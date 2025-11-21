# Guia de Segurança e Monitoring - Araujo IA

## 📋 Índice

- [Sistema de Logging](#sistema-de-logging)
- [Rate Limiting](#rate-limiting)
- [Validação de Inputs](#validação-de-inputs)
- [Error Boundary](#error-boundary)
- [Health Check](#health-check)
- [Best Practices](#best-practices)

---

## 🔍 Sistema de Logging

### Uso Básico

```typescript
import { logger } from '@/lib/logger'

// Diferentes níveis
logger.debug('Debug info', { data: 123 })
logger.info('Operation completed')
logger.warn('Warning message', { userId: '123' })
logger.error('Error occurred', error, { context: 'payment' })
logger.fatal('Critical failure', error)

// Helpers especializados
logger.request('POST', '/api/users', { userId: '123' })
logger.database('SELECT * FROM profiles', 150) // 150ms
logger.event('user_registered', { userId: '123' })
```

### Contexto de Request

```typescript
import { createRequestContext } from '@/lib/logger'

export async function POST(request: Request) {
  const context = createRequestContext(request)
  logger.info('Processing request', context)

  context.userId = user.id // Adicionar mais contexto
  logger.info('User authenticated', context)
}
```

---

## 🛡️ Rate Limiting

### Presets Disponíveis

```typescript
import { RateLimitPresets } from '@/lib/rate-limit'

// PUBLIC: 100 requests / 15 minutos
// AUTH: 5 requests / 15 minutos
// PAYMENT: 10 requests / 1 hora
// DISPATCH: 50 requests / 1 minuto
// ADMIN: 200 requests / 15 minutos
```

### Aplicar em API Route

```typescript
import { applyRateLimit, rateLimitExceeded, RateLimitPresets } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Aplicar rate limit
  const rateLimit = applyRateLimit(request, RateLimitPresets.AUTH)

  if (!rateLimit.allowed) {
    return rateLimitExceeded(rateLimit.resetTime)
  }

  // ... resto da lógica

  // Retornar com headers
  return NextResponse.json(data, {
    headers: rateLimit.headers
  })
}
```

### Custom Rate Limit

```typescript
const customLimit = {
  maxRequests: 30,
  windowMs: 10 * 60 * 1000, // 10 minutos
}

const rateLimit = applyRateLimit(request, customLimit)
```

---

## ✅ Validação de Inputs

### Schemas Disponíveis

```typescript
import {
  loginSchema,
  signupSchema,
  updateUserSchema,
  sendMessageSchema,
  createCampaignSchema,
  // ... outros
} from '@/lib/validation'
```

### Validar Dados

```typescript
import { validateData, sendMessageSchema } from '@/lib/validation'

export async function POST(request: Request) {
  const body = await request.json()

  const validation = validateData(sendMessageSchema, body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.errors
    }, { status: 400 })
  }

  // validation.data está tipado e validado!
  const { instance_id, number, message } = validation.data
}
```

### Sanitizar Dados

```typescript
import { sanitizeString, sanitizeObject } from '@/lib/validation'

// String
const clean = sanitizeString(userInput) // Remove HTML, scripts

// Objeto inteiro
const cleanData = sanitizeObject(formData)
```

### Criar Novo Schema

```typescript
import { z } from 'zod'

export const mySchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(['user', 'admin']),
  metadata: z.record(z.any()).optional(),
})
```

---

## 🚨 Error Boundary

### Uso em Layout

```typescript
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

### Error Boundary Custom

```typescript
<ErrorBoundary
  fallback={
    <div>Erro customizado!</div>
  }
>
  <MyComponent />
</ErrorBoundary>
```

### Hook para Erros

```typescript
import { useErrorHandler } from '@/components/ErrorBoundary'

function MyComponent() {
  const handleError = useErrorHandler()

  const doSomething = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      handleError(error) // Propaga para Error Boundary
    }
  }
}
```

---

## 💚 Health Check

### Endpoint

```
GET /api/health
```

### Resposta

```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 45
    },
    "environment": {
      "status": "ok"
    },
    "api": {
      "status": "ok",
      "latency": 2
    }
  },
  "latency": 50
}
```

### Monitoring

Use ferramentas como:
- **UptimeRobot** - Ping a cada 5 minutos
- **Pingdom** - Monitoring global
- **Datadog** - APM completo

---

## 🔐 Best Practices

### 1. API Route Completa e Segura

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyRateLimit, rateLimitExceeded, RateLimitPresets } from '@/lib/rate-limit'
import { logger, createRequestContext } from '@/lib/logger'
import { validateData, mySchema, sanitizeObject } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const context = createRequestContext(request)

  try {
    // 1. Rate Limiting
    const rateLimit = applyRateLimit(request, RateLimitPresets.PUBLIC)
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', context)
      return rateLimitExceeded(rateLimit.resetTime)
    }

    // 2. Authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logger.warn('Unauthorized', context)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    context.userId = user.id

    // 3. Input Validation
    const body = await request.json()
    const sanitized = sanitizeObject(body)

    const validation = validateData(mySchema, sanitized)
    if (!validation.success) {
      logger.warn('Validation failed', { ...context, errors: validation.errors })
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 })
    }

    // 4. Business Logic
    const result = await doSomething(validation.data)

    logger.info('Operation successful', context)

    // 5. Response com headers
    return NextResponse.json(
      { success: true, data: result },
      { headers: rateLimit.headers }
    )

  } catch (error) {
    logger.fatal('Unexpected error', error instanceof Error ? error : new Error(String(error)), context)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Níveis de Segurança por Endpoint

| Tipo | Auth | Rate Limit | Validation | Logging |
|------|------|------------|------------|---------|
| Público | ❌ | PUBLIC | ✅ | INFO |
| Autenticado | ✅ | PUBLIC | ✅ | INFO |
| Admin | ✅ + Role | ADMIN | ✅ | WARN |
| Payment | ✅ | PAYMENT | ✅ | INFO |
| Webhook | ❌ (assinatura) | PAYMENT | ✅ | INFO |

### 3. Checklist de Segurança

- [ ] Rate limiting aplicado
- [ ] Input validation com Zod
- [ ] Sanitização de strings
- [ ] Logging adequado (não logar senhas/tokens)
- [ ] Error handling com try/catch
- [ ] Autenticação verificada
- [ ] Autorização (roles) verificada
- [ ] HTTPS em produção
- [ ] Variáveis de ambiente protegidas
- [ ] RLS habilitado no Supabase

### 4. O que NÃO fazer

❌ **Não logar dados sensíveis**
```typescript
// MAL
logger.info('User login', { password: user.password })

// BOM
logger.info('User login', { userId: user.id })
```

❌ **Não confiar em inputs**
```typescript
// MAL
const { userId } = req.body
await db.delete(userId)

// BOM
const validation = validateData(schema, req.body)
if (!validation.success) return error
await db.delete(validation.data.userId)
```

❌ **Não expor stack traces em produção**
```typescript
// MAL
catch (error) {
  return res.json({ error: error.stack })
}

// BOM
catch (error) {
  logger.error('Error', error)
  return res.json({ error: 'Internal server error' })
}
```

---

## 📊 Monitoring em Produção

### Métricas para Monitorar

1. **Availability** - Uptime do serviço
2. **Response Time** - Latência das APIs
3. **Error Rate** - Taxa de erros 4xx/5xx
4. **Rate Limit Hits** - Quantos requests são bloqueados
5. **Database Latency** - Tempo de resposta do Supabase

### Ferramentas Recomendadas

- **Sentry** - Error tracking
- **LogRocket** - Session replay + logs
- **Datadog** - APM completo
- **New Relic** - Performance monitoring
- **UptimeRobot** - Uptime monitoring (free)

### Alertas Importantes

- Uptime < 99%
- Response time > 1s
- Error rate > 1%
- Database connection failures
- Rate limit abuse (mesmo IP/user)

---

## 🔧 Configuração em Produção

### Environment Variables

```bash
# Logging
LOG_LEVEL=info # debug|info|warn|error|fatal

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOGROCKET_APP_ID=your-logrocket-id
```

### Nginx Config (se aplicável)

```nginx
# Rate limiting no nginx level
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
```

---

## 📚 Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/auth/managing-user-data)
- [Zod Documentation](https://zod.dev/)

---

**Última atualização:** 2025-01-21
**Versão:** 1.0.0
