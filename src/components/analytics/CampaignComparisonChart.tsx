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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="name"
              className="text-xs text-muted-foreground"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis className="text-xs text-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: any, name: string) => {
                if (name === 'enviadas') return [value, 'Enviadas']
                return [`${value}%`, name.charAt(0).toUpperCase() + name.slice(1)]
              }}
            />
            <Legend />
            <Bar dataKey="entrega" fill="#10b981" name="Taxa Entrega (%)" />
            <Bar dataKey="leitura" fill="#a855f7" name="Taxa Leitura (%)" />
            <Bar dataKey="resposta" fill="#f59e0b" name="Taxa Resposta (%)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
