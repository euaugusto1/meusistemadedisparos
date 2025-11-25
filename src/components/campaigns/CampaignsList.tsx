'use client'

import React, { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Send,
  Clock,
  CheckCircle,
  XCircle,
  StopCircle,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Play,
  Calendar,
  MessageSquare,
  Image,
  Users,
  Smartphone,
  Link,
  FileText,
} from 'lucide-react'
import { formatDateTime, formatNumber, getStatusColor } from '@/lib/utils'
import { dispatchCampaign } from '@/services/campaigns'
import { SmartScheduler } from '@/components/campaigns/SmartScheduler'
import type { Campaign, CampaignStatus, WhatsAppInstance, MediaFile, ScheduleType, RecurrencePattern } from '@/types'

interface CampaignsListProps {
  campaigns: (Campaign & {
    instance?: WhatsAppInstance | null
    media?: MediaFile | null
  })[]
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  processing: 'Em Andamento',
  completed: 'Concluída',
  failed: 'Falhou',
  cancelled: 'Cancelada',
  paused: 'Pausada',
}

const STATUS_ICONS: Record<CampaignStatus, typeof Send> = {
  draft: Clock,
  scheduled: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: StopCircle,
  paused: Clock,
}

export function CampaignsList({ campaigns: initialCampaigns }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [cancelConfirm, setCancelConfirm] = useState<Campaign | null>(null)
  const [resendConfirm, setResendConfirm] = useState<Campaign | null>(null)
  const [startConfirm, setStartConfirm] = useState<Campaign | null>(null)
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [campaignToSchedule, setCampaignToSchedule] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(false)
  const [dispatching, setDispatching] = useState<string | null>(null)

  // Schedule data
  const [scheduleType, setScheduleType] = useState<ScheduleType>('scheduled')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null)
  const [throttleEnabled, setThrottleEnabled] = useState(true)
  const [throttleRate, setThrottleRate] = useState(60)
  const [throttleDelay, setThrottleDelay] = useState(2)
  const [smartTiming, setSmartTiming] = useState(false)
  const [suggestedSendTime, setSuggestedSendTime] = useState<string | null>(null)

  const pendingCampaigns = campaigns.filter(c =>
    ['draft', 'scheduled', 'processing'].includes(c.status)
  )

  const completedCampaigns = campaigns.filter(c =>
    ['completed', 'failed', 'cancelled'].includes(c.status)
  )

  const handleCancel = async (campaign: Campaign) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaign.id)

      if (error) throw error
      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, status: 'cancelled' as CampaignStatus } : c)
      )
    } catch (error) {
      console.error('Error cancelling campaign:', error)
    } finally {
      setLoading(false)
      setCancelConfirm(null)
    }
  }

  const handleResend = async (campaign: Campaign) => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Buscar os itens da campanha original para obter os destinatários
      const { data: items, error: itemsError } = await supabase
        .from('campaign_items')
        .select('recipient')
        .eq('campaign_id', campaign.id)

      if (itemsError) throw itemsError

      const recipients = items?.map(item => item.recipient) || []

      if (recipients.length === 0) {
        toast.error('Não foi possível encontrar os destinatários da campanha original')
        return
      }

      // Criar nova campanha com os mesmos dados
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: campaign.user_id,
          instance_id: campaign.instance_id,
          title: `${campaign.title} (Reenvio)`,
          message: campaign.message,
          media_id: campaign.media_id,
          link_url: campaign.link_url,
          button_type: campaign.button_type,
          buttons: campaign.buttons,
          total_recipients: recipients.length,
          min_delay: campaign.min_delay,
          max_delay: campaign.max_delay,
          status: 'draft',
        })
        .select()
        .single()

      if (campaignError || !newCampaign) throw campaignError

      // Criar os itens da nova campanha
      const newItems = recipients.map(recipient => ({
        campaign_id: newCampaign.id,
        recipient,
        status: 'pending',
      }))

      const { error: newItemsError } = await supabase
        .from('campaign_items')
        .insert(newItems)

      if (newItemsError) throw newItemsError

      // Adicionar à lista local
      setCampaigns(prev => [newCampaign, ...prev])

      toast.success('Campanha criada com sucesso!', {
        description: `"${newCampaign.title}" foi criada. Clique no botão Play para iniciá-la.`
      })
    } catch (error) {
      console.error('Error resending campaign:', error)
      toast.error('Erro ao reenviar campanha', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido'
      })
    } finally {
      setLoading(false)
      setResendConfirm(null)
    }
  }

  const handleStart = async (campaign: Campaign & { instance?: WhatsAppInstance | null }) => {
    if (!campaign.instance) {
      toast.error('Esta campanha não tem uma instância WhatsApp associada')
      return
    }

    setStartConfirm(null)
    setDispatching(campaign.id)

    try {
      // Atualizar status para processing na UI
      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, status: 'processing' as CampaignStatus } : c)
      )

      // Iniciar o disparo
      const result = await dispatchCampaign({
        campaign,
        instance: campaign.instance,
        onProgress: (current, total, status) => {
          // Atualizar progresso na UI
          setCampaigns(prev =>
            prev.map(c => c.id === campaign.id ? {
              ...c,
              sent_count: current,
            } : c)
          )
        },
        onItemComplete: (itemResult) => {
          // Atualizar contadores
          setCampaigns(prev =>
            prev.map(c => {
              if (c.id === campaign.id) {
                return {
                  ...c,
                  sent_count: itemResult.success ? c.sent_count + 1 : c.sent_count,
                  failed_count: !itemResult.success ? c.failed_count + 1 : c.failed_count,
                }
              }
              return c
            })
          )
        },
        shouldStop: () => false,
      })

      // Atualizar status final
      const finalStatus = result.failed === campaign.total_recipients ? 'failed' : 'completed'
      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? {
          ...c,
          status: finalStatus as CampaignStatus,
          sent_count: result.sent,
          failed_count: result.failed,
        } : c)
      )

      toast.success('Campanha concluída!', {
        description: `${result.sent} mensagens enviadas, ${result.failed} falhas.`
      })
    } catch (error) {
      console.error('Error starting campaign:', error)
      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, status: 'failed' as CampaignStatus } : c)
      )
      toast.error('Erro ao iniciar campanha', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido'
      })
    } finally {
      setDispatching(null)
    }
  }

  // Open schedule dialog
  const handleOpenSchedule = (campaign: Campaign) => {
    setCampaignToSchedule(campaign)
    setScheduleType('scheduled')
    setScheduledAt(null)
    setTimezone('America/Sao_Paulo')
    setRecurrencePattern(null)
    setThrottleEnabled(true)
    setThrottleRate(60)
    setThrottleDelay(2)
    setSmartTiming(false)
    setSuggestedSendTime(null)
    setScheduleDialogOpen(true)
  }

  // Handle schedule data change
  const handleScheduleChange = useCallback((data: any) => {
    if (data.schedule_type !== undefined) setScheduleType(data.schedule_type)
    if (data.scheduled_at !== undefined) setScheduledAt(data.scheduled_at)
    if (data.timezone !== undefined) setTimezone(data.timezone)
    if (data.recurrence_pattern !== undefined) setRecurrencePattern(data.recurrence_pattern)
    if (data.throttle_enabled !== undefined) setThrottleEnabled(data.throttle_enabled)
    if (data.throttle_rate !== undefined) setThrottleRate(data.throttle_rate)
    if (data.throttle_delay !== undefined) setThrottleDelay(data.throttle_delay)
    if (data.smart_timing !== undefined) setSmartTiming(data.smart_timing)
    if (data.suggested_send_time !== undefined) setSuggestedSendTime(data.suggested_send_time)
  }, [])

  // Schedule campaign
  const handleScheduleCampaign = async () => {
    if (!campaignToSchedule) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Buscar os itens da campanha original
      const { data: items, error: itemsError } = await supabase
        .from('campaign_items')
        .select('recipient')
        .eq('campaign_id', campaignToSchedule.id)

      if (itemsError) throw itemsError

      const recipients = items?.map(item => item.recipient) || []

      if (recipients.length === 0) {
        toast.error('Não foi possível encontrar os destinatários da campanha original')
        return
      }

      // Criar nova campanha com agendamento
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: campaignToSchedule.user_id,
          instance_id: campaignToSchedule.instance_id,
          title: `${campaignToSchedule.title} (Agendada)`,
          message: campaignToSchedule.message,
          media_id: campaignToSchedule.media_id,
          link_url: campaignToSchedule.link_url,
          button_type: campaignToSchedule.button_type,
          buttons: campaignToSchedule.buttons,
          total_recipients: recipients.length,
          min_delay: campaignToSchedule.min_delay,
          max_delay: campaignToSchedule.max_delay,
          status: 'scheduled',
          // Campos de agendamento
          schedule_type: scheduleType,
          scheduled_at: scheduledAt,
          timezone: timezone,
          recurrence_pattern: recurrencePattern,
          throttle_enabled: throttleEnabled,
          throttle_rate: throttleRate,
          throttle_delay: throttleDelay,
          smart_timing: smartTiming,
          suggested_send_time: suggestedSendTime,
        })
        .select()
        .single()

      if (campaignError || !newCampaign) throw campaignError

      // Criar os itens da nova campanha
      const newItems = recipients.map(recipient => ({
        campaign_id: newCampaign.id,
        recipient,
        status: 'pending',
      }))

      const { error: newItemsError } = await supabase
        .from('campaign_items')
        .insert(newItems)

      if (newItemsError) throw newItemsError

      // Adicionar à lista local
      setCampaigns(prev => [newCampaign, ...prev])

      // Fechar dialog
      setScheduleDialogOpen(false)
      setCampaignToSchedule(null)

      toast.success('Campanha agendada com sucesso!', {
        description: `A campanha "${newCampaign.title}" foi agendada para ${new Date(scheduledAt!).toLocaleString('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: timezone
        })}`
      })
    } catch (error) {
      console.error('Error scheduling campaign:', error)
      toast.error('Erro ao agendar campanha', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido'
      })
    } finally {
      setLoading(false)
    }
  }

  const CampaignCard = ({ campaign }: { campaign: Campaign & { instance?: WhatsAppInstance | null } }) => {
    const Icon = STATUS_ICONS[campaign.status]
    const progress = campaign.total_recipients > 0
      ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
      : 0

    return (
      <Card className="relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
        {campaign.status === 'completed' && (
          <div className="absolute -top-3 right-4 z-10">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg px-4 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Concluída
            </Badge>
          </div>
        )}
        {campaign.status === 'processing' && (
          <div className="absolute -top-3 right-4 z-10">
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg px-4 py-1.5 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Em andamento
            </Badge>
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{campaign.title}</CardTitle>
              <CardDescription>
                {campaign.instance?.name || 'Instância não definida'}
              </CardDescription>
            </div>
            {!['completed', 'processing'].includes(campaign.status) && (
              <Badge
                variant="outline"
                className={`${getStatusColor(campaign.status)} text-white border-none`}
              >
                <Icon className={`h-3 w-3 mr-1`} />
                {STATUS_LABELS[campaign.status]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress */}
            {campaign.status === 'processing' && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Stats - Premium Style */}
            <div className="grid grid-cols-3 gap-4">
              {/* Total */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-xl"></div>
                <div className="relative bg-background border-2 border-primary/20 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-primary">{formatNumber(campaign.total_recipients)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
              </div>

              {/* Enviadas */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl"></div>
                <div className="relative bg-background border-2 border-green-500/20 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-green-600">{formatNumber(campaign.sent_count)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Enviadas</p>
                </div>
              </div>

              {/* Falhas */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-xl"></div>
                <div className="relative bg-background border-2 border-red-500/20 p-4 rounded-xl text-center">
                  <p className="text-3xl font-bold text-red-600">{formatNumber(campaign.failed_count)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Falhas</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setViewCampaign(campaign)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Detalhes
              </Button>
              {campaign.status === 'draft' && (
                <Button
                  size="sm"
                  onClick={() => setStartConfirm(campaign)}
                  disabled={dispatching === campaign.id}
                  title="Iniciar campanha"
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105"
                >
                  {dispatching === campaign.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              )}
              {['completed', 'failed', 'cancelled'].includes(campaign.status) && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenSchedule(campaign)}
                    title="Agendar campanha"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setResendConfirm(campaign)}
                    title="Reenviar campanha"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
              {['draft', 'scheduled', 'processing'].includes(campaign.status) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelConfirm(campaign)}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Date */}
            <div className="text-xs text-muted-foreground text-right">
              {campaign.completed_at
                ? `Concluída em ${formatDateTime(campaign.completed_at)}`
                : campaign.started_at
                  ? `Iniciada em ${formatDateTime(campaign.started_at)}`
                  : `Criada em ${formatDateTime(campaign.created_at)}`}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes/Em Andamento ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídas ({completedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma campanha pendente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingCampaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma campanha concluída</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedCampaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a campanha "{cancelConfirm?.title}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelConfirm && handleCancel(cancelConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar Campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Confirmation */}
      <AlertDialog open={!!resendConfirm} onOpenChange={() => setResendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma nova campanha com os mesmos destinatários e configurações de "{resendConfirm?.title}".
              A nova campanha ficará em rascunho para você iniciar quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resendConfirm && handleResend(resendConfirm)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Nova Campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Confirmation */}
      <AlertDialog open={!!startConfirm} onOpenChange={() => setStartConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Campanha</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a iniciar a campanha "{startConfirm?.title}" com{' '}
                <strong>{startConfirm?.total_recipients}</strong> destinatário(s).
              </p>
              <p>
                O sistema aplicará um delay aleatório entre cada envio para evitar bloqueios.
              </p>
              <p className="text-yellow-500 font-medium mt-4">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                AVISO: Use com responsabilidade. O uso indevido pode resultar em banimento do WhatsApp.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startConfirm && handleStart(startConfirm)}
              disabled={dispatching !== null}
            >
              {dispatching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Details Dialog */}
      <Dialog open={!!viewCampaign} onOpenChange={() => setViewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {viewCampaign?.title}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos da campanha
            </DialogDescription>
          </DialogHeader>

          {viewCampaign && (
            <div className="space-y-6">
              {/* Status e Instância */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getStatusColor(viewCampaign.status)}>
                      {STATUS_LABELS[viewCampaign.status]}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Instância
                  </label>
                  <p className="font-medium mt-1">{(viewCampaign as any).instance?.name || 'N/A'}</p>
                </div>
              </div>

              {/* Agendamento - Se existir */}
              {(viewCampaign.scheduled_at || viewCampaign.schedule_type) && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <label className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Agendamento
                  </label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Tipo:</span>
                      <p className="font-medium">
                        {viewCampaign.schedule_type === 'immediate' && 'Imediato'}
                        {viewCampaign.schedule_type === 'scheduled' && 'Agendado'}
                        {viewCampaign.schedule_type === 'recurring' && 'Recorrente'}
                        {viewCampaign.schedule_type === 'smart' && 'Inteligente'}
                        {!viewCampaign.schedule_type && 'Não definido'}
                      </p>
                    </div>
                    {viewCampaign.scheduled_at && (
                      <div>
                        <span className="text-xs text-muted-foreground">Data/Hora:</span>
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          {(() => {
                            // Parse the scheduled_at without timezone conversion
                            const dateStr = viewCampaign.scheduled_at
                            if (dateStr.includes('T')) {
                              const [datePart, timePart] = dateStr.split('T')
                              const [year, month, day] = datePart.split('-')
                              const time = timePart.split(':').slice(0, 2).join(':')
                              return `${day}/${month}/${year}, ${time}`
                            }
                            return new Date(dateStr).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          })()}
                        </p>
                      </div>
                    )}
                    {viewCampaign.timezone && (
                      <div>
                        <span className="text-xs text-muted-foreground">Fuso Horário:</span>
                        <p className="font-medium">{viewCampaign.timezone}</p>
                      </div>
                    )}
                    {(viewCampaign as any).recurrence_pattern && (
                      <div>
                        <span className="text-xs text-muted-foreground">Recorrência:</span>
                        <p className="font-medium">
                          {(viewCampaign as any).recurrence_pattern?.type === 'daily' && 'Diário'}
                          {(viewCampaign as any).recurrence_pattern?.type === 'weekly' && 'Semanal'}
                          {(viewCampaign as any).recurrence_pattern?.type === 'monthly' && 'Mensal'}
                          {' às '}{(viewCampaign as any).recurrence_pattern?.time || ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensagem */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Mensagem
                </label>
                <div className="mt-2 p-4 bg-muted rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {viewCampaign.message || 'Nenhuma mensagem definida'}
                  </p>
                </div>
              </div>

              {/* Link e Mídia */}
              {(viewCampaign.link_url || (viewCampaign as any).media) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewCampaign.link_url && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Link className="h-3 w-3" />
                        Link
                      </label>
                      <p className="font-medium mt-1 text-sm truncate text-blue-500">
                        {viewCampaign.link_url}
                      </p>
                    </div>
                  )}
                  {(viewCampaign as any).media && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        Mídia
                      </label>
                      <p className="font-medium mt-1 text-sm truncate">
                        {(viewCampaign as any).media.original_name || 'Arquivo anexado'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Estatísticas */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{viewCampaign.total_recipients}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    Total
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl font-bold text-green-500">{viewCampaign.sent_count}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Enviados</div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-500">{viewCampaign.failed_count}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Falhas</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-500">
                    {viewCampaign.total_recipients > 0
                      ? Math.round((viewCampaign.sent_count / viewCampaign.total_recipients) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Taxa</div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Criada em</label>
                  <p className="font-medium">{formatDateTime(viewCampaign.created_at)}</p>
                </div>
                {viewCampaign.started_at && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Iniciada em</label>
                    <p className="font-medium">{formatDateTime(viewCampaign.started_at)}</p>
                  </div>
                )}
                {viewCampaign.completed_at && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Concluída em</label>
                    <p className="font-medium">{formatDateTime(viewCampaign.completed_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Campaign Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendar Campanha
            </DialogTitle>
            <DialogDescription>
              Configure o agendamento para a campanha "{campaignToSchedule?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda - Configurações de Agendamento */}
            <div>
              <SmartScheduler
                scheduleType={scheduleType}
                scheduledAt={scheduledAt}
                timezone={timezone}
                recurrencePattern={recurrencePattern}
                throttleEnabled={throttleEnabled}
                throttleRate={throttleRate}
                throttleDelay={throttleDelay}
                smartTiming={smartTiming}
                suggestedSendTime={suggestedSendTime}
                onChange={handleScheduleChange}
              />
            </div>

            {/* Coluna Direita - Resumo da Campanha */}
            <div className="space-y-4">
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Resumo da Campanha
                  </CardTitle>
                  <CardDescription>
                    Dados que serão enviados ao N8N para processamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Instância WhatsApp */}
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4 text-green-600" />
                      Instância WhatsApp
                    </div>
                    <div className="pl-6 text-sm space-y-1">
                      <p><span className="text-muted-foreground">Nome:</span> {(campaignToSchedule as any)?.instance?.name || 'Não definida'}</p>
                      <p><span className="text-muted-foreground">Número:</span> {(campaignToSchedule as any)?.instance?.phone_number || 'N/A'}</p>
                      <p><span className="text-muted-foreground">Status:</span>{' '}
                        <Badge variant={(campaignToSchedule as any)?.instance?.status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                          {(campaignToSchedule as any)?.instance?.status || 'desconhecido'}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  {/* Destinatários */}
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4 text-blue-600" />
                      Destinatários
                    </div>
                    <div className="pl-6 text-sm">
                      <p className="text-2xl font-bold text-primary">{formatNumber(campaignToSchedule?.total_recipients || 0)}</p>
                      <p className="text-muted-foreground">contatos receberão esta mensagem</p>
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4 text-purple-600" />
                      Mensagem
                    </div>
                    <div className="pl-6">
                      <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {campaignToSchedule?.message || 'Sem mensagem'}
                      </p>
                      {campaignToSchedule?.message && campaignToSchedule.message.length > 200 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ({campaignToSchedule.message.length} caracteres)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mídia */}
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Image className="h-4 w-4 text-orange-600" />
                      Mídia
                    </div>
                    <div className="pl-6 text-sm">
                      {(campaignToSchedule as any)?.media ? (
                        <div className="space-y-1">
                          <p><span className="text-muted-foreground">Arquivo:</span> {(campaignToSchedule as any).media.original_name}</p>
                          <p><span className="text-muted-foreground">Tipo:</span> {(campaignToSchedule as any).media.mime_type}</p>
                          <Badge variant="secondary" className="text-xs">Com mídia anexada</Badge>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Sem mídia anexada (apenas texto)</p>
                      )}
                    </div>
                  </div>

                  {/* Link */}
                  {campaignToSchedule?.link_url && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Link className="h-4 w-4 text-cyan-600" />
                        Link
                      </div>
                      <div className="pl-6 text-sm">
                        <p className="text-primary truncate">{campaignToSchedule.link_url}</p>
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  {campaignToSchedule?.buttons && campaignToSchedule.buttons.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Send className="h-4 w-4 text-indigo-600" />
                        Botões ({campaignToSchedule.buttons.length})
                      </div>
                      <div className="pl-6 text-sm space-y-1">
                        {campaignToSchedule.buttons.map((btn: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="mr-1">
                            {btn.text || btn.buttonText || `Botão ${idx + 1}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configurações de Delay */}
                  <div className="p-3 bg-gradient-to-r from-primary/5 to-blue-600/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Configurações de Envio
                    </div>
                    <div className="pl-6 text-sm grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Delay mínimo:</span>
                        <p className="font-medium">{campaignToSchedule?.min_delay || 5}s</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Delay máximo:</span>
                        <p className="font-medium">{campaignToSchedule?.max_delay || 20}s</p>
                      </div>
                      {throttleEnabled && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Msgs/min:</span>
                            <p className="font-medium">{throttleRate}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Intervalo:</span>
                            <p className="font-medium">{throttleDelay}s</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setScheduleDialogOpen(false)
                setCampaignToSchedule(null)
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleScheduleCampaign}
              disabled={loading || !scheduledAt}
              className="bg-gradient-to-r from-primary to-blue-600"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Campanha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
