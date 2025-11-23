'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, CheckCircle, Eye, MessageCircle, Target } from 'lucide-react'
import type { ConversionFunnel } from '@/types'

interface ConversionFunnelChartProps {
  data: ConversionFunnel
  title?: string
  description?: string
}

export function ConversionFunnelChart({
  data,
  title = "Funil de Conversão",
  description = "Acompanhe a jornada das mensagens"
}: ConversionFunnelChartProps) {
  const stages = [
    {
      name: "Enviadas",
      value: data.total_sent,
      icon: Send,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      percentage: 100,
    },
    {
      name: "Entregues",
      value: data.total_delivered,
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-500",
      percentage: data.total_sent > 0 ? (data.total_delivered / data.total_sent) * 100 : 0,
    },
    {
      name: "Lidas",
      value: data.total_read,
      icon: Eye,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      percentage: data.total_sent > 0 ? (data.total_read / data.total_sent) * 100 : 0,
    },
    {
      name: "Respondidas",
      value: data.total_responded,
      icon: MessageCircle,
      color: "bg-orange-500",
      textColor: "text-orange-500",
      percentage: data.total_sent > 0 ? (data.total_responded / data.total_sent) * 100 : 0,
    },
    {
      name: "Convertidas",
      value: data.total_converted,
      icon: Target,
      color: "bg-pink-500",
      textColor: "text-pink-500",
      percentage: data.total_sent > 0 ? (data.total_converted / data.total_sent) * 100 : 0,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stages.map((stage, index) => {
          const width = stage.percentage
          const dropoff = index > 0 ? stages[index - 1].percentage - stage.percentage : 0

          return (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`${stage.color} p-2 rounded-lg`}>
                    <stage.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {dropoff > 0 && (
                    <span className="text-xs text-red-500">
                      -{dropoff.toFixed(1)}%
                    </span>
                  )}
                  <span className={`font-bold ${stage.textColor}`}>
                    {stage.value.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground min-w-[60px] text-right">
                    {stage.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className={`h-full ${stage.color} transition-all duration-500 ease-out flex items-center justify-center`}
                  style={{ width: `${width}%` }}
                >
                  {width > 15 && (
                    <span className="text-xs font-medium text-white">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Taxa de Conversão</div>
              <div className="text-2xl font-bold text-pink-500">
                {data.total_sent > 0
                  ? ((data.total_converted / data.total_sent) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Taxa de Engajamento</div>
              <div className="text-2xl font-bold text-purple-500">
                {data.total_sent > 0
                  ? ((data.total_read / data.total_sent) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
