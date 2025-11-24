import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InstancesManager } from '@/components/admin/InstancesManager'

export default async function AdminInstancesPage() {
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

  // Obter todas as instâncias com informações do usuário
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select(`
      *,
      user:profiles(id, email, full_name)
    `)
    .order('created_at', { ascending: false })

  // Admin usa service role para ver todos os usuários (bypass RLS)
  const adminSupabase = createAdminClient()
  const { data: users } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, role')
    .order('email', { ascending: true })

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Instâncias WhatsApp
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Gerencie todas as instâncias do sistema
        </p>
      </div>

      <InstancesManager instances={instances || []} users={users || []} />
    </div>
  )
}
