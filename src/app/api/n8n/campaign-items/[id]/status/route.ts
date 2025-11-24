import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CampaignItemStatus } from '@/types'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

const VALID_STATUSES: CampaignItemStatus[] = ['pending', 'sent', 'failed']

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

    const itemId = params.id
    const body = await request.json()
    const { status, error_message, response_data } = body

    // Validar status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido', validStatuses: VALID_STATUSES },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Preparar dados para atualização
    const updateData: any = {
      status
    }

    // Se foi enviado com sucesso, marcar sent_at
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
      updateData.error_message = null
    }

    // Se falhou, salvar erro
    if (status === 'failed' && error_message) {
      updateData.error_message = error_message
    }

    // Salvar dados da resposta se fornecidos
    if (response_data) {
      updateData.response_data = response_data
    }

    // Atualizar item
    const { data: item, error } = await supabase
      .from('campaign_items')
      .update(updateData)
      .eq('id', itemId)
      .select('id, campaign_id, recipient, status, sent_at, error_message')
      .single()

    if (error) {
      console.error('Error updating campaign item:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar item', details: error.message },
        { status: 500 }
      )
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // Se foi enviado com sucesso, decrementar créditos do usuário
    if (status === 'sent') {
      // Buscar user_id da campanha
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('user_id')
        .eq('id', item.campaign_id)
        .single()

      if (campaign) {
        // Decrementar crédito
        await supabase.rpc('decrement_user_credits', {
          user_uuid: campaign.user_id,
          amount: 1
        })
      }
    }

    return NextResponse.json({
      success: true,
      item,
      message: `Status atualizado para: ${status}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in campaign item status route:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
