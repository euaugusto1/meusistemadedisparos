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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{campaign.title}</CardTitle>
              <CardDescription>
                {campaign.instance?.name || 'Instância não definida'}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`${getStatusColor(campaign.status)} text-white border-none`}
            >
              <Icon className={`h-3 w-3 mr-1 ${campaign.status === 'processing' ? 'animate-spin' : ''}`} />
              {STATUS_LABELS[campaign.status]}
            </Badge>
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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{formatNumber(campaign.total_recipients)}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{formatNumber(campaign.sent_count)}</div>
                <div className="text-xs text-muted-foreground">Enviados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{formatNumber(campaign.failed_count)}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
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
                  variant="default"
                  size="sm"
                  onClick={() => setStartConfirm(campaign)}
                  disabled={dispatching === campaign.id}
                  title="Iniciar campanha"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewCampaign?.title}</DialogTitle>
            <DialogDescription>
              Detalhes da campanha
            </DialogDescription>
          </DialogHeader>

          {viewCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="font-medium">{STATUS_LABELS[viewCampaign.status]}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Instância</label>
                  <p className="font-medium">{(viewCampaign as any).instance?.name || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Mensagem</label>
                <p className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                  {viewCampaign.message}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xl font-bold">{viewCampaign.total_recipients}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-500">{viewCampaign.sent_count}</div>
                  <div className="text-xs text-muted-foreground">Enviados</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-500">{viewCampaign.failed_count}</div>
                  <div className="text-xs text-muted-foreground">Falhas</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {viewCampaign.total_recipients > 0
                      ? Math.round((viewCampaign.sent_count / viewCampaign.total_recipients) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Taxa</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-muted-foreground">Criada em</label>
                  <p>{formatDateTime(viewCampaign.created_at)}</p>
                </div>
                {viewCampaign.started_at && (
                  <div>
                    <label className="font-medium text-muted-foreground">Iniciada em</label>
                    <p>{formatDateTime(viewCampaign.started_at)}</p>
                  </div>
                )}
                {viewCampaign.completed_at && (
                  <div>
                    <label className="font-medium text-muted-foreground">Concluída em</label>
                    <p>{formatDateTime(viewCampaign.completed_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Campaign Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Campanha</DialogTitle>
            <DialogDescription>
              Configure o agendamento para a campanha "{campaignToSchedule?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agendar Campanha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
