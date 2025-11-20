import { createClient } from '@/lib/supabase/server'
import { ContactsListManager } from '@/components/lists/ContactsListManager'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Listas de Contatos</h1>
        <p className="text-muted-foreground">
          Importe e gerencie suas listas de contatos para envios em massa
        </p>
      </div>

      <ContactsListManager
        lists={lists || []}
        instances={instances || []}
      />
    </div>
  )
}
