'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CampaignComparison } from '@/types'

interface CampaignComparisonChartProps {
  data: CampaignComparison[]
  title?: string
  description?: string
}

export function CampaignComparisonChart({
  data,
  title = "Comparativo de Campanhas",
  description = "Compare o desempenho de diferentes campanhas"
}: CampaignComparisonChartProps) {
  // Prepare data for chart
  const chartData = data.map(campaign => ({
    name: campaign.campaign_title.length > 20
      ? campaign.campaign_title.substring(0, 20) + '...'
      : campaign.campaign_title,
    fullName: campaign.campaign_title,
    enviadas: campaign.sent_count,
    entrega: Number(campaign.delivery_rate.toFixed(1)),
    leitura: Number(campaign.read_rate.toFixed(1)),
    resposta: Number(campaign.response_rate.toFixed(1)),
  }))

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 pt-0">
        <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-[10px] sm:text-xs text-muted-foreground"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 10 }}
            />
            <YAxis className="text-[10px] sm:text-xs text-muted-foreground" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: any, name: string) => {
                if (name === 'enviadas') return [value, 'Enviadas']
                return [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar dataKey="entrega" fill="#10b981" name="Entrega (%)" />
            <Bar dataKey="leitura" fill="#a855f7" name="Leitura (%)" />
            <Bar dataKey="resposta" fill="#f59e0b" name="Resposta (%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
