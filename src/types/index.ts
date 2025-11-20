// =====================================================
// TIPOS DO SISTEMA
// =====================================================

// Enums
export type UserRole = 'admin' | 'user'
export type PlanTier = 'free' | 'bronze' | 'silver' | 'gold'
export type InstanceStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_code'
export type CampaignStatus = 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type CampaignItemStatus = 'pending' | 'sent' | 'failed'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type MediaType = 'image' | 'video' | 'audio' | 'document'
export type ButtonType = 'button' | 'list' | 'poll' | 'carousel'

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
  status: InstanceStatus
  phone_number: string | null
  webhook_url: string | null
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
  created_at: string
  updated_at: string
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
