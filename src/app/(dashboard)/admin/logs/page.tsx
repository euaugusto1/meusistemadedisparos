import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogsViewer } from '@/components/admin/LogsViewer'

export default async function LogsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Buscar logs do sistema
  const { data: logs } = await supabase
    .from('system_logs')
    .select(`
      *,
      user:profiles(id, email, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  // Buscar logs de campanhas
  const { data: campaignLogs } = await supabase
    .from('campaign_items')
    .select(`
      id,
      recipient,
      status,
      error_message,
      sent_at,
      campaign:campaigns(id, title, user_id)
    `)
    .order('sent_at', { ascending: false })
    .not('sent_at', 'is', null)
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground">
          Monitore todas as atividades e eventos do sistema
        </p>
      </div>

      <LogsViewer
        systemLogs={logs || []}
        campaignLogs={campaignLogs || []}
      />
    </div>
  )
}
