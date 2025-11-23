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
    const { reason } = body

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

    // Check if campaign can be cancelled
    if (['completed', 'cancelled', 'failed'].includes(campaign.status)) {
      return NextResponse.json(
        { error: 'Campanha já foi finalizada' },
        { status: 400 }
      )
    }

    // Update campaign
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'cancelled',
        is_paused: false,
        pause_until: null,
      })
      .eq('id', campaignId)

    if (updateError) {
      throw updateError
    }

    // Log the action
    await supabase.from('campaign_schedule_logs').insert({
      campaign_id: campaignId,
      user_id: user.id,
      action: 'cancelled',
      reason: reason || null,
      metadata: {
        previous_status: campaign.status,
        sent_count: campaign.sent_count,
        total_recipients: campaign.total_recipients,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Campanha cancelada com sucesso',
    })
  } catch (error) {
    console.error('Error cancelling campaign:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao cancelar campanha',
      },
      { status: 500 }
    )
  }
}
