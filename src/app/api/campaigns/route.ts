import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateApiToken } from '@/lib/api-token-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Try API token auth first, then fall back to Supabase auth
    const tokenAuth = await validateApiToken(request, ['campaigns:read'])

    let userId: string

    if (tokenAuth.valid && tokenAuth.userId) {
      userId = tokenAuth.userId
    } else {
      // Fall back to Supabase session auth
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        )
      }
      userId = user.id
    }

    const supabase = createClient()

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
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

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
