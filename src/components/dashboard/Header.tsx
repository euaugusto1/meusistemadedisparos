'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Settings, Crown, CreditCard, Shield, Palette, Key, FileCode2 } from 'lucide-react'
import { getPlanColor } from '@/lib/utils'
import { MobileSidebar } from './MobileSidebar'
import { ThemeSelector } from './ThemeSelector'
import type { Profile } from '@/types'

interface HeaderProps {
  profile: Profile | null
}

export function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const [showThemeSelector, setShowThemeSelector] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'
  const initials = profile ? getInitials(profile.full_name, profile.email) : 'U'
  const isAdmin = profile?.role === 'admin'

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <MobileSidebar profile={profile} />
        <div>
          <h2 className="text-lg font-semibold">
            Olá, {displayName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {profile?.email}
          </p>
        </div>
        {profile?.plan_tier && (
          <Badge variant="outline" className={`${getPlanColor(profile.plan_tier)} text-white border-none shadow-md`}>
            <Crown className="h-3 w-3 mr-1" />
            {profile.plan_tier.charAt(0).toUpperCase() + profile.plan_tier.slice(1)}
          </Badge>
        )}
        {isAdmin && (
          <Badge className="gap-1 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md border-none">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Admin Quick Actions */}
        {isAdmin && (
          <div className="hidden md:flex items-center gap-2">
            <Link href="/api-docs">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300"
              >
                <FileCode2 className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">API Docs</span>
              </Button>
            </Link>
            <Link href="/admin/api-tokens">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/30 hover:border-green-500/50 hover:bg-green-600/20 text-green-400 hover:text-green-300"
              >
                <Key className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Tokens</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Créditos disponíveis */}
        {profile && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary/10 to-blue-600/10 border border-primary/20 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
            <CreditCard className="h-4 w-4 text-primary" />
            <div className="text-sm">
              <span className="font-semibold text-primary">{profile.credits.toLocaleString('pt-BR')}</span>
              <span className="text-muted-foreground ml-1">créditos</span>
            </div>
          </div>
        )}

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/plans" className="cursor-pointer">
                <Crown className="mr-2 h-4 w-4" />
                Meu Plano
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowThemeSelector(true)}
              className="cursor-pointer"
            >
              <Palette className="mr-2 h-4 w-4" />
              Escolher Tema
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Painel Admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/api-docs" className="cursor-pointer">
                    <FileCode2 className="mr-2 h-4 w-4" />
                    API Docs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/admin/api-tokens" className="cursor-pointer">
                    <Key className="mr-2 h-4 w-4" />
                    Tokens API
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Theme Selector Modal */}
      <ThemeSelector
        open={showThemeSelector}
        onOpenChange={setShowThemeSelector}
        planTier={profile?.plan_tier}
      />
    </header>
  )
}
