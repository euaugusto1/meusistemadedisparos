// =====================================================
// CAMPAIGNS SERVICE - Gerenciamento de Campanhas
// =====================================================

import { createClient } from '@/lib/supabase/client'
import { sendMessage } from './uazapi'
import { getRandomDelay, sleep } from '@/lib/utils'
import type {
  Campaign,
  CampaignItem,
  CampaignStatus,
  DispatchResult,
  WhatsAppInstance,
  CampaignSettings,
} from '@/types'

// =====================================================
// SYSTEM SETTINGS
// =====================================================

/**
 * Buscar configurações de delay do sistema
 */
async function getCampaignDelaySettings(): Promise<CampaignSettings> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'campaign_delays')
      .single()

    if (error || !data) {
      // Retornar valores padrão se não houver configuração
      return {
        min_delay_seconds: 35,
        max_delay_seconds: 250,
      }
    }

    return data.value as CampaignSettings
  } catch (error) {
    console.error('Error fetching campaign delay settings:', error)
    // Retornar valores padrão em caso de erro
    return {
      min_delay_seconds: 35,
      max_delay_seconds: 250,
    }
  }
}

// =====================================================
// CAMPAIGN CRUD
// =====================================================

/**
 * Criar nova campanha
 */
export async function createCampaign(
  campaignData: Partial<Campaign>,
  recipients: string[]
): Promise<{ campaign: Campaign; items: CampaignItem[] } | null> {
  const supabase = createClient()

  // Get current user for RLS
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  // Criar campanha
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      ...campaignData,
      user_id: user.id,
      total_recipients: recipients.length,
      status: campaignData.scheduled_for ? 'scheduled' : 'draft',
    })
    .select()
    .single()

  if (campaignError || !campaign) {
    console.error('Error creating campaign:', campaignError)
    return null
  }

  // Criar itens da campanha
  const items = recipients.map(recipient => ({
    campaign_id: campaign.id,
    recipient,
    status: 'pending' as const,
  }))

  const { data: campaignItems, error: itemsError } = await supabase
    .from('campaign_items')
    .insert(items)
    .select()

  if (itemsError) {
    console.error('Error creating campaign items:', itemsError)
    // Rollback: deletar campanha
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    return null
  }

  return { campaign, items: campaignItems }
}

/**
 * Obter campanha por ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (error) {
    console.error('Error fetching campaign:', error)
    return null
  }

  return data
}

/**
 * Listar campanhas do usuário
 */
export async function listCampaigns(status?: CampaignStatus): Promise<Campaign[]> {
  const supabase = createClient()

  let query = supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error listing campaigns:', error)
    return []
  }

  return data || []
}

/**
 * Atualizar status da campanha
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus,
  additionalData?: Partial<Campaign>
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('campaigns')
    .update({ status, ...additionalData })
    .eq('id', campaignId)

  if (error) {
    console.error('Error updating campaign status:', error)
    return false
  }

  return true
}

/**
 * Cancelar campanha
 */
export async function cancelCampaign(campaignId: string): Promise<boolean> {
  return updateCampaignStatus(campaignId, 'cancelled')
}

// =====================================================
// CAMPAIGN ITEMS
// =====================================================

/**
 * Obter itens da campanha
 */
export async function getCampaignItems(campaignId: string): Promise<CampaignItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('campaign_items')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching campaign items:', error)
    return []
  }

  return data || []
}

/**
 * Atualizar item da campanha
 */
export async function updateCampaignItem(
  itemId: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
  responseData?: Record<string, unknown>
): Promise<boolean> {
  const supabase = createClient()

  const updateData: Partial<CampaignItem> = {
    status,
    sent_at: new Date().toISOString(),
  }

  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  if (responseData) {
    updateData.response_data = responseData
  }

  const { error } = await supabase
    .from('campaign_items')
    .update(updateData)
    .eq('id', itemId)

  if (error) {
    console.error('Error updating campaign item:', error)
    return false
  }

  return true
}

// =====================================================
// DISPATCH LOGIC (FRONTEND - CLIENT-SIDE)
// =====================================================

interface DispatchOptions {
  campaign: Campaign
  instance: WhatsAppInstance
  onProgress?: (current: number, total: number, status: string) => void
  onItemComplete?: (result: DispatchResult) => void
  shouldStop?: () => boolean
}

/**
 * Executar disparo de campanha (client-side)
 * NÃO para o lote inteiro por um erro único
 */
