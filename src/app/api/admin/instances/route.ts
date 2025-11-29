import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Usar admin client para bypass RLS nos profiles
    const adminSupabase = createAdminClient()

    const { data: instances, error } = await adminSupabase
      .from('whatsapp_instances')
      .select(`
        *,
        user:profiles(id, email, full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar instâncias:', error)
      return NextResponse.json({ error: 'Erro ao buscar instâncias' }, { status: 500 })
    }

    return NextResponse.json({ instances })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
