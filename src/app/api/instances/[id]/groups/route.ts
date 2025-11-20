import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar instância do usuário
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    // Verificar se está conectada
    if (instance.status !== 'connected') {
      return NextResponse.json({
        error: 'Instância não está conectada',
        status: instance.status
      }, { status: 400 })
    }

    // Obter servidor correto para esta instância
    const { url: baseUrl, token: adminToken } = getServerForInstance(instance.instance_key)

    // Buscar parâmetros da URL
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === 'true'
    const noparticipants = url.searchParams.get('noparticipants') === 'true'

    // Construir URL da API
    const apiUrl = new URL(`${baseUrl}/group/list`)
    if (force) apiUrl.searchParams.append('force', 'true')
    if (noparticipants) apiUrl.searchParams.append('noparticipants', 'true')

    const tokenToUse = instance.token || adminToken
    console.log('Fetching groups from:', apiUrl.toString())
    console.log('Instance key:', instance.instance_key)
    console.log('Token being used:', tokenToUse?.substring(0, 10) + '...')

    // Chamar API do UAZAPI
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'token': tokenToUse,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Error fetching groups:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Erro ao buscar grupos' },
        { status: response.status }
      )
    }

    const data = await response.json()
    // API retorna {groups: [...]} ou diretamente [...]
    const rawGroups = data.groups || data || []
    console.log('Groups fetched:', Array.isArray(rawGroups) ? rawGroups.length : 0)
    console.log('Sample group:', JSON.stringify(rawGroups[0]).substring(0, 500))

    // Mapear campos da API UAZAPI para nosso formato
    // UAZAPI usa: JID, Name, Topic, Participants
    // Nosso formato: id, name, subject, participants
    // Name = nome do grupo, Topic = descrição do grupo
    const groups = Array.isArray(rawGroups) ? rawGroups.map((g: any) => ({
      id: g.JID || g.id,
      name: g.Name || g.name || 'Grupo sem nome',
      subject: g.Topic || g.subject || '',
      participants: (g.Participants || g.participants || []).map((p: any) => ({
        id: p.JID || p.id || p,
        admin: p.Admin || p.admin || false
      }))
    })) : []

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
    })
  } catch (error) {
    console.error('Erro ao listar grupos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar grupos' },
      { status: 500 }
    )
  }
}
