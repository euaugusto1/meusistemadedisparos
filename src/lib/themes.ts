// Sistema de Temas Premium
export type ThemeVariant = 'ocean' | 'sunset' | 'forest' | 'galaxy' | 'aurora' | 'christmas' | 'neutral' | 'minimal'

export interface Theme {
  id: ThemeVariant
  name: string
  description: string
  icon: string
  colors: {
    primary: string
    secondary: string
    accent: string
    gradient: string
    cardGradient: string
    hoverGradient: string
    badgeGradient: string
    glowColor: string
  }
  cssVars: Record<string, string>
}

export const themes: Record<ThemeVariant, Theme> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Profissional e confiável',
    icon: '🌊',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0284c7',
      accent: '#06b6d4',
      gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
      cardGradient: 'from-cyan-500/5 via-blue-600/5 to-indigo-600/5',
      hoverGradient: 'from-cyan-500 to-blue-600',
      badgeGradient: 'from-cyan-500 to-blue-600',
      glowColor: 'cyan',
    },
    cssVars: {
      '--theme-primary': '14 165 233', // sky-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '6 182 212', // cyan-500
      '--theme-gradient-via': '37 99 235', // blue-600
      '--theme-gradient-to': '79 70 229', // indigo-600
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Vibrante e energético',
    icon: '🌅',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fb923c',
      gradient: 'from-orange-500 via-red-500 to-pink-600',
      cardGradient: 'from-orange-500/5 via-red-500/5 to-pink-600/5',
      hoverGradient: 'from-orange-500 to-red-600',
      badgeGradient: 'from-orange-500 to-pink-600',
      glowColor: 'orange',
    },
    cssVars: {
      '--theme-primary': '249 115 22', // orange-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '249 115 22', // orange-500
      '--theme-gradient-via': '239 68 68', // red-500
      '--theme-gradient-to': '219 39 119', // pink-600
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural e relaxante',
    icon: '🌲',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      gradient: 'from-emerald-500 via-green-600 to-teal-600',
      cardGradient: 'from-emerald-500/5 via-green-600/5 to-teal-600/5',
      hoverGradient: 'from-emerald-500 to-green-600',
      badgeGradient: 'from-emerald-500 to-teal-600',
      glowColor: 'emerald',
    },
    cssVars: {
      '--theme-primary': '16 185 129', // emerald-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '16 185 129', // emerald-500
      '--theme-gradient-via': '22 163 74', // green-600
      '--theme-gradient-to': '13 148 136', // teal-600
    },
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy Purple',
    description: 'Místico e inovador',
    icon: '🌌',
    colors: {
      primary: '#a855f7',
      secondary: '#9333ea',
      accent: '#c084fc',
      gradient: 'from-purple-500 via-violet-600 to-fuchsia-600',
      cardGradient: 'from-purple-500/5 via-violet-600/5 to-fuchsia-600/5',
      hoverGradient: 'from-purple-500 to-violet-600',
      badgeGradient: 'from-purple-500 to-fuchsia-600',
      glowColor: 'purple',
    },
    cssVars: {
      '--theme-primary': '168 85 247', // purple-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '168 85 247', // purple-500
      '--theme-gradient-via': '124 58 237', // violet-600
      '--theme-gradient-to': '192 38 211', // fuchsia-600
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora Borealis',
    description: 'Mágico e inspirador',
    icon: '✨',
    colors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#22d3ee',
      gradient: 'from-cyan-400 via-blue-500 to-purple-600',
      cardGradient: 'from-cyan-400/5 via-blue-500/5 to-purple-600/5',
      hoverGradient: 'from-cyan-400 to-purple-600',
      badgeGradient: 'from-cyan-400 via-blue-500 to-purple-600',
      glowColor: 'cyan',
    },
    cssVars: {
      '--theme-primary': '6 182 212', // cyan-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '34 211 238', // cyan-400
      '--theme-gradient-via': '59 130 246', // blue-500
      '--theme-gradient-to': '147 51 234', // purple-600
    },
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas Spirit',
    description: 'Festivo e caloroso',
    icon: '🎄',
    colors: {
      primary: '#dc2626',
      secondary: '#16a34a',
      accent: '#fbbf24',
      gradient: 'from-red-600 via-green-600 to-red-600',
      cardGradient: 'from-red-600/5 via-green-600/5 to-red-600/5',
      hoverGradient: 'from-red-600 to-green-600',
      badgeGradient: 'from-red-600 via-amber-500 to-green-600',
      glowColor: 'red',
    },
    cssVars: {
      '--theme-primary': '220 38 38', // red-600
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '220 38 38', // red-600
      '--theme-gradient-via': '22 163 74', // green-600
      '--theme-gradient-to': '220 38 38', // red-600
    },
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral Gray',
    description: 'Elegante e atemporal',
    icon: '⚪',
    colors: {
      primary: '#6b7280',
      secondary: '#4b5563',
      accent: '#9ca3af',
      gradient: 'from-slate-600 via-gray-600 to-zinc-600',
      cardGradient: 'from-slate-600/5 via-gray-600/5 to-zinc-600/5',
      hoverGradient: 'from-slate-600 to-gray-600',
      badgeGradient: 'from-slate-600 to-zinc-600',
      glowColor: 'gray',
    },
    cssVars: {
      '--theme-primary': '107 114 128', // gray-500
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '71 85 105', // slate-600
      '--theme-gradient-via': '75 85 99', // gray-600
      '--theme-gradient-to': '82 82 91', // zinc-600
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Black',
    description: 'Limpo e sofisticado',
    icon: '◼️',
    colors: {
      primary: '#18181b',
      secondary: '#27272a',
      accent: '#3f3f46',
      gradient: 'from-zinc-900 via-neutral-800 to-stone-900',
      cardGradient: 'from-zinc-900/5 via-neutral-800/5 to-stone-900/5',
      hoverGradient: 'from-zinc-800 to-neutral-900',
      badgeGradient: 'from-zinc-800 via-neutral-800 to-stone-800',
      glowColor: 'zinc',
    },
    cssVars: {
      '--theme-primary': '24 24 27', // zinc-900
      '--theme-primary-foreground': '255 255 255',
      '--theme-gradient-from': '24 24 27', // zinc-900
      '--theme-gradient-via': '38 38 38', // neutral-800
      '--theme-gradient-to': '28 25 23', // stone-900
    },
  },
}

