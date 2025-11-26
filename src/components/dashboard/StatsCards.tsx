'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  AlertTriangle,
  Wifi,
  Coins,
  Calendar,
  TrendingUp,
  Crown
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
      borderColor: 'border-green-500/20',
      gradient: 'from-green-500/20 to-green-500/5',
    },
    {
      title: 'Falhas',
      value: formatNumber(stats?.total_failed || 0),
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      gradient: 'from-red-500/20 to-red-500/5',
    },
    {
      title: 'Instâncias Conectadas',
      value: stats?.connected_instances || 0,
      icon: Wifi,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      gradient: 'from-blue-500/20 to-blue-500/5',
    },
    {
      title: 'Créditos Disponíveis',
      value: formatNumber(stats?.credits || 0),
      icon: Coins,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      gradient: 'from-yellow-500/20 to-yellow-500/5',
    },
    {
      title: 'Total de Campanhas',
      value: stats?.total_campaigns || 0,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      gradient: 'from-purple-500/20 to-purple-500/5',
    },
    {
      title: 'Dias Restantes',
      value: stats?.days_remaining ?? '∞',
      icon: Calendar,
      color: stats?.days_remaining && stats.days_remaining < 7 ? 'text-red-500' : 'text-primary',
      bgColor: stats?.days_remaining && stats.days_remaining < 7 ? 'bg-red-500/10' : 'bg-primary/10',
      borderColor: stats?.days_remaining && stats.days_remaining < 7 ? 'border-red-500/20' : 'border-primary/20',
      gradient: stats?.days_remaining && stats.days_remaining < 7 ? 'from-red-500/20 to-red-500/5' : 'from-primary/20 to-primary/5',
      highlight: true,
    },
  ]

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
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`
            relative overflow-hidden transition-all duration-300
            hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]
            border ${card.borderColor}
            ${card.highlight ? 'ring-2 ring-primary/50 shadow-lg' : ''}
          `}
        >
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50`} />

          <CardContent className="relative p-3 sm:p-4">
            {/* Header com ícone */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide line-clamp-1">
                {card.title}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-lg ${card.bgColor} transition-transform duration-300 hover:scale-110`}>
                <card.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${card.color}`} />
              </div>
            </div>

            {/* Valor */}
            <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${card.highlight ? card.color : ''}`}>
              {card.value}
            </div>

            {/* Badge do Plano (apenas no card de dias restantes) */}
            {card.title === 'Dias Restantes' && stats?.plan_tier && (
              <div className="mt-2">
                <Badge className={`${getPlanBadgeStyle(stats.plan_tier)} text-[10px] sm:text-xs px-2 py-0.5`}>
                  <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Plano {stats.plan_tier.charAt(0).toUpperCase() + stats.plan_tier.slice(1)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
