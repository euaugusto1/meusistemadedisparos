'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { HourlyHeatmap } from '@/types'

interface HourlyHeatmapChartProps {
  data: HourlyHeatmap[]
  title?: string
  description?: string
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}h`)

export function HourlyHeatmapChart({
  data,
  title = "Mapa de Calor de Horários",
  description = "Melhor horário para envio de mensagens"
}: HourlyHeatmapChartProps) {
  // Create a matrix for the heatmap
  const heatmapData: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  // Fill the matrix with message counts (dados reais)
  data.forEach(item => {
    heatmapData[item.day_of_week][item.hour] = item.message_count
  })

  // Find max value for color scaling
  const maxValue = Math.max(...data.map(item => item.message_count), 1) // Min 1 para evitar divisão por zero

  // Check if there's any data
  const totalMessages = data.reduce((sum, item) => sum + item.message_count, 0)
  const hasData = totalMessages > 0

  // Get color based on value
  const getColor = (value: number) => {
    if (value === 0) return 'bg-muted'
    const intensity = value / maxValue
    if (intensity > 0.8) return 'bg-green-500'
    if (intensity > 0.6) return 'bg-green-400'
    if (intensity > 0.4) return 'bg-yellow-400'
    if (intensity > 0.2) return 'bg-orange-400'
    return 'bg-red-400'
  }

  // Find best time (only if there's data)
  const bestTime = hasData
    ? data.reduce((prev, current) => {
        return current.message_count > prev.message_count ? current : prev
      }, data[0])
    : null

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
        {/* Best Time Banner */}
        {bestTime ? (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100">
              Melhor horário para envio
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {DAYS[bestTime.day_of_week]} às {bestTime.hour.toString().padStart(2, '0')}:00
            </div>
            <div className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 mt-1">
              {bestTime.message_count.toLocaleString('pt-BR')} mensagens enviadas neste horário
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm font-medium text-muted-foreground">
              Sem dados suficientes
            </div>
            <div className="text-sm sm:text-base text-muted-foreground mt-1">
              Envie campanhas para visualizar os melhores horários de engajamento
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="inline-block min-w-max">
            {/* Hours header */}
            <div className="flex mb-1">
              <div className="w-8 sm:w-12"></div>
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  className={`text-[8px] sm:text-xs text-center text-muted-foreground ${
                    index % 3 === 0 ? 'w-5 sm:w-8' : 'w-0'
                  }`}
                >
                  {index % 3 === 0 ? hour : ''}
                </div>
              ))}
            </div>

            {/* Days and cells */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                <div className="w-8 sm:w-12 text-[10px] sm:text-sm font-medium flex items-center">
                  {day}
                </div>
                {HOURS.map((hour, hourIndex) => {
                  const value = heatmapData[dayIndex][hourIndex]
                  const colorClass = getColor(value)

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`h-5 w-5 sm:h-8 sm:w-8 rounded-sm sm:rounded ${colorClass} hover:ring-2 hover:ring-primary transition-all cursor-pointer group relative`}
                      title={`${day} ${hour}: ${value} mensagens`}
                    >
                      {/* Tooltip on hover - hidden on mobile */}
                      <div className="invisible group-hover:visible hidden sm:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap border">
                        {day} {hour}
                        <br />
                        {value > 0 ? `${value.toLocaleString('pt-BR')} mensagens` : 'Sem dados'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground pt-3 sm:pt-4 border-t">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span>Menos envios</span>
            <div className="flex gap-0.5 sm:gap-1">
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-muted"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-red-400"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-orange-400"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-yellow-400"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-400"></div>
              <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-500"></div>
            </div>
            <span>Mais envios</span>
          </div>
          {hasData && (
            <div className="text-muted-foreground">
              Total: {totalMessages.toLocaleString('pt-BR')} mensagens
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
