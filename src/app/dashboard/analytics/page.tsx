import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient'
import type {
  RealtimeMetrics as RealtimeMetricsType,
  TimeSeriesData,
  CampaignComparison,
  ConversionFunnel,
  HourlyHeatmap,
} from '@/types'

export const metadata: Metadata = {
  title: 'Analytics | Dashboard',
  description: 'Análise detalhada de performance de campanhas',
}

async function getAnalyticsData(userId: string) {
  const supabase = createClient()

  // Get campaigns with items
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      id,
      title,
      total_recipients,
      sent_count,
      failed_count,
      created_at,
      completed_at,
      campaign_items (
        id,
        status,
        sent_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Get active instances count
  const { count: activeInstances } = await supabase
    .from('whatsapp_instances')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'connected')

  return {
    campaigns: campaigns || [],
    activeInstances: activeInstances || 0,
  }
}

function generateMockData(campaigns: any[], activeInstances: number) {
  // Calculate realtime metrics
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCampaigns = campaigns.filter(c => {
    const createdAt = new Date(c.created_at)
    return createdAt >= today
  })

  const messagesToday = todayCampaigns.reduce((sum, c) => sum + c.sent_count, 0)

  const realtimeMetrics: RealtimeMetricsType = {
    active_campaigns: campaigns.filter(c => c.completed_at === null).length,
    messages_sent_today: messagesToday,
    messages_sent_this_hour: Math.floor(messagesToday / 24),
    current_delivery_rate: campaigns.length > 0
      ? (campaigns.reduce((sum, c) => sum + (c.sent_count > 0 ? ((c.sent_count - c.failed_count) / c.sent_count) * 100 : 0), 0) / campaigns.length)
      : 0,
    active_instances: activeInstances,
    avg_response_time_minutes: 15 + Math.random() * 30,
  }

  // Generate time series data (last 7 days)
  const timeSeriesData: TimeSeriesData[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))

    const dayCampaigns = campaigns.filter(c => {
      const createdAt = new Date(c.created_at)
      return createdAt.toDateString() === date.toDateString()
    })

    const sent = dayCampaigns.reduce((sum, c) => sum + c.sent_count, 0)
    const failed = dayCampaigns.reduce((sum, c) => sum + c.failed_count, 0)
    const delivered = sent - failed
    const read = Math.floor(delivered * (0.6 + Math.random() * 0.3))

    return {
      date: date.toISOString(),
      sent,
      delivered,
      read,
      failed,
    }
  })

  // Campaign comparison (last 5 campaigns)
  const campaignComparison: CampaignComparison[] = campaigns.slice(0, 5).map(c => {
    const deliveryRate = c.sent_count > 0 ? ((c.sent_count - c.failed_count) / c.sent_count) * 100 : 0
    const readRate = deliveryRate > 0 ? deliveryRate * (0.6 + Math.random() * 0.3) : 0
    const responseRate = readRate > 0 ? readRate * (0.2 + Math.random() * 0.3) : 0

    return {
      campaign_id: c.id,
      campaign_title: c.title,
      sent_count: c.sent_count,
      delivery_rate: deliveryRate,
      read_rate: readRate,
      response_rate: responseRate,
      created_at: c.created_at,
    }
  })

  // Conversion funnel
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0)
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failed_count, 0)
  const totalDelivered = totalSent - totalFailed
  const totalRead = Math.floor(totalDelivered * 0.7)
  const totalResponded = Math.floor(totalRead * 0.3)
  const totalConverted = Math.floor(totalResponded * 0.5)

  const conversionFunnel: ConversionFunnel = {
    total_sent: totalSent,
    total_delivered: totalDelivered,
    total_read: totalRead,
    total_responded: totalResponded,
    total_converted: totalConverted,
  }

  // Hourly heatmap (generate mock data)
  const hourlyHeatmap: HourlyHeatmap[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Peak hours: 9-12 and 18-21
      let baseRate = 20
      if ((hour >= 9 && hour <= 12) || (hour >= 18 && hour <= 21)) {
        baseRate = 60
      } else if ((hour >= 6 && hour <= 9) || (hour >= 12 && hour <= 18)) {
        baseRate = 40
      }

      // Weekend modifier
      if (day === 0 || day === 6) {
        baseRate *= 0.7
      }

      hourlyHeatmap.push({
        hour,
        day_of_week: day,
        message_count: Math.floor(Math.random() * 100),
        delivery_rate: baseRate + Math.random() * 20,
        read_rate: (baseRate + Math.random() * 20) * 0.8,
        response_rate: (baseRate + Math.random() * 20) * 0.3,
      })
    }
  }

  return {
    realtimeMetrics,
    timeSeriesData,
    campaignComparison,
    conversionFunnel,
    hourlyHeatmap,
  }
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'

  const { campaigns, activeInstances } = await getAnalyticsData(user.id)
  const analyticsData = generateMockData(campaigns, activeInstances)

  return <AnalyticsClient initialData={analyticsData} userName={userName} />
}
