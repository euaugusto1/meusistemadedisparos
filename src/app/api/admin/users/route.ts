import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { applyRateLimit, rateLimitExceeded, RateLimitPresets } from '@/lib/rate-limit'
import { logger, createRequestContext } from '@/lib/logger'
import { validateData, updateUserSchema, sanitizeObject } from '@/lib/validation'

export async function PUT(request: NextRequest) {
  const context = createRequestContext(request)

  try {
    // 1. Rate Limiting
    const rateLimit = applyRateLimit(request, RateLimitPresets.ADMIN)
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded on admin users endpoint', context)
      return rateLimitExceeded(rateLimit.resetTime)
    }

    // 2. Authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('Unauthorized access attempt', context)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    context.userId = user.id

    // 3. Authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      logger.warn('Non-admin user attempted admin operation', context)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Input Validation
    const body = await request.json()
    const sanitized = sanitizeObject(body)

    const validation = validateData(updateUserSchema, sanitized)
    if (!validation.success) {
      logger.warn('Validation failed', { ...context, errors: validation.errors })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // 5. Update user with validated data
    const { userId, role, plan_tier, credits, plan_expires_at } = validation.data

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({
        ...(role && { role }),
        ...(plan_tier && { plan_tier }),
        ...(credits !== undefined && { credits }),
        ...(plan_expires_at && { plan_expires_at }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating user profile', error, context)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logger.info('User profile updated successfully', {
      ...context,
      updatedUserId: userId,
    })

    // Return com rate limit headers
    return NextResponse.json(
      { success: true, data },
      {
        headers: rateLimit.headers,
      }
    )
  } catch (error) {
    logger.fatal(
      'Unexpected error in PUT /api/admin/users',
      error instanceof Error ? error : new Error(String(error)),
      context
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
