import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação N8N
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== N8N_API_KEY) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const supabase = createClient()
    const now = new Date().toISOString()

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
        instance:whatsapp_instances(
          id,
          name,
          phone_number,
          api_token,
          status,
          is_test
        ),
        media:media_files(
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
      .not('is_paused', 'eq', true)
      .not('instance_id', 'is', null)
      .order('created_at', { ascending: true })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: campaignsError.message }, { status: 500 })
    }

    // Filtrar campanhas prontas para envio (produção ou teste)
    const readyCampaigns = campaigns?.filter(campaign => {
      const instance = campaign.instance as any
      if (!instance || !instance.length) return false

      const inst = instance[0]

      // Aceita instâncias de produção E de teste
      const isConnected = inst.status === 'connected'
      const hasApiToken = !!inst.api_token

      // Verifica se está pronta para envio baseado no schedule_type
      const currentTime = new Date()
      let isReadyToSend = false

      if (!campaign.schedule_type || campaign.schedule_type === 'immediate') {
        isReadyToSend = true
      } else if (campaign.schedule_type === 'scheduled') {
        isReadyToSend = !campaign.scheduled_at || new Date(campaign.scheduled_at) <= currentTime
      } else if (campaign.schedule_type === 'recurring') {
        isReadyToSend = !campaign.scheduled_at || new Date(campaign.scheduled_at) <= currentTime
      } else if (campaign.schedule_type === 'smart') {
        const smartTime = campaign.suggested_send_time || campaign.scheduled_at
        isReadyToSend = !smartTime || new Date(smartTime) <= currentTime
      }

      return isConnected && hasApiToken && isReadyToSend
    }) || []

    if (readyCampaigns.length === 0) {
      return NextResponse.json({
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

        // Get media as base64 if exists
        let mediaBase64 = null
        let mediaInfo = null

        if (campaign.media && campaign.media.length > 0 && campaign.media[0].storage_path) {
          try {
            const { data: fileData, error: fileError } = await supabase
              .storage
              .from('media')
              .download(campaign.media[0].storage_path)

            if (!fileError && fileData) {
              const arrayBuffer = await fileData.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              mediaBase64 = buffer.toString('base64')

              mediaInfo = {
                fileName: campaign.media[0].original_name,
                mimeType: campaign.media[0].mime_type,
                fileSize: campaign.media[0].size_bytes,
                base64: mediaBase64
              }
            }
          } catch (error) {
            console.error(`Error downloading media for campaign ${campaign.id}:`, error)
          }
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
          instance: campaign.instance && campaign.instance.length > 0 ? {
            id: campaign.instance[0].id,
            name: campaign.instance[0].name,
            phoneNumber: campaign.instance[0].phone_number,
            apiToken: campaign.instance[0].api_token,
            // URL baseada no tipo de instância (teste usa Evolution API, produção usa UAZAPI)
            apiUrl: campaign.instance[0].is_test
              ? (process.env.EVOLUTION_API_URL || 'https://dev.evo.sistemabrasil.online')
              : (process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com'),
            status: campaign.instance[0].status,
            isTest: campaign.instance[0].is_test
          } : null,

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

    return NextResponse.json({
      success: true,
      count: validCampaigns.length,
      campaigns: validCampaigns,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in /api/n8n/scheduled-campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
