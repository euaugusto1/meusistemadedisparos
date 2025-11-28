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

// Helper function to find instance by token when name doesn't match
async function findEvolutionInstanceByToken(baseUrl: string, globalApiKey: string, instanceToken: string) {
  try {
    console.log('[Evolution API] Buscando instância por token:', instanceToken)
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
      inst.token?.toLowerCase() === instanceToken.toLowerCase()
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
      const apiKey = instance.api_token || EVOLUTION_API_KEY

      if (!evolutionApiUrl) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada para esta instância' },
          { status: 500 }
        )
      }

      let instanceName = instance.instance_key
      let evolutionInstance = null

      console.log('[Evolution API] Verificando status para instance_key:', instanceName)
      console.log('[Evolution API] api_token:', instance.api_token)

      // Primeiro tentar buscar status pelo nome da instância
      try {
        const statusData = await evolutionApiRequest(evolutionApiUrl, instanceName, apiKey)
        console.log('[Evolution API] Status por nome:', statusData)
        const state = statusData.state || statusData.instance?.state || 'close'
        if (state === 'open') {
          status = 'connected'
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
          if (connectionStatus === 'open') {
            status = 'connected'
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

      // Obter número de telefone - buscar do endpoint fetchInstances
      if (status === 'connected') {
        try {
          // Se já temos a instância do fallback por token, usar ela
          let instanceInfo = evolutionInstance

          // Se não temos, buscar
          if (!instanceInfo) {
            // Primeiro tentar buscar pela instância específica
            const instancesResponse = await fetch(
              `${evolutionApiUrl}/instance/fetchInstances?instanceName=${instanceName}`,
              {
                method: 'GET',
                headers: {
                  'apikey': EVOLUTION_API_KEY,
                },
              }
            )

            if (instancesResponse.ok) {
              const instancesData = await instancesResponse.json()
              // Verificar se encontrou (pode retornar erro 404 ou array vazio)
              if (instancesData && !instancesData.error) {
                instanceInfo = Array.isArray(instancesData) ? instancesData[0] : instancesData
              }
            }

            // Se não encontrou pelo nome, buscar todas as instâncias e encontrar pelo token
            if (!instanceInfo && instance.api_token) {
              instanceInfo = await findEvolutionInstanceByToken(evolutionApiUrl, EVOLUTION_API_KEY, instance.api_token)
            }
          }

          // Extrair número do ownerJid
          if (instanceInfo) {
            console.log('[Evolution API] instanceInfo para ownerJid:', JSON.stringify(instanceInfo).substring(0, 500))
            const ownerJid = instanceInfo.ownerJid || instanceInfo.instance?.owner || instanceInfo.owner
            console.log('[Evolution API] ownerJid encontrado:', ownerJid)
            if (ownerJid) {
              // Extrair apenas o número do JID (remover @s.whatsapp.net)
              let extractedNumber = ownerJid.replace('@s.whatsapp.net', '')
              // Formatar como +55 (98) 99999-9999 se for número brasileiro
              if (extractedNumber.startsWith('55') && extractedNumber.length >= 12) {
                const ddd = extractedNumber.substring(2, 4)
                const part1 = extractedNumber.substring(4, 9)
                const part2 = extractedNumber.substring(9)
                extractedNumber = `+55 (${ddd}) ${part1}-${part2}`
              }
              phoneNumber = extractedNumber
              console.log('[Evolution API] phoneNumber formatado:', phoneNumber)
            }
          } else {
            console.log('[Evolution API] instanceInfo não encontrado')
          }
        } catch (e) {
          console.error('Erro ao buscar número:', e)
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
      const instanceStatus = statusData.instance?.status
      const statusObjConnected = statusData.status?.connected === true || statusData.status?.loggedIn === true

      console.log('[UAZAPI] instance.status:', instanceStatus, '| status.connected:', statusData.status?.connected, '| status.loggedIn:', statusData.status?.loggedIn)

      // Verificar status da instância primeiro (string), depois fallback para objeto status
      if (instanceStatus === 'connected' || instanceStatus === 'open' || statusObjConnected) {
        status = 'connected'
      } else if (instanceStatus === 'qrcode' || instanceStatus === 'qr_code') {
        status = 'qr_code'
      } else if (instanceStatus === 'connecting') {
        status = 'connecting'
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
