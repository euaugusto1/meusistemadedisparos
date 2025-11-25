import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireApiToken } from '@/lib/api-token-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Try API token auth first, then fall back to Supabase auth
    const tokenAuth = await requireApiToken(request)

    let userId: string
    let isAdmin = false

    if (tokenAuth.isValid && tokenAuth.userId) {
      userId = tokenAuth.userId
      // Check if user is admin
      const supabase = createAdminClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      isAdmin = profile?.role === 'admin'
    } else {
      // Fall back to Supabase session auth
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        )
      }
      userId = user.id

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      isAdmin = profile?.role === 'admin'
    }

    const supabase = createAdminClient()

    // Get scheduled campaigns
    let query = supabase
      .from('campaigns')
      .select(`
        id,
        title,
        message,
        status,
        schedule_type,
        scheduled_at,
        timezone,
        total_recipients,
        sent_count,
        failed_count,
        min_delay,
        max_delay,
        throttle_enabled,
        throttle_rate,
        throttle_delay,
        link_url,
        button_type,
        buttons,
        media_id,
        instance_id,
        user_id,
        is_paused,
        created_at,
        updated_at,
        instance:whatsapp_instances!campaigns_instance_id_fkey(
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
      .order('created_at', { ascending: true })

    // If not admin, only show user's own campaigns
    if (!isAdmin) {
      query = query.eq('user_id', userId)
    }

    const { data: campaigns, error: campaignsError } = await query

    if (campaignsError) {
      console.error('Error fetching scheduled campaigns:', campaignsError)
      return NextResponse.json(
        { error: 'Erro ao buscar campanhas agendadas' },
        { status: 500 }
      )
    }

    // For each campaign, get recipients and prepare response
    const campaignsWithDetails = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Get pending recipients
        const { data: recipients } = await supabase
          .from('campaign_items')
          .select('id, recipient, status')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')

        // Get instance data
        const instData = campaign.instance as any
        const inst = Array.isArray(instData) ? instData[0] : instData
        const isTestInstance = inst?.is_test === true

        // Prepare instance info with correct API details
        const instanceInfo = inst ? {
          id: inst.id,
          name: inst.name,
          instanceKey: inst.name,
          phoneNumber: inst.phone_number,
          apiToken: isTestInstance
            ? inst.api_token
            : (process.env.UAZAPI_ADMIN_TOKEN || ''),
          apiUrl: isTestInstance
            ? (process.env.EVOLUTION_API_URL || 'https://dev.evo.sistemabrasil.online')
            : (process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com'),
          apiHeaderName: isTestInstance ? 'apikey' : 'token',
          sendTextEndpoint: isTestInstance
            ? `/message/sendText/${inst.name}`
            : '/send/text',
          sendMediaEndpoint: isTestInstance
            ? `/message/sendMedia/${inst.name}`
            : '/send/media',
          status: inst.status,
          isTest: isTestInstance
        } : null

        // Get media info
        const mediaData = campaign.media as any
        const media = Array.isArray(mediaData) ? mediaData[0] : mediaData

        return {
          campaignId: campaign.id,
          title: campaign.title,
          message: campaign.message,
          status: campaign.status,
          scheduledAt: campaign.scheduled_at,
          scheduleType: campaign.schedule_type,
          timezone: campaign.timezone,
          isPaused: campaign.is_paused,
          instance: instanceInfo,
          recipients: recipients?.map(r => ({
            id: r.id,
            phoneNumber: r.recipient,
            status: r.status
          })) || [],
          totalRecipients: campaign.total_recipients,
          media: media ? {
            id: media.id,
            fileName: media.original_name,
            mimeType: media.mime_type,
            fileSize: media.size_bytes,
            publicUrl: media.public_url
          } : null,
          linkUrl: campaign.link_url,
          buttonType: campaign.button_type,
          buttons: campaign.buttons,
          throttling: {
            enabled: campaign.throttle_enabled,
            messagesPerMinute: campaign.throttle_rate,
            delayBetweenMessages: campaign.throttle_delay,
            minDelay: campaign.min_delay,
            maxDelay: campaign.max_delay
          },
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: campaignsWithDetails.length,
      campaigns: campaignsWithDetails,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/campaigns/scheduled:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
