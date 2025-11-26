import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsClient } from '@/components/analytics/AnalyticsClient'
import { AnalyticsUpgrade } from '@/components/analytics/AnalyticsUpgrade'
import type {
  RealtimeMetrics as RealtimeMetricsType,
  TimeSeriesData,
  CampaignComparison,
  ConversionFunnel,
  HourlyHeatmap,
  Profile,
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

function generateAnalyticsData(campaigns: any[], activeInstances: number) {
  // Calculate realtime metrics
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const now = new Date()

  const todayCampaigns = campaigns.filter(c => {
    const createdAt = new Date(c.created_at)
    return createdAt >= today
  })

  const messagesToday = todayCampaigns.reduce((sum, c) => sum + c.sent_count, 0)

  // Calcular mensagens enviadas na última hora baseado em campaign_items reais
  let messagesThisHour = 0
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  campaigns.forEach(campaign => {
    if (campaign.campaign_items && Array.isArray(campaign.campaign_items)) {
      campaign.campaign_items.forEach((item: { sent_at: string | null }) => {
        if (item.sent_at) {
          const sentDate = new Date(item.sent_at)
          if (sentDate >= oneHourAgo && sentDate <= now) {
            messagesThisHour++
          }
        }
      })
    }
  })

  // Calcular tempo médio de resposta real (baseado nos dados disponíveis)
  // Por enquanto, calcular baseado na taxa de entrega - quanto maior a taxa, menor o tempo
  const avgDeliveryRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.sent_count > 0 ? ((c.sent_count - c.failed_count) / c.sent_count) * 100 : 0), 0) / campaigns.length
    : 0
  const avgResponseTime = avgDeliveryRate > 80 ? 10 : avgDeliveryRate > 60 ? 20 : avgDeliveryRate > 40 ? 30 : 45

  const realtimeMetrics: RealtimeMetricsType = {
    active_campaigns: campaigns.filter(c => c.completed_at === null).length,
    messages_sent_today: messagesToday,
    messages_sent_this_hour: messagesThisHour,
    current_delivery_rate: avgDeliveryRate,
    active_instances: activeInstances,
    avg_response_time_minutes: avgResponseTime,
  }

  // Generate time series data (last 7 days) - dados reais baseados em campaign_items
  const timeSeriesData: TimeSeriesData[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    let sent = 0
    let delivered = 0
    let read = 0
    let failed = 0

    // Contar mensagens reais por dia baseado em sent_at
    campaigns.forEach(campaign => {
      if (campaign.campaign_items && Array.isArray(campaign.campaign_items)) {
        campaign.campaign_items.forEach((item: { status: string; sent_at: string | null }) => {
          if (item.sent_at) {
            const sentDate = new Date(item.sent_at)
            if (sentDate >= date && sentDate < nextDate) {
              sent++
              if (item.status === 'sent' || item.status === 'delivered' || item.status === 'read') {
                delivered++
              }
              if (item.status === 'read') {
                read++
              }
              if (item.status === 'failed') {
                failed++
              }
            }
          }
        })
      }
    })

    return {
      date: date.toISOString(),
      sent,
      delivered,
      read,
      failed,
    }
  })

  // Campaign comparison (last 5 campaigns) - dados reais baseados em campaign_items
  const campaignComparison: CampaignComparison[] = campaigns.slice(0, 5).map(c => {
    let totalItems = 0
    let deliveredItems = 0
    let readItems = 0

    if (c.campaign_items && Array.isArray(c.campaign_items)) {
      c.campaign_items.forEach((item: { status: string }) => {
        totalItems++
        if (item.status === 'sent' || item.status === 'delivered' || item.status === 'read') {
          deliveredItems++
        }
        if (item.status === 'read') {
          readItems++
        }
      })
    }

    const deliveryRate = totalItems > 0 ? (deliveredItems / totalItems) * 100 : 0
    const readRate = deliveredItems > 0 ? (readItems / deliveredItems) * 100 : 0
    // Taxa de resposta: por enquanto não temos esse dado, então deixamos como 0
    const responseRate = 0

    return {
      campaign_id: c.id,
      campaign_title: c.title,
      sent_count: c.sent_count || totalItems,
      delivery_rate: deliveryRate,
      read_rate: readRate,
      response_rate: responseRate,
      created_at: c.created_at,
    }
  })

  // Conversion funnel - dados reais baseados em campaign_items
  let totalSent = 0
  let totalDelivered = 0
  let totalRead = 0

  campaigns.forEach(campaign => {
    if (campaign.campaign_items && Array.isArray(campaign.campaign_items)) {
      campaign.campaign_items.forEach((item: { status: string }) => {
        totalSent++
        if (item.status === 'sent' || item.status === 'delivered' || item.status === 'read') {
          totalDelivered++
        }
        if (item.status === 'read') {
          totalRead++
        }
      })
    }
  })

  // Respondidas e convertidas: por enquanto não temos esses dados no sistema
  const totalResponded = 0
  const totalConverted = 0

  const conversionFunnel: ConversionFunnel = {
    total_sent: totalSent,
    total_delivered: totalDelivered,
    total_read: totalRead,
    total_responded: totalResponded,
    total_converted: totalConverted,
  }

  // Hourly heatmap (dados reais baseados em sent_at dos campaign_items)
  const hourlyHeatmap: HourlyHeatmap[] = []

  // Criar matriz para acumular dados por dia/hora
  const heatmapMatrix: {
    [key: string]: {
      total: number
      delivered: number
      read: number
      responded: number
    }
  } = {}

  // Inicializar matriz com zeros
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmapMatrix[`${day}-${hour}`] = {
        total: 0,
        delivered: 0,
        read: 0,
        responded: 0,
      }
    }
  }

  // Processar todos os campaign_items para extrair dados reais
  campaigns.forEach(campaign => {
    if (campaign.campaign_items && Array.isArray(campaign.campaign_items)) {
      campaign.campaign_items.forEach((item: { id: string; status: string; sent_at: string | null }) => {
        if (item.sent_at) {
          const sentDate = new Date(item.sent_at)
          const dayOfWeek = sentDate.getDay() // 0 = Domingo, 6 = Sábado
          const hour = sentDate.getHours()
          const key = `${dayOfWeek}-${hour}`

          if (heatmapMatrix[key]) {
            heatmapMatrix[key].total++

            // Considerar status para calcular taxas
            if (item.status === 'sent' || item.status === 'delivered' || item.status === 'read') {
              heatmapMatrix[key].delivered++
            }
            if (item.status === 'read') {
              heatmapMatrix[key].read++
            }
            // Considerar respostas (se houver campo no futuro)
            if (item.status === 'responded') {
              heatmapMatrix[key].responded++
            }
          }
        }
      })
    }
  })

  // Converter matriz em array de HourlyHeatmap
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`
      const data = heatmapMatrix[key]

      const deliveryRate = data.total > 0 ? (data.delivered / data.total) * 100 : 0
      const readRate = data.delivered > 0 ? (data.read / data.delivered) * 100 : 0
      const responseRate = data.read > 0 ? (data.responded / data.read) * 100 : 0

      hourlyHeatmap.push({
        hour,
        day_of_week: day,
        message_count: data.total,
        delivery_rate: deliveryRate,
        read_rate: readRate,
        response_rate: responseRate,
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

// Planos que têm acesso ao Analytics
const ALLOWED_PLANS = ['silver', 'gold']

export default async function AnalyticsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user profile for name and plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'

  // Verificar se o usuário tem acesso (admin ou plano silver/gold)
  const hasAccess = profile?.role === 'admin' || ALLOWED_PLANS.includes(profile?.plan_tier || '')

  if (!hasAccess) {
    return <AnalyticsUpgrade profile={profile as Profile} />
  }

  const { campaigns, activeInstances } = await getAnalyticsData(user.id)
  const analyticsData = generateAnalyticsData(campaigns, activeInstances)

  return <AnalyticsClient initialData={analyticsData} userName={userName} />
}
