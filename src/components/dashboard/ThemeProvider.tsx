'use client'

import { useEffect, useState } from 'react'
import { getStoredTheme, themes, type ThemeVariant } from '@/lib/themes'

export function ThemeProvider() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Function to update theme styles
    const updateThemeStyles = () => {
      const theme = getStoredTheme()
      const themeData = themes[theme]

      console.log('ThemeProvider: Applying theme:', theme)

      // Apply CSS variables to root element
      const root = document.documentElement
      Object.entries(themeData.cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })

      // Also apply to --primary to ensure immediate update
      root.style.setProperty('--primary', themeData.cssVars['--theme-primary'])
      root.style.setProperty('--primary-foreground', themeData.cssVars['--theme-primary-foreground'])

      // Inject dynamic CSS for gradients
      const styleId = 'dynamic-theme-styles'
      let styleElement = document.getElementById(styleId) as HTMLStyleElement

      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }

      // Create CSS with current theme gradients
      styleElement.textContent = `
        /* Dynamic Theme Styles - ${theme} */

        /* Main gradient combinations - to right */
        .bg-gradient-to-r.from-primary.via-blue-600.to-purple-600,
        .bg-gradient-to-r.from-primary.to-blue-600,
        .bg-gradient-to-r.from-cyan-500.via-blue-600.to-indigo-600,
        .bg-gradient-to-r.from-orange-500.via-red-500.to-pink-600,
        .bg-gradient-to-r.from-emerald-500.via-green-600.to-teal-600,
        .bg-gradient-to-r.from-purple-500.via-violet-600.to-fuchsia-600,
        .bg-gradient-to-r.from-cyan-400.via-blue-500.to-purple-600,
        .bg-gradient-to-r.from-green-500.to-emerald-500,
        .bg-gradient-to-r.from-blue-500.to-cyan-500,
        .bg-gradient-to-r.from-green-600.to-emerald-600,
        .bg-gradient-to-r.from-yellow-500.to-orange-500,
        .bg-gradient-to-r.from-yellow-500.to-orange-600,
        .bg-gradient-to-r.from-red-600.via-green-600.to-red-600,
        .bg-gradient-to-r.from-red-600.via-amber-500.to-green-600,
        .bg-gradient-to-r.from-slate-600.via-gray-600.to-zinc-600,
        .bg-gradient-to-r.from-zinc-900.via-neutral-800.to-stone-900 {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-gradient-from']}),
            rgb(${themeData.cssVars['--theme-gradient-via']}),
            rgb(${themeData.cssVars['--theme-gradient-to']})
          ) !important;
        }

        /* Bottom-right gradients */
        .bg-gradient-to-br.from-primary.to-blue-600,
        .bg-gradient-to-br.from-cyan-500.to-blue-600,
        .bg-gradient-to-br.from-orange-500.to-red-600,
        .bg-gradient-to-br.from-emerald-500.to-green-600,
        .bg-gradient-to-br.from-purple-500.to-violet-600,
        .bg-gradient-to-br.from-cyan-400.to-blue-500,
        .bg-gradient-to-br.from-red-600.to-green-600,
        .bg-gradient-to-br.from-slate-600.to-gray-600,
        .bg-gradient-to-br.from-zinc-900.to-neutral-800 {
          background-image: linear-gradient(to bottom right,
            rgb(${themeData.cssVars['--theme-gradient-from']}),
            rgb(${themeData.cssVars['--theme-gradient-to']})
          ) !important;
        }

        /* Opacity variants - gradients */
        .bg-gradient-to-br.from-primary\\/10.to-blue-600\\/10,
        .from-primary\\/10.to-background,
        .bg-gradient-to-r.from-primary\\/20.to-blue-500\\/20,
        .bg-gradient-to-r.from-primary\\/20.to-blue-600\\/20,
        .bg-gradient-to-r.from-green-500\\/20.to-emerald-500\\/20,
        .bg-gradient-to-r.from-red-500\\/20.to-orange-500\\/20 {
          background-image: linear-gradient(to bottom right,
            rgb(${themeData.cssVars['--theme-gradient-from']} / 0.1),
            rgb(${themeData.cssVars['--theme-gradient-to']} / 0.1)
          ) !important;
        }

        /* Blur glow effects */
        .bg-gradient-to-r.from-primary.to-blue-600.blur,
        .-inset-1.bg-gradient-to-r.from-primary.to-blue-600,
        .-inset-0\\.5.bg-gradient-to-r.from-primary.via-blue-600.to-purple-600,
        .bg-gradient-to-r.from-primary.to-blue-600.rounded-full.blur-2xl {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-gradient-from']}),
            rgb(${themeData.cssVars['--theme-gradient-via']}),
            rgb(${themeData.cssVars['--theme-gradient-to']})
          ) !important;
        }

        /* Text gradients for titles */
        .bg-gradient-to-r.bg-clip-text,
        .text-transparent.bg-gradient-to-r,
        .bg-gradient-to-r.from-primary.to-blue-600.bg-clip-text.text-transparent,
        .bg-gradient-to-r.from-primary.via-blue-600.to-purple-600.bg-clip-text.text-transparent {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-gradient-from']}),
            rgb(${themeData.cssVars['--theme-gradient-via']}),
            rgb(${themeData.cssVars['--theme-gradient-to']})
          ) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
        }

        /* Badges */
        .bg-gradient-to-r.from-primary.to-blue-600.shadow-lg {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-gradient-from']}),
            rgb(${themeData.cssVars['--theme-gradient-to']})
          ) !important;
        }

        /* Button hover states */
        .bg-gradient-to-r.from-primary.to-blue-600.hover\\:from-primary\\/90.hover\\:to-blue-600\\/90:hover,
        .hover\\:from-primary\\/90:hover,
        .hover\\:to-blue-600\\/90:hover {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-gradient-from']} / 0.9),
            rgb(${themeData.cssVars['--theme-gradient-to']} / 0.9)
          ) !important;
        }

        /* Primary with opacity variations */
        .from-primary.via-primary\\/90.to-primary,
        .hover\\:from-primary\\/90.hover\\:via-primary.hover\\:to-primary\\/90:hover {
          background-image: linear-gradient(to right,
            rgb(${themeData.cssVars['--theme-primary']}),
            rgb(${themeData.cssVars['--theme-primary']} / 0.9),
            rgb(${themeData.cssVars['--theme-primary']})
          ) !important;
        }

        /* Primary color utilities */
        .text-primary {
          color: rgb(${themeData.cssVars['--theme-primary']}) !important;
        }

        .border-primary {
          border-color: rgb(${themeData.cssVars['--theme-primary']}) !important;
        }

        .bg-primary {
          background-color: rgb(${themeData.cssVars['--theme-primary']}) !important;
        }

        .ring-primary {
          --tw-ring-color: rgb(${themeData.cssVars['--theme-primary']}) !important;
        }

        .shadow-primary\\/25 {
          --tw-shadow-color: rgb(${themeData.cssVars['--theme-primary']} / 0.25) !important;
          --tw-shadow: var(--tw-shadow-colored);
        }

        .shadow-primary\\/40 {
          --tw-shadow-color: rgb(${themeData.cssVars['--theme-primary']} / 0.4) !important;
          --tw-shadow: var(--tw-shadow-colored);
        }

        /* Hover states */
        .hover\\:border-primary\\/50:hover {
          border-color: rgb(${themeData.cssVars['--theme-primary']} / 0.5) !important;
        }

        .hover\\:shadow-primary\\/40:hover {
          --tw-shadow-color: rgb(${themeData.cssVars['--theme-primary']} / 0.4) !important;
        }

        /* Glow effects for each theme */
        .group:hover .group-hover\\:opacity-30 {
          opacity: 0.3 !important;
        }

        .group:hover .group-hover\\:opacity-40 {
          opacity: 0.4 !important;
        }

        .group:hover .group-hover\\:opacity-50 {
          opacity: 0.5 !important;
        }
      `
    }

    // Apply theme on mount
    updateThemeStyles()

    // Listen for theme changes
    const handleThemeChange = () => {
      updateThemeStyles()
    }

    window.addEventListener('theme-change', handleThemeChange)

    return () => {
      window.removeEventListener('theme-change', handleThemeChange)
    }
  }, [])

  if (!mounted) return null

  return null
}
