import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  try {
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter versão ativa dos termos
    const { data: activeTerms, error: termsError } = await supabase
      .rpc('get_active_terms_version')
      .single<{ id: string; version: string; content: string }>()

    if (termsError || !activeTerms) {
      console.error('Error fetching active terms:', termsError)
      return NextResponse.json({
        error: 'Versão ativa dos termos não encontrada'
      }, { status: 404 })
    }

    // Obter IP e User Agent
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Registrar aceite (ignora se já existe devido ao UNIQUE constraint)
    const { error: acceptError } = await supabase
      .from('terms_acceptances')
      .insert({
        user_id: user.id,
        terms_version_id: activeTerms.id,
        ip_address: ip,
        user_agent: userAgent
      })

    // Se erro não for de constraint violation, retornar erro
    if (acceptError && !acceptError.message.includes('unique_user_version')) {
      console.error('Error creating acceptance:', acceptError)
      return NextResponse.json({
        error: 'Erro ao registrar aceite',
        details: acceptError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Aceite registrado com sucesso',
      data: {
        version: activeTerms.version,
        accepted_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createClient()

  try {
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se usuário aceitou a versão atual
    const { data: hasAccepted, error } = await supabase
      .rpc('user_has_accepted_current_terms', { p_user_id: user.id })

    if (error) {
      console.error('Error checking acceptance:', error)
      return NextResponse.json({
        error: 'Erro ao verificar aceite'
      }, { status: 500 })
    }

    // Obter versão ativa
    const { data: activeTerms } = await supabase
      .rpc('get_active_terms_version')
      .single<{ id: string; version: string; content: string }>()

    return NextResponse.json({
      success: true,
      has_accepted: hasAccepted || false,
      current_version: activeTerms?.version || 'unknown'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
