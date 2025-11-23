'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crown, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push('/plans')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Recurso Exclusivo do Plano Gold
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Os Agentes IA com integração n8n são exclusivos para assinantes do plano Gold
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Agentes IA Ilimitados</p>
                <p className="text-sm text-muted-foreground">
                  Crie e gerencie workflows de IA com n8n
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Automações Inteligentes</p>
                <p className="text-sm text-muted-foreground">
                  Integre LangChain, OpenAI e outros modelos de IA
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Suporte 24/7</p>
                <p className="text-sm text-muted-foreground">
                  Suporte dedicado e gerente de conta
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Créditos Personalizados</p>
                <p className="text-sm text-muted-foreground">
                  Volume de mensagens sob medida para seu negócio
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4 space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white h-11 font-semibold"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Fazer Upgrade para Gold
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              className="w-full"
            >
              Talvez mais tarde
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            O plano Gold é personalizado. Entre em contato para uma proposta sob medida.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
