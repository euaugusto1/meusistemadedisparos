import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Get scheduled campaigns that are ready to be sent
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
        instance:whatsapp_instances(
          id,
          name,
          phone_number,
          api_token,
          api_url,
          status
        ),
        media:media_files(
          id,
          file_name,
          original_name,
          mime_type,
          file_size,
          public_url,
          storage_path
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .not('is_paused', 'eq', true)

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: campaignsError.message }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        campaigns: [],
        message: 'No campaigns ready to send'
      })
    }

    // For each campaign, get recipients and prepare full data
    const campaignsWithRecipients = await Promise.all(
      campaigns.map(async (campaign) => {
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

        if (campaign.media && campaign.media.storage_path) {
          try {
            const { data: fileData, error: fileError } = await supabase
              .storage
              .from('media')
              .download(campaign.media.storage_path)

            if (!fileError && fileData) {
              const arrayBuffer = await fileData.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              mediaBase64 = buffer.toString('base64')

              mediaInfo = {
                fileName: campaign.media.original_name,
                mimeType: campaign.media.mime_type,
                fileSize: campaign.media.file_size,
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
          timezone: campaign.timezone,

          // WhatsApp Instance info
          instance: campaign.instance ? {
            id: campaign.instance.id,
            name: campaign.instance.name,
            phoneNumber: campaign.instance.phone_number,
            apiToken: campaign.instance.api_token,
            apiUrl: campaign.instance.api_url,
            status: campaign.instance.status
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
