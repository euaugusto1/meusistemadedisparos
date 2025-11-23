import { createAdminClient } from './supabase/server'

export type AnalyticsEventType =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'responded'
  | 'converted'

export interface TrackEventParams {
  userId: string
  campaignId: string
  campaignItemId?: string
  instanceId?: string
  eventType: AnalyticsEventType
  recipient: string
  metadata?: Record<string, any>
  errorMessage?: string
}

/**
 * Track an analytics event
 */
export async function trackEvent(params: TrackEventParams): Promise<string | null> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('log_analytics_event', {
      p_user_id: params.userId,
      p_campaign_id: params.campaignId,
      p_campaign_item_id: params.campaignItemId || null,
      p_instance_id: params.instanceId || null,
      p_event_type: params.eventType,
      p_recipient: params.recipient,
      p_metadata: params.metadata || {},
      p_error_message: params.errorMessage || null,
    })

    if (error) {
      console.error('Error tracking analytics event:', error)
      return null
    }

    return data as string
  } catch (error) {
    console.error('Failed to track event:', error)
    return null
  }
}

/**
 * Track multiple events in batch
 */
export async function trackEventsBatch(events: TrackEventParams[]): Promise<void> {
  try {
    const supabase = createAdminClient()

    const rows = events.map(event => ({
      user_id: event.userId,
      campaign_id: event.campaignId,
      campaign_item_id: event.campaignItemId || null,
      instance_id: event.instanceId || null,
      event_type: event.eventType,
      recipient: event.recipient,
      metadata: event.metadata || {},
      error_message: event.errorMessage || null,
    }))

    const { error } = await supabase.from('analytics_events').insert(rows)

    if (error) {
      console.error('Error tracking batch analytics events:', error)
    }
  } catch (error) {
    console.error('Failed to track batch events:', error)
  }
}

/**
 * Get analytics summary for a user
 */
export async function getAnalyticsSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('get_user_analytics_summary', {
      p_user_id: userId,
      p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: endDate?.toISOString() || new Date().toISOString(),
    })

    if (error) {
      console.error('Error getting analytics summary:', error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error('Failed to get analytics summary:', error)
    return null
  }
}

/**
 * Get hourly heatmap data
 */
export async function getHourlyHeatmapData(userId: string, days: number = 30) {
  try {
    const supabase = createAdminClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('analytics_hourly_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('hour', startDate.toISOString())
      .order('hour', { ascending: false })

    if (error) {
      console.error('Error getting hourly heatmap data:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to get hourly heatmap data:', error)
    return []
  }
}

/**
 * Get time series data for charts
 */
export async function getTimeSeriesData(userId: string, days: number = 7) {
  try {
    const supabase = createAdminClient()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, event_timestamp')
      .eq('user_id', userId)
      .gte('event_timestamp', startDate.toISOString())
      .order('event_timestamp', { ascending: true })

    if (error) {
      console.error('Error getting time series data:', error)
      return []
    }

    // Group by date
    const grouped = new Map<string, any>()

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      grouped.set(dateStr, {
        date: date.toISOString(),
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      })
    }

    data?.forEach(event => {
      const dateStr = event.event_timestamp.split('T')[0]
      const dayData = grouped.get(dateStr)

      if (dayData) {
        if (event.event_type === 'sent') dayData.sent++
        if (event.event_type === 'delivered') dayData.delivered++
        if (event.event_type === 'read') dayData.read++
        if (event.event_type === 'failed') dayData.failed++
      }
    })

    return Array.from(grouped.values())
  } catch (error) {
    console.error('Failed to get time series data:', error)
    return []
  }
}

/**
 * Get campaign comparison data
 */
export async function getCampaignComparisonData(userId: string, limit: number = 5) {
  try {
    const supabase = createAdminClient()

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !campaigns) {
      console.error('Error getting campaigns:', error)
      return []
    }

    const comparisons = await Promise.all(
      campaigns.map(async campaign => {
        const { data: events } = await supabase
          .from('analytics_events')
          .select('event_type')
          .eq('campaign_id', campaign.id)

        const sent = events?.filter(e => e.event_type === 'sent').length || 0
        const delivered = events?.filter(e => e.event_type === 'delivered').length || 0
        const read = events?.filter(e => e.event_type === 'read').length || 0
        const responded = events?.filter(e => e.event_type === 'responded').length || 0

        return {
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          sent_count: sent,
          delivery_rate: sent > 0 ? (delivered / sent) * 100 : 0,
          read_rate: delivered > 0 ? (read / delivered) * 100 : 0,
          response_rate: read > 0 ? (responded / read) * 100 : 0,
          created_at: campaign.created_at,
        }
      })
    )

    return comparisons
  } catch (error) {
    console.error('Failed to get campaign comparison data:', error)
    return []
  }
}
