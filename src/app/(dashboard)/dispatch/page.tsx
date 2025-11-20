import { createClient } from '@/lib/supabase/server'
import { CampaignDispatcher } from '@/components/campaigns/CampaignDispatcher'

export default async function DispatchPage() {
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

  // Obter listas de contatos do usuário (contacts é um campo JSON na tabela)
  const { data: lists } = await supabase
    .from('contacts_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Obter templates do usuário
  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Disparo de Mensagens</h1>
        <p className="text-muted-foreground">
          Configure e inicie o envio de mensagens em lote
        </p>
      </div>

      <CampaignDispatcher
        instances={instances || []}
        lists={lists || []}
        templates={templates || []}
        profile={profile}
      />
    </div>
  )
}
