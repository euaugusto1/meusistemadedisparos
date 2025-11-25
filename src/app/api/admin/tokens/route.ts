import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyRateLimit, RateLimitPresets, rateLimitExceeded } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = applyRateLimit(request, RateLimitPresets.ADMIN)

    if (!rateLimitResult.allowed) {
      return rateLimitExceeded(rateLimitResult.resetTime)
    }

    const headers = rateLimitResult.headers

    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403, headers }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'

    // Fetch tokens for this admin
    let query = supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: tokens, error: tokensError } = await query

    if (tokensError) {
      console.error('[API] Error fetching tokens:', tokensError)
      return NextResponse.json(
        { error: 'Failed to fetch tokens' },
        { status: 500, headers }
      )
    }

    // Remove actual token values from response (security)
    const sanitizedTokens = tokens?.map(token => ({
      ...token,
      token: `${token.token.substring(0, 12)}${'*'.repeat(36)}` // Show only first 12 chars
    }))

    return NextResponse.json(
      {
        success: true,
        tokens: sanitizedTokens || [],
        count: tokens?.length || 0
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('[API] Error in list tokens:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
