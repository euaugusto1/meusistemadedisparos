import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function PATCH(
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
    const body = await request.json()
    const { increment_sent, increment_failed } = body

    const supabase = createAdminClient()

    // Buscar campanha atual
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, sent_count, failed_count')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Calcular novos valores
    const newSentCount = campaign.sent_count + (increment_sent || 0)
    const newFailedCount = campaign.failed_count + (increment_failed || 0)

    // Atualizar contadores
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update({
        sent_count: newSentCount,
        failed_count: newFailedCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select('id, title, sent_count, failed_count, total_recipients')
      .single()

    if (updateError) {
      console.error('Error updating campaign counters:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar contadores', details: updateError.message },
        { status: 500 }
      )
    }

    // Padronizado: campaignId sempre no nível raiz para consistência no N8N
    return NextResponse.json({
      success: true,
      campaignId: updated.id,
      title: updated.title,
      incremented: {
        sent: increment_sent || 0,
        failed: increment_failed || 0
      },
      progress: {
        total: updated.total_recipients,
        sent: updated.sent_count,
        failed: updated.failed_count,
        remaining: updated.total_recipients - updated.sent_count - updated.failed_count
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in campaign counters route:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
