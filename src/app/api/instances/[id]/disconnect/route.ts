import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

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

    // Obter servidor correto para esta instância
    const { url: baseUrl, token: adminToken } = getServerForInstance(instance.instance_key)

    // Desconectar no UAZAPI
    await uazapiPostRequest(
      baseUrl,
      '/instance/disconnect',
      adminToken,
      { instance_key: instance.instance_key }
    )

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
