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

  // Buscar dados em paralelo
  const [
    { data: logs },
    { data: campaignLogsRaw },
    { data: users },
    { data: instances }
  ] = await Promise.all([
    // Logs do sistema
    supabase
      .from('system_logs')
      .select(`
        *,
        user:profiles!user_id(id, email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(500),

    // Logs de campanhas
    supabase
      .from('campaign_items')
      .select(`
        id,
        campaign_id,
        recipient,
        recipient_name,
        status,
        error_message,
        sent_at,
        response_data,
        campaign:campaigns(id, title, user_id, instance_id, message)
      `)
      .order('sent_at', { ascending: false })
      .not('sent_at', 'is', null)
      .limit(500),

    // Usuários para filtro
    supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('email'),

    // Instâncias para filtro
    supabase
      .from('whatsapp_instances')
      .select('id, name, phone_number')
      .order('name')
  ])

  // Transform array to single object
  const campaignLogs = campaignLogsRaw?.map(log => ({
    ...log,
    campaign: Array.isArray(log.campaign) ? log.campaign[0] : log.campaign
  })) || []

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Logs do Sistema
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Monitore todas as atividades e eventos do sistema
        </p>
      </div>

      <LogsViewer
        systemLogs={logs || []}
        campaignLogs={campaignLogs as any}
        users={users || []}
        instances={instances || []}
      />
    </div>
  )
}
