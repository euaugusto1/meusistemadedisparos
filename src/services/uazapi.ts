// =====================================================
// UAZAPI SERVICE - Integração com API WhatsApp
// =====================================================

import type { ButtonConfig, ButtonType, UazapiInstance, UazapiSendResponse } from '@/types'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com'
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || ''

// UAZAPI Free Test Server
export const UAZAPI_FREE_URL = 'https://free.uazapi.com'
export const UAZAPI_FREE_TOKEN = 'ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9Ih7kIEIc2cISRV8t'

// Helper to get correct server for an instance
export function getServerForInstance(instanceKey: string): { url: string; token: string } {
  // Instâncias do servidor free começam com "free-"
  if (instanceKey.startsWith('free-')) {
    return {
      url: UAZAPI_FREE_URL,
      token: UAZAPI_FREE_TOKEN
    }
  }

  // Instâncias reais vêm do servidor principal (monitor-grupo)
  return {
    url: UAZAPI_BASE_URL,
    token: UAZAPI_ADMIN_TOKEN
  }
}

// Helper to determine base URL for an instance
export function getUazapiBaseUrl(instanceKey: string): string {
  // Test instances created with free server have specific patterns
  // You can adjust this logic based on how you identify test instances
  return UAZAPI_BASE_URL
}

export function getUazapiFreeBaseUrl(): string {
  return UAZAPI_FREE_URL
}

interface UazapiRequestOptions {
  method: 'GET' | 'POST' | 'DELETE'
  endpoint: string
  body?: Record<string, unknown>
  token?: string
  baseUrl?: string
}

