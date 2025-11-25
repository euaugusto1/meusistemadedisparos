import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação N8N
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== N8N_API_KEY) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const campaignId = params.id
    const supabase = createAdminClient()

    // Buscar a campanha para validar
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id, title')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Buscar items pendentes da campanha
    const { data: items, error: itemsError } = await supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (itemsError) {
      console.error('Error fetching campaign items:', itemsError)
      return NextResponse.json(
        { error: 'Erro ao buscar destinatários', details: itemsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        title: campaign.title
      },
      items: items || [],
      count: items?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in campaign items route:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
