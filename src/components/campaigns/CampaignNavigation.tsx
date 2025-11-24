'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Smartphone,
  Users,
  Image,
  FileText,
  Rocket,
  ScrollText,
} from 'lucide-react'

const campaignMenuItems = [
  {
    title: 'Minhas Instâncias',
    href: '/instances',
    icon: Smartphone,
  },
  {
    title: 'Listas de Contatos',
    href: '/lists',
    icon: Users,
  },
  {
    title: 'Biblioteca de Mídia',
    href: '/media',
    icon: Image,
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: FileText,
  },
  {
    title: 'Envios',
    href: '/dispatch',
    icon: Rocket,
  },
  {
    title: 'Histórico',
    href: '/campaigns',
    icon: ScrollText,
  },
]

export function CampaignNavigation() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const activeItemRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // Scroll automático para o item ativo no mobile
    if (activeItemRef.current && navRef.current) {
      const navElement = navRef.current
      const activeElement = activeItemRef.current

      // Calcular a posição de scroll para centralizar o item ativo
      const scrollLeft = activeElement.offsetLeft - (navElement.offsetWidth / 2) + (activeElement.offsetWidth / 2)

      navElement.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }, [pathname])

  return (
    <div className="bg-card border-b">
      <div className="container mx-auto px-4">
        <nav
          ref={navRef}
          className="flex items-center gap-1 overflow-x-auto py-3
          scrollbar-hide
          [-webkit-overflow-scrolling:touch]
          [&::-webkit-scrollbar]:hidden
          [&::-webkit-scrollbar]:w-0
          [&::-webkit-scrollbar]:h-0
          [-ms-overflow-style:none]
          [scrollbar-width:none]">
          {campaignMenuItems.map((item) => {
            // Se estiver em /campaigns, destacar "Histórico" como ativo
            const isActive = pathname === item.href || (pathname === '/campaigns' && item.href === '/campaigns')

            return (
              <Link
                key={item.href}
                href={item.href}
                ref={isActive ? activeItemRef : null}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
