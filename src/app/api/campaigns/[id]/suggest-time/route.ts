import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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
    const { searchParams } = new URL(request.url)
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'

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

    // Call Supabase function to get suggested time
    const { data, error } = await supabase.rpc('get_suggested_send_time', {
      p_campaign_id: campaignId,
      p_timezone: timezone,
    })

    if (error) {
      throw error
    }

    // In production, this would also analyze:
    // - Contact timezone distribution
    // - Historical engagement data
    // - Best performing sending times
    // - Contact's typical response patterns

    const suggestedTime = data as string
    const analysis = {
      suggested_time: suggestedTime,
      timezone: timezone,
      confidence: 'high',
      reasons: [
        'Baseado em horário comercial (10h-16h)',
        'Evita finais de semana',
        'Otimizado para maior engajamento',
      ],
      alternative_times: [
        {
          time: new Date(new Date(suggestedTime).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          label: '+2 horas',
        },
        {
          time: new Date(new Date(suggestedTime).getTime() + 4 * 60 * 60 * 1000).toISOString(),
          label: '+4 horas',
        },
      ],
    }

    // Update campaign with suggested time
    await supabase
      .from('campaigns')
      .update({
        suggested_send_time: suggestedTime,
        smart_timing: true,
      })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      ...analysis,
    })
  } catch (error) {
    console.error('Error suggesting time:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao sugerir horário',
      },
      { status: 500 }
    )
  }
}
