import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Obter perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <DashboardWrapper profile={profile}>
      {children}
    </DashboardWrapper>
  )
}
