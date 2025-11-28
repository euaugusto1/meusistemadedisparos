import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const UAZAPI_BASE_URL = process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com'
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || ''

// Helper to fetch instances from a specific server
async function fetchInstancesFromServer(baseUrl: string, token: string): Promise<{ name: string; token?: string; status?: string; phone_number?: string }[]> {
  try {
    console.log(`Tentando buscar instâncias de ${baseUrl} com token: ${token.substring(0, 10)}...`)

    const response = await fetch(`${baseUrl}/instance/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'admintoken': token,
        'apikey': token, // Alguns servidores usam apikey
        'Authorization': `Bearer ${token}`, // Alguns usam Bearer token
      },
    })

    console.log(`Resposta de ${baseUrl}: status=${response.status}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Erro ao buscar instâncias de ${baseUrl}:`, response.status, errorData)
      // Servidor free de demo pode não ter /instance/all disponível
      if (errorData.error?.includes('disabled') || errorData.error?.includes('demo')) {
        console.log(`Servidor ${baseUrl} é demo - endpoint /instance/all desabilitado`)
      }
      return []
    }

    const data = await response.json()
    console.log(`Instâncias recebidas de ${baseUrl}:`, data)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`Erro ao conectar com ${baseUrl}:`, error)
    return []
  }
}

export async function POST() {
  try {
    const supabase = createClient()

    // Verificar se é admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar instâncias do servidor principal
    const allInstances = await fetchInstancesFromServer(UAZAPI_BASE_URL, UAZAPI_ADMIN_TOKEN)

    console.log('Instâncias do servidor principal:', allInstances.length)

    if (allInstances.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        results: [],
        message: 'Nenhuma instância encontrada no UAZAPI'
      })
    }

    // Para cada instância do UAZAPI, criar ou atualizar no banco
    const results = []
    for (const instance of allInstances) {
      // UAZAPI pode retornar 'name' ou 'instance_key'
      const instanceKey = (instance as { name?: string; instance_key?: string; instanceKey?: string }).name ||
                     (instance as { instance_key?: string }).instance_key ||
                     (instance as { instanceKey?: string }).instanceKey || ''

      const instanceToken = (instance as { token?: string; apiToken?: string }).token ||
                           (instance as { apiToken?: string }).apiToken || instanceKey

      if (!instanceKey) {
        console.log('Instância sem key:', instance)
        continue
      }

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('instance_key', instanceKey)
        .single()

      // Extract status and phone from instance
      const instanceStatus = (instance as { status?: string; connectionStatus?: string }).status ||
                            (instance as { connectionStatus?: string }).connectionStatus || 'disconnected'
      const phoneNumber = (instance as { phone_number?: string; phone?: string; number?: string }).phone_number ||
                         (instance as { phone?: string }).phone ||
                         (instance as { number?: string }).number || null

      if (existing) {
        // Atualizar status E token (sincronizar token do UAZAPI)
        const { error } = await supabase
          .from('whatsapp_instances')
          .update({
            status: instanceStatus,
            phone_number: phoneNumber,
            token: instanceToken,
            api_token: instanceToken, // Sincronizar api_token também
          })
          .eq('id', existing.id)

        if (!error) {
          results.push({ key: instanceKey, action: 'updated', token: instanceToken.substring(0, 8) + '...' })
        } else {
          console.log('Erro ao atualizar:', error)
        }
      } else {
        // Criar nova instância (associar ao admin por padrão)
        const { error } = await supabase
          .from('whatsapp_instances')
          .insert({
            user_id: user.id,
            name: instanceKey,
            instance_key: instanceKey,
            token: instanceToken,
            api_token: instanceToken, // Token para API
            api_url: UAZAPI_BASE_URL, // URL do servidor
            status: instanceStatus,
            phone_number: phoneNumber,
            is_test: false, // Instâncias UAZAPI não são teste
          })

        if (!error) {
          results.push({ key: instanceKey, action: 'created' })
        } else {
          console.log('Erro ao criar:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: allInstances.length,
      results,
    })
  } catch (error) {
    console.error('Erro ao sincronizar instâncias:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao sincronizar' },
      { status: 500 }
    )
  }
}
