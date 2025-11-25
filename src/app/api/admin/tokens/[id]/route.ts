import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyRateLimit, RateLimitPresets, rateLimitExceeded } from '@/lib/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Verify token belongs to this admin
    const { data: token, error: fetchError } = await supabase
      .from('api_tokens')
      .select('id, name, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404, headers }
      )
    }

    if (token.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own tokens' },
        { status: 403, headers }
      )
    }

    // Delete the token
    const { error: deleteError } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[API] Error deleting token:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete token' },
        { status: 500, headers }
      )
    }

    // Log the action
    console.log(`[API] Admin ${user.email} deleted API token: ${token.name}`)

    return NextResponse.json(
      {
        success: true,
        message: 'API token deleted successfully'
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('[API] Error in delete token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()

    // Verify token belongs to this admin
    const { data: token, error: fetchError } = await supabase
      .from('api_tokens')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404, headers }
      )
    }

    if (token.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own tokens' },
        { status: 403, headers }
      )
    }

    // Prepare update data (only allow specific fields)
    const updateData: any = {}
    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.scopes) updateData.scopes = body.scopes

    // Update the token
    const { data: updatedToken, error: updateError } = await supabase
      .from('api_tokens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[API] Error updating token:', updateError)
      return NextResponse.json(
        { error: 'Failed to update token' },
        { status: 500, headers }
      )
    }

    // Remove actual token value from response
    const sanitizedToken = {
      ...updatedToken,
      token: `${updatedToken.token.substring(0, 12)}${'*'.repeat(36)}`
    }

    // Log the action
    console.log(`[API] Admin ${user.email} updated API token: ${updatedToken.name}`)

    return NextResponse.json(
      {
        success: true,
        message: 'API token updated successfully',
        token: sanitizedToken
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('[API] Error in update token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
