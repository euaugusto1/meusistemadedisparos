/**
 * Sistema de Logging para Banco de Dados
 * Registra eventos importantes no system_logs
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export type LogAction =
  // Auth
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'password_reset_request'
  | 'password_reset_complete'
  // Admin User Actions
  | 'user_blocked'
  | 'user_unblocked'
  | 'user_deleted'
  | 'credits_added'
  | 'credit_transfer'
  | 'user_profile_updated'
  | 'password_reset_sent'
  // Campaigns
  | 'campaign_created'
  | 'campaign_started'
  | 'campaign_completed'
  | 'campaign_failed'
  | 'campaign_cancelled'
  | 'campaign_paused'
  | 'campaign_resumed'
  // Instances
  | 'instance_created'
  | 'instance_connected'
  | 'instance_disconnected'
  | 'instance_deleted'
  | 'instance_transferred'
  | 'instance_qr_generated'
  // Plans & Payments
  | 'plan_purchased'
  | 'plan_upgraded'
  | 'plan_expired'
  | 'payment_received'
  | 'payment_failed'
  | 'payment_refunded'
  // Settings
  | 'settings_updated'
  | 'api_token_created'
  | 'api_token_deleted'
  // Contacts & Lists
  | 'contacts_list_created'
  | 'contacts_list_deleted'
  | 'contacts_imported'
  // Media
  | 'media_uploaded'
  | 'media_deleted'
  // Templates
  | 'template_created'
  | 'template_deleted'
  // Support
  | 'ticket_created'
  | 'ticket_replied'
  | 'ticket_closed'
  // System
  | 'system_error'
  | 'api_error'
  | 'webhook_received'

export interface LogDetails {
  [key: string]: unknown
}

interface CreateLogParams {
  userId?: string | null
  action: LogAction
  level?: LogLevel
  details?: LogDetails
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Registra um evento no system_logs (server-side)
 */
export async function createSystemLog(params: CreateLogParams): Promise<void> {
  const {
    userId,
    action,
    level = 'info',
    details = {},
    ipAddress,
    userAgent,
  } = params

  try {
    const supabase = createClient()

    await supabase.from('system_logs').insert({
      user_id: userId,
      action,
      level,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (error) {
    console.error('Failed to create system log:', error)
  }
}

/**
 * Registra um evento no system_logs (client-side)
 */
export async function createSystemLogClient(params: CreateLogParams): Promise<void> {
  const {
    userId,
    action,
    level = 'info',
    details = {},
  } = params

  try {
    const supabase = createBrowserClient()

    await supabase.from('system_logs').insert({
      user_id: userId,
      action,
      level,
      details,
    })
  } catch (error) {
    console.error('Failed to create system log:', error)
  }
}

/**
 * Helper para extrair IP e User-Agent de um Request
 */
export function extractRequestInfo(request: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ipAddress = forwardedFor?.split(',')[0] || realIp || null
  const userAgent = request.headers.get('user-agent') || null

  return { ipAddress, userAgent }
}

/**
 * Classe para logging com contexto
 */
export class SystemLogger {
  private userId: string | null
  private ipAddress: string | null
  private userAgent: string | null

  constructor(userId?: string | null, request?: Request) {
    this.userId = userId || null
    if (request) {
      const { ipAddress, userAgent } = extractRequestInfo(request)
      this.ipAddress = ipAddress
      this.userAgent = userAgent
    } else {
      this.ipAddress = null
      this.userAgent = null
    }
  }

  async log(action: LogAction, level: LogLevel = 'info', details?: LogDetails): Promise<void> {
    await createSystemLog({
      userId: this.userId,
      action,
      level,
      details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    })
  }

  async info(action: LogAction, details?: LogDetails): Promise<void> {
    await this.log(action, 'info', details)
  }

  async success(action: LogAction, details?: LogDetails): Promise<void> {
    await this.log(action, 'success', details)
  }

  async warning(action: LogAction, details?: LogDetails): Promise<void> {
    await this.log(action, 'warning', details)
  }

  async error(action: LogAction, details?: LogDetails): Promise<void> {
    await this.log(action, 'error', details)
  }
}

/**
 * Cria uma instância do SystemLogger a partir de uma requisição
 */
export function createSystemLogger(userId?: string | null, request?: Request): SystemLogger {
  return new SystemLogger(userId, request)
}
