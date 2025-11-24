import { createClient } from '@/lib/supabase/server'
import { SupportChat } from '@/components/support/SupportChat'

export default async function SupportPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Obter perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Obter tickets do usuário (ou todos se admin)
  const isAdmin = profile?.role === 'admin'

  let ticketsQuery = supabase
    .from('support_tickets')
    .select(`
      *,
      user:profiles(id, email, full_name),
      messages:support_messages(
        id,
        message,
        created_at,
        sender:profiles(id, email, full_name, role)
      )
    `)
    .order('updated_at', { ascending: false })

  if (!isAdmin) {
    ticketsQuery = ticketsQuery.eq('user_id', user.id)
  }

  const { data: tickets } = await ticketsQuery

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Suporte
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {isAdmin
            ? 'Gerencie os tickets de suporte dos usuários'
            : 'Entre em contato com nossa equipe de suporte'}
        </p>
      </div>

      <SupportChat
        tickets={tickets || []}
        profile={profile}
        isAdmin={isAdmin}
      />
    </div>
  )
}
