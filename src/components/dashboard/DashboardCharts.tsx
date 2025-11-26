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
import { Badge } from '@/components/ui/badge'
import { Send, PieChart as PieChartIcon, BarChart3, Gauge, CalendarDays, Crown } from 'lucide-react'
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

  // Calcular taxa de sucesso
  const successRate = useMemo(() => {
    const total = (stats?.total_sent || 0) + (stats?.total_failed || 0)
    if (total === 0) return 0
    return Math.round(((stats?.total_sent || 0) / total) * 100)
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
  // Consumo = total enviado / (total enviado + créditos restantes) * 100
  // Isso mostra quanto do "pool total" já foi consumido
  const quotaData = useMemo(() => {
    const creditsRemaining = stats?.credits || 0
    const totalSent = stats?.total_sent || 0

    // Total de créditos que o usuário teve = créditos restantes + créditos usados (enviados)
    const totalCreditsEver = creditsRemaining + totalSent

    // Porcentagem consumida do total
    const percentage = totalCreditsEver > 0 ? Math.round((totalSent / totalCreditsEver) * 100) : 0

    return [
      {
        name: 'Consumo',
        value: percentage,
        fill: percentage > 80 ? COLORS.danger : percentage > 50 ? COLORS.warning : COLORS.primary,
        creditsRemaining,
        totalSent,
        totalCreditsEver,
      },
    ]
  }, [stats])

  // Determinar cor do badge do plano
  const getPlanBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0'
      case 'silver':
        return 'bg-gradient-to-r from-slate-400 to-slate-500 text-white border-0'
      case 'bronze':
        return 'bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Gráfico de Área - Timeline de Envios (Full Width) */}
      <Card className="transition-all duration-300 hover:shadow-xl border-blue-500/20">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary to-blue-600 p-2 sm:p-2.5 rounded-xl shadow-lg">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Timeline de Envios</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Histórico de mensagens nos últimos 7 dias
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Enviados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Falhas</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <div className="h-[200px] sm:h-[280px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="date"
                  className="text-[10px] sm:text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-[10px] sm:text-xs"
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSent)"
                  name="Enviados"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  name="Falhas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Grid de gráficos menores */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gráfico de Rosca - Sucesso vs Falha */}
        <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-green-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-1.5 sm:p-2 rounded-lg">
                <PieChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Taxa de Sucesso</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  Enviados vs Falhas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[160px] sm:h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
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
                </PieChart>
              </ResponsiveContainer>
              {/* Porcentagem central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-500">{successRate}%</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">sucesso</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Envios por Dia da Semana */}
        <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-purple-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-1.5 sm:p-2 rounded-lg">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Envios por Dia</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  Distribuição semanal
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[160px] sm:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis
                    dataKey="day"
                    className="text-[9px] sm:text-[10px]"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-[9px] sm:text-[10px]"
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
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
        <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-orange-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-1.5 sm:p-2 rounded-lg">
                <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Consumo da Cota</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  {quotaData[0].totalSent?.toLocaleString('pt-BR')} de {quotaData[0].totalCreditsEver?.toLocaleString('pt-BR')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 pt-0">
            <div className="h-[160px] sm:h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  barSize={12}
                  data={quotaData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background={{ fill: 'hsl(var(--muted))' }}
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              {/* Porcentagem central */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-2xl sm:text-3xl font-bold ${
                    quotaData[0].value > 80 ? 'text-red-500' :
                    quotaData[0].value > 50 ? 'text-yellow-500' :
                    'text-primary'
                  }`}>
                    {quotaData[0].value}%
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">consumido</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Validade do Plano */}
        <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-600/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary to-blue-600 p-1.5 sm:p-2 rounded-lg">
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">Validade do Plano</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  Sua assinatura
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[160px] sm:h-[180px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent ${
                  stats?.days_remaining && stats.days_remaining < 7 ? 'from-red-500 to-red-600' : ''
                }`}>
                  {stats?.days_remaining ?? '∞'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stats?.days_remaining !== null ? 'dias restantes' : 'Sem expiração'}
                </div>
                {stats?.plan_tier && (
                  <Badge className={`${getPlanBadgeStyle(stats.plan_tier)} text-xs px-3 py-1`}>
                    <Crown className="h-3 w-3 mr-1" />
                    Plano {stats.plan_tier.charAt(0).toUpperCase() + stats.plan_tier.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
