import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { corsPreflightResponse, jsonResponseWithCors } from '@/lib/cors'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Função auxiliar para buscar número de telefone da Evolution API
async function fetchPhoneNumberFromEvolution(instanceName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
        },
      }
    )
    if (response.ok) {
      const data = await response.json()
      const instanceInfo = Array.isArray(data) ? data[0] : data
      return instanceInfo?.instance?.owner || instanceInfo?.owner || null
    }
  } catch (e) {
    console.error(`[N8N] Error fetching phone from Evolution API for ${instanceName}:`, e)
  }
  return null
}

// Handle CORS preflight
export async function OPTIONS() {
  return corsPreflightResponse()
}

export async function GET(request: NextRequest) {
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

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // First, let's check ALL campaigns to debug
    const { data: allCampaigns, error: allError } = await supabase
      .from('campaigns')
      .select('id, title, status, is_paused, instance_id, schedule_type, scheduled_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('[N8N] DEBUG - Last 10 campaigns in database:')
    console.log('[N8N] Current server time:', new Date().toISOString())
    allCampaigns?.forEach((c, i) => {
      console.log(`  ${i + 1}. "${c.title}" - status: ${c.status}, instance_id: ${c.instance_id ? 'SET' : 'NULL'}, scheduled_at: ${c.scheduled_at}, created_at: ${c.created_at}`)
    })

    // Get scheduled campaigns that are ready to be sent (production instances only)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        message,
        status,
        scheduled_at,
        schedule_type,
        timezone,
        total_recipients,
        throttle_enabled,
        throttle_rate,
        throttle_delay,
        min_delay,
        max_delay,
        link_url,
        button_type,
        buttons,
        media_id,
        instance_id,
        user_id,
        suggested_send_time,
        recurrence_pattern,
        is_paused,
        instance:whatsapp_instances!campaigns_instance_id_fkey(
          id,
          name,
          instance_key,
          phone_number,
          api_token,
          status,
          is_test
        ),
        media:media_files!campaigns_media_id_fkey(
          id,
          file_name,
          original_name,
          mime_type,
          size_bytes,
          public_url,
          storage_path
        )
      `)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: true })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return jsonResponseWithCors({ error: campaignsError.message }, { status: 500 })
    }

    // Debug: Log all campaigns found with status='scheduled'
    console.log(`[N8N] Found ${campaigns?.length || 0} campaigns with status='scheduled'`)

    // Debug: Check if instances exist for campaigns with instance_id but no instance data
    for (const c of campaigns || []) {
      const inst = c.instance as any
      console.log(`[N8N] Campaign: ${c.title}`)
      console.log(`  - ID: ${c.id}`)
      console.log(`  - instance_id: ${c.instance_id || 'NULL'}`)
      console.log(`  - schedule_type: ${c.schedule_type}`)
      console.log(`  - scheduled_at: ${c.scheduled_at}`)
      console.log(`  - instance data from JOIN: ${JSON.stringify(inst)}`)

      // If instance_id exists but no instance data, query directly
      if (c.instance_id && (!inst || inst.length === 0)) {
        const { data: directInstance, error: directError } = await supabase
          .from('whatsapp_instances')
          .select('id, name, status, api_token, is_test, user_id')
          .eq('id', c.instance_id)
          .single()

        if (directError) {
          console.log(`  - Direct query ERROR: ${directError.message}`)
        } else if (directInstance) {
          console.log(`  - Direct query FOUND: ${directInstance.name} (user_id: ${directInstance.user_id}, status: ${directInstance.status})`)
        } else {
          console.log(`  - Direct query: Instance not found in database`)
        }
      }
    }

    // Tempo limite para considerar uma campanha como expirada (1 hora após o horário agendado)
    const EXPIRATION_THRESHOLD_MS = 60 * 60 * 1000 // 1 hora em milissegundos
    const currentTime = new Date()

    // Separar campanhas em: prontas para envio, expiradas (para marcar como failed)
    const readyCampaigns: typeof campaigns = []
    const expiredCampaigns: typeof campaigns = []

    for (const campaign of campaigns || []) {
      // Skip paused campaigns
      if ((campaign as any).is_paused === true) {
        console.log(`[N8N] SKIP ${campaign.title}: Campaign is paused`)
        continue
      }

      // Skip campaigns without instance_id
      if (!campaign.instance_id) {
        console.log(`[N8N] SKIP ${campaign.title}: No instance_id`)
        continue
      }

      const instanceData = campaign.instance as any
      // Instance pode ser objeto único (foreign key explícito) ou array
      const inst = Array.isArray(instanceData) ? instanceData[0] : instanceData

      if (!inst || !inst.id) {
        console.log(`[N8N] SKIP ${campaign.title}: No instance data (foreign key issue?)`)
        continue
      }

      // Aceita instâncias de produção E de teste
      const isConnected = inst.status === 'connected'
      // Para instâncias UAZAPI (is_test=false), usamos UAZAPI_ADMIN_TOKEN do ambiente
      // Para instâncias Evolution (is_test=true), precisamos do api_token na tabela
      const isTestInstance = inst.is_test === true
      const hasApiToken = isTestInstance ? !!inst.api_token : true // UAZAPI não precisa de token na tabela

      // Verifica se a campanha está expirada (passou muito tempo do horário agendado)
      if (campaign.schedule_type === 'scheduled' && campaign.scheduled_at) {
        const scheduledTime = new Date(campaign.scheduled_at)
        const timeSinceScheduled = currentTime.getTime() - scheduledTime.getTime()

        // Se passou mais de 1 hora do horário agendado e a instância não está pronta, marcar como expirada
        if (timeSinceScheduled > EXPIRATION_THRESHOLD_MS) {
          if (!isConnected || !hasApiToken) {
            console.log(`[N8N] EXPIRED ${campaign.title}: Scheduled for ${campaign.scheduled_at}, now is ${currentTime.toISOString()}, instance not ready`)
            expiredCampaigns.push(campaign)
            continue
          }
        }
      }

      if (!isConnected) {
        console.log(`[N8N] SKIP ${campaign.title}: Instance not connected (status: ${inst.status})`)
        continue
      }

      // Para UAZAPI, verificar se UAZAPI_ADMIN_TOKEN está definido no ambiente
      if (!isTestInstance && !process.env.UAZAPI_ADMIN_TOKEN) {
        console.log(`[N8N] SKIP ${campaign.title}: UAZAPI instance but UAZAPI_ADMIN_TOKEN not configured in environment`)
        continue
      }

      if (!hasApiToken) {
        console.log(`[N8N] SKIP ${campaign.title}: No api_token (is_test=${isTestInstance})`)
        continue
      }

      console.log(`[N8N] ${campaign.title}: Instance type = ${isTestInstance ? 'Evolution (test)' : 'UAZAPI (production)'}, hasApiToken=${hasApiToken}`)

      // Verifica se está pronta para envio baseado no schedule_type
      let isReadyToSend = false

      if (!campaign.schedule_type || campaign.schedule_type === 'immediate') {
        isReadyToSend = true
      } else if (campaign.schedule_type === 'scheduled') {
        const scheduledTime = campaign.scheduled_at ? new Date(campaign.scheduled_at) : null
        isReadyToSend = !scheduledTime || scheduledTime <= currentTime
        console.log(`[N8N] ${campaign.title}: scheduled_at=${campaign.scheduled_at}, currentTime=${currentTime.toISOString()}, isReady=${isReadyToSend}`)
      } else if (campaign.schedule_type === 'recurring') {
        isReadyToSend = !campaign.scheduled_at || new Date(campaign.scheduled_at) <= currentTime
      } else if (campaign.schedule_type === 'smart') {
        const smartTime = campaign.suggested_send_time || campaign.scheduled_at
        isReadyToSend = !smartTime || new Date(smartTime) <= currentTime
      }

      if (!isReadyToSend) {
        console.log(`[N8N] SKIP ${campaign.title}: Not ready to send yet`)
        continue
      }

      console.log(`[N8N] READY ${campaign.title}: All conditions met!`)
      readyCampaigns.push(campaign)
    }

    // Marcar campanhas expiradas como failed
    if (expiredCampaigns.length > 0) {
      console.log(`[N8N] Marking ${expiredCampaigns.length} expired campaigns as failed...`)
      for (const campaign of expiredCampaigns) {
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id)

        if (updateError) {
          console.error(`[N8N] Error marking campaign ${campaign.id} as failed:`, updateError)
        } else {
          console.log(`[N8N] Campaign "${campaign.title}" marked as failed (expired)`)
        }
      }
    }

    if (readyCampaigns.length === 0) {
      return jsonResponseWithCors({
        success: true,
        count: 0,
        campaigns: [],
        message: 'No campaigns ready to send'
      })
    }

    // For each campaign, get recipients and prepare full data
    const campaignsWithRecipients = await Promise.all(
      readyCampaigns.map(async (campaign) => {
        // Get all pending recipients
        const { data: recipients, error: recipientsError } = await supabase
          .from('campaign_items')
          .select('id, recipient, status')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')

        if (recipientsError) {
          console.error(`Error fetching recipients for campaign ${campaign.id}:`, recipientsError)
          return null
        }

        // Get instance info first to determine API type
        const instData = campaign.instance as any
        const inst = Array.isArray(instData) ? instData[0] : instData
        const isTestInstance = inst?.is_test === true

        // Get media info if exists
        let mediaInfo = null
        const mediaData = campaign.media as any
        const media = Array.isArray(mediaData) ? mediaData[0] : mediaData

        if (media && media.id) {
          // Determinar o tipo de mídia baseado no mime_type
          let mediaType = 'document' // default
          const mimeType = media.mime_type || ''

          if (mimeType.startsWith('image/')) {
            mediaType = 'image'
          } else if (mimeType.startsWith('video/')) {
            mediaType = 'video'
          } else if (mimeType.startsWith('audio/')) {
            mediaType = 'audio'
          } else if (mimeType === 'application/pdf') {
            mediaType = 'document'
          }

          // Usar public_url se disponível, senão gerar URL assinada
          let mediaUrl = media.public_url

          if (!mediaUrl && media.storage_path) {
            // Gerar URL pública assinada (válida por 1 hora)
            const { data: signedUrlData } = await supabase
              .storage
              .from('media')
              .createSignedUrl(media.storage_path, 3600)

            mediaUrl = signedUrlData?.signedUrl || null
          }

          // Dados comuns - usando apenas URL (mais leve, evita limite de tamanho do n8n)
          const commonMediaInfo = {
            id: media.id,
            fileName: media.original_name || media.file_name,
            mimeType: mimeType,
            mediaType: mediaType, // image, video, audio, document
            fileSize: media.size_bytes,
          }

          // Dados específicos para cada API
          if (isTestInstance) {
            // Evolution API - usa URL da biblioteca (mais leve)
            mediaInfo = {
              ...commonMediaInfo,
              // URL pública da mídia - Evolution API aceita URL direta
              media: mediaUrl,
            }
            console.log(`[N8N] Evolution API media URL: ${mediaUrl}`)
          } else {
            // UAZAPI - POST /send/media
            // Tipos suportados: image, video, document, audio, myaudio, ptt, sticker
            let uazapiType = mediaType
            // Mapear tipos específicos do UAZAPI
            if (mimeType.startsWith('audio/')) {
              uazapiType = 'audio' // ou 'ptt' para mensagem de voz
            }

            mediaInfo = {
              ...commonMediaInfo,
              // Campos para UAZAPI /send/media - usando apenas URL (mais leve)
              file: mediaUrl, // URL da mídia
              type: uazapiType, // image, video, document, audio, myaudio, ptt, sticker
              caption: campaign.message, // Legenda opcional
              docName: media.original_name || media.file_name, // Nome para documentos
              media: mediaUrl, // URL da mídia (campo alternativo)
            }
            console.log(`[N8N] UAZAPI media URL: ${mediaUrl}`)
          }

          console.log(`[N8N] Campaign ${campaign.id} has media: ${mediaType} - ${media.original_name} (${isTestInstance ? 'Evolution' : 'UAZAPI'})`)
        }

        return {
          // Campaign info
          campaignId: campaign.id,
          title: campaign.title,
          message: campaign.message,
          status: campaign.status,
          scheduledAt: campaign.scheduled_at,
          scheduleType: campaign.schedule_type,
          timezone: campaign.timezone,
          suggestedSendTime: campaign.suggested_send_time,
          recurrencePattern: campaign.recurrence_pattern,

          // WhatsApp Instance info
          instance: await (async () => {
            // inst já foi definido acima para determinar o tipo de API
            if (!inst || !inst.id) return null

            // instance_key é o nome real da instância na Evolution API (ex: test_6d983e3a_1764022014264)
            const instanceKey = inst.instance_key || inst.name

            // Para Evolution API (teste): usa api_token da tabela e EVOLUTION_API_URL
            // Para UAZAPI (produção): usa UAZAPI_ADMIN_TOKEN do ambiente e UAZAPI_BASE_URL
            const apiUrl = isTestInstance
              ? (process.env.EVOLUTION_API_URL || 'https://dev.evo.sistemabrasil.online')
              : (process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com')

            const apiToken = isTestInstance
              ? inst.api_token
              : (process.env.UAZAPI_ADMIN_TOKEN || '')

            // Buscar número de telefone - se não estiver no banco, busca da Evolution API
            let phoneNumber = inst.phone_number
            if (!phoneNumber && isTestInstance && instanceKey) {
              phoneNumber = await fetchPhoneNumberFromEvolution(instanceKey)
              // Atualiza no banco para próximas consultas
              if (phoneNumber) {
                await supabase
                  .from('whatsapp_instances')
                  .update({ phone_number: phoneNumber })
                  .eq('id', inst.id)
              }
            }

            return {
              id: inst.id,
              name: inst.name,
              instanceKey: instanceKey, // Nome real da instância na Evolution API
              phoneNumber: phoneNumber,
              apiToken,
              apiUrl,
              // Header name: Evolution usa 'apikey', UAZAPI usa 'token'
              apiHeaderName: isTestInstance ? 'apikey' : 'token',
              // Endpoints para envio de mensagens - usa instanceKey (nome na API)
              sendTextEndpoint: isTestInstance
                ? `/message/sendText/${instanceKey}` // Evolution API
                : '/send/text', // UAZAPI
              sendMediaEndpoint: isTestInstance
                ? `/message/sendMedia/${instanceKey}` // Evolution API
                : '/send/media', // UAZAPI
              status: inst.status,
              isTest: isTestInstance
            }
          })(),

          // Recipients
          recipients: recipients?.map(r => ({
            id: r.id,
            phoneNumber: r.recipient,
            status: r.status
          })) || [],
          totalRecipients: campaign.total_recipients,

          // Media (Base64)
          media: mediaInfo,

          // Message customization
          linkUrl: campaign.link_url,
          buttonType: campaign.button_type,
          buttons: campaign.buttons,

          // Throttling settings
          throttling: {
            enabled: campaign.throttle_enabled,
            messagesPerMinute: campaign.throttle_rate,
            delayBetweenMessages: campaign.throttle_delay,
            minDelay: campaign.min_delay,
            maxDelay: campaign.max_delay
          }
        }
      })
    )

    // Filter out null campaigns
    const validCampaigns = campaignsWithRecipients.filter(c => c !== null)

    return jsonResponseWithCors({
      success: true,
      count: validCampaigns.length,
      campaigns: validCampaigns,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in /api/n8n/scheduled-campaigns:', error)
    return jsonResponseWithCors(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
