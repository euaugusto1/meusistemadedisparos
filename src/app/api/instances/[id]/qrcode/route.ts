import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

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
  } catch (error) {
    console.error('Erro ao obter QR Code:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao obter QR Code' },
      { status: 500 }
    )
  }
}
