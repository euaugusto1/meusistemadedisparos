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

  return (
    <div className="space-y-8">
      {/* Header - Premium Style */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
          Gerenciar Planos
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Administre os planos e preços do sistema
        </p>
      </div>

      <PlansManager plans={plans || []} />
    </div>
  )
}
