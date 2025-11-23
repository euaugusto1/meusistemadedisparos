import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Cron Job to process scheduled campaigns
 *
 * This endpoint should be called every minute by a cron service like:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - External cron services (cron-job.org, etc.)
 *
 * Configuration example for Vercel (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-scheduled-campaigns",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()

    console.log(`[CRON] Processing scheduled campaigns at ${now.toISOString()}`)

    // Find campaigns that should be processed now
    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .eq('is_paused', false)
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10) // Process max 10 campaigns per run

    if (fetchError) {
      throw fetchError
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('[CRON] No campaigns to process')
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No campaigns to process',
      })
    }

    console.log(`[CRON] Found ${campaigns.length} campaigns to process`)

    const results = []

    for (const campaign of campaigns) {
      try {
        // Update campaign status to processing
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            status: 'processing',
            started_at: now.toISOString(),
          })
          .eq('id', campaign.id)

        if (updateError) {
          throw updateError
        }

        // Log the action
        await supabase.from('campaign_schedule_logs').insert({
          campaign_id: campaign.id,
          user_id: campaign.user_id,
          action: 'sent',
          reason: 'Scheduled time reached',
          metadata: {
            scheduled_at: campaign.scheduled_at,
            actual_start: now.toISOString(),
            schedule_type: campaign.schedule_type,
          },
        })

        // If recurring, schedule next execution
        if (campaign.schedule_type === 'recurring' && campaign.recurrence_pattern) {
          const { data: nextRun } = await supabase.rpc('process_recurring_campaign', {
            p_campaign_id: campaign.id,
          })

          console.log(`[CRON] Campaign ${campaign.id} scheduled for next run: ${nextRun}`)
        }

        results.push({
          id: campaign.id,
          title: campaign.title,
          status: 'started',
        })

        console.log(`[CRON] Started campaign: ${campaign.id} - ${campaign.title}`)
      } catch (error) {
        console.error(`[CRON] Error processing campaign ${campaign.id}:`, error)

        // Mark campaign as failed
        await supabase
          .from('campaigns')
          .update({
            status: 'failed',
          })
          .eq('id', campaign.id)

        results.push({
          id: campaign.id,
          title: campaign.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error in scheduled campaigns processor:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Also handle POST for manual triggers
 */
export async function POST() {
  return GET()
}
