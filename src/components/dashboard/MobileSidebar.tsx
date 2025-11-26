'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Image,
  FileText,
  Users,
  Send,
  Rocket,
  HeadphonesIcon,
  Settings,
  Shield,
  MessageSquare,
  Smartphone,
  ScrollText,
  Crown,
  Menu,
  Sparkles,
  BarChart3,
  Bot,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useUnreadSupport } from '@/hooks/useUnreadSupport'
import type { Profile } from '@/types'

interface MobileSidebarProps {
  profile: Profile | null
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    badge: 'Prata+',
    premium: true,
  },
  {
    title: 'Agentes IA',
    href: '/agents',
    icon: Bot,
    badge: 'Exclusivo',
    highlight: true,
  },
  {
    title: 'Campanhas',
    href: '/instances',
    icon: Send,
  },
  {
    title: 'Follow-Up',
    href: '/follow-up',
    icon: RefreshCw,
    badge: 'Em breve',
    comingSoon: true,
  },
  {
    title: 'Planos',
    href: '/plans',
    icon: Crown,
  },
  {
    title: 'Suporte',
    href: '/support',
    icon: HeadphonesIcon,
  },
]

const adminItems = [
  {
    title: 'Usuários',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Instâncias',
    href: '/admin/instances',
    icon: MessageSquare,
  },
  {
    title: 'Logs',
    href: '/admin/logs',
    icon: ScrollText,
  },
  {
    title: 'Planos',
    href: '/admin/plans',
    icon: Crown,
  },
  {
    title: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function MobileSidebar({ profile }: MobileSidebarProps) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const unreadCount = useUnreadSupport(profile)
  const [open, setOpen] = useState(false)

  // Rotas de campanhas
  const campaignRoutes = ['/instances', '/lists', '/media', '/templates', '/dispatch', '/campaigns']
  const isInCampaignRoute = campaignRoutes.some(route => pathname.startsWith(route))

  // Função para fechar o sidebar ao clicar em um link
  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-md opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg">
                <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
              </div>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Araujo IA
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {menuItems.map((item) => {
              // Se o item for "Campanhas", considerar ativo se estiver em qualquer rota de campanha
              const isCampaignItem = item.title === 'Campanhas'
              const isActive = isCampaignItem ? isInCampaignRoute : pathname === item.href

              const isSupportItem = item.href === '/support'
              const showUnreadBadge = isSupportItem && unreadCount > 0
              const showNewBadge = item.badge === 'Novo'
              const showExclusiveBadge = item.badge === 'Exclusivo'
              const showPremiumBadge = item.badge === 'Prata+'
              const showComingSoonBadge = item.badge === 'Em breve'
              const isHighlighted = item.highlight

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
                    isActive
                      ? isHighlighted
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-200 border border-yellow-500/30'
                        : 'bg-primary text-primary-foreground'
                      : isHighlighted
                      ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-100 border border-yellow-500/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4",
                    isHighlighted && "text-yellow-400"
                  )} />
                  {item.title}
                  {showUnreadBadge && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                  {showNewBadge && (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    >
                      Novo
                    </Badge>
                  )}
                  {showExclusiveBadge && (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold"
                    >
                      Gold
                    </Badge>
                  )}
                  {showPremiumBadge && (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-slate-400 to-slate-500 text-white font-semibold"
                    >
                      Prata+
                    </Badge>
                  )}
                  {showComingSoonBadge && (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold"
                    >
                      Em breve
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>

          {isAdmin && (
            <>
              <div className="px-3 py-4">
                <div className="flex items-center gap-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Shield className="h-3 w-3" />
                  Admin
                </div>
              </div>
              <div className="px-3 space-y-1">
                {adminItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
