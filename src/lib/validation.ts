/**
 * Schemas de Validação com Zod
 * Validação de inputs para todas as APIs
 */

import { z } from 'zod'

// =====================================================
// SCHEMAS DE AUTENTICAÇÃO
// =====================================================

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter número'),
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
})

// =====================================================
// SCHEMAS DE USUÁRIO
// =====================================================

export const updateUserSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido'),
  role: z.enum(['admin', 'user']).optional(),
  plan_tier: z.enum(['free', 'bronze', 'silver', 'gold']).optional(),
  credits: z.number().int().min(0, 'Créditos não pode ser negativo').optional(),
  plan_expires_at: z.string().datetime().optional(),
})

export const profileUpdateSchema = z.object({
  full_name: z.string().min(3).max(100).optional(),
  avatar_url: z.string().url().optional(),
})

// =====================================================
// SCHEMAS DE INSTÂNCIA WHATSAPP
// =====================================================

export const createInstanceSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(50),
  webhook_url: z.string().url('URL de webhook inválida').optional(),
})

export const updateInstanceSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  webhook_url: z.string().url().optional(),
  status: z.enum(['connected', 'disconnected', 'connecting', 'qr_code']).optional(),
})

export const assignInstanceSchema = z.object({
  instanceId: z.string().uuid(),
  userId: z.string().uuid(),
})

// =====================================================
// SCHEMAS DE MENSAGEM
// =====================================================

export const phoneNumberSchema = z
  .string()
  .regex(/^[0-9]{10,15}$/, 'Número de telefone inválido (apenas dígitos, 10-15 caracteres)')

export const sendMessageSchema = z.object({
  instance_id: z.string().uuid('ID de instância inválido'),
  number: phoneNumberSchema,
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(4096),
  media_url: z.string().url('URL de mídia inválida').optional(),
  link_url: z.string().url('URL de link inválida').optional(),
  button_type: z.enum(['button', 'list', 'poll', 'carousel']).optional(),
  buttons: z
    .array(
      z.object({
        name: z.string().min(1).max(24),
        url: z.string().url().optional(),
        id: z.string().optional(),
        text: z.string().max(60).optional(),
        media_id: z.string().uuid().optional(),
      })
    )
    .max(10, 'Máximo 10 botões')
    .optional(),
})

// =====================================================
// SCHEMAS DE TEMPLATE
// =====================================================

export const createTemplateSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  message: z.string().min(1).max(4096),
  media_id: z.string().uuid().optional(),
  link_url: z.string().url().optional(),
  button_type: z.enum(['button', 'list', 'poll', 'carousel']).optional(),
  buttons: z
    .array(
      z.object({
        name: z.string().min(1).max(24),
        url: z.string().url().optional(),
        id: z.string().optional(),
        text: z.string().max(60).optional(),
        media_id: z.string().uuid().optional(),
      })
    )
    .max(10)
    .optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

// =====================================================
// SCHEMAS DE LISTA DE CONTATOS
// =====================================================

export const contactSchema = z.object({
  number: phoneNumberSchema,
  name: z.string().min(1).max(100).optional(),
})

export const createContactsListSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  contacts: z.array(contactSchema).min(1, 'Lista deve conter pelo menos 1 contato'),
})

export const updateContactsListSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  contacts: z.array(contactSchema).optional(),
})

// =====================================================
// SCHEMAS DE CAMPANHA
// =====================================================

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(100),
  instance_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  message: z.string().min(1).max(4096),
  media_id: z.string().uuid().optional(),
  link_url: z.string().url().optional(),
  button_type: z.enum(['button', 'list', 'poll', 'carousel']).optional(),
  buttons: z.array(z.any()).optional(),
  scheduled_for: z.string().datetime().optional(),
  min_delay: z.number().int().min(1, 'Delay mínimo deve ser 1 segundo').max(60),
  max_delay: z.number().int().min(1).max(300),
  recipients: z.array(contactSchema).min(1),
})

// =====================================================
// SCHEMAS DE PAGAMENTO
// =====================================================

export const createPaymentSchema = z.object({
  plan_tier: z.enum(['bronze', 'silver', 'gold']),
})

// =====================================================
// SCHEMAS DE SUPORTE
// =====================================================

export const createTicketSchema = z.object({
  subject: z.string().min(5, 'Assunto deve ter no mínimo 5 caracteres').max(200),
  message: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres').max(2000),
  priority: z.number().int().min(1).max(5).default(3),
})

export const sendSupportMessageSchema = z.object({
  ticket_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  attachments: z.array(z.string().url()).max(5).optional(),
})

// =====================================================
// HELPER PARA VALIDAÇÃO
// =====================================================

export type ValidationError = {
  field: string
  message: string
}

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: ValidationError[]
} {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  const errors: ValidationError[] = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))

  return {
    success: false,
    errors,
  }
}

// =====================================================
// SANITIZAÇÃO
// =====================================================

/**
 * Remove caracteres potencialmente perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .trim()
}

/**
 * Sanitiza objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj }

  for (const key in result) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key]) as any
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = sanitizeObject(result[key])
    }
  }

  return result
}
