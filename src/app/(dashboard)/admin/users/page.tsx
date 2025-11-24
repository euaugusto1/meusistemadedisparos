import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersManager } from '@/components/admin/UsersManager'

export default async function AdminUsersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Admin usa service role para ver todos os usuários (bypass RLS)
  const adminSupabase = createAdminClient()
  const { data: users } = await adminSupabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Gestão de Usuários
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Gerencie usuários, planos e permissões
        </p>
      </div>

      <UsersManager users={users || []} />
    </div>
  )
}
