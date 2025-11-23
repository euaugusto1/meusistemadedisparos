import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { version, content } = body

    // Validação
    if (!version || !content) {
      return NextResponse.json({
        error: 'Versão e conteúdo são obrigatórios'
      }, { status: 400 })
    }

    // Criar nova versão (inativa por padrão)
    const { data, error } = await supabase
      .from('terms_versions')
      .insert({
        version: version.trim(),
        content: content.trim(),
        is_active: false, // Nova versão criada inativa
        effective_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating version:', error)
      return NextResponse.json({
        error: 'Erro ao criar versão',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Versão criada com sucesso',
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
