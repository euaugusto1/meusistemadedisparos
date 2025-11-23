import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const N8N_API_URL = process.env.N8N_API_URL || ''
const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se o usuário tem plano Gold ou é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, role')
      .eq('id', user.id)
      .single()

    const hasAccess = profile?.role === 'admin' || profile?.plan_tier === 'gold'

    if (!hasAccess) {
      return NextResponse.json({
        error: 'Agentes IA são exclusivos do plano Gold',
        requiresUpgrade: true
      }, { status: 403 })
    }

    const workflowId = params.id

    // Get current workflow state
    const getResponse = await fetch(`${N8N_API_URL}/workflows/${workflowId}`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    })

    if (!getResponse.ok) {
      return NextResponse.json(
        { error: 'Falha ao buscar workflow' },
        { status: getResponse.status }
      )
    }

    const workflow = await getResponse.json()
    const newActiveState = !workflow.active

    // Toggle workflow active state
    const toggleResponse = await fetch(
      `${N8N_API_URL}/workflows/${workflowId}/${newActiveState ? 'activate' : 'deactivate'}`,
      {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
        },
      }
    )

    if (!toggleResponse.ok) {
      console.error(`n8n API error: ${toggleResponse.status}`)
      return NextResponse.json(
        { error: `Erro ao ${newActiveState ? 'ativar' : 'desativar'} workflow` },
        { status: toggleResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Agente ${newActiveState ? 'ativado' : 'desativado'} com sucesso`,
      active: newActiveState,
    })
  } catch (error) {
    console.error('Error toggling n8n agent:', error)
    return NextResponse.json(
      {
        error: 'Falha ao alterar estado do agente',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
