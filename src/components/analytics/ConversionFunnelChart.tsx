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
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
        {stages.map((stage, index) => {
          const width = stage.percentage
          const dropoff = index > 0 ? stages[index - 1].percentage - stage.percentage : 0

          return (
            <div key={stage.name} className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`${stage.color} p-1.5 sm:p-2 rounded-lg`}>
                    <stage.icon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  {dropoff > 0 && (
                    <span className="text-[10px] sm:text-xs text-red-500">
                      -{dropoff.toFixed(1)}%
                    </span>
                  )}
                  <span className={`font-bold ${stage.textColor}`}>
                    {stage.value.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground min-w-[40px] sm:min-w-[60px] text-right text-[10px] sm:text-sm">
                    {stage.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="relative h-6 sm:h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className={`h-full ${stage.color} transition-all duration-500 ease-out flex items-center justify-center`}
                  style={{ width: `${width}%` }}
                >
                  {width > 20 && (
                    <span className="text-[10px] sm:text-xs font-medium text-white">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Summary */}
        <div className="pt-3 sm:pt-4 border-t">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-sm">Taxa de Conversão</div>
              <div className="text-xl sm:text-2xl font-bold text-pink-500">
                {data.total_sent > 0
                  ? ((data.total_converted / data.total_sent) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-sm">Taxa de Engajamento</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-500">
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
