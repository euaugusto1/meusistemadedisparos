// =====================================================
// TIPOS DO SISTEMA
// =====================================================

// Enums
export type UserRole = 'admin' | 'user'
export type PlanTier = 'free' | 'bronze' | 'silver' | 'gold'
export type InstanceStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_code'
export type CampaignStatus = 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused'
export type CampaignItemStatus = 'pending' | 'sent' | 'failed'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MediaType = 'image' | 'video' | 'audio' | 'document'
export type ButtonType = 'button' | 'list' | 'poll' | 'carousel'
export type ScheduleType = 'immediate' | 'scheduled' | 'recurring' | 'smart'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly'

// Profile
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  plan_tier: PlanTier
  plan_expires_at: string | null
  credits: number
  created_at: string
  updated_at: string
}

// Plan
export interface Plan {
  id: string
  name: string
  description: string | null
  tier: PlanTier
  price: number
  credits: number
  duration_days: number
  features: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// API Token
export interface ApiToken {
  id: string
  user_id: string
  token: string
  name: string
  description: string | null
  scopes: string[]
  expires_at: string | null
  last_used_at: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

// System Settings
export interface SystemSetting {
  id: string
  key: string
  value: Record<string, any>
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

// Mercado Pago Settings
export interface MercadoPagoSettings {
  access_token: string
  public_key: string
  webhook_secret: string
  is_enabled: boolean
  use_sandbox: boolean
}

// Campaign Settings
export interface CampaignSettings {
  min_delay_seconds: number
  max_delay_seconds: number
}

// Terms of Service
export interface TermsVersion {
  id: string
  version: string
  content: string
  effective_date: string
  created_at: string
  is_active: boolean
}

export interface TermsAcceptance {
  id: string
  user_id: string
  terms_version_id: string
  accepted_at: string
  ip_address: string | null
  user_agent: string | null
}

// Payment Transaction
export interface PaymentTransaction {
  id: string
  user_id: string
  plan_tier: PlanTier
  amount: number
  credits_added: number
  payment_method: string
  payment_id: string | null
  status: string
  payment_data: Record<string, any>
  created_at: string
  updated_at: string
}

// WhatsApp Instance
export interface WhatsAppInstance {
  id: string
  user_id: string
  name: string
  instance_key: string
  token: string
  api_token?: string | null
  status: InstanceStatus
  phone_number: string | null
  webhook_url: string | null
  is_test: boolean
  expires_at: string | null
  server_url: string | null
  created_at: string
  updated_at: string
}

// Media File
export interface MediaFile {
  id: string
  user_id: string
  file_name: string
  original_name: string
  public_url: string
  storage_path: string
  mime_type: string
  type: MediaType
  size_bytes: number
  created_at: string
}

// Message Template
export interface MessageTemplate {
  id: string
  user_id: string
  name: string
  message: string
  media_id: string | null
  link_url: string | null
  button_type: ButtonType | null
  buttons: ButtonConfig[]
  is_favorite: boolean  // Se o template é favorito
  created_at: string
  updated_at: string
}

// Button Configuration
export interface ButtonConfig {
  name: string
  url?: string
  id?: string
  text?: string  // Texto curto do botão (máx 11 palavras)
  media_id?: string  // ID da mídia para o botão
}

// Contacts List
export interface ContactsList {
  id: string
  user_id: string
  name: string
  description: string | null
  contacts: Contact[]
  contact_count: number
  group_jid?: string | null  // JID do grupo WhatsApp (se importado de grupo)
  is_favorite: boolean  // Se a lista é favorita
  created_at: string
  updated_at: string
}

// Contact
export interface Contact {
  number: string
  name?: string
}

// Recurrence Pattern
export interface RecurrencePattern {
  type: RecurrenceType
  interval: number // Every X days/weeks/months
  days?: number[] // Days of week (0-6) for weekly, days of month for monthly
  time: string // HH:mm format
}

// Campaign
export interface Campaign {
  id: string
  user_id: string
  instance_id: string | null
  template_id: string | null
  title: string
  message: string
  media_id: string | null
  link_url: string | null
  button_type: ButtonType | null
  buttons: ButtonConfig[]
  status: CampaignStatus
  scheduled_for: string | null
  started_at: string | null
  completed_at: string | null
  total_recipients: number
  sent_count: number
  failed_count: number
  min_delay: number
  max_delay: number
  // Smart Scheduling fields
  schedule_type: ScheduleType
  scheduled_at: string | null
  timezone: string | null
  recurrence_pattern: RecurrencePattern | null
  throttle_enabled: boolean
  throttle_rate: number | null // messages per minute
  throttle_delay: number | null // delay in seconds
  smart_timing: boolean
  suggested_send_time: string | null
  pause_until: string | null
  is_paused: boolean
  created_at: string
  updated_at: string
}

// Schedule Log
export interface CampaignScheduleLog {
  id: string
  campaign_id: string
  user_id: string
  action: 'scheduled' | 'paused' | 'resumed' | 'cancelled' | 'sent'
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// Campaign Item
export interface CampaignItem {
  id: string
  campaign_id: string
  recipient: string
  recipient_name: string | null
  status: CampaignItemStatus
  sent_at: string | null
  error_message: string | null
  response_data: Record<string, unknown> | null
  created_at: string
}

// Support Ticket
export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  priority: number
  created_at: string
  updated_at: string
  closed_at: string | null
}

// Support Message
export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  attachments: string[]
  is_read: boolean
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  user_id: string
  plan_tier: PlanTier
  plan_expires_at: string | null
  credits: number
  days_remaining: number | null
  connected_instances: number
  total_campaigns: number
  total_sent: number
  total_failed: number
}

// Chart Data Types
export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface TimelineDataPoint {
  date: string
  sent: number
  failed: number
}

// N8N Integration Types
export type N8nWorkflowStatus = 'active' | 'inactive' | 'error'
export type N8nExecutionStatus = 'success' | 'error' | 'running' | 'waiting' | 'canceled'
export type N8nExecutionMode = 'webhook' | 'trigger' | 'manual'
export type N8nWorkflowType = 'ai_agent' | 'automation' | 'webhook' | 'scheduled'

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  isArchived: boolean
  workflowType?: N8nWorkflowType
  description?: string | null
  tags: string[]
  triggerCount: number
  createdAt: string
  updatedAt: string
  nodes?: any[]
  connections?: any
  settings?: any
}

export interface N8nExecution {
  id: string
  workflowId: string
  finished: boolean
  mode: N8nExecutionMode
  status: N8nExecutionStatus
  startedAt: string
  stoppedAt: string | null
  error?: string | null
  data?: any
}

export interface N8nAgent {
  workflow: N8nWorkflow
  lastExecution: N8nExecution | null
  executionCount: number
  successRate: number
  status: N8nWorkflowStatus
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

// Dispatch Types
export interface DispatchPayload {
  instance_id: string
  number: string
  message: string
  media_url?: string
  link_url?: string
  button_type?: ButtonType
  buttons?: ButtonConfig[]
}

export interface DispatchResult {
  recipient: string
  success: boolean
  error?: string
  response?: Record<string, unknown>
}

// UAZAPI Types
export interface UazapiInstance {
  instance_key: string
  status: string
  phone_number?: string
}

export interface UazapiSendResponse {
  success: boolean
  message_id?: string
  error?: string
}

// =====================================================
// ANALYTICS TYPES
// =====================================================

// Campaign Analytics
export interface CampaignAnalytics {
  campaign_id: string
  campaign_title: string
  total_recipients: number
  sent_count: number
  failed_count: number
  delivery_rate: number
  read_count: number
  read_rate: number
  response_count: number
  response_rate: number
  avg_response_time_minutes: number
  created_at: string
  completed_at: string | null
}

// Realtime Metrics
export interface RealtimeMetrics {
  active_campaigns: number
  messages_sent_today: number
  messages_sent_this_hour: number
  current_delivery_rate: number
  active_instances: number
  avg_response_time_minutes: number
}

// Campaign Comparison
export interface CampaignComparison {
  campaign_id: string
  campaign_title: string
  sent_count: number
  delivery_rate: number
  read_rate: number
  response_rate: number
  created_at: string
}

// Conversion Funnel
export interface ConversionFunnel {
  total_sent: number
  total_delivered: number
  total_read: number
  total_responded: number
  total_converted: number
}

// Hourly Heatmap Data
export interface HourlyHeatmap {
  hour: number
  day_of_week: number
  message_count: number
  delivery_rate: number
  read_rate: number
  response_rate: number
}

// Time Series Data
export interface TimeSeriesData {
  date: string
  sent: number
  delivered: number
  read: number
  failed: number
}

// Performance Metrics
export interface PerformanceMetrics {
  period: string
  total_campaigns: number
  total_sent: number
  total_delivered: number
  total_read: number
  total_responses: number
  avg_delivery_rate: number
  avg_read_rate: number
  avg_response_rate: number
  best_hour: number
  best_day_of_week: number
}

// =====================================================
// EVOLUTION API TYPES
// =====================================================

export type EvolutionInstanceState = 'open' | 'connecting' | 'close'
export type EvolutionConnectionState = 'open' | 'close'

export interface EvolutionInstance {
  instance: {
    instanceName: string
    owner: string
    profileName?: string
    profilePictureUrl?: string
    profileStatus?: string
    status?: EvolutionInstanceState
  }
}

export interface EvolutionCreateInstancePayload {
  instanceName: string
  token?: string
  number?: string
  qrcode?: boolean
  integration?: string
}

export interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string
    status: string
  }
  hash: string
  qrcode?: {
    code: string
    base64: string
  }
}

export interface EvolutionConnectionStatus {
  instance: string
  state: EvolutionConnectionState
}

export interface EvolutionQRCodeResponse {
  pairingCode?: string
  code?: string
  base64?: string
}

export interface EvolutionDeleteInstanceResponse {
  status: string
  error?: boolean
  response?: {
    message: string
  }
}
