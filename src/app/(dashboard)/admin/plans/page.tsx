import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlansManager } from '@/components/admin/PlansManager'

export const metadata = {
  title: 'Gerenciar Planos',
  description: 'Administre os planos e preços do sistema',
}

export default async function AdminPlans() {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all plans
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })

  console.log('Plans data:', plans)
  console.log('Plans error:', error)

  return <PlansManager plans={plans || []} />
}
