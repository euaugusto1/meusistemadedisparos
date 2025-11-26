import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { corsPreflightResponse, jsonResponseWithCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

// Handle CORS preflight
export async function OPTIONS() {
  return corsPreflightResponse()
}

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação N8N
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== N8N_API_KEY) {
      return jsonResponseWithCors(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const campaignId = params.id
    const supabase = createAdminClient()

    // Buscar campanha com seus items e dados de agendamento
    const { data: campaign, error: fetchError} = await supabase
      .from('campaigns')
      .select('id, title, total_recipients, sent_count, failed_count, status, schedule_type, scheduled_at, recurrence_pattern, timezone, instance_id, user_id, message, link_url, media_id, button_type, buttons, min_delay, max_delay')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaign) {
      return jsonResponseWithCors(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se ainda há items pendentes
    const { count: pendingCount } = await supabase
      .from('campaign_items')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    // Determinar status final
    let finalStatus: 'completed' | 'failed' | 'processing' = 'completed'

    if (pendingCount && pendingCount > 0) {
      // Ainda há items pendentes, não finalizar
      // Padronizado: campaignId sempre no nível raiz para consistência no N8N
      return jsonResponseWithCors({
        success: false,
        campaignId: campaign.id,
        title: campaign.title,
        status: campaign.status,
        message: 'Ainda há destinatários pendentes',
        pendingCount
      })
    }

    // Se nenhum enviado com sucesso, marcar como failed
    if (campaign.sent_count === 0 && campaign.failed_count > 0) {
      finalStatus = 'failed'
    }

    // Atualizar campanha como concluída
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error completing campaign:', updateError)
      return jsonResponseWithCors(
        { error: 'Erro ao finalizar campanha', details: updateError.message },
        { status: 500 }
      )
    }

    // Se é campanha recorrente, criar próxima ocorrência
    let nextOccurrenceId = null
    if (campaign.schedule_type === 'recurring' && campaign.recurrence_pattern && finalStatus === 'completed') {
      try {
        const pattern = campaign.recurrence_pattern as any
        const lastScheduledAt = campaign.scheduled_at ? new Date(campaign.scheduled_at) : new Date()
        let nextScheduledAt = new Date(lastScheduledAt)

        // Calcular próxima ocorrência baseado no tipo de recorrência
        if (pattern.type === 'daily') {
          nextScheduledAt.setDate(nextScheduledAt.getDate() + (pattern.interval || 1))
        } else if (pattern.type === 'weekly') {
          nextScheduledAt.setDate(nextScheduledAt.getDate() + (7 * (pattern.interval || 1)))
        } else if (pattern.type === 'monthly') {
          nextScheduledAt.setMonth(nextScheduledAt.getMonth() + (pattern.interval || 1))
        }

        // Criar nova campanha idêntica mas com nova data
        const { data: newCampaign, error: createError } = await supabase
          .from('campaigns')
          .insert({
            user_id: campaign.user_id,
            instance_id: campaign.instance_id,
            title: campaign.title,
            message: campaign.message,
            link_url: campaign.link_url,
            media_id: campaign.media_id,
            button_type: campaign.button_type,
            buttons: campaign.buttons,
            min_delay: campaign.min_delay,
            max_delay: campaign.max_delay,
            total_recipients: 0, // Será preenchido ao adicionar items
            status: 'scheduled',
            schedule_type: 'recurring',
            scheduled_at: nextScheduledAt.toISOString(),
            timezone: campaign.timezone,
            recurrence_pattern: campaign.recurrence_pattern,
          })
          .select('id')
          .single()

        if (!createError && newCampaign) {
          nextOccurrenceId = newCampaign.id

          // Copiar destinatários da campanha original
          const { data: originalItems } = await supabase
            .from('campaign_items')
            .select('recipient, recipient_name')
            .eq('campaign_id', campaignId)

          if (originalItems && originalItems.length > 0) {
            const newItems = originalItems.map(item => ({
              campaign_id: newCampaign.id,
              recipient: item.recipient,
              recipient_name: item.recipient_name,
              status: 'pending' as const,
            }))

            await supabase.from('campaign_items').insert(newItems)

            // Atualizar total_recipients da nova campanha
            await supabase
              .from('campaigns')
              .update({ total_recipients: originalItems.length })
              .eq('id', newCampaign.id)
          }
        }
      } catch (error) {
        console.error('Error creating recurring campaign:', error)
        // Não falhar o complete se recorrência der erro
      }
    }

    // Calcular estatísticas finais
    const successRate = campaign.total_recipients > 0
      ? ((campaign.sent_count / campaign.total_recipients) * 100).toFixed(2)
      : '0.00'

    // Padronizado: campaignId sempre no nível raiz para consistência no N8N
    return jsonResponseWithCors({
      success: true,
      campaignId: updated.id,
      title: updated.title,
      status: updated.status,
      completedAt: updated.completed_at,
      statistics: {
        totalRecipients: campaign.total_recipients,
        sentCount: campaign.sent_count,
        failedCount: campaign.failed_count,
        successRate: `${successRate}%`,
        finalStatus: finalStatus
      },
      message: `Campanha finalizada com status: ${finalStatus}`,
      recurring: nextOccurrenceId ? {
        nextOccurrenceId,
        message: 'Próxima ocorrência agendada com sucesso'
      } : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in complete campaign route:', error)
    return jsonResponseWithCors(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
