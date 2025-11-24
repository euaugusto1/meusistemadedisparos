import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

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

// Helper function to make Evolution API requests
async function evolutionApiRequest(instanceName: string) {
  const response = await fetch(
    `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
    {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `Evolution API Error: ${response.status}`)
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

    let status: string
    let phoneNumber: string | null = null

    // Detectar qual API usar baseado na presença de api_token
    const isEvolutionApi = !!instance.api_token

    if (isEvolutionApi) {
      // Usar Evolution API
      const statusData = await evolutionApiRequest(instance.instance_key)

      // Normalizar status da Evolution API
      const state = statusData.state || statusData.instance?.state || 'close'
      if (state === 'open') {
        status = 'connected'
      } else if (state === 'connecting') {
        status = 'connecting'
      } else {
        status = 'disconnected'
      }

      // Obter número de telefone se disponível
      phoneNumber = statusData.instance?.profilePictureUrl ?
        (statusData.instance.owner || null) : null
    } else {
      // Usar UAZAPI
      const { url: baseUrl, token: adminToken } = getServerForInstance(instance.instance_key)

      const statusData = await uazapiRequest(
        baseUrl,
        `/instance/status?key=${instance.instance_key}`,
        adminToken
      )

      // Normalizar status
      status = statusData.status || statusData.connectionStatus || statusData.state || 'disconnected'
      if (status === 'open' || status === 'connected') {
        status = 'connected'
      } else if (status === 'qrcode' || status === 'qr_code') {
        status = 'qr_code'
      } else if (status === 'connecting') {
        status = 'connecting'
      } else {
        status = 'disconnected'
      }

      phoneNumber = statusData.phone_number || statusData.phone || statusData.number || null
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
