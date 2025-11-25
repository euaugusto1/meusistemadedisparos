import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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
          phone_number,
          api_token,
          status,
          is_test,
          api_url
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
      .order('created_at', { ascending: true })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: campaignsError.message }, { status: 500 })
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

    // Filtrar campanhas prontas para envio (produção ou teste)
    const readyCampaigns = campaigns?.filter(campaign => {
      // Skip paused campaigns
      if ((campaign as any).is_paused === true) {
        console.log(`[N8N] SKIP ${campaign.title}: Campaign is paused`)
        return false
      }

      // Skip campaigns without instance_id
      if (!campaign.instance_id) {
        console.log(`[N8N] SKIP ${campaign.title}: No instance_id`)
        return false
      }

      const instance = campaign.instance as any
      if (!instance || !instance.length) {
        console.log(`[N8N] SKIP ${campaign.title}: No instance data (foreign key issue?)`)
        return false
      }

      const inst = instance[0]

      // Aceita instâncias de produção E de teste
      const isConnected = inst.status === 'connected'
      const hasApiToken = !!inst.api_token

      if (!isConnected) {
        console.log(`[N8N] SKIP ${campaign.title}: Instance not connected (status: ${inst.status})`)
        return false
      }
      if (!hasApiToken) {
        console.log(`[N8N] SKIP ${campaign.title}: No api_token`)
        return false
      }

      // Verifica se está pronta para envio baseado no schedule_type
      const currentTime = new Date()
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
        return false
      }

      console.log(`[N8N] READY ${campaign.title}: All conditions met!`)
      return true
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
            apiUrl: campaign.instance[0].api_url || (campaign.instance[0].is_test
              ? (process.env.EVOLUTION_API_URL || 'https://dev.evo.sistemabrasil.online')
              : (process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com')),
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
