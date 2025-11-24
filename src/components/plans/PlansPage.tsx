'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Sparkles, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getPlanColor } from '@/lib/utils'
import type { Plan, Profile } from '@/types'

interface PlansPageProps {
  profile: Profile
  plans: Plan[]
}

export function PlansPage({ profile, plans }: PlansPageProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setShowPaymentDialog(true)
    setError(null)
  }

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return

    console.log('[FRONTEND] Starting payment process for plan:', selectedPlan)
    setProcessing(true)
    setError(null)

    try {
      console.log('[FRONTEND] Sending request to /api/payments/create-preference')

      // Create payment preference
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
        }),
      })

      console.log('[FRONTEND] Response status:', response.status)
      console.log('[FRONTEND] Response OK:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[FRONTEND] Error from API:', errorData)
        throw new Error(errorData.error || 'Failed to create payment')
      }

      const responseData = await response.json()
      console.log('[FRONTEND] Success response:', responseData)

      const { checkoutUrl } = responseData

      console.log('[FRONTEND] Redirecting to:', checkoutUrl)
      // Redirect to Mercado Pago checkout
      window.location.href = checkoutUrl
    } catch (error) {
      console.error('[FRONTEND] Payment error:', error)
      setError(error instanceof Error ? error.message : 'Erro ao processar pagamento')
      setProcessing(false)
    }
  }

  const isCurrentPlan = (tier: string) => tier === profile.plan_tier

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <div className="inline-block">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Planos e Preços
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Escolha o melhor plano para suas necessidades e potencialize suas campanhas de WhatsApp
        </p>
      </div>

      {/* Current Plan Info - Premium Style */}
      <div className="relative group max-w-3xl mx-auto">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-blue-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
        <Card className="relative border-2 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary to-blue-600 p-2.5 rounded-xl shadow-md">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Seu Plano Atual</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-3">
                <Badge variant="outline" className={`${getPlanColor(profile.plan_tier)} text-white border-none shadow-md text-base px-4 py-1.5`}>
                  {profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1)}
                </Badge>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="text-2xl font-bold text-primary">{profile.credits.toLocaleString('pt-BR')}</span> créditos disponíveis
                  </p>
                  {profile.plan_expires_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                      Expira em: {new Date(profile.plan_expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
          <CardContent className="py-16 text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary/10 to-blue-600/10 p-6 rounded-full">
                <Crown className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Nenhum plano disponível</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Entre em contato com o suporte para obter mais informações sobre nossos planos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.tier)
            const isUpgrade = !isCurrent && plan.sort_order > (plans.find(p => p.tier === profile.plan_tier)?.sort_order || 0)

            return (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                isCurrent ? 'border-2 border-primary shadow-xl bg-gradient-to-br from-primary/5 to-background' : ''
              } ${isUpgrade ? 'border-2 border-primary/50 hover:border-primary' : 'hover:border-primary/30'}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-blue-600 shadow-lg px-4 py-1.5 text-sm">
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Plano Atual
                  </Badge>
                </div>
              )}
              {isUpgrade && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg px-4 py-1.5 text-sm animate-pulse">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Recomendado
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2.5 text-xl">
                    <div className={`p-2 rounded-lg ${getPlanColor(plan.tier)} bg-opacity-10`}>
                      <Crown className={`h-5 w-5 ${getPlanColor(plan.tier).replace('bg-', 'text-')}`} />
                    </div>
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl"></div>
                  <div className="relative bg-background p-4 rounded-xl border-2 border-primary/20">
                    <div className="flex items-baseline gap-1 justify-center">
                      <span className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        R$ {plan.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-1">
                      por mês
                    </p>
                    <div className="mt-3 pt-3 border-t border-primary/20">
                      <p className="text-center font-semibold text-primary">
                        {plan.credits.toLocaleString('pt-BR')} créditos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold text-foreground">Recursos inclusos:</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-sm">
                        <div className="mt-0.5 p-0.5 rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        </div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                {isCurrent ? (
                  <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20" disabled>
                    <Crown className="mr-2 h-4 w-4" />
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    className={`w-full transition-all duration-300 hover:scale-105 ${
                      isUpgrade
                        ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg hover:shadow-xl'
                        : ''
                    }`}
                    variant={isUpgrade ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isUpgrade && <Sparkles className="mr-2 h-4 w-4" />}
                    {isUpgrade ? 'Fazer Upgrade' : 'Selecionar Plano'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
        </div>
      )}

      {/* Payment Confirmation Dialog - Premium Style */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl">
                <Crown className="h-6 w-6 text-white" />
              </div>
              Confirmar Assinatura
            </DialogTitle>
            <DialogDescription className="text-base">
              Você está prestes a assinar o plano <span className="font-semibold text-foreground">{selectedPlan?.name}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-5 py-4">
              {/* Plan Details Card */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-xl"></div>
                <div className="relative bg-background border-2 border-primary/20 p-5 rounded-xl space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-primary/10">
                    <span className="text-sm font-medium text-muted-foreground">Plano:</span>
                    <span className="font-bold text-lg">{selectedPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-primary/10">
                    <span className="text-sm font-medium text-muted-foreground">Créditos:</span>
                    <span className="font-semibold text-primary">{selectedPlan.credits.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-primary/10">
                    <span className="text-sm font-medium text-muted-foreground">Duração:</span>
                    <span className="font-semibold">{selectedPlan.duration_days} dias</span>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      R$ {selectedPlan.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="bg-green-500 p-1.5 rounded-lg mt-0.5">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                      Pagamento Seguro
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      O pagamento será processado de forma segura. Após a confirmação,
                      seus créditos serão adicionados automaticamente e seu plano será ativado.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {error && (
              <div className="w-full mb-2 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg flex items-center gap-2">
                <span className="font-semibold">Erro:</span>
                <span>{error}</span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processing}
              className="flex-1 transition-all duration-300 hover:scale-105"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPlan}
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
