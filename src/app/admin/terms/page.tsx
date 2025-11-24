import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TermsManager } from '@/components/admin/TermsManager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Gerenciar Termos de Uso - Admin',
  description: 'Gerenciar versões e aceites dos Termos de Uso',
}

export default async function AdminTermsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // Buscar todas as versões de termos
  const { data: versions } = await supabase
    .from('terms_versions')
    .select('*')
    .order('created_at', { ascending: false })

  // Buscar todos os aceites para calcular estatísticas
  const { data: allAcceptances } = await supabase
    .from('terms_acceptances')
    .select('terms_version_id')

  // Calcular estatísticas manualmente
  const acceptanceStats = versions?.map(version => {
    const count = allAcceptances?.filter(a => a.terms_version_id === version.id).length || 0
    return {
      terms_version_id: version.id,
      count
    }
  }) || []

  return (
    <div className="p-8 space-y-8">
      <div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4 transition-all duration-300 hover:scale-105">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
        </Link>

        {/* Header - Premium Style */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            Gerenciar Termos de Uso
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Controle de versões e aceites dos Termos de Uso
          </p>
        </div>
      </div>

      <TermsManager
        versions={versions || []}
        acceptanceStats={acceptanceStats || []}
      />
    </div>
  )
}
