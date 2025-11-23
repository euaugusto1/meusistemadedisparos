import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  try {
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 })
    }

    const versionId = params.id

    // Desativar todas as versões
    const { error: deactivateError } = await supabase
      .from('terms_versions')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    if (deactivateError) {
      console.error('Error deactivating versions:', deactivateError)
      return NextResponse.json({
        error: 'Erro ao desativar versões anteriores'
      }, { status: 500 })
    }

    // Ativar a versão selecionada
    const { data, error: activateError } = await supabase
      .from('terms_versions')
      .update({
        is_active: true,
        effective_date: new Date().toISOString()
      })
      .eq('id', versionId)
      .select()
      .single()

    if (activateError) {
      console.error('Error activating version:', activateError)
      return NextResponse.json({
        error: 'Erro ao ativar versão'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Versão ativada com sucesso',
      data
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
