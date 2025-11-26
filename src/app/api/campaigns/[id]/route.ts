import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireApiToken } from '@/lib/api-token-auth'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id

    if (!campaignId) {
      return NextResponse.json(
        { error: 'ID da campanha é obrigatório' },
        { status: 400 }
      )
    }

    let userId: string | null = null
    let isAdmin = false

    // 1. Try N8N API Key (Bearer token from environment)
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')

    if (bearerToken && N8N_API_KEY && bearerToken === N8N_API_KEY) {
      isAdmin = true
    } else {
      // 2. Try API token auth (wpp_xxx tokens)
      const tokenAuth = await requireApiToken(request)

      if (tokenAuth.isValid && tokenAuth.userId) {
        userId = tokenAuth.userId
        const supabase = createAdminClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        isAdmin = profile?.role === 'admin'
      } else {
        // 3. Fall back to Supabase session auth
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.json(
            {
              error: 'Não autorizado',
              message: 'Use Bearer token (N8N_API_KEY), API token (wpp_xxx), ou sessão autenticada.'
            },
            { status: 401 }
          )
        }
        userId = user.id

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        isAdmin = profile?.role === 'admin'
      }
    }

    const supabase = createAdminClient()

    // Build query
    let query = supabase
      .from('campaigns')
      .select(`
        id,
        user_id,
        title,
        message,
        status,
        schedule_type,
        scheduled_at,
        timezone,
        total_recipients,
        sent_count,
        failed_count,
        min_delay,
        max_delay,
        throttle_enabled,
        throttle_rate,
        throttle_delay,
        link_url,
        button_type,
        buttons,
        is_paused,
        created_at,
        updated_at,
        instance:whatsapp_instances(id, name, status, phone_number),
        media:media_files(id, file_name, original_name, mime_type, size_bytes, public_url)
      `)
      .eq('id', campaignId)
      .single()

    const { data: campaign, error } = await query

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campanha não encontrada' },
          { status: 404 }
        )
      }
      console.error('Error fetching campaign:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar campanha' },
        { status: 500 }
      )
    }

    // Check permission if not admin
    if (!isAdmin && userId && campaign.user_id !== userId) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta campanha' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      campaign
    })

  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
