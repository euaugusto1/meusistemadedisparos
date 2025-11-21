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
  Menu,
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
    title: 'Suporte',
    href: '/support',
    icon: HeadphonesIcon,
  },
  {
    title: 'Planos',
    href: '/plans',
    icon: Crown,
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">WhatsApp SaaS</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const isSupportItem = item.href === '/support'
              const showBadge = isSupportItem && unreadCount > 0

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                  {showBadge && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
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
        </nav>
      </SheetContent>
    </Sheet>
  )
}
