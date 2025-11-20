import { createClient } from '@/lib/supabase/server'
import { CampaignsList } from '@/components/campaigns/CampaignsList'

export default async function CampaignsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter campanhas do usuário
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      *,
      instance:whatsapp_instances(id, name, phone_number),
      media:media_files(id, public_url, original_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Campanhas</h1>
        <p className="text-muted-foreground">
          Acompanhe o histórico e status das suas campanhas
        </p>
      </div>

      <CampaignsList campaigns={campaigns || []} />
    </div>
  )
}
