import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

// Fallback para instâncias sem api_url configurada
const EVOLUTION_API_URL_FALLBACK = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Helper function to make UAZAPI GET requests
async function uazapiRequest(baseUrl: string, endpoint: string, token: string) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'admintoken': token,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `UAZAPI Error: ${response.status}`)
  }

  return response.json()
}

// Helper function to get UAZAPI instance status
// Uses GET /instance/status with instance token
async function uazapiGetStatus(baseUrl: string, instanceToken: string) {
  console.log('[UAZAPI] Getting status from:', `${baseUrl}/instance/status`)
  console.log('[UAZAPI] Token:', instanceToken?.substring(0, 10) + '...')

  const response = await fetch(`${baseUrl}/instance/status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'token': instanceToken,
    },
  })

  const data = await response.json().catch(() => ({ message: response.statusText }))

  if (!response.ok) {
    console.error('[UAZAPI] Status error:', response.status, data)
    return null
  }

  console.log('[UAZAPI] Status response:', JSON.stringify(data).substring(0, 300))
  return data
}

// Helper function to connect UAZAPI instance and get QR Code
// Uses POST /instance/connect with instance token
// Documentação: https://docs.uazapi.com/endpoint/post/instance~connect
async function uazapiConnect(baseUrl: string, instanceToken: string) {
  console.log('[UAZAPI] Connecting to get QR Code:', `${baseUrl}/instance/connect`)
  console.log('[UAZAPI] Token:', instanceToken?.substring(0, 10) + '...')

  const response = await fetch(`${baseUrl}/instance/connect`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'token': instanceToken,
    },
    body: '{}', // Body vazio para obter QR Code (sem phone = QR Code, com phone = pairing code)
  })

  const data = await response.json().catch(() => ({ message: response.statusText }))

  if (!response.ok) {
    console.error('[UAZAPI] Connect error:', response.status, data)
    // Se for 409 (conflict), a instância já está connecting
    // IMPORTANTE: A resposta 409 pode conter o QR Code no campo instance.qrcode
    if (response.status === 409) {
      // Extrair QR Code da resposta 409 se disponível
      const qrFromConflict = data.instance?.qrcode || data.qrcode
      if (qrFromConflict) {
        console.log('[UAZAPI] 409 Conflict with QR Code available!')
        return {
          status: 'connecting',
          conflict: true,
          qrcode: qrFromConflict,
          instance: data.instance
        }
      }
      return { status: 'connecting', conflict: true }
    }
    throw new Error(data.message || `UAZAPI Error: ${response.status}`)
  }

  console.log('[UAZAPI] Connect success, status:', data.instance?.status || data.status)
  return data
}

// Helper function to fetch instance details including ownerJid
async function fetchEvolutionInstanceDetails(baseUrl: string, instanceName: string, globalApiKey: string) {
  try {
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
      console.log('[Evolution API] fetchInstances failed:', response.status)
      return null
    }

    const data = await response.json()
    // Pode retornar array ou objeto único
    const instance = Array.isArray(data) ? data[0] : data
    console.log('[Evolution API] Instance details:', JSON.stringify(instance).substring(0, 500))
    return instance
  } catch (e) {
    console.error('[Evolution API] Error fetching instance details:', e)
    return null
  }
}

// Helper function to get QR Code from Evolution API with retry/polling
async function getEvolutionQRCode(baseUrl: string, instanceName: string, globalApiKey: string, instanceToken?: string, maxRetries = 5) {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  let currentInstanceName = instanceName

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Evolution API] Tentativa ${attempt}/${maxRetries} para obter QR Code...`)

    const response = await fetch(
      `${baseUrl}/instance/connect/${currentInstanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': globalApiKey,
        },
      }
    )

    // Se a instância não foi encontrada pelo nome, tentar buscar por token
    if (!response.ok && response.status === 404 && instanceToken && attempt === 1) {
      console.log(`[Evolution API] Instância não encontrada por nome, buscando por token...`)
      const instanceByToken = await findEvolutionInstanceByToken(baseUrl, globalApiKey, instanceToken)
      if (instanceByToken) {
        console.log(`[Evolution API] Encontrou instância por token:`, instanceByToken.name)
        currentInstanceName = instanceByToken.name

        // Se já está conectada, retornar imediatamente
        if (instanceByToken.connectionStatus === 'open' && instanceByToken.ownerJid) {
          return { alreadyConnected: true, ownerJid: instanceByToken.ownerJid, instanceName: currentInstanceName }
        }

        // Tentar novamente com o nome correto
        continue
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `Evolution API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Evolution API] Resposta tentativa ${attempt}:`, JSON.stringify(data).substring(0, 300))

    // Verificar se o QR Code está disponível
    const qrCode = data.base64 || data.qrcode?.base64 || data.code
    const pairingCode = data.pairingCode

    if (qrCode || pairingCode) {
      console.log(`[Evolution API] QR Code obtido na tentativa ${attempt}`)
      return { ...data, instanceName: currentInstanceName }
    }

    // Verificar se já está conectado
    if (data.state === 'open' || data.instance?.state === 'open') {
      // Buscar detalhes da instância para obter ownerJid
      const instanceDetails = await fetchEvolutionInstanceDetails(baseUrl, currentInstanceName, globalApiKey)
      const ownerJid = instanceDetails?.ownerJid || data.instance?.ownerJid || data.ownerJid

      if (ownerJid) {
        console.log(`[Evolution API] Instância conectada com ownerJid:`, ownerJid)
        return { ...data, alreadyConnected: true, ownerJid, instanceName: currentInstanceName }
      } else {
        console.log(`[Evolution API] State=open mas sem ownerJid, continuando polling...`)
      }
    }

    // Se ainda está connecting e não é a última tentativa, esperar e tentar novamente
    if (attempt < maxRetries) {
      console.log(`[Evolution API] QR Code não disponível ainda (count: ${data.count}), aguardando 2s...`)
      await delay(2000)
    }
  }

  // Retornar última resposta mesmo sem QR Code
  const finalResponse = await fetch(
    `${baseUrl}/instance/connect/${currentInstanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': globalApiKey,
      },
    }
  )

  const finalData = await finalResponse.json()
  return { ...finalData, instanceName: currentInstanceName }
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

