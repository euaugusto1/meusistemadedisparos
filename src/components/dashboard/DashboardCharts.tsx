'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'
import type { Campaign, DashboardStats } from '@/types'

interface DashboardChartsProps {
  campaigns: Campaign[]
  stats: DashboardStats | null
}

const COLORS = {
  primary: '#f97316',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',
  muted: '#6b7280',
}

export function DashboardCharts({ campaigns, stats }: DashboardChartsProps) {
  // Dados para gráfico de área (timeline de envios)
  const timelineData = useMemo(() => {
    const grouped: Record<string, { date: string; sent: number; failed: number }> = {}

    campaigns.forEach(campaign => {
      const date = new Date(campaign.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })

      if (!grouped[date]) {
        grouped[date] = { date, sent: 0, failed: 0 }
      }

      grouped[date].sent += campaign.sent_count
      grouped[date].failed += campaign.failed_count
    })

    return Object.values(grouped).slice(-7).reverse()
  }, [campaigns])

  // Dados para gráfico de rosca (sucesso vs falha)
  const pieData = useMemo(() => {
    const totalSent = stats?.total_sent || 0
    const totalFailed = stats?.total_failed || 0

    if (totalSent === 0 && totalFailed === 0) {
      return [{ name: 'Sem dados', value: 1, color: COLORS.muted }]
    }

    return [
      { name: 'Enviados', value: totalSent, color: COLORS.success },
      { name: 'Falhas', value: totalFailed, color: COLORS.danger },
    ]
  }, [stats])

  // Dados para gráfico de barras (envios por dia da semana)
  const weekdayData = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const grouped: Record<number, number> = {}

    campaigns.forEach(campaign => {
      const dayOfWeek = new Date(campaign.created_at).getDay()
      grouped[dayOfWeek] = (grouped[dayOfWeek] || 0) + campaign.sent_count
    })

    return days.map((day, index) => ({
      day,
      envios: grouped[index] || 0,
    }))
  }, [campaigns])

  // Dados para gráfico radial (consumo da cota)
  const quotaData = useMemo(() => {
    const credits = stats?.credits || 0
    const used = stats?.total_sent || 0
    const total = credits + used
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0

    return [
      {
        name: 'Consumo',
        value: percentage,
        fill: percentage > 80 ? COLORS.danger : percentage > 50 ? COLORS.warning : COLORS.primary,
      },
    ]
  }, [stats])

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Gráfico de Área - Timeline de Envios */}
      <Card className="col-span-2 transition-all duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-lg">
              <Send className="h-5 w-5 text-white" />
            </div>
            Timeline de Envios
          </CardTitle>
          <CardDescription>
            Histórico de mensagens enviadas nos últimos 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke={COLORS.success}
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Enviados"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke={COLORS.danger}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  name="Falhas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Rosca - Sucesso vs Falha */}
      <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <CardTitle>Taxa de Sucesso</CardTitle>
          <CardDescription>
            Proporção entre mensagens enviadas e falhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Envios por Dia da Semana */}
      <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <CardTitle>Envios por Dia</CardTitle>
          <CardDescription>
            Distribuição de envios por dia da semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="envios"
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                  name="Envios"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Radial - Consumo da Cota */}
      <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <CardTitle>Consumo da Cota</CardTitle>
          <CardDescription>
            Porcentagem de créditos utilizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                barSize={10}
                data={quotaData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-2xl font-bold"
                >
                  {quotaData[0].value}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Radial - Dias Restantes */}
      <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader>
          <CardTitle>Validade do Plano</CardTitle>
          <CardDescription>
            Dias restantes da sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                {stats?.days_remaining ?? '∞'}
              </div>
              <div className="text-muted-foreground mt-2">
                {stats?.days_remaining !== null ? 'dias restantes' : 'Sem expiração'}
              </div>
              <div className="mt-4 text-sm">
                Plano: <span className="font-semibold capitalize bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{stats?.plan_tier || 'free'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
