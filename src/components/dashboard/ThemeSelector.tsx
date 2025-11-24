'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { themes, type ThemeVariant, applyTheme, getStoredTheme, getAvailableThemes, isThemeAvailable } from '@/lib/themes'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ThemeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planTier?: string
}

export function ThemeSelector({ open, onOpenChange, planTier }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeVariant>('neutral')

  useEffect(() => {
    // Load saved theme on mount
    const savedTheme = getStoredTheme()
    setSelectedTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const handleThemeChange = (variant: ThemeVariant) => {
    // Verifica se o tema está disponível para o plano do usuário
    if (!isThemeAvailable(variant, planTier)) {
      return
    }

    setSelectedTheme(variant)
    applyTheme(variant)

    // Trigger theme update event
    window.dispatchEvent(new Event('theme-change'))
  }

  const availableThemes = getAvailableThemes(planTier)
  const isPremiumUser = planTier && planTier !== 'free'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl">
              <span className="text-2xl">🎨</span>
            </div>
            Escolher Tema
          </DialogTitle>
          <DialogDescription className="text-base">
            {isPremiumUser
              ? 'Personalize a aparência do sistema com temas premium'
              : 'Faça upgrade para Bronze ou superior para desbloquear mais temas'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {Object.values(themes).map((theme) => {
            const isSelected = selectedTheme === theme.id
            const isAvailable = availableThemes.includes(theme.id)
            const isLocked = !isAvailable

            return (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                disabled={isLocked}
                className={cn(
                  'relative group p-1 rounded-2xl transition-all duration-300',
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : isAvailable ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed'
                )}
              >
                {/* Glow effect */}
                <div className={cn(
                  'absolute -inset-1 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500',
                  `bg-gradient-to-r ${theme.colors.gradient}`
                )}></div>

                {/* Card */}
                <div className={cn(
                  'relative border-2 rounded-xl p-4 transition-all duration-300',
                  isSelected
                    ? 'bg-gradient-to-br from-primary/10 to-background border-primary'
                    : 'bg-card border-border hover:border-primary/50',
                  isLocked && 'bg-muted/50'
                )}>
                  {/* Selected Badge */}
                  {isSelected && !isLocked && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className={cn(
                        'bg-gradient-to-r text-white rounded-full p-1.5 shadow-lg',
                        theme.colors.badgeGradient
                      )}>
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {/* Locked Badge */}
                  {isLocked && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full p-1.5 shadow-lg">
                        <Lock className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {/* Theme Icon */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'relative p-3 rounded-xl shadow-md',
                      `bg-gradient-to-br ${theme.colors.gradient}`
                    )}>
                      <span className="text-3xl">{theme.icon}</span>
                    </div>
                    <div className="text-left">
                      <h3 className={cn(
                        'font-bold text-lg',
                        isSelected && `bg-gradient-to-r ${theme.colors.gradient} bg-clip-text text-transparent`
                      )}>
                        {theme.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                  </div>

                  {/* Preview Gradient Bar */}
                  <div className={cn(
                    'h-2 rounded-full',
                    `bg-gradient-to-r ${theme.colors.gradient}`
                  )}></div>

                  {/* Preview Elements */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {/* Primary Badge */}
                    <div className={cn(
                      'h-6 rounded-md flex items-center justify-center text-xs font-semibold text-white shadow-sm',
                      `bg-gradient-to-r ${theme.colors.badgeGradient}`
                    )}>
                      Badge
                    </div>
                    {/* Card */}
                    <div className={cn(
                      'h-6 rounded-md border-2',
                      `bg-gradient-to-br ${theme.colors.cardGradient} border-${theme.colors.glowColor}-500/20`
                    )}></div>
                    {/* Accent */}
                    <div className={cn(
                      'h-6 rounded-md',
                      `bg-gradient-to-r ${theme.colors.hoverGradient}`
                    )}></div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Info or Upgrade Banner */}
        {!isPremiumUser ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-300 dark:border-yellow-700 p-4 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  🎨 Desbloqueie 7 Temas Premium!
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-3">
                  Faça upgrade para o plano <strong>Bronze</strong> ou superior e tenha acesso a todos os temas incríveis: Ocean Blue, Sunset Glow, Forest Green, Galaxy Purple, Aurora Borealis, Christmas Spirit e Minimal Black!
                </p>
                <Link href="/plans" onClick={() => onOpenChange(false)}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Ver Planos Premium
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">💡 Dica:</span> O tema escolhido será salvo automaticamente e aplicado em todas as páginas do sistema!
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
