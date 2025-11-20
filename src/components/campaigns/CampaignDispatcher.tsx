'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dispatchCampaign, createCampaign } from '@/services/campaigns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Rocket,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Check,
  Eye,
  Smartphone,
  FileText,
  Users,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { isPlanExpired, formatNumber } from '@/lib/utils'
import type { WhatsAppInstance, Profile, DispatchResult, ContactsList, MessageTemplate } from '@/types'

interface CampaignDispatcherProps {
  instances: WhatsAppInstance[]
  lists: ContactsList[]
  templates: MessageTemplate[]
  profile: Profile | null
}

export function CampaignDispatcher({ instances = [], lists = [], templates = [], profile }: CampaignDispatcherProps) {
  // Form State
  const [instanceId, setInstanceId] = useState('')
  const [listId, setListId] = useState('')
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

  // Computed - ensure arrays are never undefined
  const safeInstances = instances || []
  const safeLists = lists || []
  const safeTemplates = templates || []

  const connectedInstances = safeInstances.filter(i => i.status === 'connected')
  const selectedInstance = safeInstances.find(i => i.id === instanceId)
  const selectedList = safeLists.find(l => l.id === listId)
  const selectedTemplates = safeTemplates.filter(t => templateIds.includes(t.id))
  const recipientsList = selectedList?.contacts?.map(c => c.number) || []
  const planExpired = isPlanExpired(profile?.plan_expires_at || null)
  const userCredits = profile?.credits || 0
  // Créditos necessários: destinatários * número de templates
  const creditsNeeded = recipientsList.length * (templateIds.length || 1)
  const hasEnoughCredits = userCredits >= creditsNeeded

  // Validation
  const isValid =
    instanceId &&
    listId &&
    templateIds.length > 0 &&
    title.trim() &&
    selectedTemplates.every(t => t.message?.trim()) &&
    recipientsList.length > 0 &&
    !planExpired &&
    hasEnoughCredits

  // Auto-select instance if only one is connected
  useEffect(() => {
    if (!instanceId && connectedInstances.length === 1) {
      setInstanceId(connectedInstances[0].id)
    }
  }, [connectedInstances, instanceId])

  // Auto-select favorite list on mount
  useEffect(() => {
    if (!listId && safeLists.length > 0) {
      const favoriteList = safeLists.find(l => l.is_favorite)
      if (favoriteList) {
        setListId(favoriteList.id)
      }
    }
  }, [safeLists, listId])

  // Auto-select favorite templates on mount
  useEffect(() => {
    if (templateIds.length === 0 && safeTemplates.length > 0) {
      const favoriteTemplates = safeTemplates.filter(t => t.is_favorite).slice(0, 3)
      if (favoriteTemplates.length > 0) {
        setTemplateIds(favoriteTemplates.map(t => t.id))
      }
    }
  }, [safeTemplates, templateIds.length])

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
          min_delay: 35,
          max_delay: 250,
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
    setListId(id)
    setShowListModal(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Nova Campanha de Disparo
          </CardTitle>
          <CardDescription>
            Configure e inicie o envio de mensagens em lote
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Instance Selection Card */}
            <div className="space-y-2">
              <Label>Instância WhatsApp *</Label>
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${selectedInstance ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => !isProcessing && setShowInstanceModal(true)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedInstance ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      {selectedInstance ? (
                        <>
                          <p className="font-medium">{selectedInstance.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedInstance.phone_number || 'Sem número'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-muted-foreground">Selecione uma instância</p>
                          <p className="text-sm text-muted-foreground">
                            {connectedInstances.length} instância(s) conectada(s)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Campaign Title */}
            <div className="space-y-2">
              <Label>Título da Campanha *</Label>
              <Input
                placeholder="Ex: Promoção Black Friday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProcessing}
                required
              />
            </div>

            {/* Template Selection Card */}
            <div className="space-y-2">
              <Label>Templates de Mensagem * (máx. 3)</Label>
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${selectedTemplates.length > 0 ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => !isProcessing && setShowTemplateModal(true)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedTemplates.length > 0 ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {selectedTemplates.length > 0 ? (
                        <>
                          <p className="font-medium">
                            {selectedTemplates.length} template(s) selecionado(s)
                          </p>
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {selectedTemplates.map(t => t.name).join(', ')}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-muted-foreground">Selecione até 3 templates</p>
                          <p className="text-sm text-muted-foreground">
                            {safeTemplates.length} template(s) disponível(is)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
              {safeTemplates.length === 0 && (
                <p className="text-sm text-destructive">
                  Crie um template primeiro para enviar mensagens
                </p>
              )}
            </div>

            {/* List Selection Card */}
            <div className="space-y-2">
              <Label>Lista de Destinatários *</Label>
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${selectedList ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => !isProcessing && setShowListModal(true)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedList ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      {selectedList ? (
                        <>
                          <p className="font-medium">{selectedList.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(recipientsList.length)} destinatário(s)
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-muted-foreground">Selecione uma lista</p>
                          <p className="text-sm text-muted-foreground">
                            {safeLists.length} lista(s) disponível(is)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
              {safeLists.length === 0 && (
                <p className="text-sm text-destructive">
                  Crie uma lista de contatos primeiro para enviar mensagens
                </p>
              )}
            </div>

            {/* WhatsApp Message Preview */}
            {isValid && selectedTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview das Mensagens ({selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''})
                </Label>
                <div className="space-y-4">
                  {selectedTemplates.map((template, templateIndex) => (
                    <div key={template.id} className="bg-[#0b141a] rounded-lg p-4 border border-[#2a3942]">
                      <div className="mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {templateIndex + 1}. {template.name}
                        </Badge>
                      </div>
                      <div
                        className="relative rounded-lg p-3"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          backgroundColor: '#0b141a'
                        }}
                      >
                        <div className="max-w-[85%] ml-auto">
                          <div className="bg-[#005c4b] rounded-lg p-3 relative shadow-md">
                            <div
                              className="absolute top-0 -right-2 w-0 h-0"
                              style={{
                                borderLeft: '8px solid transparent',
                                borderTop: '8px solid #005c4b'
                              }}
                            />
                            <p className="text-[#e9edef] text-sm whitespace-pre-wrap break-words">
                              {template.message}
                            </p>
                            {template.link_url && (
                              <a
                                href={template.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#53bdeb] text-sm hover:underline block mt-2 break-all"
                              >
                                {template.link_url}
                              </a>
                            )}
                            {template.button_type === 'button' && template.buttons?.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {template.buttons
                                  .filter(b => b.name && b.url)
                                  .map((button, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-[#0b141a]/50 rounded px-3 py-2 text-center"
                                    >
                                      <span className="text-[#53bdeb] text-sm font-medium">
                                        {button.name}
                                      </span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-[#8696a0]">
                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex">
                                <Check className="h-3 w-3 text-[#53bdeb]" />
                                <Check className="h-3 w-3 text-[#53bdeb] -ml-1.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {formatNumber(creditsNeeded)} crédito(s) para {formatNumber(recipientsList.length)} destinatário(s) × {selectedTemplates.length} template(s)
                  </span>
                </div>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progressText}</span>
                  <span className="font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Results Summary */}
            {results.length > 0 && (
              <div className="flex gap-4">
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {results.filter(r => r.success).length} Enviados
                </Badge>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.filter(r => !r.success).length} Falhas
                </Badge>
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
                  className="flex-1"
                  disabled={!isValid || planExpired}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Iniciar Envios
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={handleStop}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Parar Envios
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

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
              Selecionar Lista
            </DialogTitle>
            <DialogDescription>
              Escolha a lista de destinatários para a campanha
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
              safeLists.map(list => (
                <Card
                  key={list.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${listId === list.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => handleSelectList(list.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${listId === list.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(list.contact_count)} contato(s)
                        </p>
                      </div>
                    </div>
                    {listId === list.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio em Lote</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a enviar <strong>{selectedTemplates.length}</strong> template(s) para{' '}
                <strong>{recipientsList.length}</strong> destinatário(s).
              </p>
              <p>
                Total de mensagens: <strong>{formatNumber(creditsNeeded)}</strong> ({formatNumber(creditsNeeded)} créditos)
              </p>
              <p>
                O sistema aplicará um delay aleatório de 35 a 250 segundos entre cada envio.
              </p>
              <p className="text-yellow-500 font-medium mt-4">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                AVISO: Use com responsabilidade. O uso indevido pode resultar em
                banimento do WhatsApp.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartDispatch}>
              Sim, Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
