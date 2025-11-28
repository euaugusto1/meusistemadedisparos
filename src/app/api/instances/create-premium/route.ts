import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createSystemLogger } from '@/lib/system-logger'

// Servidor UAZAPI de Produção para instâncias premium (Bronze+)
const UAZAPI_PROD_URL = process.env.UAZAPI_BASE_URL || 'https://monitor-grupo.uazapi.com'
const UAZAPI_PROD_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || 'bxQWIA0PCVxhejo2yvYoVgtQ9SWx4S5qjkWQAwORviB9kzqwa5'

export async function POST() {
  const logger = createSystemLogger()

  try {
    const supabase = createClient()

    // Verificar usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar plano do usuário (deve ser bronze ou superior)
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, role')
      .eq('id', user.id)
      .single()

    const planTier = profile?.plan_tier || 'free'
    const isAdmin = profile?.role === 'admin'

    // Free plan não pode criar instâncias premium
    if (planTier === 'free' && !isAdmin) {
      return NextResponse.json(
        { error: 'Plano Bronze ou superior necessário para criar instâncias premium' },
        { status: 403 }
      )
    }

    // Gerar nome único para a instância
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const instanceName = `wpp_${user.id.substring(0, 8)}_${timestamp}_${randomSuffix}`

    console.log('[Create Premium Instance] Criando instância UAZAPI Produção:', instanceName)
    console.log('[Create Premium Instance] URL:', `${UAZAPI_PROD_URL}/instance/init`)

    // Criar instância no UAZAPI usando /instance/init
    // Documentação: https://docs.uazapi.com/endpoint/post/instance~init
    const uazapiResponse = await fetch(`${UAZAPI_PROD_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'admintoken': UAZAPI_PROD_TOKEN,
      },
      body: JSON.stringify({
        name: instanceName,
        systemName: 'araujo-ia-solutions',
        adminField01: user.id, // User ID para rastreamento
        adminField02: planTier, // Plano do usuário
      }),
    })

    const uazapiData = await uazapiResponse.json().catch(() => ({}))
    console.log('[Create Premium Instance] Resposta UAZAPI:', JSON.stringify(uazapiData, null, 2))

    if (!uazapiResponse.ok) {
      console.error('[Create Premium Instance] Erro UAZAPI:', uazapiData)
      return NextResponse.json(
        { error: 'Erro ao criar instância no servidor UAZAPI', details: uazapiData },
        { status: 500 }
      )
    }

    // Extrair token da instância da resposta
    // A resposta do /instance/init retorna o token da instância
    const instanceToken = uazapiData.token || uazapiData.instance?.token || instanceName

    // Salvar no banco de dados com a URL da API
    const { data: newInstance, error: dbError } = await supabase
      .from('whatsapp_instances')
      .insert({
        user_id: user.id,
        name: `WhatsApp Business - ${new Date().toLocaleDateString('pt-BR')}`,
        instance_key: instanceName,
        token: instanceToken,
        api_token: instanceToken, // Token para API
        api_url: UAZAPI_PROD_URL, // URL do servidor UAZAPI Produção
        status: 'disconnected',
        is_test: false, // Instância premium, não é teste
        phone_number: null,
        webhook_url: null,
        expires_at: null, // Sem expiração
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Create Premium Instance] Erro ao salvar no banco:', dbError)
      return NextResponse.json(
        { error: 'Erro ao salvar instância no banco de dados', details: dbError.message },
        { status: 500 }
      )
    }

    // Log da criação
    await logger.log({
      action: 'instance_created',
      userId: user.id,
      resourceType: 'instance',
      resourceId: newInstance.id,
      details: {
        instanceName,
        type: 'premium',
        planTier,
        apiUrl: UAZAPI_PROD_URL,
      },
    })

    // Retornar instância criada
    // O QR Code será buscado via /instance/qrcode/{token}
    return NextResponse.json({
      success: true,
      instance: newInstance,
      instanceToken: instanceToken,
      apiUrl: UAZAPI_PROD_URL,
      message: 'Instância premium criada com sucesso. Escaneie o QR Code para conectar.',
    })

  } catch (error) {
    console.error('[Create Premium Instance] Erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar instância' },
      { status: 500 }
    )
  }
}