export function getTheme(variant: ThemeVariant): Theme {
  return themes[variant] || themes.ocean
}

export function applyTheme(variant: ThemeVariant) {
  const theme = getTheme(variant)
  const root = document.documentElement

  console.log('applyTheme: Applying theme:', variant, theme)

  // Apply CSS variables
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  // Also apply to --primary to ensure immediate update
  root.style.setProperty('--primary', theme.cssVars['--theme-primary'])
  root.style.setProperty('--primary-foreground', theme.cssVars['--theme-primary-foreground'])

  console.log('applyTheme: CSS vars applied to root')

  // Force repaint
  root.classList.add('theme-transition')
  setTimeout(() => {
    root.classList.remove('theme-transition')
  }, 300)

  // Store in localStorage
  localStorage.setItem('theme-variant', variant)
  console.log('applyTheme: Theme saved to localStorage:', variant)

  // Dispatch event for other components
  window.dispatchEvent(new CustomEvent('theme-applied', { detail: { variant, theme } }))
}

export function getStoredTheme(): ThemeVariant {
  if (typeof window === 'undefined') return 'neutral'
  const stored = (localStorage.getItem('theme-variant') as ThemeVariant) || 'neutral'
  console.log('getStoredTheme: Retrieved theme from localStorage:', stored)
  return stored
}

// Temas disponíveis por plano
export function getAvailableThemes(planTier?: string): ThemeVariant[] {
  const freePlanThemes: ThemeVariant[] = ['neutral']
  const premiumThemes: ThemeVariant[] = ['ocean', 'sunset', 'forest', 'galaxy', 'aurora', 'christmas', 'neutral', 'minimal']

  // Se não tem plano ou é plano free, só tema neutral
  if (!planTier || planTier === 'free') {
    return freePlanThemes
  }

  // Bronze ou superior tem acesso a todos os temas
  return premiumThemes
}

// Verifica se um tema está disponível para o plano do usuário
export function isThemeAvailable(themeId: ThemeVariant, planTier?: string): boolean {
  const availableThemes = getAvailableThemes(planTier)
  return availableThemes.includes(themeId)
}
