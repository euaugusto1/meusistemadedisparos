import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlansPage } from '@/components/plans/PlansPage'

export const metadata = {
  title: 'Planos e Preços',
  description: 'Escolha o melhor plano para suas necessidades',
}

export default async function Plans() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get active plans
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  console.log('User plans data:', plans)
  console.log('User plans error:', error)
  console.log('User profile:', profile.email, profile.role)

  return <PlansPage profile={profile} plans={plans || []} />
}
