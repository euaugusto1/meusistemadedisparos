import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { UAZAPI_FREE_URL, UAZAPI_FREE_TOKEN } from '@/services/uazapi'

// Usar servidor FREE para criar instâncias de teste
const UAZAPI_BASE_URL = UAZAPI_FREE_URL
const UAZAPI_ADMIN_TOKEN = UAZAPI_FREE_TOKEN

export async function POST(request: Request) {
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

    const body = await request.json()
    const { name, user_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Nome da instância é obrigatório' }, { status: 400 })
    }

    // Gerar instance_key único com prefixo "free-" para identificar servidor
    const instanceKey = `free-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`

    // Criar instância no UAZAPI (servidor principal)
    let instanceToken = instanceKey

    try {
      // Endpoint para criar instância
      console.log('Creating instance with:', { name: instanceKey, url: `${UAZAPI_BASE_URL}/instance/init` })
      const uazapiResponse = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'admintoken': UAZAPI_ADMIN_TOKEN,
        },
        body: JSON.stringify({
          name: instanceKey,
          instanceName: instanceKey, // Alguns servidores usam este campo
        }),
      })

      if (uazapiResponse.ok) {
        const uazapiData = await uazapiResponse.json()
        console.log('UAZAPI Response:', uazapiData)
        instanceToken = uazapiData.token || uazapiData.apiToken || instanceKey
      } else {
        const errorData = await uazapiResponse.json().catch(() => ({}))
        console.error('UAZAPI create failed:', errorData)
        throw new Error('Erro ao criar instância no UAZAPI')
      }
    } catch (apiError) {
      console.error('UAZAPI API Error:', apiError)
      throw new Error('Erro ao criar instância no UAZAPI')
    }

    // Salvar no banco de dados usando cliente admin para bypassar RLS
    const adminSupabase = createAdminClient()
    const { data: instance, error: dbError } = await adminSupabase
      .from('whatsapp_instances')
      .insert({
        user_id: user_id || user.id,
        name: name,
        instance_key: instanceKey,
        token: instanceToken,
        status: 'disconnected',
        webhook_url: null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database Error:', dbError)
      throw new Error('Erro ao salvar instância no banco de dados')
    }

    return NextResponse.json({
      success: true,
      instance,
      message: 'Instância criada com sucesso.',
    })
  } catch (error) {
    console.error('Erro ao criar instância de teste:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar instância de teste' },
      { status: 500 }
    )
  }
}
