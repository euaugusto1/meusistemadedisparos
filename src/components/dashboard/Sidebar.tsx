'use client'

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
  Sparkles,
  BarChart3,
  Scale,
  Bot,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUnreadSupport } from '@/hooks/useUnreadSupport'
import type { Profile } from '@/types'

interface SidebarProps {
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
    badge: 'Novo',
  },
  {
    title: 'Agentes IA',
    href: '/agents',
    icon: Bot,
    badge: 'Exclusivo',
    highlight: true,
  },
  {
    title: 'Minhas Instâncias',
    href: '/instances',
    icon: Smartphone,
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
    title: 'Listas de Contatos',
    href: '/lists',
    icon: Users,
  },
  {
    title: 'Disparo',
    href: '/dispatch',
    icon: Rocket,
  },
  {
    title: 'Campanhas',
    href: '/campaigns',
    icon: Send,
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
    title: 'Termos de Uso',
    href: '/admin/terms',
    icon: Scale,
  },
  {
    title: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const unreadCount = useUnreadSupport(profile)

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r">
      <div className="flex items-center h-16 px-6 border-b gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur-md opacity-50"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Araujo IA
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const isSupportItem = item.href === '/support'
            const showUnreadBadge = isSupportItem && unreadCount > 0
            const showNewBadge = item.badge === 'Novo'
            const showExclusiveBadge = item.badge === 'Exclusivo'
            const isHighlighted = item.highlight

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 relative group',
                  isActive
                    ? isHighlighted
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-200 border border-yellow-500/30'
                      : 'bg-primary text-primary-foreground'
                    : isHighlighted
                    ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-100 hover:from-yellow-500/20 hover:to-orange-500/20 border border-yellow-500/20 hover:border-yellow-500/40'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4",
                  isHighlighted && "text-yellow-400 group-hover:text-yellow-300"
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
                    className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    Novo
                  </Badge>
                )}
                {showExclusiveBadge && (
                  <Badge
                    variant="default"
                    className="ml-auto h-5 px-2 text-xs bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold shadow-lg"
                  >
                    Gold
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

        {/* Footer Links */}
        <div className="px-3 py-4 border-t">
          <Link
            href="/terms"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Scale className="h-4 w-4" />
            Termos de Uso
          </Link>
        </div>
      </nav>
    </aside>
  )
}
