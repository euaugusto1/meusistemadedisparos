'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Sparkles, BarChart3, ArrowLeft, ArrowRight } from 'lucide-react'
import { getPlanColor } from '@/lib/utils'
import type { Profile } from '@/types'

interface AnalyticsUpgradeProps {
  profile: Profile
}

export function AnalyticsUpgrade({ profile }: AnalyticsUpgradeProps) {
  return (
    <div className="space-y-8 pb-8">
      {/* Botão Voltar */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="transition-all duration-300 hover:scale-105 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </Link>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <BarChart3 className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">
            Analytics Avançado
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Recurso exclusivo para assinantes do plano Prata ou superior
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Com o Analytics você pode:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Ver métricas em tempo real',
                'Analisar performance de campanhas',
                'Identificar melhores horários de envio',
                'Comparar resultados entre campanhas',
                'Exportar relatórios em PDF e Excel',
                'Funil de conversão detalhado',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="p-0.5 rounded-full bg-green-500/20">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Faça upgrade para desbloquear</h2>
          <p className="text-sm text-muted-foreground">
            Escolha o plano Prata ou Ouro e tenha acesso completo ao Analytics
          </p>
        </div>

        <Link href="/dashboard/plans">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 gap-2"
          >
            <Crown className="h-5 w-5" />
            Ver Planos Disponíveis
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        {/* Current Plan Info */}
        <p className="text-sm text-muted-foreground">
          Seu plano atual:{' '}
          <Badge variant="outline" className={`${getPlanColor(profile.plan_tier)} text-white border-none ml-1`}>
            {profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1)}
          </Badge>
        </p>
      </div>
    </div>
  )
}
