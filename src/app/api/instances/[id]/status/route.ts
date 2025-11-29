import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'

// Fallback para instâncias sem api_url configurada
const EVOLUTION_API_URL_FALLBACK = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Helper function to make UAZAPI requests with instance token
async function uazapiRequest(baseUrl: string, endpoint: string, instanceToken: string) {
  console.log('[UAZAPI] Request:', `${baseUrl}${endpoint}`)
  console.log('[UAZAPI] Using instance token:', instanceToken?.substring(0, 10) + '...')

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': instanceToken, // Usar token da instância, não admintoken
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    console.error('[UAZAPI] Request error:', response.status, error)
    throw new Error(error.message || `UAZAPI Error: ${response.status}`)
  }

  return response.json()
}

// Helper function to make Evolution API requests
async function evolutionApiRequest(baseUrl: string, instanceName: string, apiKey: string) {
  const response = await fetch(
    `${baseUrl}/instance/connectionState/${instanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `Evolution API Error: ${response.status}`)
  }

  return response.json()
}

// Helper function to fetch instance details by name (includes ownerJid)
async function fetchEvolutionInstanceByName(baseUrl: string, globalApiKey: string, instanceName: string) {
  try {
    console.log('[Evolution API] Buscando detalhes da instância por nome:', instanceName)
    const response = await fetch(
      `${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': globalApiKey,
        },
      }
    )

    if (!response.ok) {
      console.log('[Evolution API] fetchInstances por nome falhou:', response.status)
      return null
    }

    const data = await response.json()
    // Pode retornar array ou objeto único
    const instance = Array.isArray(data) ? data[0] : data
    console.log('[Evolution API] Detalhes da instância:', JSON.stringify(instance).substring(0, 300))
    return instance
  } catch (e) {
    console.error('[Evolution API] Erro ao buscar instância por nome:', e)
    return null
  }
}

