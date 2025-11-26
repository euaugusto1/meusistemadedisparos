import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET - Obter detalhes completos do usuário
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { userId } = params

    // Buscar perfil do usuário
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Buscar estatísticas
    const [
      campaignsResult,
      instancesResult,
      listsResult,
      paymentsResult,
      notesResult
    ] = await Promise.all([
      // Campanhas
      adminSupabase
        .from('campaigns')
        .select('id, status, total_recipients, sent_count, failed_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),

      // Instâncias
      adminSupabase
        .from('whatsapp_instances')
        .select('id, name, status, phone_number, created_at')
        .eq('user_id', userId),

      // Listas de contatos
      adminSupabase
        .from('contacts_lists')
        .select('id, name, contact_count, created_at')
        .eq('user_id', userId),

      // Pagamentos
      adminSupabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Notas do admin
      adminSupabase
        .from('user_notes')
        .select('*, admin:profiles!admin_id(full_name, email)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ])

    // Calcular estatísticas
    const campaigns = campaignsResult.data || []
    const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)
    const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0)
    const successRate = totalSent + totalFailed > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 0

    const stats = {
      total_campaigns: campaigns.length,
      total_messages_sent: totalSent,
      total_messages_failed: totalFailed,
      success_rate: successRate,
      active_instances: (instancesResult.data || []).filter(i => i.status === 'connected').length,
      total_instances: (instancesResult.data || []).length,
      total_lists: (listsResult.data || []).length,
      total_contacts: (listsResult.data || []).reduce((acc, l) => acc + (l.contact_count || 0), 0),
    }

    return NextResponse.json({
      profile: userProfile,
      stats,
      campaigns: campaigns,
      instances: instancesResult.data || [],
      lists: listsResult.data || [],
      payments: paymentsResult.data || [],
      notes: notesResult.data || [],
    })

  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Ações específicas (bloquear, desbloquear, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = params
    const body = await request.json()
    const { action, ...data } = body

    const adminSupabase = createAdminClient()

    switch (action) {
      case 'block': {
        const { reason } = data
        const { error } = await adminSupabase
          .from('profiles')
          .update({
            status: 'blocked',
            blocked_at: new Date().toISOString(),
            blocked_reason: reason || 'Bloqueado pelo administrador',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) throw error

        // Registrar log
        await adminSupabase.from('system_logs').insert({
          user_id: user.id,
          action: 'user_blocked',
          level: 'warn',
          details: { blocked_user_id: userId, reason },
        })

        return NextResponse.json({ success: true, message: 'Usuário bloqueado' })
      }

      case 'unblock': {
        const { error } = await adminSupabase
          .from('profiles')
          .update({
            status: 'active',
            blocked_at: null,
            blocked_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) throw error

        // Registrar log
        await adminSupabase.from('system_logs').insert({
          user_id: user.id,
          action: 'user_unblocked',
          level: 'info',
          details: { unblocked_user_id: userId },
        })

        return NextResponse.json({ success: true, message: 'Usuário desbloqueado' })
      }

      case 'add_credits': {
        const { amount, description } = data
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 })
        }

        // Buscar créditos atuais do admin e do usuário
        const { data: adminProfile } = await adminSupabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single()

        const { data: targetUser } = await adminSupabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        if (!adminProfile || !targetUser) {
          return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        // Verificar se admin tem créditos suficientes
        if (adminProfile.credits < amount) {
          return NextResponse.json({
            error: `Créditos insuficientes. Você tem ${adminProfile.credits} créditos.`
          }, { status: 400 })
        }

        // Descontar do admin
        await adminSupabase
          .from('profiles')
          .update({ credits: adminProfile.credits - amount })
          .eq('id', user.id)

        // Adicionar ao usuário
        const { error } = await adminSupabase
          .from('profiles')
          .update({ credits: targetUser.credits + amount })
          .eq('id', userId)

        if (error) throw error

        // Registrar histórico de créditos
        await adminSupabase.from('credit_history').insert({
          user_id: userId,
          amount,
          type: 'add',
          description: description || 'Créditos adicionados pelo administrador',
          admin_id: user.id,
        })

        // Registrar log
        await adminSupabase.from('system_logs').insert({
          user_id: user.id,
          action: 'credits_added',
          level: 'info',
          details: {
            target_user_id: userId,
            amount,
            description,
            admin_credits_before: adminProfile.credits,
            admin_credits_after: adminProfile.credits - amount,
          },
        })

        return NextResponse.json({
          success: true,
          message: `${amount} créditos adicionados`,
          newBalance: targetUser.credits + amount
        })
      }

      case 'add_note': {
        const { note } = data
        if (!note || !note.trim()) {
          return NextResponse.json({ error: 'Nota não pode estar vazia' }, { status: 400 })
        }

        const { data: newNote, error } = await adminSupabase
          .from('user_notes')
          .insert({
            user_id: userId,
            admin_id: user.id,
            note: note.trim(),
          })
          .select('*, admin:profiles!admin_id(full_name, email)')
          .single()

        if (error) throw error

        return NextResponse.json({ success: true, note: newNote })
      }

      case 'delete_note': {
        const { noteId } = data
        if (!noteId) {
          return NextResponse.json({ error: 'ID da nota não fornecido' }, { status: 400 })
        }

        const { error } = await adminSupabase
          .from('user_notes')
          .delete()
          .eq('id', noteId)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Nota excluída' })
      }

      case 'reset_password': {
        // Buscar email do usuário
        const { data: targetUser } = await adminSupabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single()

        if (!targetUser) {
          return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        // Enviar email de reset
        const { error } = await adminSupabase.auth.resetPasswordForEmail(targetUser.email)

        if (error) throw error

        // Registrar log
        await adminSupabase.from('system_logs').insert({
          user_id: user.id,
          action: 'password_reset_sent',
          level: 'info',
          details: { target_user_id: userId, target_email: targetUser.email },
        })

        return NextResponse.json({ success: true, message: 'Email de redefinição enviado' })
      }

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in user action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
