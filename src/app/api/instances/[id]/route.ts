import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerForInstance } from '@/services/uazapi'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

// Helper para deletar instância UAZAPI
// Documentação: DELETE /instance com header 'token' da instância
async function deleteUazapiInstance(baseUrl: string, instanceToken: string): Promise<boolean> {
  try {
    console.log('[UAZAPI] Deletando instância de:', baseUrl)
    console.log('[UAZAPI] Token:', instanceToken?.substring(0, 10) + '...')

    const response = await fetch(`${baseUrl}/instance`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'token': instanceToken,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      console.log('[UAZAPI] Instância deletada com sucesso:', data)
      return true
    } else {
      console.error('[UAZAPI] Erro ao deletar:', response.status, data)
      return false
    }
  } catch (error) {
    console.error('[UAZAPI] Erro ao deletar instância:', error)
    return false
  }
}

// DELETE - Deletar instância (apenas admin ou dono)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar a instância
    const { data: instance, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    // Buscar perfil do usuário para verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = instance.user_id === user.id

    // Verificar permissão (apenas admin ou dono)
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Você não tem permissão para deletar esta instância' },
        { status: 403 }
      )
    }

    // Deletar da Evolution API (se for instância de teste)
    if (instance.is_test && instance.api_token && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
      try {
        const response = await fetch(
          `${EVOLUTION_API_URL}/instance/delete/${instance.instance_key}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': EVOLUTION_API_KEY,
            },
          }
        )

        if (response.ok) {
          console.log(`Deleted instance ${instance.instance_key} from Evolution API`)
        } else {
          console.error(
            `Failed to delete instance ${instance.instance_key} from Evolution API: ${response.status}`
          )
        }
      } catch (error) {
        console.error(
          `Error deleting instance ${instance.instance_key} from Evolution API:`,
          error
        )
        // Continua mesmo se falhar na Evolution API
      }
    }

    // Deletar da UAZAPI (se NÃO for instância de teste - instância premium)
    if (!instance.is_test) {
      const instanceToken = instance.api_token || instance.token

      if (instanceToken) {
        const { url: baseUrl } = getServerForInstance(instance.instance_key, instance.api_url)
        console.log(`[UAZAPI] Deletando instância ${instance.instance_key} de ${baseUrl}`)

        const deleted = await deleteUazapiInstance(baseUrl, instanceToken)

        if (deleted) {
          console.log(`[UAZAPI] Instância ${instance.instance_key} deletada com sucesso`)
        } else {
          console.warn(`[UAZAPI] Falha ao deletar ${instance.instance_key} - continuando com deleção local`)
        }
      } else {
        console.warn(`[UAZAPI] Token não encontrado para instância ${instance.instance_key}`)
      }
    }

    // Deletar do banco de dados
    const { error: deleteError } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json(
        {
          error: 'Erro ao deletar instância do banco de dados',
          details: deleteError.message
        },
        { status: 500 }
      )
    }

    console.log(`Instance ${params.id} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Instância deletada com sucesso'
    })
  } catch (error) {
    console.error('Error deleting instance:', error)
    return NextResponse.json(
      {
        error: 'Erro ao deletar instância',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// PATCH - Editar instância (apenas admin ou dono)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar a instância
    const { data: instance, error: fetchError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    // Buscar perfil do usuário para verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = instance.user_id === user.id

    // Verificar permissão (apenas admin ou dono)
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar esta instância' },
        { status: 403 }
      )
    }

    // Obter dados do body
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome inválido' },
        { status: 400 }
      )
    }

    // Atualizar no banco de dados
    const { data: updatedInstance, error: updateError } = await supabase
      .from('whatsapp_instances')
      .update({ name: name.trim() })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        {
          error: 'Erro ao atualizar instância',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    console.log(`Instance ${params.id} updated successfully`)

    return NextResponse.json({
      success: true,
      message: 'Instância atualizada com sucesso',
      instance: updatedInstance
    })
  } catch (error) {
    console.error('Error updating instance:', error)
    return NextResponse.json(
      {
        error: 'Erro ao atualizar instância',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