async function uazapiRequest<T>({ method, endpoint, body, token, baseUrl }: UazapiRequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }

  // UAZAPI usa 'token' como header para autenticação da instância
  if (token) {
    headers['token'] = token
  } else if (UAZAPI_ADMIN_TOKEN) {
    headers['admintoken'] = UAZAPI_ADMIN_TOKEN
  }

  const url = baseUrl || UAZAPI_BASE_URL
  console.log(`UAZAPI Request: ${method} ${url}${endpoint}`)

  const response = await fetch(`${url}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    console.error(`UAZAPI Error: ${response.status}`, error)
    throw new Error(error.message || `UAZAPI Error: ${response.status}`)
  }

  return response.json()
}

// =====================================================
// INSTANCE MANAGEMENT
// =====================================================

/**
 * Criar nova instância WhatsApp
 */
export async function createInstance(instanceKey: string, webhookUrl?: string): Promise<UazapiInstance> {
  return uazapiRequest<UazapiInstance>({
    method: 'POST',
    endpoint: '/instance/init',
    body: {
      instance_key: instanceKey,
      webhook_url: webhookUrl,
    },
  })
}

/**
 * Listar todas as instâncias
 */
export async function listInstances(): Promise<UazapiInstance[]> {
  return uazapiRequest<UazapiInstance[]>({
    method: 'GET',
    endpoint: '/instance/all',
  })
}

/**
 * Verificar status de uma instância
 */
export async function getInstanceStatus(instanceKey: string, token: string): Promise<UazapiInstance> {
  return uazapiRequest<UazapiInstance>({
    method: 'GET',
    endpoint: `/instance/status?key=${instanceKey}`,
    token,
  })
}

/**
 * Obter QR Code para conexão
 */
export async function getInstanceQRCode(instanceKey: string, token: string): Promise<{ qr_code: string }> {
  return uazapiRequest<{ qr_code: string }>({
    method: 'GET',
    endpoint: `/instance/qrcode?key=${instanceKey}`,
    token,
  })
}

/**
 * Desconectar instância
 */
export async function disconnectInstance(instanceKey: string, token: string): Promise<{ success: boolean }> {
  return uazapiRequest<{ success: boolean }>({
    method: 'POST',
    endpoint: '/instance/disconnect',
    body: { instance_key: instanceKey },
    token,
  })
}

/**
 * Deletar instância
 */
export async function deleteInstance(instanceKey: string, token: string): Promise<{ success: boolean }> {
  return uazapiRequest<{ success: boolean }>({
    method: 'DELETE',
    endpoint: `/instance?key=${instanceKey}`,
    token,
  })
}

// =====================================================
// MESSAGE SENDING
// =====================================================

interface SendMessageOptions {
  instanceKey: string
  token: string
  number: string
  message: string
  mediaUrl?: string
  linkUrl?: string
  buttonType?: ButtonType
  buttons?: ButtonConfig[]
}

/**
 * Enviar mensagem de texto simples
 */
export async function sendTextMessage(
  instanceKey: string,
  token: string,
  number: string,
  message: string
): Promise<UazapiSendResponse> {
  const { url: baseUrl } = getServerForInstance(instanceKey)
  return uazapiRequest<UazapiSendResponse>({
    method: 'POST',
    endpoint: '/send/text',
    body: {
      number,
      text: message,
    },
    token,
    baseUrl,
  })
}

/**
 * Enviar mensagem com mídia
 */
export async function sendMediaMessage(
  instanceKey: string,
  token: string,
  number: string,
  message: string,
  mediaUrl: string
): Promise<UazapiSendResponse> {
  const { url: baseUrl } = getServerForInstance(instanceKey)

  // Detectar tipo de mídia pela URL
  const url = mediaUrl.toLowerCase()
  let type = 'document'
  if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif')) {
    type = 'image'
  } else if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')) {
    type = 'video'
  } else if (url.includes('.mp3') || url.includes('.ogg') || url.includes('.wav')) {
    type = 'audio'
  }

  return uazapiRequest<UazapiSendResponse>({
    method: 'POST',
    endpoint: '/send/media',
    body: {
      number,
      type,
      file: mediaUrl,
      caption: message,
    },
    token,
    baseUrl,
  })
}

/**
 * Enviar mensagem com botões (carousel)
 * Usa o endpoint /send/menu com type carousel
 * Cada botão pode ter seu próprio texto e imageUrl
 */
export async function sendButtonMessage(
  instanceKey: string,
  token: string,
  number: string,
  message: string,
  buttons: ButtonConfig[],
  mediaUrl?: string,
  buttonMediaUrls?: Record<string, string> // Mapa de media_id -> URL
): Promise<UazapiSendResponse> {
  const { url: baseUrl } = getServerForInstance(instanceKey)

  // Montar choices no formato correto da UAZAPI
  const choices: string[] = []

  for (const button of buttons) {
    // Texto do cartão (usa texto individual do botão ou mensagem principal como fallback)
    const cardText = button.text || message
    choices.push(`[${cardText}]`)

    // Imagem (usa imagem individual do botão ou mídia principal como fallback)
    const buttonImageUrl = button.media_id && buttonMediaUrls ? buttonMediaUrls[button.media_id] : mediaUrl
    if (buttonImageUrl) {
      choices.push(`{${buttonImageUrl}}`)
    }

    // Botão com URL
    const url = button.url || ''
    choices.push(`${button.name}|https:${url.replace(/^https?:/, '')}`)
  }

  return uazapiRequest<UazapiSendResponse>({
    method: 'POST',
    endpoint: '/send/menu',
    body: {
      number,
      type: 'carousel',
      text: message,
      choices,
    },
    token,
    baseUrl,
  })
}

/**
 * Enviar mensagem com lista
 */
export async function sendListMessage(
  instanceKey: string,
  token: string,
  number: string,
  message: string,
  sections: Array<{ title: string; rows: Array<{ title: string; description?: string }> }>
): Promise<UazapiSendResponse> {
  const { url: baseUrl } = getServerForInstance(instanceKey)
  return uazapiRequest<UazapiSendResponse>({
    method: 'POST',
    endpoint: '/send/list',
    body: {
      number,
      text: message,
      sections,
    },
    token,
    baseUrl,
  })
}

/**
 * Enviar mensagem completa (decide automaticamente o tipo)
 * Esta função chama a API route local para evitar problemas de CORS
 */
export async function sendMessage(options: SendMessageOptions): Promise<UazapiSendResponse> {
  const { instanceKey, token, number, message, mediaUrl, buttonType, buttons } = options

  // Chamar API route local para evitar CORS
  const response = await fetch('/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instanceKey,
      token,
      number,
      message,
      mediaUrl,
      buttonType,
      buttons,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.error || `Erro ${response.status}`,
    }
  }

  return data
}

// =====================================================
// GROUP MANAGEMENT
// =====================================================

/**
 * Listar grupos da instância
 * Endpoint: GET /group/list
 * Query params: force (boolean), noparticipants (boolean)
 */
export async function listGroups(
  instanceKey: string,
  token: string,
  options?: { force?: boolean; noparticipants?: boolean }
): Promise<Array<{ id: string; name: string; subject?: string; participants?: Array<{ id: string; admin?: boolean }> }>> {
  const params = new URLSearchParams()
  if (options?.force) params.append('force', 'true')
  if (options?.noparticipants) params.append('noparticipants', 'true')

  const queryString = params.toString()
  const endpoint = `/group/list${queryString ? `?${queryString}` : ''}`

  return uazapiRequest<Array<{ id: string; name: string; subject?: string; participants?: Array<{ id: string; admin?: boolean }> }>>({
    method: 'GET',
    endpoint,
    token,
  })
}

/**
 * Obter participantes de um grupo
 */
export async function getGroupParticipants(instanceKey: string, token: string, groupId: string): Promise<string[]> {
  return uazapiRequest<string[]>({
    method: 'GET',
    endpoint: `/group/participants?key=${instanceKey}&group_id=${groupId}`,
    token,
  })
}

// =====================================================
// WEBHOOK MANAGEMENT
// =====================================================

/**
 * Configurar webhook da instância
 */
export async function setWebhook(instanceKey: string, token: string, webhookUrl: string): Promise<{ success: boolean }> {
  return uazapiRequest<{ success: boolean }>({
    method: 'POST',
    endpoint: '/instance/webhook',
    body: {
      instance_key: instanceKey,
      webhook_url: webhookUrl,
    },
    token,
  })
}
