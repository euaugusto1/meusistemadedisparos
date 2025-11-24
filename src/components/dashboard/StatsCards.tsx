'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Send,
  AlertTriangle,
  Wifi,
  Coins,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { formatNumber, getPlanColor } from '@/lib/utils'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats | null
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Enviado',
      value: formatNumber(stats?.total_sent || 0),
      icon: Send,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Falhas',
      value: formatNumber(stats?.total_failed || 0),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Instâncias Conectadas',
      value: stats?.connected_instances || 0,
      icon: Wifi,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Créditos Disponíveis',
      value: formatNumber(stats?.credits || 0),
      icon: Coins,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Total de Campanhas',
      value: stats?.total_campaigns || 0,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Dias Restantes',
      value: stats?.days_remaining ?? '∞',
      icon: Calendar,
      color: stats?.days_remaining && stats.days_remaining < 7 ? 'text-red-500' : 'text-primary',
      bgColor: stats?.days_remaining && stats.days_remaining < 7 ? 'bg-red-500/10' : 'bg-primary/10',
      highlight: true,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className={`transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${card.highlight ? 'border-2 border-primary shadow-md' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor} transition-all duration-300 group-hover:scale-110`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.highlight ? card.color : ''}`}>
              {card.value}
            </div>
            {card.title === 'Dias Restantes' && stats?.plan_tier && (
              <p className={`text-xs ${getPlanColor(stats.plan_tier)} text-white mt-1 capitalize font-semibold`}>
                Plano {stats.plan_tier}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
