'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeSeriesData } from '@/types'

interface CampaignPerformanceChartProps {
  data: TimeSeriesData[]
  title?: string
  description?: string
}

export function CampaignPerformanceChart({
  data,
  title = "Performance de Campanhas",
  description = "Taxa de entrega, leitura e resposta ao longo do tempo"
}: CampaignPerformanceChartProps) {
  // Calculate rates
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    sent: item.sent,
    delivered: item.delivered,
    read: item.read,
    failed: item.failed,
    deliveryRate: item.sent > 0 ? ((item.delivered / item.sent) * 100).toFixed(1) : 0,
    readRate: item.delivered > 0 ? ((item.read / item.delivered) * 100).toFixed(1) : 0,
  }))

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs text-muted-foreground"
            />
            <YAxis className="text-xs text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="sent"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorSent)"
              name="Enviadas"
            />
            <Area
              type="monotone"
              dataKey="delivered"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorDelivered)"
              name="Entregues"
            />
            <Area
              type="monotone"
              dataKey="read"
              stroke="#a855f7"
              fillOpacity={1}
              fill="url(#colorRead)"
              name="Lidas"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              fillOpacity={1}
              fill="url(#colorFailed)"
              name="Falhas"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
