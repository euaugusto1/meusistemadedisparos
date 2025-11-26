import { createClient } from '@/lib/supabase/server'
import { TemplatesList } from '@/components/templates/TemplatesList'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'

export default async function TemplatesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter templates do usuário
  const { data: templates } = await supabase
    .from('message_templates')
    .select(`
      *,
      media:media_files(id, public_url, original_name, type)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Obter mídias para seleção (do usuário atual)
  const { data: media } = await supabase
    .from('media_files')
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
            Templates de Mensagem
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Crie e gerencie templates reutilizáveis para suas campanhas
          </p>
        </div>

        <TemplatesList
          templates={templates || []}
          media={media || []}
        />
      </div>
    </>
  )
}
