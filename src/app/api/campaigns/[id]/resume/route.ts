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

    // Check if campaign is paused
    if (!campaign.is_paused) {
      return NextResponse.json(
        { error: 'Campanha não está pausada' },
        { status: 400 }
      )
    }

    // Determine new status based on previous state
    let newStatus = 'scheduled'
    if (campaign.sent_count > 0) {
      newStatus = 'processing'
    } else if (campaign.schedule_type === 'immediate') {
      newStatus = 'processing'
    }

    // Update campaign
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        is_paused: false,
        pause_until: null,
        status: newStatus,
      })
      .eq('id', campaignId)

    if (updateError) {
      throw updateError
    }

    // Log the action
    await supabase.from('campaign_schedule_logs').insert({
      campaign_id: campaignId,
      user_id: user.id,
      action: 'resumed',
      reason: reason || null,
      metadata: {
        new_status: newStatus,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Campanha retomada com sucesso',
    })
  } catch (error) {
    console.error('Error resuming campaign:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro ao retomar campanha',
      },
      { status: 500 }
    )
  }
}
