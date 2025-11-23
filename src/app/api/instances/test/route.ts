import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const TEST_SERVER_URL = 'https://free.uazapi.com'
const TEST_ADMIN_TOKEN = 'ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t'

export async function POST() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Check if user already has a test instance that hasn't expired
    const { data: existingTest } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_test', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingTest) {
      const expiresAt = new Date(existingTest.expires_at!)
      const minutesRemaining = Math.round(
        (expiresAt.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        {
          error: `Você já possui uma instância de teste ativa. Expira em ${minutesRemaining} minutos.`,
        },
        { status: 400 }
      )
    }

    // Create instance on UAZAPI test server
    const instanceName = `test_${user.id.substring(0, 8)}_${Date.now()}`

    const requestPayload = {
      name: instanceName,
      systemName: 'AraujoIA_Test',
      adminField01: `user_${user.id}`,
      adminField02: 'test_instance',
    }

    console.log('Creating test instance...')
    console.log('URL:', `${TEST_SERVER_URL}/instance/init`)
    console.log('Payload:', requestPayload)
    console.log('Token (first 20 chars):', TEST_ADMIN_TOKEN.substring(0, 20) + '...')

    const response = await fetch(`${TEST_SERVER_URL}/instance/init`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('UAZAPI Error Response:', errorText)
      console.error('Response status:', response.status)

      // If unauthorized, this likely means the free server requires authentication
      // that we don't have, or doesn't support programmatic instance creation
      if (response.status === 401) {
        throw new Error(
          'O servidor gratuito da UAZAPI não permite criação de instâncias via API. ' +
          'Por favor, entre em contato com o suporte da UAZAPI para obter as credenciais corretas ' +
          'ou crie sua instância manualmente no painel de controle em https://free.uazapi.com'
        )
      }

      throw new Error(`Erro ao criar instância de teste: ${errorText}`)
    }

    const instanceData = await response.json()
    console.log('UAZAPI Response:', instanceData)

    // Calculate expiration time (1 hour from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    // Extract token from response
    const token = instanceData.hash?.apikey || instanceData.token || ''

    if (!token) {
      console.error('No token found in response:', instanceData)
      throw new Error('Token não retornado pela API UAZAPI')
    }

    // Save to database using admin client
    const adminSupabase = createAdminClient()
    const { data: newInstance, error: dbError } = await adminSupabase
      .from('whatsapp_instances')
      .insert({
        user_id: user.id,
        name: 'Instância de Teste (1h)',
        instance_key: instanceName,
        token: token,
        status: 'disconnected',
        is_test: true,
        expires_at: expiresAt.toISOString(),
        server_url: TEST_SERVER_URL,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Erro ao salvar instância no banco de dados')
    }

    return NextResponse.json({
      success: true,
      instance: newInstance,
      message: 'Instância de teste criada com sucesso! Válida por 1 hora.',
    })
  } catch (error) {
    console.error('Error creating test instance:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao criar instância de teste',
      },
      { status: 500 }
    )
  }
}

// Clean up expired test instances
export async function DELETE() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Get expired test instances for this user
    const { data: expiredInstances } = await adminSupabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_test', true)
      .lt('expires_at', new Date().toISOString())

    if (!expiredInstances || expiredInstances.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma instância expirada encontrada',
      })
    }

    // Delete from UAZAPI server
    for (const instance of expiredInstances) {
      try {
        await fetch(
          `${instance.server_url}/instance/delete/${instance.instance_key}`,
          {
            method: 'DELETE',
            headers: {
              'admin-token': TEST_ADMIN_TOKEN,
            },
          }
        )
      } catch (error) {
        console.error(
          `Error deleting instance ${instance.instance_key} from UAZAPI:`,
          error
        )
      }
    }

    // Delete from database
    const { error: deleteError } = await adminSupabase
      .from('whatsapp_instances')
      .delete()
      .eq('user_id', user.id)
      .eq('is_test', true)
      .lt('expires_at', new Date().toISOString())

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `${expiredInstances.length} instância(s) expirada(s) removida(s)`,
    })
  } catch (error) {
    console.error('Error cleaning up expired instances:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao limpar instâncias expiradas',
      },
      { status: 500 }
    )
  }
}
