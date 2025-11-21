/**
 * Sistema de Rate Limiting
 * Protege APIs contra abuse usando sliding window algorithm
 */

import { logger } from './logger'

interface RateLimitConfig {
  maxRequests: number // Número máximo de requests
  windowMs: number // Janela de tempo em millisegundos
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store em memória (para produção, usar Redis)
const store = new Map<string, RateLimitEntry>()

// Configurações padrão para diferentes tipos de endpoints
export const RateLimitPresets = {
  // APIs públicas
  PUBLIC: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  // APIs de autenticação
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  // APIs de pagamento
  PAYMENT: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
  },
  // APIs de disparo (WhatsApp)
  DISPATCH: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minuto
  },
  // APIs admin
  ADMIN: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
}

/**
 * Verifica se um IP/identificador excedeu o limite de taxa
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RateLimitPresets.PUBLIC
): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const key = `ratelimit:${identifier}`

  // Limpar entradas expiradas (cleanup básico)
  if (store.size > 10000) {
    Array.from(store.entries()).forEach(([k, v]) => {
      if (v.resetTime < now) {
        store.delete(k)
      }
    })
  }

  let entry = store.get(key)

  // Se não existe ou expirou, criar nova entrada
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  entry.count++
  store.set(key, entry)

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  if (!allowed) {
    logger.warn('Rate limit exceeded', {
      identifier,
      count: entry.count,
      maxRequests: config.maxRequests,
    })
  }

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Middleware helper para rate limiting em API routes
 */
export function withRateLimit(
  request: Request,
  config: RateLimitConfig = RateLimitPresets.PUBLIC
) {
  // Identificar por IP (em produção, considerar usar user ID se autenticado)
  const identifier = getIdentifier(request)

  const result = checkRateLimit(identifier, config)

  return {
    ...result,
    headers: getRateLimitHeaders(result, config),
  }
}

/**
 * Extrai identificador único do request (IP ou user ID)
 */
function getIdentifier(request: Request): string {
  // Tentar obter IP real (considerando proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Cria headers HTTP padrão para rate limiting
 */
function getRateLimitHeaders(
  result: { remaining: number; resetTime: number },
  config: RateLimitConfig
): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  }
}

/**
 * Cria resposta de rate limit excedido
 */
export function rateLimitExceeded(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

/**
 * Helper para aplicar rate limit em API route
 *
 * Exemplo de uso:
 * ```ts
 * export async function POST(request: Request) {
 *   const rateLimit = applyRateLimit(request, RateLimitPresets.AUTH)
 *   if (!rateLimit.allowed) {
 *     return rateLimitExceeded(rateLimit.resetTime)
 *   }
 *
 *   // ... resto da lógica
 * }
 * ```
 */
export function applyRateLimit(
  request: Request,
  config: RateLimitConfig = RateLimitPresets.PUBLIC
) {
  return withRateLimit(request, config)
}
