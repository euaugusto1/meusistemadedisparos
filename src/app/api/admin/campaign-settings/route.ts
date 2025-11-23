import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

    // Buscar configuração
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'campaign_delays')
      .single()

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({
        error: 'Configuração não encontrada',
        details: error
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Configuração encontrada'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

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
    const { min_delay_seconds, max_delay_seconds } = body

    // Validação
    if (!min_delay_seconds || !max_delay_seconds) {
      return NextResponse.json({
        error: 'Parâmetros obrigatórios faltando'
      }, { status: 400 })
    }

    if (min_delay_seconds >= max_delay_seconds) {
      return NextResponse.json({
        error: 'Delay mínimo deve ser menor que o máximo'
      }, { status: 400 })
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', 'campaign_delays')
      .single()

    const delaySettings = {
      min_delay_seconds,
      max_delay_seconds
    }

    if (existing) {
      // Atualizar
      const { error } = await supabase
        .from('system_settings')
        .update({
          value: delaySettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Configuração atualizada',
        data: delaySettings
      })
    } else {
      // Criar
      const { error } = await supabase
        .from('system_settings')
        .insert({
          key: 'campaign_delays',
          value: delaySettings,
          description: 'Configurações de delay para envio de campanhas'
        })

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Configuração criada',
        data: delaySettings
      })
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      error: 'Erro ao salvar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
