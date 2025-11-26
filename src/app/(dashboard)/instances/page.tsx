import { createClient } from '@/lib/supabase/server'
import { ClientInstances } from '@/components/instances/ClientInstances'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'

export default async function InstancesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Obter instâncias do usuário
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <CampaignNavigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Minhas Instâncias
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Gerencie suas conexões WhatsApp
          </p>
        </div>

        <ClientInstances
          instances={instances || []}
          profile={profile}
        />
      </div>
    </>
  )
}
