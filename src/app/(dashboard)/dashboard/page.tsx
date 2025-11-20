import { createClient } from '@/lib/supabase/server'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { StatsCards } from '@/components/dashboard/StatsCards'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Obter estatísticas
  const { data: stats } = await supabase
    .from('dashboard_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Obter dados para gráficos
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('status, sent_count, failed_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas campanhas e estatísticas
        </p>
      </div>

      <StatsCards stats={stats} />

      <DashboardCharts campaigns={campaigns || []} stats={stats} />
    </div>
  )
}
