import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiTokensManager } from '@/components/admin/ApiTokensManager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'API Tokens - Admin',
  description: 'Gerenciar tokens de API para integrações externas',
}

export default async function AdminApiTokensPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch all API tokens for this admin
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Sanitize tokens (hide full token value)
  const sanitizedTokens = tokens?.map(token => ({
    ...token,
    token: `${token.token.substring(0, 12)}${'*'.repeat(36)}`
  })) || []

  return (
    <div className="p-8 space-y-8">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4 transition-all duration-300 hover:scale-105">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
        </Link>

        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            API Tokens
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Gere e gerencie tokens de API para integrações externas e automação
          </p>
        </div>
      </div>

      <ApiTokensManager tokens={sanitizedTokens} adminEmail={profile.email} />
    </div>
  )
}
