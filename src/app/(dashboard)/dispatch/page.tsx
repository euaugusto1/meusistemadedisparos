import { createClient } from '@/lib/supabase/server'
import { CampaignDispatcher } from '@/components/campaigns/CampaignDispatcher'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'

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

  // Obter templates do usuário com informações de mídia
  const { data: templates } = await supabase
    .from('message_templates')
    .select(`
      *,
      media:media_files(id, public_url, original_name, type, mime_type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <CampaignNavigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Envios
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
    </>
  )
}
