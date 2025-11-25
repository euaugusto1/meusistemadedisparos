/**
 * OpenAPI Specification Endpoint
 *
 * Serves the complete OpenAPI 3.0 specification as JSON
 * Used by Swagger UI and other API documentation tools
 * Admin-only access
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateOpenApiSpec, validateOpenApiSpec } from '@/lib/swagger/generator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/swagger
 *
 * Returns the complete OpenAPI specification
 * Requires admin authentication
 */
export async function GET() {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', details: 'Admin access required' },
        { status: 403 }
      )
    }

    // Validate spec before serving
    const validation = validateOpenApiSpec()

    if (!validation.valid) {
      console.error('[Swagger] Invalid OpenAPI specification:', validation.errors)
      return NextResponse.json(
        {
          error: 'Invalid OpenAPI specification',
          details: validation.errors
        },
        { status: 500 }
      )
    }

    // Generate and return the spec
    const spec = generateOpenApiSpec()

    return NextResponse.json(spec, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('[Swagger] Error generating OpenAPI spec:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate OpenAPI specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/swagger
 *
 * CORS preflight request handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}
