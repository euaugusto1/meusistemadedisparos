import { createClient } from '@/lib/supabase/server'
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

  // Obter todos os usuários
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, planos e permissões
        </p>
      </div>

      <UsersManager users={users || []} />
    </div>
  )
}
