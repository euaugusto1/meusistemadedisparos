'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import type { Profile } from '@/types'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { ThemeProvider } from './ThemeProvider'

interface DashboardWrapperProps {
  profile: Profile | null
  children: React.ReactNode
}

export function DashboardWrapper({ profile, children }: DashboardWrapperProps) {
  // Load and apply theme
  useTheme()

  const pathname = usePathname()
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  // Rotas de campanhas onde o sidebar deve ficar oculto
  const campaignRoutes = ['/instances', '/lists', '/media', '/templates', '/dispatch', '/campaigns']
  const isInCampaignRoute = campaignRoutes.some(route => pathname.startsWith(route))

  return (
    <>
      <ThemeProvider />
      <div className="flex h-screen overflow-hidden">
        {/* Área de hover invisível para mostrar o sidebar */}
        {isInCampaignRoute && (
          <div
            className="fixed left-0 top-0 bottom-0 w-4 z-40"
            onMouseEnter={() => setIsSidebarHovered(true)}
          />
        )}

        {/* Sidebar - sempre renderizado mas com posicionamento condicional */}
        <div
          className={`${
            isInCampaignRoute
              ? `fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300 ${
                  isSidebarHovered ? 'translate-x-0' : '-translate-x-full'
                }`
              : ''
          }`}
          onMouseLeave={() => isInCampaignRoute && setIsSidebarHovered(false)}
        >
          <Sidebar profile={profile} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header profile={profile} />
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </>
  )
}
