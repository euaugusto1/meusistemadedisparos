'use client'

import { useState, useRef, useEffect } from 'react'
import { dispatchCampaign, createCampaign } from '@/services/campaigns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Rocket,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Smartphone,
  FileText,
  Users,
  MessageSquare,
  Coins,
  Clock,
  Send,
  X,
} from 'lucide-react'
import { isPlanExpired, formatNumber } from '@/lib/utils'
import type { WhatsAppInstance, Profile, DispatchResult, ContactsList, MessageTemplate, CampaignSettings } from '@/types'
import { WhatsAppPreview } from './WhatsAppPreview'
import { createClient } from '@/lib/supabase/client'

interface CampaignDispatcherProps {
  instances: WhatsAppInstance[]
  lists: ContactsList[]
  templates: MessageTemplate[]
  profile: Profile | null
}

export function CampaignDispatcher({ instances = [], lists = [], templates = [], profile }: CampaignDispatcherProps) {
  // Form State
  const [instanceId, setInstanceId] = useState('')
  const [listIds, setListIds] = useState<string[]>([])
  const [templateIds, setTemplateIds] = useState<string[]>([])
  const [title, setTitle] = useState('')

  // Modal State
  const [showInstanceModal, setShowInstanceModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  // UI State
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [results, setResults] = useState<DispatchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Refs
  const stopRequestedRef = useRef(false)

  // Campaign Settings State
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>({
    min_delay_seconds: 35,
    max_delay_seconds: 250,
  })

  // Computed - ensure arrays are never undefined
  const safeInstances = instances || []
  const safeLists = lists || []
  const safeTemplates = templates || []

  const connectedInstances = safeInstances.filter(i => i.status === 'connected')
  const selectedInstance = safeInstances.find(i => i.id === instanceId)
  const selectedLists = safeLists.filter(l => listIds.includes(l.id))
  const selectedTemplates = safeTemplates.filter(t => templateIds.includes(t.id))

  // Combinar contatos de todas as listas, removendo duplicatas
  const allContacts = selectedLists.flatMap(list => list.contacts || [])
  const uniqueNumbers = Array.from(new Set(allContacts.map(c => c.number)))
  const recipientsList = uniqueNumbers

  const planExpired = isPlanExpired(profile?.plan_expires_at || null)
  const userCredits = profile?.credits || 0
  // Créditos necessários: destinatários * número de templates
  const creditsNeeded = recipientsList.length * (templateIds.length || 1)
  const hasEnoughCredits = userCredits >= creditsNeeded

  // Validation
  const isValid =
    instanceId &&
    listIds.length > 0 &&
    templateIds.length > 0 &&
    title.trim() &&
    selectedTemplates.every(t => t.message?.trim()) &&
    recipientsList.length > 0 &&
    !planExpired &&
    hasEnoughCredits

  // Auto-fill title with first template name
  useEffect(() => {
    if (selectedTemplates.length > 0 && !title) {
      setTitle(selectedTemplates[0].name)
    }
  }, [selectedTemplates, title])

  // Auto-select instance if only one is connected
  useEffect(() => {
    if (!instanceId && connectedInstances.length === 1) {
      setInstanceId(connectedInstances[0].id)
    }
  }, [connectedInstances, instanceId])

  // Auto-select favorite lists on mount
  useEffect(() => {
    if (listIds.length === 0 && safeLists.length > 0) {
      const favoriteLists = safeLists.filter(l => l.is_favorite)
      if (favoriteLists.length > 0) {
        setListIds(favoriteLists.map(l => l.id))
      }
    }
  }, [safeLists, listIds.length])

  // Auto-select favorite templates on mount
  useEffect(() => {
    if (templateIds.length === 0 && safeTemplates.length > 0) {
      const favoriteTemplates = safeTemplates.filter(t => t.is_favorite).slice(0, 3)
      if (favoriteTemplates.length > 0) {
        setTemplateIds(favoriteTemplates.map(t => t.id))
      }
    }
  }, [safeTemplates, templateIds.length])

  // Fetch campaign delay settings on mount
  useEffect(() => {
    const fetchCampaignSettings = async () => {
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'campaign_delays')
          .single()

        console.log('🔍 Campaign Settings Query Result:', { data, error })

        if (!error && data) {
          console.log('✅ Setting campaign delays:', data.value)
          setCampaignSettings(data.value as CampaignSettings)
        } else {
          console.warn('⚠️ No campaign settings found, using defaults')
        }
      } catch (error) {
        console.error('❌ Error fetching campaign settings:', error)
      }
    }

    fetchCampaignSettings()
  }, [])

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isValid) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setShowConfirm(true)
  }

  // Start dispatch
  const handleStartDispatch = async () => {
    setShowConfirm(false)
    setIsProcessing(true)
    setProgress(0)
    setResults([])
    stopRequestedRef.current = false

    try {
      if (selectedTemplates.length === 0) {
        throw new Error('Nenhum template selecionado')
      }

      let totalSent = 0
      let totalFailed = 0
      const totalMessages = recipientsList.length * selectedTemplates.length

      // Process each template
      for (let templateIndex = 0; templateIndex < selectedTemplates.length; templateIndex++) {
        if (stopRequestedRef.current) break

        const template = selectedTemplates[templateIndex]

        // Use template data
        const validButtons = template.button_type === 'button'
          ? template.buttons.filter(b => b.name && b.url)
          : []

        // Create campaign for this template
        const campaignTitle = selectedTemplates.length > 1
          ? `${title} (${templateIndex + 1}/${selectedTemplates.length})`
          : title

        const campaignData = {
          instance_id: instanceId,
          title: campaignTitle,
          message: template.message.trim(),
          link_url: template.link_url || undefined,
          media_id: template.media_id || undefined,
          button_type: template.button_type || undefined,
          buttons: validButtons,
          min_delay: campaignSettings.min_delay_seconds,
          max_delay: campaignSettings.max_delay_seconds,
        }

        const result = await createCampaign(campaignData, recipientsList)

        if (!result) {
          throw new Error(`Erro ao criar campanha para template "${template.name}"`)
        }

        setProgressText(`Enviando template ${templateIndex + 1}/${selectedTemplates.length}: ${template.name}`)

        // Start dispatch for this campaign
        const dispatchResult = await dispatchCampaign({
          campaign: result.campaign,
          instance: selectedInstance!,
          onProgress: (current, total, status) => {
            const baseProgress = (templateIndex / selectedTemplates.length) * 100
            const templateProgress = (current / total) * (100 / selectedTemplates.length)
            setProgress(Math.round(baseProgress + templateProgress))
            setProgressText(`[${templateIndex + 1}/${selectedTemplates.length}] ${status}`)
          },
          onItemComplete: (itemResult) => {
            setResults(prev => [...prev, itemResult])
          },
          shouldStop: () => stopRequestedRef.current,
        })

        totalSent += dispatchResult.sent
        totalFailed += dispatchResult.failed
      }

      if (stopRequestedRef.current) {
        setError(`Campanha interrompida. ${totalSent} enviados antes da parada.`)
      } else if (totalFailed === totalMessages) {
        setError(`Todas as campanhas falharam. ${totalFailed} falhas.`)
      } else {
        setSuccess(`Campanhas concluídas! ${totalSent} enviados, ${totalFailed} falhas.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar campanha')
    } finally {
      setIsProcessing(false)
    }
  }

  // Stop dispatch
  const handleStop = () => {
    stopRequestedRef.current = true
    setProgressText('Parando envios...')
  }

  // Selection handlers
  const handleSelectInstance = (id: string) => {
    setInstanceId(id)
    setShowInstanceModal(false)
  }

  const handleSelectTemplate = (id: string) => {
    setTemplateIds(prev => {
      if (prev.includes(id)) {
        // Remove if already selected
        return prev.filter(t => t !== id)
      } else if (prev.length < 3) {
        // Add if less than 3 selected
        return [...prev, id]
      }
      // Max 3 reached, don't add
      return prev
    })
  }

  const handleSelectList = (id: string) => {
    setListIds(prev => {
      if (prev.includes(id)) {
        // Remove if already selected
        return prev.filter(l => l !== id)
      } else {
        // Add to selection
        return [...prev, id]
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header - Compacto */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Nova Campanha</h1>
          <p className="text-xs text-muted-foreground">Configure e inicie o envio em lote</p>
        </div>
      </div>

      {/* Grid Layout: Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração</CardTitle>
              <CardDescription>
                Preencha os campos abaixo para configurar sua campanha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
            {/* Plan Warning */}
            {planExpired && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Seu plano expirou. Renove para continuar enviando mensagens.
                </AlertDescription>
              </Alert>
            )}

            {/* Credits Warning */}
            {!hasEnoughCredits && recipientsList.length > 0 && templateIds.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Créditos insuficientes. Você tem {formatNumber(userCredits)} créditos, mas precisa de {formatNumber(creditsNeeded)} para esta campanha ({recipientsList.length} destinatários × {templateIds.length} templates).
                </AlertDescription>
              </Alert>
            )}

            {/* Instance Selection */}
            <div className="space-y-2">
              <Label>Instância WhatsApp *</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[42px] bg-background">
                {selectedInstance ? (
                  <Badge
                    className="pl-2 pr-1 py-1 gap-1 bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30"
                  >
                    <Smartphone className="h-3 w-3" />
                    <span className="text-xs font-medium">{selectedInstance.name}</span>
                    <button
                      type="button"
                      onClick={() => setInstanceId('')}
                      className="ml-1 hover:bg-blue-500/50 rounded-sm p-0.5 transition-colors"
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : (
                  <>
                    {connectedInstances.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowInstanceModal(true)}
                        disabled={isProcessing}
                      >
                        + Selecionar
                      </Button>
                    )}
                    {connectedInstances.length === 0 && (
                      <span className="text-xs text-destructive py-1">
                        Nenhuma instância conectada
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Templates de Mensagem * (máx. 3)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[42px] bg-background">
                {selectedTemplates.map(template => (
                  <Badge
                    key={template.id}
                    className="pl-2 pr-1 py-1 gap-1 bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30"
                  >
                    <FileText className="h-3 w-3" />
                    <span className="text-xs font-medium">{template.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateIds(prev => prev.filter(id => id !== template.id))
                      }}
                      className="ml-1 hover:bg-purple-500/50 rounded-sm p-0.5 transition-colors"
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedTemplates.length < 3 && safeTemplates.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowTemplateModal(true)}
                    disabled={isProcessing}
                  >
                    + Adicionar
                  </Button>
                )}
                {selectedTemplates.length === 0 && safeTemplates.length > 0 && (
                  <span className="text-xs text-muted-foreground py-1">
                    Clique em "+ Adicionar" para selecionar templates
                  </span>
                )}
              </div>
              {safeTemplates.length === 0 && (
                <p className="text-xs text-destructive">
                  Crie um template primeiro
                </p>
              )}
            </div>

            {/* List Selection */}
            <div className="space-y-2">
              <Label>Listas de Destinatários *</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[42px] bg-background">
                {selectedLists.map(list => (
                  <Badge
                    key={list.id}
                    className="pl-2 pr-1 py-1 gap-1 bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30"
                  >
                    <Users className="h-3 w-3" />
                    <span className="text-xs font-medium">{list.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setListIds(prev => prev.filter(id => id !== list.id))
                      }}
                      className="ml-1 hover:bg-green-500/50 rounded-sm p-0.5 transition-colors"
                      disabled={isProcessing}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {safeLists.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowListModal(true)}
                    disabled={isProcessing}
                  >
                    + Adicionar
                  </Button>
                )}
                {selectedLists.length === 0 && safeLists.length > 0 && (
                  <span className="text-xs text-muted-foreground py-1">
                    Clique em "+ Adicionar" para selecionar listas
                  </span>
                )}
                {safeLists.length === 0 && (
                  <span className="text-xs text-destructive py-1">
                    Crie uma lista de contatos primeiro
                  </span>
                )}
              </div>
            </div>

            {/* Progress - Visual Melhorado */}
            {isProcessing && (
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Send className="h-5 w-5 text-primary animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      </div>
                      <span className="font-semibold">Enviando mensagens...</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{progressText}</p>
                </CardContent>
              </Card>
            )}

            {/* Results Summary - Visual Melhorado */}
            {results.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-green-400">
                      {results.filter(r => r.success).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Enviados</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-red-400">
                      {results.filter(r => !r.success).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Falhas</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              {!isProcessing ? (
                <Button
                  type="submit"
                  className="flex-1 relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 text-white font-semibold text-base py-6 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none group"
                  disabled={!isValid || planExpired}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 -top-full group-hover:top-full transition-all duration-700 ease-out bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                  {/* Icon with animation */}
                  <div className="relative mr-2">
                    <Rocket className="h-5 w-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    {isValid && !planExpired && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </div>

                  <span className="relative">Iniciar Envios</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 font-semibold text-base py-6 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300"
                  onClick={handleStop}
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Parar Envios
                </Button>
              )}
            </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview + Stats */}
        <div className="space-y-4">
          {/* WhatsApp Preview */}
          <WhatsAppPreview
            messages={selectedTemplates.map((template, idx) => ({
              message: template.message,
              mediaUrl: template.media_id ? undefined : undefined, // TODO: Get media URL
              linkUrl: template.link_url || undefined,
              buttons: template.button_type === 'button' ? template.buttons : [],
              templateName: template.name
            }))}
            recipientName="Cliente"
          />

          {/* Stats Card */}
          {(recipientsList.length > 0 || selectedTemplates.length > 0) && (
            <Card className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border-slate-800 relative z-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Resumo da Campanha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campanha Info */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-slate-300">Destinatários</span>
                    </div>
                    <span className="text-white font-semibold">{formatNumber(recipientsList.length)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-400" />
                      <span className="text-slate-300">Templates</span>
                    </div>
                    <span className="text-white font-semibold">{selectedTemplates.length}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300">Total de mensagens</span>
                    </div>
                    <span className="text-white font-semibold">
                      {formatNumber(recipientsList.length * (selectedTemplates.length || 1))}
                    </span>
                  </div>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Créditos */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-orange-400" />
                      <span className="text-slate-300">Créditos necessários</span>
                    </div>
                    <span className="text-orange-400 font-bold text-base">{formatNumber(creditsNeeded)}</span>
                  </div>

                  <div className={`flex items-center justify-between text-sm p-2.5 rounded-lg border ${
                    (userCredits - creditsNeeded) < 0
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-green-500/10 border-green-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Coins className={`h-4 w-4 ${
                        (userCredits - creditsNeeded) < 0 ? 'text-red-400' : 'text-green-400'
                      }`} />
                      <span className="text-slate-300">Saldo após envio</span>
                    </div>
                    <span className={`font-bold text-base ${
                      (userCredits - creditsNeeded) < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {formatNumber(userCredits - creditsNeeded)}
                    </span>
                  </div>
                </div>

                {/* Tempo estimado */}
                {recipientsList.length > 0 && (
                  <>
                    <Separator className="bg-slate-700/50" />
                    <div className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span className="text-slate-300">Tempo estimado</span>
                      </div>
                      <span className="text-blue-400 font-semibold text-base">
                        {(() => {
                          const avgDelay = (campaignSettings.min_delay_seconds + campaignSettings.max_delay_seconds) / 2
                          const totalSeconds = recipientsList.length * selectedTemplates.length * avgDelay
                          const hours = Math.floor(totalSeconds / 3600)
                          const minutes = Math.floor((totalSeconds % 3600) / 60)
                          if (hours > 0) {
                            return `~${hours}h ${minutes}m`
                          }
                          return `~${minutes}m`
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Instance Selection Modal */}
      <Dialog open={showInstanceModal} onOpenChange={setShowInstanceModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Selecionar Instância
            </DialogTitle>
            <DialogDescription>
              Escolha a instância WhatsApp para enviar as mensagens
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {connectedInstances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma instância conectada</p>
                <p className="text-sm">Conecte uma instância primeiro</p>
              </div>
            ) : (
              connectedInstances.map(instance => (
                <Card
                  key={instance.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${instanceId === instance.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => handleSelectInstance(instance.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${instanceId === instance.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{instance.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {instance.phone_number || 'Sem número'}
                        </p>
                      </div>
                    </div>
                    {instanceId === instance.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Selecionar Templates
            </DialogTitle>
            <DialogDescription>
              Escolha até 3 templates de mensagem para a campanha ({templateIds.length}/3 selecionados)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {safeTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum template disponível</p>
                <p className="text-sm">Crie um template primeiro</p>
              </div>
            ) : (
              safeTemplates.map(template => {
                const isSelected = templateIds.includes(template.id)
                const isDisabled = !isSelected && templateIds.length >= 3
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer hover:border-primary transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isDisabled && handleSelectTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{template.name}</p>
                            {template.button_type && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {template.button_type === 'button' ? 'Com botões' : template.button_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 ml-11">
                        {template.message}
                      </p>
                      {template.link_url && (
                        <p className="text-xs text-blue-500 mt-1 ml-11 truncate">
                          {template.link_url}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
          {templateIds.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowTemplateModal(false)}>
                Confirmar ({templateIds.length} selecionado{templateIds.length > 1 ? 's' : ''})
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* List Selection Modal */}
      <Dialog open={showListModal} onOpenChange={setShowListModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Selecionar Listas
            </DialogTitle>
            <DialogDescription>
              Escolha uma ou mais listas de destinatários para a campanha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {safeLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma lista disponível</p>
                <p className="text-sm">Crie uma lista de contatos primeiro</p>
              </div>
            ) : (
              safeLists.map(list => {
                const isSelected = listIds.includes(list.id)
                return (
                  <Card
                    key={list.id}
                    className={`cursor-pointer hover:border-primary transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => handleSelectList(list.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(list.contact_count)} contato(s)
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
          {selectedLists.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedLists.length} lista(s) selecionada(s) - Total: {formatNumber(recipientsList.length)} contato(s) único(s)
              </p>
              <Button
                onClick={() => setShowListModal(false)}
                className="w-full"
              >
                Confirmar Seleção
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Elegante */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Confirmar Envio em Lote</AlertDialogTitle>
                <p className="text-sm text-muted-foreground">Revise os detalhes antes de iniciar</p>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <FileText className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-blue-400">{selectedTemplates.length}</p>
              <p className="text-xs text-muted-foreground">Template{selectedTemplates.length > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <Users className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-400">{recipientsList.length}</p>
              <p className="text-xs text-muted-foreground">Destinatário{recipientsList.length > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
              <Send className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-400">{formatNumber(creditsNeeded)}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </div>
          </div>

          <AlertDialogDescription className="space-y-3">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-slate-300">Delay aleatório:</span>
                <span className="font-semibold text-white">
                  {campaignSettings.min_delay_seconds} a {campaignSettings.max_delay_seconds} segundos
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-orange-400" />
                <span className="text-slate-300">Créditos necessários:</span>
                <span className="font-semibold text-white">{formatNumber(creditsNeeded)}</span>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-500 mb-1">Uso Responsável</p>
                  <p className="text-sm text-yellow-200/80">
                    O uso indevido pode resultar em banimento do WhatsApp. Use apenas para fins legítimos e com consentimento dos destinatários.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>

          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartDispatch}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Sim, Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
