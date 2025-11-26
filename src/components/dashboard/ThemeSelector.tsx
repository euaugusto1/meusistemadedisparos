'use client'

import { useState, useEffect } from 'react'
import { Check, Crown, Lock, X } from 'lucide-react'
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
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-background/95 border-2 shadow-2xl p-4 sm:p-6">
        {/* Botão fechar para mobile */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 p-2 rounded-full bg-muted/80 hover:bg-muted transition-colors z-50 md:hidden"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <DialogHeader className="pr-10 sm:pr-0">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
              <span className="text-xl sm:text-2xl">🎨</span>
            </div>
            Escolher Tema
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {isPremiumUser
              ? 'Personalize a aparência do sistema com temas premium'
              : 'Faça upgrade para Bronze ou superior para desbloquear mais temas'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4 py-2 sm:py-4">
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
                  'relative group p-0.5 sm:p-1 rounded-xl sm:rounded-2xl transition-all duration-300',
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background'
                    : isAvailable ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed'
                )}
              >
                {/* Glow effect - hidden on mobile */}
                <div className={cn(
                  'absolute -inset-1 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500 hidden sm:block',
                  `bg-gradient-to-r ${theme.colors.gradient}`
                )}></div>

                {/* Card */}
                <div className={cn(
                  'relative border-2 rounded-lg sm:rounded-xl p-2 sm:p-4 transition-all duration-300',
                  isSelected
                    ? 'bg-gradient-to-br from-primary/10 to-background border-primary'
                    : 'bg-card border-border hover:border-primary/50',
                  isLocked && 'bg-muted/50'
                )}>
                  {/* Selected Badge */}
                  {isSelected && !isLocked && (
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                      <div className={cn(
                        'bg-gradient-to-r text-white rounded-full p-1 sm:p-1.5 shadow-lg',
                        theme.colors.badgeGradient
                      )}>
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                  )}

                  {/* Locked Badge */}
                  {isLocked && (
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 z-10">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full p-1 sm:p-1.5 shadow-lg">
                        <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                  )}

                  {/* Theme Icon */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className={cn(
                      'relative p-1.5 sm:p-3 rounded-lg sm:rounded-xl shadow-md flex-shrink-0',
                      `bg-gradient-to-br ${theme.colors.gradient}`
                    )}>
                      <span className="text-lg sm:text-3xl">{theme.icon}</span>
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className={cn(
                        'font-bold text-xs sm:text-lg truncate',
                        isSelected && `bg-gradient-to-r ${theme.colors.gradient} bg-clip-text text-transparent`
                      )}>
                        {theme.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                        {theme.description}
                      </p>
                    </div>
                  </div>

                  {/* Preview Gradient Bar */}
                  <div className={cn(
                    'h-1.5 sm:h-2 rounded-full',
                    `bg-gradient-to-r ${theme.colors.gradient}`
                  )}></div>

                  {/* Preview Elements - hidden on mobile */}
                  <div className="mt-2 sm:mt-3 grid-cols-3 gap-2 hidden sm:grid">
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
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-300 dark:border-yellow-700 p-3 sm:p-4 rounded-lg sm:rounded-xl">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1 sm:mb-2">
                  🎨 Desbloqueie 7 Temas Premium!
                </p>
                <p className="text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-200 mb-2 sm:mb-3 hidden sm:block">
                  Faça upgrade para o plano <strong>Bronze</strong> ou superior e tenha acesso a todos os temas incríveis: Ocean Blue, Sunset Glow, Forest Green, Galaxy Purple, Aurora Borealis, Christmas Spirit e Minimal Black!
                </p>
                <p className="text-[10px] text-yellow-800 dark:text-yellow-200 mb-2 sm:hidden">
                  Faça upgrade para o plano <strong>Bronze</strong> e desbloqueie todos os temas!
                </p>
                <Link href="/plans" onClick={() => onOpenChange(false)}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <Crown className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Ver Planos
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800 p-3 sm:p-4 rounded-lg sm:rounded-xl">
            <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">💡 Dica:</span> O tema escolhido será salvo automaticamente!
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
