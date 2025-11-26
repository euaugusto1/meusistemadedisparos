import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FollowUpClient } from '@/components/follow-up/FollowUpClient'

export const metadata: Metadata = {
  title: 'Follow-Up | Dashboard',
  description: 'Sistema de follow-up automático para suas campanhas',
}

export default async function FollowUpPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'

  return <FollowUpClient userName={userName} />
}
