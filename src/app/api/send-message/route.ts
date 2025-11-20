import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerForInstance } from '@/services/uazapi'

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { instanceKey, token, number, message, mediaUrl, buttonType, buttons } = body

    if (!instanceKey || !token || !number || !message) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Obter servidor correto para esta instância
    const { url: baseUrl } = getServerForInstance(instanceKey)

    // Determinar tipo de envio e preparar body
    let endpoint = '/send/text'
    let requestBody: Record<string, unknown> = {
      number,
      text: message,
    }

    // Se tem botões, usar menu carousel
    if (buttonType === 'button' && buttons && buttons.length > 0) {
      endpoint = '/send/menu'

      // Coletar todos os media_ids dos botões para buscar URLs
      const buttonMediaIds = buttons
        .map((b: { media_id?: string }) => b.media_id)
        .filter((id: string | undefined): id is string => !!id)

      // Buscar URLs das mídias dos botões
      let mediaUrlMap: Record<string, string> = {}
      if (buttonMediaIds.length > 0) {
        const { data: mediaFiles } = await supabase
          .from('media_files')
          .select('id, public_url')
          .in('id', buttonMediaIds)

        if (mediaFiles) {
          mediaUrlMap = mediaFiles.reduce((acc: Record<string, string>, m: { id: string; public_url: string }) => {
            acc[m.id] = m.public_url
            return acc
          }, {})
        }
      }

      // Montar choices no formato correto da UAZAPI
      // Formato: "[Texto do cartão]", "{URL da imagem}", "Texto do botão|url:link"
      const choices: string[] = []

      for (const button of buttons as { name: string; url: string; text?: string; media_id?: string }[]) {
        // Texto do cartão (usa texto individual do botão ou a mensagem principal como fallback)
        const cardText = button.text || message
        choices.push(`[${cardText}]`)

        // Imagem (usa imagem individual do botão ou a mídia principal como fallback)
        const buttonImageUrl = button.media_id ? mediaUrlMap[button.media_id] : mediaUrl
        if (buttonImageUrl) {
          choices.push(`{${buttonImageUrl}}`)
        }

        // Botão com URL
        choices.push(`${button.name}|https:${button.url.replace(/^https?:/, '')}`)
      }

      requestBody = {
        number,
        type: 'carousel',
        text: message,
        choices,
      }
    }
    // Se tem mídia
    else if (mediaUrl) {
      endpoint = '/send/media'

      // Detectar tipo de mídia pela URL
      const url = mediaUrl.toLowerCase()
      let type = 'document'
      if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif')) {
        type = 'image'
      } else if (url.includes('.mp4') || url.includes('.mov') || url.includes('.avi')) {
        type = 'video'
      } else if (url.includes('.mp3') || url.includes('.ogg') || url.includes('.wav')) {
        type = 'audio'
      }

      requestBody = {
        number,
        type,
        file: mediaUrl,
        text: message,
      }
    }

    console.log(`Sending message via ${baseUrl}${endpoint}`)
    console.log('Request body:', JSON.stringify(requestBody))

    // Fazer requisição para UAZAPI
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': token,
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json().catch(() => ({}))
    console.log('UAZAPI Response:', response.status, responseData)

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: responseData.message || responseData.error || `Erro ${response.status}`,
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      ...responseData,
    })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}
