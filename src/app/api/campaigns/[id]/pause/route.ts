import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const campaignId = params.id
    const body = await request.json()
    const { pauseUntil, reason } = body

    // Get campaign to verify ownership
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Check if campaign can be paused
    if (!['scheduled', 'processing'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Apenas campanhas agendadas ou em processamento podem ser pausadas' },
        { status: 400 }
      )
    }

    // Update campaign
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        is_paused: true,
        pause_until: pauseUntil || null,
        status: 'paused',
      })
      .eq('id', campaignId)

    if (updateError) {
      throw updateError
    }

    // Log the action
    await supabase.from('campaign_schedule_logs').insert({
      campaign_id: campaignId,
      user_id: user.id,
      action: 'paused',
      reason: reason || null,
      metadata: {
        pause_until: pauseUntil,
        previous_status: campaign.status,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Campanha pausada com sucesso',
    })
  } catch (error) {
    console.error('Error pausing campaign:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro ao pausar campanha',
      },
      { status: 500 }
    )
  }
}