// Helper function to find instance by token when name doesn't match
async function findEvolutionInstanceByToken(baseUrl: string, globalApiKey: string, instanceToken: string) {
  try {
    console.log('[Evolution API] Buscando instância por token:', instanceToken?.substring(0, 10) + '...')
    const response = await fetch(
      `${baseUrl}/instance/fetchInstances`,
      {
        method: 'GET',
        headers: {
          'apikey': globalApiKey,
        },
      }
    )

    if (!response.ok) {
      console.log('[Evolution API] fetchInstances falhou:', response.status)
      return null
    }

    const instances = await response.json()
    if (!Array.isArray(instances)) {
      console.log('[Evolution API] fetchInstances não retornou array')
      return null
    }

    console.log('[Evolution API] Instâncias encontradas:', instances.length)
    // Comparar tokens case-insensitive
    const found = instances.find((inst: { token?: string }) =>
      inst.token?.toLowerCase() === instanceToken?.toLowerCase()
    )
    console.log('[Evolution API] Instância encontrada por token:', found ? found.name : 'não encontrada')
    return found
  } catch (e) {
    console.error('[Evolution API] Erro ao buscar instância por token:', e)
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar instância e verificar se pertence ao usuário
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    let status: string
    let phoneNumber: string | null = null

    // Detectar qual API usar:
    // - is_test = true → Evolution API (instâncias de teste)
    // - is_test = false → UAZAPI (instâncias premium)
    const isEvolutionApi = instance.is_test === true

    if (isEvolutionApi) {
      // Usar Evolution API - Usar api_url da instância com fallback
      const evolutionApiUrl = instance.api_url || EVOLUTION_API_URL_FALLBACK
      // IMPORTANTE: Usar EVOLUTION_API_KEY global para endpoints administrativos
      // O token da instância (instance.api_token) não funciona para connectionState/fetchInstances
      const globalApiKey = EVOLUTION_API_KEY

      if (!evolutionApiUrl) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada para esta instância' },
          { status: 500 }
        )
      }

      if (!globalApiKey) {
        return NextResponse.json(
          { error: 'EVOLUTION_API_KEY não configurada' },
          { status: 500 }
        )
      }

      let instanceName = instance.instance_key
      let evolutionInstance = null

      console.log('[Evolution API] Verificando status para instance_key:', instanceName)
      console.log('[Evolution API] Usando EVOLUTION_API_KEY global')

      // Primeiro tentar buscar status pelo nome da instância
      try {
        const statusData = await evolutionApiRequest(evolutionApiUrl, instanceName, globalApiKey)
        console.log('[Evolution API] Status por nome:', statusData)
        const state = statusData.state || statusData.instance?.state || 'close'

        // O endpoint /connectionState NÃO retorna ownerJid, precisamos buscar de /fetchInstances
        // quando state === 'open' para verificar se realmente tem telefone conectado
        let ownerJid = statusData.instance?.ownerJid || statusData.ownerJid

        if (state === 'open' && !ownerJid) {
          // Buscar ownerJid do fetchInstances - usar nome da instância (mais eficiente)
          console.log('[Evolution API] State=open mas sem ownerJid no connectionState, buscando de fetchInstances...')
          // Pegar o nome da instância da resposta do connectionState
          const realInstanceName = statusData.instance?.instanceName || instanceName
          evolutionInstance = await fetchEvolutionInstanceByName(evolutionApiUrl, globalApiKey, realInstanceName)
          if (evolutionInstance) {
            ownerJid = evolutionInstance.ownerJid
            console.log('[Evolution API] ownerJid obtido de fetchInstances:', ownerJid)
          }
        }

        const hasPhoneConnected = !!ownerJid
        console.log('[Evolution API] state:', state, '| ownerJid:', ownerJid, '| hasPhoneConnected:', hasPhoneConnected)

        if (state === 'open' && hasPhoneConnected) {
          status = 'connected'
          // Extrair número de telefone do ownerJid
          if (ownerJid) {
            let extractedNumber = ownerJid.replace('@s.whatsapp.net', '')
            if (extractedNumber.startsWith('55') && extractedNumber.length >= 12) {
              const ddd = extractedNumber.substring(2, 4)
              const part1 = extractedNumber.substring(4, 9)
              const part2 = extractedNumber.substring(9)
              extractedNumber = `+55 (${ddd}) ${part1}-${part2}`
            }
            phoneNumber = extractedNumber
          }
        } else if (state === 'open' && !hasPhoneConnected) {
          // Estado "open" mas sem telefone = aguardando QR Code
          status = 'qr_code'
        } else if (state === 'connecting') {
          status = 'connecting'
        } else {
          status = 'disconnected'
        }
      } catch (err) {
        console.log('[Evolution API] Falhou busca por nome, tentando por token. Erro:', err)
        // Se falhou, tentar encontrar a instância pelo token
        evolutionInstance = await findEvolutionInstanceByToken(evolutionApiUrl, EVOLUTION_API_KEY, instance.api_token!)

        if (evolutionInstance) {
          instanceName = evolutionInstance.name
          console.log('[Evolution API] Encontrou instância por token:', instanceName, 'connectionStatus:', evolutionInstance.connectionStatus)
          const connectionStatus = evolutionInstance.connectionStatus

          // IMPORTANTE: Verificar ownerJid também para instâncias encontradas por token
          const ownerJid = evolutionInstance.ownerJid || evolutionInstance.instance?.ownerJid
          const hasPhoneConnected = !!ownerJid
          console.log('[Evolution API] connectionStatus:', connectionStatus, '| ownerJid:', ownerJid, '| hasPhoneConnected:', hasPhoneConnected)

          if (connectionStatus === 'open' && hasPhoneConnected) {
            status = 'connected'
            // Extrair número de telefone
            if (ownerJid) {
              let extractedNumber = ownerJid.replace('@s.whatsapp.net', '')
              if (extractedNumber.startsWith('55') && extractedNumber.length >= 12) {
                const ddd = extractedNumber.substring(2, 4)
                const part1 = extractedNumber.substring(4, 9)
                const part2 = extractedNumber.substring(9)
                extractedNumber = `+55 (${ddd}) ${part1}-${part2}`
              }
              phoneNumber = extractedNumber
            }
          } else if (connectionStatus === 'open' && !hasPhoneConnected) {
            status = 'qr_code'
          } else if (connectionStatus === 'connecting') {
            status = 'connecting'
          } else {
            status = 'disconnected'
          }
        } else {
          console.log('[Evolution API] Não encontrou instância por token')
          status = 'disconnected'
        }
      }

    } else {
      // Usar UAZAPI (usando api_url do banco se disponível)
      const { url: baseUrl } = getServerForInstance(instance.instance_key, instance.api_url)

      // Usar token da instância (salvo no banco quando a instância foi criada)
      const instanceToken = instance.api_token || instance.token

      if (!instanceToken) {
        console.error('[UAZAPI] Instance token not found in database')
        return NextResponse.json({ error: 'Token da instância não encontrado' }, { status: 400 })
      }

      console.log('[UAZAPI] Checking status from:', baseUrl, 'Instance:', instance.instance_key)

      const statusData = await uazapiRequest(
        baseUrl,
        `/instance/status`,
        instanceToken
      )

      // Log completo da resposta para debug
      console.log('[UAZAPI] Full status response:', JSON.stringify(statusData))

      // Normalizar status - A UAZAPI retorna estrutura:
      // { instance: { status: "connected", ... }, status: { connected: true, loggedIn: true, jid: "..." } }
      // O status string está em instance.status, não em status (que é um objeto)
      // IMPORTANTE: status.connected e status.loggedIn NÃO são indicadores confiáveis!
      // Eles podem retornar true mesmo quando a instância está aguardando QR Code.
      // O indicador correto é instance.status + verificar se tem jid/owner (número conectado)
      const instanceStatus = statusData.instance?.status
      const hasPhoneConnected = !!(statusData.status?.jid || statusData.instance?.owner)

      console.log('[UAZAPI] instance.status:', instanceStatus, '| hasPhoneConnected:', hasPhoneConnected, '| jid:', statusData.status?.jid)

      // Verificar status da instância - só considerar "connected" se:
      // 1. instance.status é "connected" ou "open" E
      // 2. Tem um número de telefone conectado (jid ou owner)
      if ((instanceStatus === 'connected' || instanceStatus === 'open') && hasPhoneConnected) {
        status = 'connected'
      } else if (instanceStatus === 'qrcode' || instanceStatus === 'qr_code') {
        status = 'qr_code'
      } else if (instanceStatus === 'connecting' || instanceStatus === 'connected' || instanceStatus === 'open') {
        // Se está "connected/open" mas NÃO tem telefone, ainda está aguardando leitura do QR
        status = 'qr_code'
      } else {
        status = 'disconnected'
      }

      // Extrair número de telefone de vários campos possíveis da resposta UAZAPI
      // A API pode retornar em: instance.owner, status.jid, user.id, phone_number, phone, number
      const jid = statusData.status?.jid || statusData.instance?.owner
      if (jid) {
        // Extrair número do JID (formato: 559831962090:22@s.whatsapp.net ou 559831962090@s.whatsapp.net)
        phoneNumber = jid.split(':')[0].split('@')[0]
      } else {
        phoneNumber = statusData.user?.id ||
                     statusData.phone_number ||
                     statusData.phone ||
                     statusData.number ||
                     null
      }

      console.log('[UAZAPI] Status:', status, 'Phone:', phoneNumber)
    }

    await supabase
      .from('whatsapp_instances')
      .update({
        status,
        phone_number: phoneNumber,
      })
      .eq('id', id)

    return NextResponse.json({
      status,
      phone_number: phoneNumber,
    })
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
