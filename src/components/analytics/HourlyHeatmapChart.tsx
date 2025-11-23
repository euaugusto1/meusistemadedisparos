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

  // Fill the matrix with engagement rates
  data.forEach(item => {
    const engagementRate = (item.read_rate + item.response_rate) / 2
    heatmapData[item.day_of_week][item.hour] = engagementRate
  })

  // Find max value for color scaling
  const maxValue = Math.max(...data.map(item => (item.read_rate + item.response_rate) / 2))

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

  // Find best time
  const bestTime = data.reduce((prev, current) => {
    const prevRate = (prev.read_rate + prev.response_rate) / 2
    const currentRate = (current.read_rate + current.response_rate) / 2
    return currentRate > prevRate ? current : prev
  }, data[0])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best Time Banner */}
        {bestTime && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-sm font-medium text-green-900 dark:text-green-100">
              Melhor horário para envio
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {DAYS[bestTime.day_of_week]} às {bestTime.hour.toString().padStart(2, '0')}:00
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              Taxa de engajamento: {((bestTime.read_rate + bestTime.response_rate) / 2).toFixed(1)}%
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hours header */}
            <div className="flex mb-1">
              <div className="w-12"></div>
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  className={`text-xs text-center text-muted-foreground ${
                    index % 2 === 0 ? 'w-8' : 'w-0'
                  }`}
                >
                  {index % 2 === 0 ? hour : ''}
                </div>
              ))}
            </div>

            {/* Days and cells */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex gap-1 mb-1">
                <div className="w-12 text-sm font-medium flex items-center">
                  {day}
                </div>
                {HOURS.map((hour, hourIndex) => {
                  const value = heatmapData[dayIndex][hourIndex]
                  const colorClass = getColor(value)

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`h-8 w-8 rounded ${colorClass} hover:ring-2 hover:ring-primary transition-all cursor-pointer group relative`}
                      title={`${day} ${hour}: ${value.toFixed(1)}%`}
                    >
                      {/* Tooltip on hover */}
                      <div className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap border">
                        {day} {hour}
                        <br />
                        {value > 0 ? `${value.toFixed(1)}% engajamento` : 'Sem dados'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4 border-t">
          <span>Baixo</span>
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded bg-red-400"></div>
            <div className="h-4 w-4 rounded bg-orange-400"></div>
            <div className="h-4 w-4 rounded bg-yellow-400"></div>
            <div className="h-4 w-4 rounded bg-green-400"></div>
            <div className="h-4 w-4 rounded bg-green-500"></div>
          </div>
          <span>Alto</span>
        </div>
      </CardContent>
    </Card>
  )
}
