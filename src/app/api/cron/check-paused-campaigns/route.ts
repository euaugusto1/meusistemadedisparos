import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Cron Job to check and resume paused campaigns
 *
 * This endpoint checks for paused campaigns where pause_until has expired
 * and automatically resumes them.
 *
 * Schedule: Every 5 minutes
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    console.log(`[CRON] Checking paused campaigns at ${now.toISOString()}`)

    // Find paused campaigns that should be resumed
    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_paused', true)
      .not('pause_until', 'is', null)
      .lte('pause_until', now.toISOString())

    if (fetchError) {
      throw fetchError
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('[CRON] No paused campaigns to resume')
      return NextResponse.json({
        success: true,
        resumed: 0,
        message: 'No paused campaigns to resume',
      })
    }

    console.log(`[CRON] Found ${campaigns.length} paused campaigns to resume`)

    const results = []

    for (const campaign of campaigns) {
      try {
        // Determine new status
        let newStatus = 'scheduled'
        if (campaign.sent_count > 0) {
          newStatus = 'processing'
        } else if (campaign.schedule_type === 'immediate') {
          newStatus = 'processing'
        }

        // Resume campaign
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            is_paused: false,
            pause_until: null,
            status: newStatus,
          })
          .eq('id', campaign.id)

        if (updateError) {
          throw updateError
        }

        // Log the action
        await supabase.from('campaign_schedule_logs').insert({
          campaign_id: campaign.id,
          user_id: campaign.user_id,
          action: 'resumed',
          reason: 'Auto-resumed: pause period expired',
          metadata: {
            pause_until: campaign.pause_until,
            resumed_at: now.toISOString(),
            new_status: newStatus,
          },
        })

        results.push({
          id: campaign.id,
          title: campaign.title,
          status: 'resumed',
          new_status: newStatus,
        })

        console.log(`[CRON] Resumed campaign: ${campaign.id} - ${campaign.title}`)
      } catch (error) {
        console.error(`[CRON] Error resuming campaign ${campaign.id}:`, error)

        results.push({
          id: campaign.id,
          title: campaign.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      resumed: results.filter(r => r.status === 'resumed').length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error in paused campaigns checker:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