// Helper function to check Evolution API connection state with token fallback
async function getEvolutionConnectionState(baseUrl: string, instanceName: string, apiKey: string, instanceToken?: string) {
  // Primeiro tentar buscar pelo nome
  const response = await fetch(
    `${baseUrl}/instance/connectionState/${instanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    }
  )

  if (response.ok) {
    const data = await response.json()
    return { ...data, instanceName }
  }

  // Se falhou, tentar buscar por token (fallback para quando instance_key não corresponde)
  console.log('[Evolution API] connectionState falhou para', instanceName, '- tentando buscar por token')
  if (instanceToken) {
    const instanceByToken = await findEvolutionInstanceByToken(baseUrl, apiKey, instanceToken)
    if (instanceByToken) {
      console.log('[Evolution API] Encontrou instância por token:', instanceByToken.name, 'status:', instanceByToken.connectionStatus)
      return {
        instance: {
          instanceName: instanceByToken.name,
          state: instanceByToken.connectionStatus,
          ownerJid: instanceByToken.ownerJid
        },
        instanceName: instanceByToken.name
      }
    }
  }

  return null
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

    // Detectar qual API usar:
    // - is_test = true → Evolution API (instâncias de teste)
    // - is_test = false → UAZAPI (instâncias premium)
    const isEvolutionApi = instance.is_test === true

    if (isEvolutionApi) {
      // ========== EVOLUTION API ==========
      const evolutionApiUrl = instance.api_url || EVOLUTION_API_URL_FALLBACK
      // IMPORTANTE: Usar EVOLUTION_API_KEY global para endpoints administrativos
      // O token da instância (instance.api_token) não funciona para connectionState/fetchInstances
      const globalApiKey = EVOLUTION_API_KEY

      if (!evolutionApiUrl) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada' },
          { status: 500 }
        )
      }

      if (!globalApiKey) {
        return NextResponse.json(
          { error: 'EVOLUTION_API_KEY não configurada' },
          { status: 500 }
        )
      }

      console.log('[Evolution API] Getting QR Code from:', evolutionApiUrl, 'Instance:', instance.instance_key)

      try {
        // Primeiro verificar o estado atual da conexão
        // Passa o token da instância para fallback caso o instance_key não corresponda ao nome real
        const connectionState = await getEvolutionConnectionState(evolutionApiUrl, instance.instance_key, globalApiKey, instance.api_token)
        console.log('[Evolution API] Connection state:', connectionState)

        // IMPORTANTE: Só considerar "connected" se tem ownerJid (telefone conectado)
        // Evolution API pode retornar state='open' mesmo sem ter telefone conectado
        const ownerJid = connectionState?.instance?.ownerJid
        const hasPhoneConnected = !!ownerJid
        console.log('[Evolution API] QR check - state:', connectionState?.instance?.state, '| ownerJid:', ownerJid)

        if (connectionState?.instance?.state === 'open' && hasPhoneConnected) {
          // Extrair número de telefone
          let phoneNumber = null
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

          await supabase
            .from('whatsapp_instances')
            .update({ status: 'connected', phone_number: phoneNumber })
            .eq('id', id)

          return NextResponse.json({
            status: 'connected',
            message: 'Instância já está conectada',
            phone_number: phoneNumber,
          })
        }

        // Obter QR Code com retry/polling
        // Passa o token da instância para fallback caso o instance_key não corresponda
        const qrData = await getEvolutionQRCode(evolutionApiUrl, instance.instance_key, globalApiKey, instance.api_token, 5)
        console.log('[Evolution API] Final QR response:', JSON.stringify(qrData).substring(0, 500))

        // Verificar se está conectado (pode ter conectado durante o polling)
        if (qrData.alreadyConnected) {
          // Extrair número de telefone do ownerJid
          let phoneNumber = null
          if (qrData.ownerJid) {
            let extractedNumber = qrData.ownerJid.replace('@s.whatsapp.net', '')
            if (extractedNumber.startsWith('55') && extractedNumber.length >= 12) {
              const ddd = extractedNumber.substring(2, 4)
              const part1 = extractedNumber.substring(4, 9)
              const part2 = extractedNumber.substring(9)
              extractedNumber = `+55 (${ddd}) ${part1}-${part2}`
            }
            phoneNumber = extractedNumber
          }

          await supabase
            .from('whatsapp_instances')
            .update({ status: 'connected', phone_number: phoneNumber })
            .eq('id', id)

          return NextResponse.json({
            status: 'connected',
            message: 'Instância já está conectada',
            phone_number: phoneNumber,
          })
        }

        // Evolution API retorna base64 no campo qrcode.base64 ou code
        const qrCode = qrData.base64 || qrData.qrcode?.base64 || qrData.code || null
        const pairingCode = qrData.pairingCode || null

        if (!qrCode && !pairingCode) {
          // QR Code não disponível após várias tentativas
          // Isso pode indicar problema no servidor Evolution API (Redis, Baileys, etc)
          console.error('[Evolution API] QR Code não disponível após polling. Resposta:', qrData)

          // Verificar se o servidor está em loop de reconexão
          const isServerIssue = qrData.count === 0 && connectionState?.instance?.state === 'connecting'

          return NextResponse.json({
            error: 'QR Code não disponível',
            message: isServerIssue
              ? 'O servidor Evolution API está com problemas para conectar ao WhatsApp. Isso pode ser um problema temporário de infraestrutura. Por favor, tente novamente em alguns minutos ou entre em contato com o suporte.'
              : 'O servidor está demorando para gerar o QR Code. Por favor, aguarde alguns segundos e tente novamente.',
            details: {
              count: qrData.count,
              state: connectionState?.instance?.state || 'unknown',
              serverIssue: isServerIssue
            },
            retry: !isServerIssue
          }, { status: 503 }) // Service Unavailable - indica retry
        }

        // Atualizar status para qr_code
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'qr_code' })
          .eq('id', id)

        return NextResponse.json({
          qr_code: qrCode,
          pairingCode,
          status: 'qr_code',
        })
      } catch (error) {
        console.error('[Evolution API] QR error:', error)
        throw error
      }
    } else {
      // ========== UAZAPI ==========
      // Obter servidor correto para esta instância (usando api_url do banco se disponível)
      const { url: baseUrl } = getServerForInstance(instance.instance_key, instance.api_url)

      console.log('[UAZAPI] Getting QR Code from:', baseUrl, 'Instance:', instance.instance_key)

      // Obter token da instância (salvo no banco quando a instância foi criada)
      const instanceToken = instance.api_token || instance.token

      if (!instanceToken) {
        console.error('[UAZAPI] Instance token not found in database')
        return NextResponse.json({ error: 'Token da instância não encontrado' }, { status: 400 })
      }

      console.log('[UAZAPI] Using instance token:', instanceToken?.substring(0, 10) + '...')

      // Primeiro verificar o status atual da instância
      const currentStatus = await uazapiGetStatus(baseUrl, instanceToken)
      console.log('[UAZAPI] Current status:', JSON.stringify(currentStatus).substring(0, 500))

      // Se o token é inválido, a instância pode ter sido deletada/expirada no UAZAPI
      if (currentStatus === null) {
        console.error('[UAZAPI] Instance not found or token invalid - instance may have been deleted')
        return NextResponse.json({
          error: 'Instância não encontrada no servidor UAZAPI. Ela pode ter sido deletada ou expirada. Por favor, delete esta instância e crie uma nova.',
          code: 'INSTANCE_NOT_FOUND',
          shouldDelete: true
        }, { status: 404 })
      }

      // Verificar se já está conectado
      // IMPORTANTE: Só considerar conectado se tem um número de telefone (jid/owner)
      // pois a UAZAPI pode retornar status "open/connected" mesmo sem ter lido o QR Code
      const statusJid = currentStatus?.status?.jid || currentStatus?.instance?.owner
      const isReallyConnected = (currentStatus?.status === 'open' || currentStatus?.status === 'connected' ||
                                  currentStatus?.instance?.status === 'open' || currentStatus?.instance?.status === 'connected')
                                  && !!statusJid

      if (isReallyConnected) {
        // Extrair número de telefone do JID
        let phoneNumber = null
        if (statusJid) {
          phoneNumber = statusJid.split(':')[0].split('@')[0]
        } else {
          phoneNumber = currentStatus.user?.id ||
                       currentStatus.phone_number ||
                       currentStatus.phone ||
                       currentStatus.number ||
                       currentStatus.user?.phone ||
                       null
        }

        console.log('[UAZAPI] Instance really connected! Phone:', phoneNumber)
        console.log('[UAZAPI] Full status response:', JSON.stringify(currentStatus))

        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'connected',
            phone_number: phoneNumber,
          })
          .eq('id', id)

        return NextResponse.json({
          status: 'connected',
          message: 'Instância já está conectada',
          phone_number: phoneNumber,
        })
      }

      // Se já está connecting E tem QR Code disponível, retornar o QR Code existente
      if (currentStatus?.status === 'connecting' && currentStatus?.qrcode) {
        console.log('[UAZAPI] Instance already connecting with QR Code available')

        await supabase
          .from('whatsapp_instances')
          .update({ status: 'qr_code' })
          .eq('id', id)

        return NextResponse.json({
          qr_code: currentStatus.qrcode,
          status: 'qr_code',
        })
      }

      // Usar POST /instance/connect para conectar e obter QR Code
      // Documentação: https://docs.uazapi.com/endpoint/post/instance~connect
      const qrData = await uazapiConnect(baseUrl, instanceToken)

      console.log('[UAZAPI] Connect response:', JSON.stringify(qrData).substring(0, 500))

      // Se recebeu 409 (conflict), verificar se já tem QR Code na resposta
      if (qrData.conflict) {
        console.log('[UAZAPI] Conflict detected')

        // Se a resposta 409 já contém o QR Code, retorná-lo imediatamente
        if (qrData.qrcode) {
          console.log('[UAZAPI] QR Code found in 409 response, returning immediately')

          await supabase
            .from('whatsapp_instances')
            .update({ status: 'qr_code' })
            .eq('id', id)

          return NextResponse.json({
            qr_code: qrData.qrcode,
            status: 'qr_code',
          })
        }

        // Se não tem QR Code na resposta 409, fazer polling
        console.log('[UAZAPI] No QR Code in 409 response, polling for QR Code...')

        // Polling com até 5 tentativas, aguardando 2 segundos entre cada
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        for (let attempt = 1; attempt <= 5; attempt++) {
          console.log(`[UAZAPI] Polling attempt ${attempt}/5...`)
          await delay(2000)

          const statusAfterConflict = await uazapiGetStatus(baseUrl, instanceToken)
          console.log(`[UAZAPI] Status attempt ${attempt}:`, JSON.stringify(statusAfterConflict).substring(0, 300))

          // Verificar se já conectou (só considerar conectado se tem JID)
          const pollingJid = statusAfterConflict?.status?.jid || statusAfterConflict?.instance?.owner
          const pollingConnected = (statusAfterConflict?.status === 'open' || statusAfterConflict?.status === 'connected' ||
                                    statusAfterConflict?.instance?.status === 'open' || statusAfterConflict?.instance?.status === 'connected')
                                    && !!pollingJid

          if (pollingConnected) {
            const phoneNumber = pollingJid ? pollingJid.split(':')[0].split('@')[0] : null

            await supabase
              .from('whatsapp_instances')
              .update({ status: 'connected', phone_number: phoneNumber })
              .eq('id', id)

            return NextResponse.json({
              status: 'connected',
              message: 'Instância conectada com sucesso!',
              phone_number: phoneNumber,
            })
          }

          // Verificar se tem QR Code disponível
          if (statusAfterConflict?.qrcode) {
            await supabase
              .from('whatsapp_instances')
              .update({ status: 'qr_code' })
              .eq('id', id)

            return NextResponse.json({
              qr_code: statusAfterConflict.qrcode,
              status: 'qr_code',
            })
          }
        }

        // Após 5 tentativas sem sucesso, retornar erro com retry habilitado
        return NextResponse.json({
          error: 'O servidor está gerando o QR Code. Por favor, aguarde alguns segundos e clique novamente.',
          status: 'connecting',
          retry: true
        }, { status: 503 })
      }

      // Verificar se já está conectado (só considerar conectado se tem JID)
      const connectJid = qrData.status?.jid || qrData.instance?.owner
      const connectReallyConnected = (qrData.status === 'open' || qrData.status === 'connected' ||
                                       qrData.instance?.status === 'open' || qrData.instance?.status === 'connected')
                                       && !!connectJid

      if (connectReallyConnected) {
        const phoneFromConnect = connectJid ? connectJid.split(':')[0].split('@')[0] : null

        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'connected',
            phone_number: phoneFromConnect,
          })
          .eq('id', id)

        return NextResponse.json({
          status: 'connected',
          message: 'Instância já está conectada',
          phone_number: phoneFromConnect,
        })
      }

      // UAZAPI /instance/connect retorna o QR Code no campo 'qrcode' ou 'instance.qrcode'
      const qrCode = qrData.qrcode || qrData.instance?.qrcode || qrData.qr_code || qrData.base64

      if (!qrCode) {
        console.log('[UAZAPI] QR Code not in response:', JSON.stringify(qrData))
        return NextResponse.json({ error: 'QR Code não disponível', details: qrData }, { status: 400 })
      }

      // Atualizar status para qr_code
      await supabase
        .from('whatsapp_instances')
        .update({ status: 'qr_code' })
        .eq('id', id)

      // Log QR code generation
      const { ipAddress, userAgent } = extractRequestInfo(request)
      await createSystemLog({
        userId: user.id,
        action: 'instance_qr_generated',
        level: 'info',
        details: {
          instanceId: id,
          instanceName: instance.name,
        },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({
        qr_code: qrCode,
        status: 'qr_code',
      })
    }
  } catch (error) {
    console.error('Erro ao obter QR Code:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao obter QR Code' },
      { status: 500 }
    )
  }
}
