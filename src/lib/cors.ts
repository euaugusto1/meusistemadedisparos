/**
 * CORS Helper
 *
 * Provides utilities for handling Cross-Origin Resource Sharing
 */

import { NextResponse } from 'next/server'

// CORS headers for API responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
  'Access-Control-Max-Age': '86400'
}

/**
 * Add CORS headers to a NextResponse
 */
export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

/**
 * Create a CORS preflight response
 */
export function corsPreflightResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  })
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponseWithCors(
  data: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  const response = NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      ...corsHeaders,
      ...init?.headers
    }
  })
  return response
}
