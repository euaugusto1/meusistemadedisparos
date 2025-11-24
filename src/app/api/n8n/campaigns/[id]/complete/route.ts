import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const supabase = createClient()

    // Buscar campanha com seus items
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, title, total_recipients, sent_count, failed_count, status')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se ainda há items pendentes
    const { count: pendingCount } = await supabase
      .from('campaign_items')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')

    // Determinar status final
    let finalStatus: 'completed' | 'failed' | 'processing' = 'completed'

    if (pendingCount && pendingCount > 0) {
      // Ainda há items pendentes, não finalizar
      return NextResponse.json({
        success: false,
        message: 'Ainda há destinatários pendentes',
        pendingCount,
        campaign: {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status
        }
      })
    }

    // Se nenhum enviado com sucesso, marcar como failed
    if (campaign.sent_count === 0 && campaign.failed_count > 0) {
      finalStatus = 'failed'
    }

    // Atualizar campanha como concluída
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error completing campaign:', updateError)
      return NextResponse.json(
        { error: 'Erro ao finalizar campanha', details: updateError.message },
        { status: 500 }
      )
    }

    // Calcular estatísticas finais
    const successRate = campaign.total_recipients > 0
      ? ((campaign.sent_count / campaign.total_recipients) * 100).toFixed(2)
      : '0.00'

    return NextResponse.json({
      success: true,
      campaign: updated,
      statistics: {
        total_recipients: campaign.total_recipients,
        sent_count: campaign.sent_count,
        failed_count: campaign.failed_count,
        success_rate: `${successRate}%`,
        final_status: finalStatus
      },
      message: `Campanha finalizada com status: ${finalStatus}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in complete campaign route:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
