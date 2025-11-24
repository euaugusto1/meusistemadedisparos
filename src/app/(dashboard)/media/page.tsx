import { createClient } from '@/lib/supabase/server'
import { MediaGallery } from '@/components/media/MediaGallery'
import { CampaignNavigation } from '@/components/campaigns/CampaignNavigation'

export default async function MediaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Obter todas as mídias (biblioteca compartilhada)
  const { data: media } = await supabase
    .from('media_files')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <CampaignNavigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Mídia</h1>
          <p className="text-muted-foreground">
            Gerencie seus arquivos de mídia para usar nas campanhas
          </p>
        </div>

        <MediaGallery
          media={media || []}
          profile={profile}
        />
      </div>
    </>
  )
}
