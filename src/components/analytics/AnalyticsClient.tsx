'use client'

import { useState } from 'react'
import { RealtimeMetrics } from './RealtimeMetrics'
import { CampaignPerformanceChart } from './CampaignPerformanceChart'
import { CampaignComparisonChart } from './CampaignComparisonChart'
import { ConversionFunnelChart } from './ConversionFunnelChart'
import { HourlyHeatmapChart } from './HourlyHeatmapChart'
import { PeriodFilter, type PeriodPreset } from './PeriodFilter'
import { ExportButtons } from './ExportButtons'
import type {
  RealtimeMetrics as RealtimeMetricsType,
  TimeSeriesData,
  CampaignComparison,
  ConversionFunnel,
  HourlyHeatmap,
} from '@/types'

interface AnalyticsClientProps {
  initialData: {
    realtimeMetrics: RealtimeMetricsType
    timeSeriesData: TimeSeriesData[]
    campaignComparison: CampaignComparison[]
    conversionFunnel: ConversionFunnel
    hourlyHeatmap: HourlyHeatmap[]
  }
  userName: string
}

export function AnalyticsClient({ initialData, userName }: AnalyticsClientProps) {
  const [period, setPeriod] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: 'last7days' as PeriodPreset,
  })

  const [data, setData] = useState(initialData)

  const [isLoading, setIsLoading] = useState(false)

  const handlePeriodChange = async (newPeriod: { start: Date; end: Date; preset: PeriodPreset }) => {
    setPeriod(newPeriod)
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        start: newPeriod.start.toISOString(),
        end: newPeriod.end.toISOString(),
      })

      const response = await fetch(`/api/analytics/data?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const newData = await response.json()
      setData(newData)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      // Keep existing data on error
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = {
    realtimeMetrics: data.realtimeMetrics,
    timeSeriesData: data.timeSeriesData,
    campaignComparison: data.campaignComparison,
    conversionFunnel: data.conversionFunnel,
    period,
    userName,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with filters and export */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance e métricas das suas campanhas
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
          <PeriodFilter onPeriodChange={handlePeriodChange} />
          <ExportButtons data={exportData} />
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      )}

      {/* Realtime Metrics */}
      <RealtimeMetrics metrics={data.realtimeMetrics} />

      {/* Conversion Funnel */}
      <ConversionFunnelChart data={data.conversionFunnel} />

      {/* Performance Chart */}
      <CampaignPerformanceChart data={data.timeSeriesData} />

      {/* Campaign Comparison */}
      {data.campaignComparison.length > 0 && (
        <CampaignComparisonChart data={data.campaignComparison} />
      )}

      {/* Hourly Heatmap */}
      <HourlyHeatmapChart data={data.hourlyHeatmap} />
    </div>
  )
}
