import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''

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

    // Detectar qual API usar baseado na presença do api_token
    const isEvolutionApi = !!instance.api_token

    console.log('API Detection:', {
      isEvolutionApi,
      instanceKey: instance.instance_key,
      hasApiToken: !!instance.api_token,
      hasToken: !!instance.token
    })

    if (isEvolutionApi) {
      // ========== EVOLUTION API ==========
      if (!EVOLUTION_API_URL) {
        return NextResponse.json(
          { error: 'Evolution API URL não configurada' },
          { status: 500 }
        )
      }

      // Construir URL da Evolution API
      const apiUrl = `${EVOLUTION_API_URL}/group/fetchAllGroups/${instance.instance_key}`

      console.log('Fetching groups from Evolution API:', apiUrl)

      // Chamar API da Evolution
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'apikey': instance.api_token,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching groups from Evolution API:', errorData)
        return NextResponse.json(
          { error: errorData.message || 'Erro ao buscar grupos' },
          { status: response.status }
        )
      }

      const data = await response.json()
      // Evolution API retorna array direto
      const rawGroups = Array.isArray(data) ? data : []

      console.log('Groups fetched from Evolution API:', rawGroups.length)

      // Mapear campos da Evolution API para nosso formato
      // Evolution API retorna: id, subject, subjectOwner, subjectTime, pictureUrl, size, creation, owner, desc, descId, restrict, announce
      const groups = rawGroups.map((g: any) => ({
        id: g.id,
        name: g.subject || 'Grupo sem nome',
        subject: g.desc || '',
        participants: [], // Evolution API não retorna participantes por padrão neste endpoint
        size: g.size || 0,
        pictureUrl: g.pictureUrl,
        owner: g.owner,
        creation: g.creation,
        announce: g.announce,
        restrict: g.restrict
      }))

      return NextResponse.json({
        success: true,
        groups,
        total: groups.length,
        api: 'evolution'
      })

    } else {
      // ========== UAZAPI ==========
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
      console.log('Fetching groups from UAZAPI:', apiUrl.toString())

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
        console.error('Error fetching groups from UAZAPI:', errorData)
        return NextResponse.json(
          { error: errorData.message || 'Erro ao buscar grupos' },
          { status: response.status }
        )
      }

      const data = await response.json()
      // API retorna {groups: [...]} ou diretamente [...]
      const rawGroups = data.groups || data || []
      console.log('Groups fetched from UAZAPI:', Array.isArray(rawGroups) ? rawGroups.length : 0)

      // Mapear campos da API UAZAPI para nosso formato
      // UAZAPI usa: JID, Name, Topic, Participants
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
        api: 'uazapi'
      })
    }
  } catch (error) {
    console.error('Erro ao listar grupos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar grupos' },
      { status: 500 }
    )
  }
}
