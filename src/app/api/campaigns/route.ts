import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireApiToken } from '@/lib/api-token-auth'

export const dynamic = 'force-dynamic'

const N8N_API_KEY = process.env.N8N_API_KEY || ''

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null
    let isAdmin = false

    // 1. Try N8N API Key (Bearer token from environment)
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')

    if (bearerToken && N8N_API_KEY && bearerToken === N8N_API_KEY) {
      // N8N authentication - admin access (can see all campaigns)
      isAdmin = true
    } else {
      // 2. Try API token auth (wpp_xxx tokens)
      const tokenAuth = await requireApiToken(request)

      if (tokenAuth.isValid && tokenAuth.userId) {
        userId = tokenAuth.userId
        // Check if user is admin
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
              message: 'Use Bearer token (N8N_API_KEY), API token (wpp_xxx), ou sessão autenticada.',
              hint: 'No Swagger, clique em "Authorize" e insira seu token'
            },
            { status: 401 }
          )
        }
        userId = user.id

        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        isAdmin = profile?.role === 'admin'
      }
    }

    const supabase = createAdminClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('campaigns')
      .select(`
        id,
        title,
        message,
        status,
        schedule_type,
        scheduled_at,
        total_recipients,
        sent_count,
        failed_count,
        min_delay,
        max_delay,
        is_paused,
        created_at,
        updated_at,
        instance:whatsapp_instances(id, name, status)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If not admin, only show user's own campaigns
    if (!isAdmin && userId) {
      query = query.eq('user_id', userId)
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar campanhas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: count || campaigns?.length || 0,
      campaigns: campaigns || [],
      pagination: {
        limit,
        offset,
        total: count || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/campaigns:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
