'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Send, TrendingUp, Clock, Smartphone, Zap } from 'lucide-react'
import type { RealtimeMetrics as RealtimeMetricsType } from '@/types'

interface RealtimeMetricsProps {
  metrics: RealtimeMetricsType
}

export function RealtimeMetrics({ metrics }: RealtimeMetricsProps) {
  const metricsData = [
    {
      title: "Campanhas Ativas",
      value: metrics.active_campaigns,
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Mensagens Hoje",
      value: metrics.messages_sent_today.toLocaleString('pt-BR'),
      icon: Send,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Mensagens/Hora",
      value: metrics.messages_sent_this_hour.toLocaleString('pt-BR'),
      icon: Zap,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Taxa de Entrega",
      value: `${metrics.current_delivery_rate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Instâncias Ativas",
      value: metrics.active_instances,
      icon: Smartphone,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Tempo Médio Resposta",
      value: `${metrics.avg_response_time_minutes.toFixed(0)} min`,
      icon: Clock,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Métricas em Tempo Real</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Acompanhe o desempenho ao vivo</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="hidden sm:inline">Atualizado agora</span>
          <span className="sm:hidden">Ao vivo</span>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {metricsData.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`${metric.bg} p-1.5 sm:p-2 rounded-lg`}>
                <metric.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className={`text-xl sm:text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${metric.bg}`} />
          </Card>
        ))}
      </div>
    </div>
  )
}
