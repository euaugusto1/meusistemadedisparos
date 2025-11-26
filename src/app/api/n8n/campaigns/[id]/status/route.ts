import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { corsPreflightResponse, jsonResponseWithCors } from '@/lib/cors'
import type { CampaignStatus } from '@/types'

export const dynamic = 'force-dynamic'

// Handle CORS preflight
export async function OPTIONS() {
  return corsPreflightResponse()
}

const N8N_API_KEY = process.env.N8N_API_KEY || ''

const VALID_STATUSES: CampaignStatus[] = ['draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'paused']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação N8N
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== N8N_API_KEY) {
      return jsonResponseWithCors(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const campaignId = params.id
    const body = await request.json()
    const { status, started_at } = body

    // Validar status
    if (!status || !VALID_STATUSES.includes(status)) {
      return jsonResponseWithCors(
        { error: 'Status inválido', validStatuses: VALID_STATUSES },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Preparar dados para atualização
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Se está começando o processamento, marcar started_at
    if (status === 'processing' && !started_at) {
      updateData.started_at = new Date().toISOString()
    } else if (started_at) {
      updateData.started_at = started_at
    }

    // Atualizar status da campanha
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select('id, title, status, started_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating campaign status:', error)
      return jsonResponseWithCors(
        { error: 'Erro ao atualizar status', details: error.message },
        { status: 500 }
      )
    }

    if (!campaign) {
      return jsonResponseWithCors(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Padronizado: campaignId sempre no nível raiz para consistência no N8N
    return jsonResponseWithCors({
      success: true,
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      startedAt: campaign.started_at,
      updatedAt: campaign.updated_at,
      message: `Status atualizado para: ${status}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in campaign status route:', error)
    return jsonResponseWithCors(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
