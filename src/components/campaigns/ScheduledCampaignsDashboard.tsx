'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Calendar,
  Clock,
  Play,
  Pause,
  XCircle,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Loader2,
  Repeat,
  Sparkles,
  Zap,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Campaign, CampaignStatus } from '@/types'
import { formatDate } from '@/lib/utils'

interface ScheduledCampaignsDashboardProps {
  campaigns: Campaign[]
  onCampaignUpdate: () => void
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500', icon: AlertCircle },
  scheduled: { label: 'Agendada', color: 'bg-blue-500', icon: Clock },
  processing: { label: 'Processando', color: 'bg-yellow-500', icon: Loader2 },
  completed: { label: 'Concluída', color: 'bg-green-500', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-500', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-500', icon: XCircle },
  paused: { label: 'Pausada', color: 'bg-orange-500', icon: Pause },
}

const SCHEDULE_TYPE_ICONS = {
  immediate: Zap,
  scheduled: Clock,
  recurring: Repeat,
  smart: Sparkles,
}

export function ScheduledCampaignsDashboard({ campaigns, onCampaignUpdate }: ScheduledCampaignsDashboardProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [actionType, setActionType] = useState<'pause' | 'resume' | 'cancel' | null>(null)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filter scheduled and paused campaigns
  const activeCampaigns = campaigns.filter(c =>
    ['scheduled', 'paused', 'processing'].includes(c.status)
  )

  const handleAction = async () => {
    if (!selectedCampaign || !actionType) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Erro ao ${actionType === 'pause' ? 'pausar' : actionType === 'resume' ? 'retomar' : 'cancelar'} campanha`)
      }

      // Reset and close
      setDialogOpen(false)
      setReason('')
      setSelectedCampaign(null)
      setActionType(null)

      // Refresh campaigns
      onCampaignUpdate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const openActionDialog = (campaign: Campaign, action: 'pause' | 'resume' | 'cancel') => {
    setSelectedCampaign(campaign)
    setActionType(action)
    setDialogOpen(true)
  }

  const getTimeUntil = (dateString: string) => {
    const target = new Date(dateString)
    const now = new Date()
    const diff = target.getTime() - now.getTime()

    if (diff < 0) return 'Vencido'

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}min`
    return `${minutes}min`
  }

  if (activeCampaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma campanha agendada</h3>
          <p className="text-muted-foreground">
            Crie uma nova campanha e configure o agendamento inteligente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {activeCampaigns.map(campaign => {
          const statusConfig = STATUS_CONFIG[campaign.status]
          const ScheduleIcon = SCHEDULE_TYPE_ICONS[campaign.schedule_type]
          const StatusIcon = statusConfig.icon

          return (
            <Card key={campaign.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <Badge variant="outline" className={`${statusConfig.color} text-white border-none`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {campaign.is_paused && campaign.pause_until && (
                        <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Pausada até {formatDate(campaign.pause_until)}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <ScheduleIcon className="h-4 w-4" />
                      {campaign.schedule_type === 'recurring' && 'Recorrente • '}
                      {campaign.schedule_type === 'smart' && 'IA Sugerido • '}
                      {campaign.scheduled_at && (
                        <>
                          Agendada para: {formatDate(campaign.scheduled_at)}
                          {' • '}
                          {getTimeUntil(campaign.scheduled_at)}
                        </>
                      )}
                    </CardDescription>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {campaign.status === 'scheduled' && !campaign.is_paused && (
                        <DropdownMenuItem onClick={() => openActionDialog(campaign, 'pause')}>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar Campanha
                        </DropdownMenuItem>
                      )}
                      {campaign.is_paused && (
                        <DropdownMenuItem onClick={() => openActionDialog(campaign, 'resume')}>
                          <Play className="h-4 w-4 mr-2" />
                          Retomar Campanha
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openActionDialog(campaign, 'cancel')}
                        className="text-red-600 dark:text-red-400"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancelar Campanha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Total de Destinatários</p>
                    <p className="font-semibold text-lg">{campaign.total_recipients}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Enviadas</p>
                    <p className="font-semibold text-lg text-green-600 dark:text-green-400">
                      {campaign.sent_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Falhas</p>
                    <p className="font-semibold text-lg text-red-600 dark:text-red-400">
                      {campaign.failed_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Progresso</p>
                    <p className="font-semibold text-lg">
                      {campaign.total_recipients > 0
                        ? Math.min(100, Math.round((campaign.sent_count / campaign.total_recipients) * 100))
                        : 0}%
                    </p>
                  </div>
                </div>

                {campaign.throttle_enabled && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Throttling ativo:</strong> {campaign.throttle_rate} msg/min • {campaign.throttle_delay}s delay
                    </p>
                  </div>
                )}

                {campaign.recurrence_pattern && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-purple-900 dark:text-purple-100">
                      <strong>Recorrência:</strong>{' '}
                      {campaign.recurrence_pattern.type === 'daily' && `A cada ${campaign.recurrence_pattern.interval} dia(s)`}
                      {campaign.recurrence_pattern.type === 'weekly' && `A cada ${campaign.recurrence_pattern.interval} semana(s)`}
                      {campaign.recurrence_pattern.type === 'monthly' && `A cada ${campaign.recurrence_pattern.interval} mês(es)`}
                      {' • '}
                      {campaign.recurrence_pattern.time}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'pause' && 'Pausar Campanha'}
              {actionType === 'resume' && 'Retomar Campanha'}
              {actionType === 'cancel' && 'Cancelar Campanha'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'pause' && 'A campanha será pausada e não será enviada até que você a retome.'}
              {actionType === 'resume' && 'A campanha será retomada e continuará o envio normalmente.'}
              {actionType === 'cancel' && 'Esta ação não pode ser desfeita. A campanha será permanentemente cancelada.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Digite o motivo para esta ação..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setReason('')
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={isLoading}
                variant={actionType === 'cancel' ? 'destructive' : 'default'}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === 'pause' && 'Pausar'}
                {actionType === 'resume' && 'Retomar'}
                {actionType === 'cancel' && 'Cancelar Definitivamente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
