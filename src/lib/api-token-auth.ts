/**
 * API Token Authentication Middleware
 *
 * Provides authentication for external API access using admin-generated tokens.
 * Tokens are validated against the api_tokens table in Supabase.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface TokenValidationResult {
  isValid: boolean
  userId: string | null
  scopes: string[]
  error?: string
}

/**
 * Extract API token from request headers
 *
 * Supports multiple header formats:
 * - Authorization: Bearer wpp_xxxxx
 * - X-API-Token: wpp_xxxxx
 * - X-Admin-Token: wpp_xxxxx
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header (Bearer format)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try X-API-Token header
  const apiTokenHeader = request.headers.get('x-api-token')
  if (apiTokenHeader) {
    return apiTokenHeader
  }

  // Try X-Admin-Token header
  const adminTokenHeader = request.headers.get('x-admin-token')
  if (adminTokenHeader) {
    return adminTokenHeader
  }

  return null
}

/**
 * Validate an API token
 *
 * Checks:
 * 1. Token exists in database
 * 2. Token is active
 * 3. Token is not expired
 * 4. Updates last_used_at timestamp
 *
 * @param token - The API token to validate
 * @returns TokenValidationResult with validation status and user info
 */
export async function validateApiToken(
  token: string
): Promise<TokenValidationResult> {
  try {
    // Validate token format
    if (!token || !token.startsWith('wpp_') || token.length < 36) {
      return {
        isValid: false,
        userId: null,
        scopes: [],
        error: 'Invalid token format'
      }
    }

    const supabase = createClient()

    // Call Supabase function to validate token
    const { data, error } = await supabase
      .rpc('validate_api_token', { p_token: token })

    if (error) {
      console.error('[API Token Auth] Validation error:', error)
      return {
        isValid: false,
        userId: null,
        scopes: [],
        error: 'Token validation failed'
      }
    }

    // Check if we got a valid response
    if (!data || data.length === 0) {
      return {
        isValid: false,
        userId: null,
        scopes: [],
        error: 'Token not found'
      }
    }

    const tokenData = data[0]

    // Check if token is valid
    if (!tokenData.is_valid) {
      return {
        isValid: false,
        userId: null,
        scopes: [],
        error: 'Token is inactive or expired'
      }
    }

    // Update last_used_at timestamp (async, don't wait)
    void supabase
      .rpc('update_api_token_last_used', { p_token: token })
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('[API Token Auth] Failed to update last_used_at:', updateError)
        } else {
          console.log(`[API Token Auth] Token used: ${token.substring(0, 12)}...`)
        }
      })

    return {
      isValid: true,
      userId: tokenData.user_id,
      scopes: tokenData.scopes || [],
      error: undefined
    }
  } catch (error) {
    console.error('[API Token Auth] Unexpected error:', error)
    return {
      isValid: false,
      userId: null,
      scopes: [],
      error: 'Internal authentication error'
    }
  }
}

/**
 * Middleware to require valid API token
 *
 * Usage in API routes:
 *
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await requireApiToken(request)
 *   if (!authResult.isValid) {
 *     return NextResponse.json(
 *       { error: authResult.error },
 *       { status: 401 }
 *     )
 *   }
 *
 *   // Use authResult.userId to access user context
 *   // ...
 * }
 * ```
 */
export async function requireApiToken(
  request: NextRequest
): Promise<TokenValidationResult> {
  const token = extractTokenFromRequest(request)

  if (!token) {
    return {
      isValid: false,
      userId: null,
      scopes: [],
      error: 'No API token provided'
    }
  }

  return validateApiToken(token)
}

/**
 * Check if token has required scope
 *
 * @param result - Token validation result
 * @param requiredScope - The scope to check for
 * @returns true if token has the required scope
 */
export function hasScope(
  result: TokenValidationResult,
  requiredScope: string
): boolean {
  if (!result.isValid) {
    return false
  }

  // If no scopes defined, allow all (backward compatibility)
  if (!result.scopes || result.scopes.length === 0) {
    return true
  }

  // Check if specific scope exists
  if (result.scopes.includes(requiredScope)) {
    return true
  }

  // Check for wildcard scope
  if (result.scopes.includes('*')) {
    return true
  }

  return false
}

/**
 * Middleware to require valid API token with specific scope
 *
 * Usage:
 * ```typescript
 * const authResult = await requireApiTokenWithScope(request, 'campaigns:write')
 * if (!authResult.isValid) {
 *   return NextResponse.json({ error: authResult.error }, { status: 401 })
 * }
 * ```
 */
export async function requireApiTokenWithScope(
  request: NextRequest,
  requiredScope: string
): Promise<TokenValidationResult> {
  const result = await requireApiToken(request)

  if (!result.isValid) {
    return result
  }

  if (!hasScope(result, requiredScope)) {
    return {
      isValid: false,
      userId: result.userId,
      scopes: result.scopes,
      error: `Missing required scope: ${requiredScope}`
    }
  }

  return result
}

/**
 * Available scopes for API tokens
 */
export const API_SCOPES = {
  // Campaigns
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_WRITE: 'campaigns:write',
  CAMPAIGNS_DELETE: 'campaigns:delete',

  // Instances
  INSTANCES_READ: 'instances:read',
  INSTANCES_WRITE: 'instances:write',
  INSTANCES_DELETE: 'instances:delete',

  // Templates
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_WRITE: 'templates:write',
  TEMPLATES_DELETE: 'templates:delete',

  // Contacts
  CONTACTS_READ: 'contacts:read',
  CONTACTS_WRITE: 'contacts:write',
  CONTACTS_DELETE: 'contacts:delete',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // Admin
  ADMIN_ALL: 'admin:*',

  // Wildcard (all permissions)
  ALL: '*'
} as const

export type ApiScope = typeof API_SCOPES[keyof typeof API_SCOPES]
