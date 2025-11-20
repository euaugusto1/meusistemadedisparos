'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

/**
 * Hook para monitorar mensagens não lidas no suporte
 * Retorna o número de mensagens não lidas
 */
export function useUnreadSupport(profile: Profile | null) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!profile) return

    const supabase = createClient()
    const isAdmin = profile.role === 'admin'

    // Função para buscar mensagens não lidas
    const fetchUnreadCount = async () => {
      try {
        if (isAdmin) {
          // Admin: contar mensagens de usuários não lidas
          const { data: messages } = await supabase
            .from('support_messages')
            .select('id, ticket_id, sender_id, is_read')
            .eq('is_read', false)

          if (!messages) {
            setUnreadCount(0)
            return
          }

          // Filtrar apenas mensagens de usuários (não do admin)
          const userMessages = messages.filter(msg => msg.sender_id !== profile.id)
          setUnreadCount(userMessages.length)
        } else {
          // Usuário: contar mensagens do admin não lidas nos seus tickets
          const { data: tickets } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('user_id', profile.id)

          if (!tickets || tickets.length === 0) {
            setUnreadCount(0)
            return
          }

          const ticketIds = tickets.map(t => t.id)

          const { data: messages } = await supabase
            .from('support_messages')
            .select('id, sender_id, is_read')
            .in('ticket_id', ticketIds)
            .eq('is_read', false)
            .neq('sender_id', profile.id)

          setUnreadCount(messages?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching unread support count:', error)
      }
    }

    // Buscar inicialmente
    fetchUnreadCount()

    // Configurar realtime subscription para support_messages
    const channel = supabase
      .channel('support-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        () => {
          // Quando houver qualquer mudança, recarregar a contagem
          fetchUnreadCount()
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  return unreadCount
}
