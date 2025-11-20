'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Send,
  MessageSquare,
  User,
  Shield,
  Loader2,
  CheckCircle,
  Clock,
  Headphones,
} from 'lucide-react'
import { formatDateTime, getStatusColor } from '@/lib/utils'
import type { SupportTicket, SupportMessage, Profile, TicketStatus } from '@/types'

interface SupportChatProps {
  tickets: (SupportTicket & {
    user?: Profile
    messages?: (SupportMessage & { sender?: Profile })[]
  })[]
  profile: Profile | null
  isAdmin: boolean
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Atendimento',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

export function SupportChat({ tickets: initialTickets, profile, isAdmin }: SupportChatProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedTicket?.messages])

  // Mark messages as read when ticket is selected
  useEffect(() => {
    if (!selectedTicket || !profile) return

    const markAsRead = async () => {
      // Marcar como lidas apenas as mensagens que não foram enviadas pelo usuário atual
      const unreadMessages = selectedTicket.messages?.filter(
        msg => !msg.is_read && msg.sender_id !== profile.id
      ) || []

      if (unreadMessages.length === 0) return

      const messageIds = unreadMessages.map(m => m.id)

      const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .in('id', messageIds)

      if (!error) {
        // Atualizar estado local para refletir que as mensagens foram lidas
        setSelectedTicket(prev => {
          if (!prev) return prev
          return {
            ...prev,
            messages: prev.messages?.map(msg =>
              messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
            ) || []
          }
        })
      }
    }

    markAsRead()
  }, [selectedTicket?.id, profile, supabase])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!selectedTicket) return

    const channel = supabase
      .channel(`ticket-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: message } = await supabase
            .from('support_messages')
            .select('*, sender:profiles(id, email, full_name, role)')
            .eq('id', payload.new.id)
            .single()

          if (message) {
            setSelectedTicket(prev => {
              if (!prev) return prev
              return {
                ...prev,
                messages: [...(prev.messages || []), message],
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedTicket?.id, supabase])

  const createTicket = async () => {
    if (!subject.trim() || !initialMessage.trim()) return

    setLoading(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para criar um ticket')
      setLoading(false)
      return
    }

    try {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          status: 'open',
        })
        .select()
        .single()

      if (ticketError) {
        console.error('Ticket error:', ticketError)
        alert(`Erro ao criar ticket: ${ticketError.message}`)
        throw ticketError
      }

      // Create initial message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: initialMessage.trim(),
        })

      if (messageError) {
        console.error('Message error:', messageError)
        alert(`Erro ao criar mensagem: ${messageError.message}`)
        throw messageError
      }

      // Fetch complete ticket with messages
      const { data: completeTicket } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles(id, email, full_name),
          messages:support_messages(
            id,
            message,
            created_at,
            sender:profiles(id, email, full_name, role)
          )
        `)
        .eq('id', ticket.id)
        .single()

      if (completeTicket) {
        setTickets(prev => [completeTicket, ...prev])
        setSelectedTicket(completeTicket)
      }

      setIsDialogOpen(false)
      setSubject('')
      setInitialMessage('')
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return

    setSending(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para enviar mensagens')
      setSending(false)
      return
    }

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: newMessage.trim(),
        })

      if (error) {
        console.error('Send message error:', error)
        alert(`Erro ao enviar mensagem: ${error.message}`)
        throw error
      }

      // Update ticket status to in_progress if admin responds
      if (isAdmin && selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id)

        setTickets(prev =>
          prev.map(t => t.id === selectedTicket.id ? { ...t, status: 'in_progress' as TicketStatus } : t)
        )
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' as TicketStatus } : prev)
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const updateTicketStatus = async (status: TicketStatus) => {
    if (!selectedTicket || !isAdmin) return

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null })
        .eq('id', selectedTicket.id)

      if (error) throw error

      setTickets(prev =>
        prev.map(t => t.id === selectedTicket.id ? { ...t, status } : t)
      )
      setSelectedTicket(prev => prev ? { ...prev, status } : prev)
    } catch (error) {
      console.error('Error updating ticket status:', error)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
      {/* Tickets List */}
      <Card className="md:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tickets</CardTitle>
            {!isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Ticket de Suporte</DialogTitle>
                    <DialogDescription>
                      Descreva seu problema e nossa equipe irá ajudá-lo
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Assunto *</Label>
                      <Input
                        placeholder="Ex: Problema com envio de mensagens"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem *</Label>
                      <Textarea
                        placeholder="Descreva seu problema em detalhes..."
                        value={initialMessage}
                        onChange={(e) => setInitialMessage(e.target.value)}
                        rows={5}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={createTicket}
                      disabled={loading || !subject.trim() || !initialMessage.trim()}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Ticket
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-380px)]">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum ticket</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium truncate">{ticket.subject}</div>
                    <div className="flex items-center justify-between mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedTicket?.id === ticket.id
                            ? 'border-primary-foreground/50'
                            : ''
                        }`}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </Badge>
                      {isAdmin && ticket.user && (
                        <span className="text-xs opacity-70">
                          {ticket.user.email?.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedTicket ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                  <CardDescription>
                    {isAdmin && selectedTicket.user
                      ? `Por: ${selectedTicket.user.full_name || selectedTicket.user.email}`
                      : `Criado em ${formatDateTime(selectedTicket.created_at)}`}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    {selectedTicket.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus('resolved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus('closed')}
                      >
                        Fechar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Support Status Banner - Only for non-admin users */}
            {!isAdmin && (
              <div className="px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Headphones className="h-4 w-4 text-green-500" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Suporte Online
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • Tempo médio de resposta: 5 min
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-background to-muted/20">
              <div className="space-y-4">
                {selectedTicket.messages?.map(message => {
                  const isOwn = message.sender_id === profile?.id
                  const isAdminMessage = message.sender?.role === 'admin'

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : isAdminMessage
                            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-bl-md'
                            : 'bg-muted rounded-bl-md'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isAdminMessage ? (
                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                              <Shield className="h-3.5 w-3.5" />
                              <span className="text-xs font-semibold">Suporte</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">
                                {message.sender?.full_name || message.sender?.email?.split('@')[0] || 'Você'}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
                        <div className={`text-xs mt-2 text-right ${isOwn ? 'opacity-70' : 'text-muted-foreground'}`}>
                          {formatDateTime(message.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {selectedTicket.status !== 'closed' ? (
              <div className="p-4 border-t bg-muted/30">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="bg-background border-2 focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pressione Enter para enviar
                    </p>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    size="lg"
                    className="mb-5"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">
                  Este ticket foi fechado. Crie um novo ticket se precisar de ajuda.
                </p>
              </div>
            )}
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4" />
              <p>Selecione um ticket para ver as mensagens</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
