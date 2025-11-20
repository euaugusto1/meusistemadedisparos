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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planos e Preços</h1>
          <p className="text-muted-foreground mt-1">
            Escolha o melhor plano para suas necessidades
          </p>
        </div>
      </div>

      {/* Current Plan Info */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>Seu Plano Atual</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="outline" className={getPlanColor(profile.plan_tier)}>
                {profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {profile.credits} créditos disponíveis
              </p>
              {profile.plan_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expira em: {new Date(profile.plan_expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum plano disponível no momento. Entre em contato com o suporte.
            </p>
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
              className={`relative flex flex-col ${
                isCurrent ? 'border-primary shadow-lg' : ''
              } ${isUpgrade ? 'border-primary/50' : ''}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Plano Atual</Badge>
                </div>
              )}
              {isUpgrade && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Recomendado
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className={`h-5 w-5 ${getPlanColor(plan.tier)}`} />
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.credits.toLocaleString('pt-BR')} créditos
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Recursos inclusos:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isUpgrade ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isUpgrade ? 'Fazer Upgrade' : 'Selecionar Plano'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
        </div>
      )}

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Assinatura</DialogTitle>
            <DialogDescription>
              Você está prestes a assinar o plano {selectedPlan?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Plano:</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Créditos:</span>
                <span>{selectedPlan.credits.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Duração:</span>
                <span>{selectedPlan.duration_days} dias</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span>R$ {selectedPlan.price.toFixed(2)}</span>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  O pagamento será processado de forma segura. Após a confirmação,
                  seus créditos serão adicionados automaticamente e seu plano será ativado.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {error && (
              <div className="w-full mb-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmPlan} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
