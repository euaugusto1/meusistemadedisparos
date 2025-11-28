import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

// Fallback para instâncias sem api_url configurada
const EVOLUTION_API_URL_FALLBACK = process.env.EVOLUTION_API_URL || ''

// Helper function to make UAZAPI requests
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

// Helper function to get QR Code from Evolution API with retry/polling
async function getEvolutionQRCode(baseUrl: string, instanceName: string, apiKey: string, maxRetries = 5) {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Evolution API] Tentativa ${attempt}/${maxRetries} para obter QR Code...`)

    const response = await fetch(
      `${baseUrl}/instance/connect/${instanceName}`,
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

    const data = await response.json()
    console.log(`[Evolution API] Resposta tentativa ${attempt}:`, JSON.stringify(data).substring(0, 300))

    // Verificar se o QR Code está disponível
    const qrCode = data.base64 || data.qrcode?.base64 || data.code
    const pairingCode = data.pairingCode

    if (qrCode || pairingCode) {
      console.log(`[Evolution API] QR Code obtido na tentativa ${attempt}`)
      return data
    }

    // Verificar se já está conectado
    if (data.state === 'open' || data.instance?.state === 'open') {
      console.log(`[Evolution API] Instância já conectada`)
      return { ...data, alreadyConnected: true }
    }

    // Se ainda está connecting e não é a última tentativa, esperar e tentar novamente
    if (attempt < maxRetries) {
      console.log(`[Evolution API] QR Code não disponível ainda (count: ${data.count}), aguardando 2s...`)
      await delay(2000)
    }
  }

  // Retornar última resposta mesmo sem QR Code
  const finalResponse = await fetch(
    `${baseUrl}/instance/connect/${instanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    }
  )

  return finalResponse.json()
}

// Helper function to check Evolution API connection state
async function getEvolutionConnectionState(baseUrl: string, instanceName: string, apiKey: string) {
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
    return null
  }

  return response.json()
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

    // Detectar qual API usar baseado na presença de api_token
    const isEvolutionApi = !!instance.api_token

    if (isEvolutionApi) {
      // ========== EVOLUTION API ==========
      const evolutionApiUrl = instance.api_url || EVOLUTION_API_URL_FALLBACK
      const apiKey = instance.api_token

      if (!evolutionApiUrl) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada' },
          { status: 500 }
        )
      }

      console.log('[Evolution API] Getting QR Code from:', evolutionApiUrl, 'Instance:', instance.instance_key)

      try {
        // Primeiro verificar o estado atual da conexão
        const connectionState = await getEvolutionConnectionState(evolutionApiUrl, instance.instance_key, apiKey)
        console.log('[Evolution API] Connection state:', connectionState)

        if (connectionState?.instance?.state === 'open') {
          await supabase
            .from('whatsapp_instances')
            .update({ status: 'connected' })
            .eq('id', id)

          return NextResponse.json({
            status: 'connected',
            message: 'Instância já está conectada',
          })
        }

        // Obter QR Code com retry/polling
        const qrData = await getEvolutionQRCode(evolutionApiUrl, instance.instance_key, apiKey, 5)
        console.log('[Evolution API] Final QR response:', JSON.stringify(qrData).substring(0, 500))

        // Verificar se está conectado (pode ter conectado durante o polling)
        if (qrData.alreadyConnected) {
          await supabase
            .from('whatsapp_instances')
            .update({ status: 'connected' })
            .eq('id', id)

          return NextResponse.json({
            status: 'connected',
            message: 'Instância já está conectada',
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
      // Obter servidor correto para esta instância
      const { url: baseUrl, token: adminToken } = getServerForInstance(instance.instance_key)

      // Verificar status atual primeiro
      try {
        const statusData = await uazapiRequest(
          baseUrl,
          `/instance/status?key=${instance.instance_key}`,
          adminToken
        )

        if (statusData.status === 'connected' || statusData.connectionStatus === 'connected' || statusData.state === 'open') {
          // Já está conectado, atualizar banco
          await supabase
            .from('whatsapp_instances')
            .update({
              status: 'connected',
              phone_number: statusData.phone_number || statusData.phone || statusData.user?.id || null,
            })
            .eq('id', id)

          return NextResponse.json({
            status: 'connected',
            message: 'Instância já está conectada',
          })
        }
      } catch (statusError) {
        console.log('Status check failed, proceeding to get QR code:', statusError)
      }

      // Obter QR Code
      const qrData = await uazapiRequest(
        baseUrl,
        `/instance/qrcode?key=${instance.instance_key}`,
        adminToken
      )

      if (!qrData.qr_code) {
        return NextResponse.json({ error: 'QR Code não disponível' }, { status: 400 })
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
        qr_code: qrData.qr_code,
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
