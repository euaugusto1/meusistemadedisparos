import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

// Fallback para instâncias sem api_url configurada
const EVOLUTION_API_URL_FALLBACK = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Helper function to make UAZAPI requests
async function uazapiPostRequest(baseUrl: string, endpoint: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'admintoken': token,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `UAZAPI Error: ${response.status}`)
  }

  return response.json()
}

// Helper function to logout from Evolution API
async function evolutionLogout(baseUrl: string, instanceName: string, apiKey: string) {
  const response = await fetch(
    `${baseUrl}/instance/logout/${instanceName}`,
    {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
      },
    }
  )

  // Se retornou 400, pode ser que a instância já está deslogada - ignorar esse erro
  if (!response.ok && response.status !== 400) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `Evolution API Error: ${response.status}`)
  }

  // Retornar sucesso mesmo em caso de 400 (já deslogada)
  if (response.status === 400) {
    console.log('[Evolution API] Instância já estava deslogada (400)')
    return { status: 'SUCCESS', message: 'Instance already logged out' }
  }

  return response.json()
}

// Helper function to find instance by token when name doesn't match
async function findEvolutionInstanceByToken(baseUrl: string, globalApiKey: string, instanceToken: string) {
  try {
    const response = await fetch(
      `${baseUrl}/instance/fetchInstances`,
      {
        method: 'GET',
        headers: {
          'apikey': globalApiKey,
        },
      }
    )

    if (!response.ok) return null

    const instances = await response.json()
    if (!Array.isArray(instances)) return null

    // Comparar tokens case-insensitive
    return instances.find((inst: { token?: string }) =>
      inst.token?.toLowerCase() === instanceToken.toLowerCase()
    )
  } catch {
    return null
  }
}

export async function POST(
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

      if (!evolutionApiUrl) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada' },
          { status: 500 }
        )
      }

      let instanceName = instance.instance_key

      // Tentar encontrar a instância pelo token se o nome não corresponder
      try {
        await evolutionLogout(evolutionApiUrl, instanceName, EVOLUTION_API_KEY)
        console.log('[Evolution API] Desconectado com sucesso:', instanceName)
      } catch (err) {
        console.log('[Evolution API] Falhou logout por nome, tentando por token:', err)

        // Buscar instância pelo token
        const evolutionInstance = await findEvolutionInstanceByToken(
          evolutionApiUrl,
          EVOLUTION_API_KEY,
          instance.api_token!
        )

        if (evolutionInstance) {
          instanceName = evolutionInstance.name
          console.log('[Evolution API] Encontrou instância por token:', instanceName)
          await evolutionLogout(evolutionApiUrl, instanceName, EVOLUTION_API_KEY)
        } else {
          console.log('[Evolution API] Instância não encontrada na Evolution API, apenas atualizando banco')
        }
      }
    } else {
      // ========== UAZAPI ==========
      // Obter servidor correto para esta instância
      const { url: baseUrl, token: adminToken } = getServerForInstance(instance.instance_key)

      // Desconectar no UAZAPI
      await uazapiPostRequest(
        baseUrl,
        '/instance/disconnect',
        adminToken,
        { instance_key: instance.instance_key }
      )
    }

    // Atualizar status no banco
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'disconnected',
        phone_number: null,
      })
      .eq('id', id)

    // Log instance disconnection
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await createSystemLog({
      userId: user.id,
      action: 'instance_disconnected',
      level: 'info',
      details: {
        instanceId: id,
        instanceName: instance.name,
        instanceKey: instance.instance_key,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Instância desconectada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao desconectar' },
      { status: 500 }
    )
  }
}
