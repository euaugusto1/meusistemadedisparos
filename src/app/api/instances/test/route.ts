import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  EvolutionCreateInstancePayload,
  EvolutionCreateInstanceResponse
} from '@/types'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const TEST_INSTANCE_DURATION_DAYS = 15

export async function POST() {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuração da Evolution API ausente',
          details: 'As variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY não estão configuradas.'
        },
        { status: 500 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se já existe uma instância de teste ativa para este usuário
    const { data: existingTestInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_test', true)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingTestInstance) {
      const expiresAt = new Date(existingTestInstance.expires_at!)
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      return NextResponse.json(
        {
          error: 'Você já possui uma instância de teste ativa',
          details: `Aguarde até ${expiresAt.toLocaleString('pt-BR')} (${daysRemaining} dias restantes) para criar uma nova instância de teste.`
        },
        { status: 400 }
      )
    }

    // Gerar nome único para a instância de teste
    const instanceName = `test_${user.id.substring(0, 8)}_${Date.now()}`

    console.log('Creating test instance with Evolution API...')
    console.log('Instance name:', instanceName)
    console.log('Evolution API URL:', EVOLUTION_API_URL)
    console.log('Evolution API Key:', EVOLUTION_API_KEY ? `${EVOLUTION_API_KEY.substring(0, 10)}...` : 'NOT SET')

    // Criar instância na Evolution API
    const payload: EvolutionCreateInstancePayload = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    }

    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    console.log('Evolution API response status:', evolutionResponse.status)

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.json().catch(() => null)
      console.error('Evolution API error:', errorData)
      return NextResponse.json(
        {
          error: 'Erro ao criar instância na Evolution API',
          details: errorData?.message || `Status: ${evolutionResponse.status}`
        },
        { status: evolutionResponse.status }
      )
    }

    const evolutionData: EvolutionCreateInstanceResponse = await evolutionResponse.json()
    console.log('Evolution API response:', JSON.stringify(evolutionData, null, 2))
    console.log('API Key from response:', evolutionData.hash)

    // Verificar se o hash foi retornado
    if (!evolutionData.hash) {
      console.error('No hash in Evolution API response:', evolutionData)
      return NextResponse.json(
        {
          error: 'Evolution API não retornou o token de autenticação',
          details: 'Resposta da API não contém hash'
        },
        { status: 500 }
      )
    }

    // Calcular data de expiração (15 dias)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + TEST_INSTANCE_DURATION_DAYS)

    const apiToken = evolutionData.hash

    console.log('Saving to database with token:', apiToken)

    // Salvar instância no banco de dados
    const { data: newInstance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        user_id: user.id,
        name: `Teste Grátis - ${TEST_INSTANCE_DURATION_DAYS} dias`,
        instance_key: instanceName,
        token: apiToken,
        api_token: apiToken,
        api_url: EVOLUTION_API_URL,
        status: 'qr_code',
        is_test: true,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)

      // Tentar deletar a instância criada na Evolution API
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: {
            'apikey': EVOLUTION_API_KEY,
          },
        })
        console.log('Cleanup: Deleted instance from Evolution API')
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }

      return NextResponse.json(
        {
          error: 'Erro ao salvar instância no banco de dados',
          details: insertError.message
        },
        { status: 500 }
      )
    }

    console.log('Test instance created successfully:', newInstance.id)

    return NextResponse.json({
      success: true,
      message: `Instância de teste criada com sucesso! Válida por ${TEST_INSTANCE_DURATION_DAYS} dias.`,
      instance: newInstance,
      qrcode: evolutionData.qrcode?.base64 || null,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating test instance:', error)
    return NextResponse.json(
      {
        error: 'Erro ao criar instância de teste',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Clean up expired test instances
export async function DELETE() {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar instâncias de teste expiradas do usuário
    const { data: expiredInstances, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_test', true)
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired instances:', fetchError)
      return NextResponse.json(
        { error: 'Erro ao buscar instâncias expiradas' },
        { status: 500 }
      )
    }

    if (!expiredInstances || expiredInstances.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma instância expirada encontrada',
        deleted: 0
      })
    }

    console.log(`Cleaning up ${expiredInstances.length} expired test instances`)

    // Deletar cada instância expirada
    const deletionResults = await Promise.allSettled(
      expiredInstances.map(async (instance) => {
        // Deletar da Evolution API
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          try {
            const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instance.instance_key}`, {
              method: 'DELETE',
              headers: {
                'apikey': EVOLUTION_API_KEY,
              },
            })

            if (response.ok) {
              console.log(`Deleted instance ${instance.instance_key} from Evolution API`)
            } else {
              console.error(`Failed to delete instance ${instance.instance_key} from Evolution API: ${response.status}`)
            }
          } catch (error) {
            console.error(`Error deleting instance ${instance.instance_key} from Evolution API:`, error)
          }
        }

        // Deletar do banco de dados
        const { error } = await supabase
          .from('whatsapp_instances')
          .delete()
          .eq('id', instance.id)

        if (error) throw error
        return instance.id
      })
    )

    const successfulDeletions = deletionResults.filter(r => r.status === 'fulfilled').length

    console.log(`Successfully deleted ${successfulDeletions} expired test instances`)

    return NextResponse.json({
      success: true,
      message: `${successfulDeletions} instância(s) expirada(s) removida(s)`,
      deleted: successfulDeletions
    })

  } catch (error) {
    console.error('Error cleaning up expired instances:', error)
    return NextResponse.json(
      {
        error: 'Erro ao limpar instâncias expiradas',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
