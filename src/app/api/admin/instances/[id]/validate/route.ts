import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createSystemLog, extractRequestInfo } from '@/lib/system-logger'

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

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar instância
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    // Verificar se é uma instância de teste
    if (!instance.is_test) {
      return NextResponse.json({ error: 'Esta instância já é permanente' }, { status: 400 })
    }

    // Converter para permanente (remover is_test e expires_at)
    const { error: updateError } = await supabase
      .from('whatsapp_instances')
      .update({
        is_test: false,
        expires_at: null,
        name: instance.name.replace('Teste Grátis - 15 dias', 'WhatsApp Business'),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Erro ao validar instância:', updateError)
      return NextResponse.json(
        { error: 'Erro ao validar instância' },
        { status: 500 }
      )
    }

    // Log da ação
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await createSystemLog({
      userId: user.id,
      action: 'instance_validated',
      level: 'info',
      details: {
        instanceId: id,
        instanceName: instance.name,
        instanceKey: instance.instance_key,
        ownerId: instance.user_id,
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Instância validada como permanente com sucesso',
    })
  } catch (error) {
    console.error('Erro ao validar instância:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao validar instância' },
      { status: 500 }
    )
  }
}
