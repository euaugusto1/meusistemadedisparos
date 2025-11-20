import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

export function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function parseRecipients(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

export function isValidPhoneNumber(number: string): boolean {
  // Remove caracteres não numéricos exceto @ (para grupos)
  const cleaned = number.replace(/[^\d@-]/g, '')
  // Número de telefone ou ID de grupo
  return cleaned.length >= 10 || cleaned.includes('@g.us')
}

export function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isPlanExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Campaign status
    draft: 'bg-gray-500',
    scheduled: 'bg-blue-500',
    processing: 'bg-yellow-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-400',
    // Instance status
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    connecting: 'bg-yellow-500',
    qr_code: 'bg-blue-500',
    // Ticket status
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
    // Item status
    pending: 'bg-gray-500',
    sent: 'bg-green-500',
  }
  return colors[status] || 'bg-gray-500'
}

export function getPlanColor(plan: string): string {
  const colors: Record<string, string> = {
    free: 'text-gray-500',
    bronze: 'text-amber-600',
    silver: 'text-gray-400',
    gold: 'text-yellow-500',
  }
  return colors[plan] || 'text-gray-500'
}

export function generateInstanceKey(): string {
  return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
