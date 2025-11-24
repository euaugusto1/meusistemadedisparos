import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(request: NextRequest) {
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

    const supabase = createClient()

    // Buscar campanhas pendentes de instâncias de teste
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        instance:whatsapp_instances!campaigns_instance_id_fkey(
          id,
          user_id,
          name,
          instance_key,
          api_token,
          status,
          phone_number,
          is_test,
          expires_at
        ),
        media:media_files(
          id,
          public_url,
          original_name,
          type,
          mime_type
        )
      `)
      .in('status', ['scheduled', 'draft'])
      .not('instance_id', 'is', null)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar campanhas', details: error.message },
        { status: 500 }
      )
    }

    // Filtrar apenas campanhas de instâncias de teste Evolution API
    const testCampaigns = campaigns?.filter(campaign => {
      const instance = campaign.instance as any
      if (!instance) return false

      // Verifica se é instância de teste com Evolution API
      const isTest = instance.is_test === true
      const hasEvolutionToken = !!instance.api_token
      const notExpired = !instance.expires_at || new Date(instance.expires_at) > new Date()

      // Verifica se está agendada para agora ou sem agendamento
      const isReadyToSend = !campaign.scheduled_for || new Date(campaign.scheduled_for) <= new Date()

      return isTest && hasEvolutionToken && notExpired && isReadyToSend
    }) || []

    return NextResponse.json({
      success: true,
      campaigns: testCampaigns,
      count: testCampaigns.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in test-campaigns route:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
