import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyRateLimit, RateLimitPresets, rateLimitExceeded } from '@/lib/rate-limit'
import { z } from 'zod'

// Validation schema
const generateTokenSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
  scopes: z.array(z.string()).optional().default([])
})

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = generateTokenSchema.parse(body)

    // Generate token using Supabase function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_api_token')

    if (tokenError || !tokenData) {
      console.error('[API] Error generating token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500, headers }
      )
    }

    const token = tokenData as string

    // Calculate expiration date
    let expiresAt: string | null = null
    if (validatedData.expiresInDays) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + validatedData.expiresInDays)
      expiresAt = expiryDate.toISOString()
    }

    // Insert token record
    const { data: newToken, error: insertError } = await supabase
      .from('api_tokens')
      .insert({
        user_id: user.id,
        token,
        name: validatedData.name,
        description: validatedData.description || null,
        scopes: validatedData.scopes,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API] Error inserting token:', insertError)
      return NextResponse.json(
        { error: 'Failed to save token' },
        { status: 500, headers }
      )
    }

    // Log the action
    console.log(`[API] Admin ${user.email} generated API token: ${validatedData.name}`)

    return NextResponse.json(
      {
        success: true,
        message: 'API token generated successfully',
        token: newToken,
        // Include the actual token string only once (for copying)
        tokenString: token,
        warning: 'Save this token now. You won\'t be able to see it again!'
      },
      { status: 201, headers }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('[API] Error in generate token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
