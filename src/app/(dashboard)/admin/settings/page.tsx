import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SystemSettings } from '@/components/admin/SystemSettings'

export default async function AdminSettingsPage() {
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

  // Estatísticas do sistema
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: totalCampaigns } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })

  const { count: totalMedia } = await supabase
    .from('media_files')
    .select('*', { count: 'exact', head: true })

  const { count: activeInstances } = await supabase
    .from('whatsapp_instances')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'connected')

  const stats = {
    totalUsers: totalUsers || 0,
    totalCampaigns: totalCampaigns || 0,
    totalMedia: totalMedia || 0,
    activeInstances: activeInstances || 0,
  }

  // Get system settings for payment
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')

  console.log('Settings data:', settings)
  console.log('Settings error:', settingsError)

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Configurações gerais e manutenção do sistema
        </p>
      </div>

      <SystemSettings stats={stats} settings={settings || []} />
    </div>
  )
}
