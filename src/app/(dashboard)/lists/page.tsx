import { createClient } from '@/lib/supabase/server'
import { ContactsListManager } from '@/components/lists/ContactsListManager'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'

export default async function ListsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter listas de contatos do usuário
  const { data: lists } = await supabase
    .from('contacts_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Obter instâncias para sincronização de grupos
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'connected')

  return (
    <>
      <CampaignNavigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Listas de Contatos
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Importe e gerencie suas listas de contatos para envios em massa
          </p>
        </div>

        <ContactsListManager
          lists={lists || []}
          instances={instances || []}
        />
      </div>
    </>
  )
}