export async function dispatchCampaign(options: DispatchOptions): Promise<{
  success: boolean
  sent: number
  failed: number
  results: DispatchResult[]
}> {
  const { campaign, instance, onProgress, onItemComplete, shouldStop } = options
  const supabase = createClient()

  // Buscar configurações de delay do sistema
  const delaySettings = await getCampaignDelaySettings()
  const minDelay = delaySettings.min_delay_seconds
  const maxDelay = delaySettings.max_delay_seconds

  console.log('Using campaign delay settings:', { minDelay, maxDelay })

  // Atualizar status para processing
  await updateCampaignStatus(campaign.id, 'processing', {
    started_at: new Date().toISOString(),
  })

  // Obter URL da mídia se existir
  let mediaUrl: string | undefined
  if (campaign.media_id) {
    const { data: media } = await supabase
      .from('media_files')
      .select('public_url')
      .eq('id', campaign.media_id)
      .single()

    if (media?.public_url) {
      mediaUrl = media.public_url
    }
  }

  // Obter itens pendentes
  const items = await getCampaignItems(campaign.id)
  const pendingItems = items.filter(item => item.status === 'pending')

  const results: DispatchResult[] = []
  let sentCount = 0
  let failedCount = 0

  for (let i = 0; i < pendingItems.length; i++) {
    // Verificar se deve parar
    if (shouldStop && shouldStop()) {
      onProgress?.(i, pendingItems.length, 'Envios interrompidos pelo usuário')
      break
    }

    const item = pendingItems[i]
    const current = i + 1

    onProgress?.(current, pendingItems.length, `Enviando para ${item.recipient}...`)

    try {
      // Log para debug
      console.log('Sending message with params:', {
        instanceKey: instance.instance_key,
        token: instance.token ? `${instance.token.substring(0, 8)}...` : 'NO TOKEN',
        number: item.recipient,
        message: campaign.message?.substring(0, 50) + '...',
        mediaUrl: mediaUrl || 'none',
        buttonType: campaign.button_type,
      })

      // Enviar mensagem
      const response = await sendMessage({
        instanceKey: instance.instance_key,
        token: instance.token,
        number: item.recipient,
        message: campaign.message,
        mediaUrl,
        buttonType: campaign.button_type || undefined,
        buttons: campaign.buttons,
      })

      console.log('sendMessage response:', response)

      if (response.success) {
        await updateCampaignItem(item.id, 'sent', undefined, response as unknown as Record<string, unknown>)
        sentCount++
        results.push({ recipient: item.recipient, success: true, response: response as unknown as Record<string, unknown> })

        // Descontar 1 crédito do usuário após envio bem-sucedido
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.rpc('decrement_credits', { user_id: user.id, amount: 1 })
        }
      } else {
        throw new Error(response.error || 'Erro desconhecido')
      }
    } catch (error) {
      // NÃO parar o lote por erro único - continuar para o próximo
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('Error sending message:', errorMessage)
      await updateCampaignItem(item.id, 'failed', errorMessage)
      failedCount++
      results.push({ recipient: item.recipient, success: false, error: errorMessage })
    }

    onItemComplete?.(results[results.length - 1])

    // Atualizar contadores na campanha
    await supabase
      .from('campaigns')
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaign.id)

    // Delay aleatório entre envios (exceto no último)
    if (i < pendingItems.length - 1) {
      const delaySeconds = getRandomDelay(minDelay, maxDelay)

      // Contagem regressiva com atualização a cada segundo
      for (let remaining = delaySeconds; remaining > 0; remaining--) {
        const minutes = Math.floor(remaining / 60)
        const seconds = remaining % 60
        const timeStr = minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`

        onProgress?.(
          current,
          pendingItems.length,
          `⏳ Aguardando ${timeStr} para o próximo envio...`
        )
        await sleep(1000)
      }
    }
  }

  // Determinar status final
  const finalStatus: CampaignStatus =
    shouldStop && shouldStop()
      ? 'cancelled'
      : failedCount === pendingItems.length
        ? 'failed'
        : 'completed'

  await updateCampaignStatus(campaign.id, finalStatus, {
    completed_at: new Date().toISOString(),
    sent_count: sentCount,
    failed_count: failedCount,
  })

  return {
    success: finalStatus === 'completed',
    sent: sentCount,
    failed: failedCount,
    results,
  }
}

// =====================================================
// STATISTICS
// =====================================================

/**
 * Obter estatísticas de campanhas
 */
export async function getCampaignStats(): Promise<{
  total: number
  completed: number
  failed: number
  sent: number
  pending: number
}> {
  const supabase = createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('status, sent_count, failed_count, total_recipients')

  if (!campaigns) {
    return { total: 0, completed: 0, failed: 0, sent: 0, pending: 0 }
  }

  return {
    total: campaigns.length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
    sent: campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0),
    pending: campaigns
      .filter(c => ['draft', 'scheduled', 'processing'].includes(c.status))
      .reduce((acc, c) => acc + (c.total_recipients - c.sent_count - c.failed_count), 0),
  }
}

/**
 * Obter dados para gráfico de timeline
 */
export async function getTimelineData(days: number = 7): Promise<Array<{ date: string; sent: number; failed: number }>> {
  const supabase = createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: items } = await supabase
    .from('campaign_items')
    .select('status, sent_at')
    .gte('sent_at', startDate.toISOString())
    .not('sent_at', 'is', null)

  if (!items) return []

  // Agrupar por dia
  const grouped: Record<string, { sent: number; failed: number }> = {}

  items.forEach(item => {
    if (!item.sent_at) return
    const date = new Date(item.sent_at).toISOString().split('T')[0]
    if (!grouped[date]) {
      grouped[date] = { sent: 0, failed: 0 }
    }
    if (item.status === 'sent') {
      grouped[date].sent++
    } else if (item.status === 'failed') {
      grouped[date].failed++
    }
  })

  // Converter para array ordenado
  return Object.entries(grouped)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
