import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CrmClient } from '@/components/crm/CrmClient'

export const metadata: Metadata = {
  title: 'CRM AraujoIA | Dashboard',
  description: 'Sistema de CRM integrado ao WhatsApp com Inteligência Artificial',
}

export default async function CrmPage() {
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

  return <CrmClient userName={userName} />
}
