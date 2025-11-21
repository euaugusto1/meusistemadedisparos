import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Health Check Endpoint Avançado
 * Verifica saúde de todos os serviços críticos
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {}

  // 1. Check Database (Supabase)
  try {
    const dbStart = Date.now()
    const supabase = createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)

    checks.database = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - dbStart,
      error: error?.message,
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // 2. Check Environment Variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

  checks.environment = {
    status: missingEnvVars.length === 0 ? 'ok' : 'error',
    error: missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : undefined,
  }

  // 3. Check API Availability
  checks.api = {
    status: 'ok',
    latency: Date.now() - startTime,
  }

  // 4. Determinar status geral
  const allOk = Object.values(checks).every((check) => check.status === 'ok')
  const overallStatus = allOk ? 'healthy' : 'degraded'

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks,
    latency: Date.now() - startTime,
  }

  // Retornar status HTTP 503 se não saudável
  const statusCode = allOk ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
