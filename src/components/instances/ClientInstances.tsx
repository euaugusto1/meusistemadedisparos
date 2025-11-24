'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TestTube2,
  Clock,
  Trash2,
  Edit,
  MoreVertical,
} from 'lucide-react'
import { formatDate, getStatusColor } from '@/lib/utils'
import type { WhatsAppInstance, Profile, InstanceStatus } from '@/types'

interface ClientInstancesProps {
  instances: WhatsAppInstance[]
  profile: Profile | null
}

const STATUS_LABELS: Record<InstanceStatus, string> = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  connecting: 'Conectando',
  qr_code: 'Aguardando QR',
}

export function ClientInstances({ instances: initialInstances, profile }: ClientInstancesProps) {
  const [instances, setInstances] = useState(initialInstances)
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [creatingTest, setCreatingTest] = useState(false)

  // Admin states
  const [instanceToDelete, setInstanceToDelete] = useState<WhatsAppInstance | null>(null)
  const [instanceToEdit, setInstanceToEdit] = useState<WhatsAppInstance | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)

  // QR Code connection states
  const [qrCodeConnected, setQrCodeConnected] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const qrCodePollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (qrCodePollIntervalRef.current) {
        clearInterval(qrCodePollIntervalRef.current)
      }
    }
  }, [])

  // Auto-refresh time remaining for test instances
  useEffect(() => {
    const hasTestInstances = instances.some(i => i.is_test && i.expires_at)

    if (!hasTestInstances) return

    const interval = setInterval(() => {
      // Force re-render to update time remaining
      setInstances(prev => [...prev])

      // Check for expired instances and remove them
      const now = new Date()
      const expiredIds = instances
        .filter(i => i.is_test && i.expires_at && new Date(i.expires_at) < now)
        .map(i => i.id)

      if (expiredIds.length > 0) {
        setInstances(prev => prev.filter(i => !expiredIds.includes(i.id)))
        // Call API to clean up
        fetch('/api/instances/test', { method: 'DELETE' }).catch(console.error)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [instances])

  // Poll para verificar status quando aguardando QR
  useEffect(() => {
    if (selectedInstance && qrCode && !qrCodeConnected) {
      pollIntervalRef.current = setInterval(async () => {
        const status = await checkInstanceStatus(selectedInstance)
        if (status === 'connected') {
          // Mostrar feedback de sucesso
          setQrCodeConnected(true)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }

          // Fechar modal após 2 segundos
          setTimeout(() => {
            setQrCode(null)
            setSelectedInstance(null)
            setQrCodeConnected(false)
          }, 2000)
        }
      }, 3000) // Verificar a cada 3 segundos
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [selectedInstance, qrCode, qrCodeConnected])

  const checkInstanceStatus = async (instance: WhatsAppInstance): Promise<InstanceStatus> => {
    try {
      const response = await fetch(`/api/instances/${instance.id}/status`)
      if (response.ok) {
        const data = await response.json()

        // Atualizar estado local
        setInstances(prev =>
          prev.map(i =>
            i.id === instance.id
              ? { ...i, status: data.status, phone_number: data.phone_number || i.phone_number }
              : i
          )
        )

        return data.status
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err)
    }
    return instance.status
  }

  const handleConnect = async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance)
    setLoading(true)
    setError(null)
    setQrCode(null)

    try {
      const response = await fetch(`/api/instances/${instance.id}/qrcode`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao obter QR Code')
      }

      const data = await response.json()

      if (data.status === 'connected') {
        setError(null)
        setSelectedInstance(null)
        // Atualizar status local
        setInstances(prev =>
          prev.map(i =>
            i.id === instance.id
              ? { ...i, status: 'connected' as InstanceStatus }
              : i
          )
        )
        return
      }

      if (data.qr_code) {
        setQrCode(data.qr_code)
        // Atualizar status para qr_code
        setInstances(prev =>
          prev.map(i =>
            i.id === instance.id
              ? { ...i, status: 'qr_code' as InstanceStatus }
              : i
          )
        )
      } else {
        throw new Error('QR Code não disponível')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (instance: WhatsAppInstance) => {
    setCheckingStatus(true)
    setError(null)

    try {
      const response = await fetch(`/api/instances/${instance.id}/disconnect`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao desconectar')
      }

      // Atualizar status local
      setInstances(prev =>
        prev.map(i =>
          i.id === instance.id
            ? { ...i, status: 'disconnected' as InstanceStatus, phone_number: null }
            : i
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desconectar')
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleRefreshStatus = async (instance: WhatsAppInstance) => {
    setCheckingStatus(true)
    await checkInstanceStatus(instance)
    setCheckingStatus(false)
  }

  const handleCloseDialog = () => {
    setSelectedInstance(null)
    setQrCode(null)
    setError(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
  }

  const handleCreateTestInstance = async () => {
    setCreatingTest(true)
    setError(null)

    try {
      const response = await fetch('/api/instances/test', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erro ao criar instância de teste')
      }

      // Add new instance to the list
      setInstances(prev => [data.instance, ...prev])

      // Se retornou QR Code, abrir modal com o QR
      if (data.qrcode) {
        setSelectedInstance(data.instance)
        setQrCode(data.qrcode)
      }

      // Não mostrar alert, pois a modal de QR Code já será exibida
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar instância de teste'
      setError(errorMessage)
    } finally {
      setCreatingTest(false)
    }
  }

  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/instances/${instanceToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erro ao deletar instância')
      }

      // Remove instance from the list
      setInstances(prev => prev.filter(i => i.id !== instanceToDelete.id))
      setInstanceToDelete(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar instância'
      setError(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  const handleEditInstance = async () => {
    if (!instanceToEdit) return

    setUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/instances/${instanceToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Erro ao atualizar instância')
      }

      // Update instance in the list
      setInstances(prev =>
        prev.map(i => (i.id === instanceToEdit.id ? { ...i, name: editName } : i))
      )
      setInstanceToEdit(null)
      setEditName('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar instância'
      setError(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const getTimeRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return ''

    const now = new Date()
    const expires = new Date(expiresAt)
    const diffMs = expires.getTime() - now.getTime()

    if (diffMs <= 0) return 'Expirada'

    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 60) {
      return `${minutes}min restantes`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min restantes`
  }

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma instância disponível</h3>
          <p className="text-muted-foreground">
            Entre em contato com o administrador para solicitar uma instância WhatsApp.
          </p>

          {/* Test Instance Button */}
          <div className="pt-4">
            <div className="inline-block p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <TestTube2 className="h-8 w-8 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
              <h4 className="font-semibold text-sm mb-1">Servidor gratuito para testes</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Crie uma instância de teste grátis válida por 15 dias!
              </p>
              <Button
                onClick={handleCreateTestInstance}
                disabled={creatingTest}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
              >
                {creatingTest ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-4 w-4" />
                )}
                {creatingTest ? 'Criando...' : 'Criar Instância de Teste'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Test Instance Creation Button */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 border-orange-200 dark:border-orange-800">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <TestTube2 className="h-8 w-8 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Servidor gratuito para testes</h4>
                <p className="text-xs text-muted-foreground">
                  Crie uma instância de teste grátis válida por 15 dias!
                </p>
              </div>
            </div>
            <Button
              onClick={handleCreateTestInstance}
              disabled={creatingTest}
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 flex-shrink-0"
            >
              {creatingTest ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TestTube2 className="mr-2 h-4 w-4" />
              )}
              {creatingTest ? 'Criando...' : 'Criar Instância de Teste'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instances Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances.map(instance => (
          <Card key={instance.id} className={`relative overflow-hidden ${instance.is_test ? 'border-orange-300 dark:border-orange-700' : ''}`}>
            {/* Test Instance Badge */}
            {instance.is_test && (
              <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-bl-lg font-semibold flex items-center gap-1">
                <TestTube2 className="h-3 w-3" />
                TESTE
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 pr-16">
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                  <CardDescription>
                    Criada em {formatDate(instance.created_at)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(instance.status)} text-white border-none`}
                  >
                    {instance.status === 'connected' ? (
                      <Wifi className="h-3 w-3 mr-1" />
                    ) : instance.status === 'qr_code' ? (
                      <QrCode className="h-3 w-3 mr-1" />
                    ) : instance.status === 'connecting' ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <WifiOff className="h-3 w-3 mr-1" />
                    )}
                    {STATUS_LABELS[instance.status]}
                  </Badge>
                  {(isAdmin || instance.user_id === profile?.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setInstanceToEdit(instance)
                            setEditName(instance.name)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar nome
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setInstanceToDelete(instance)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Instance Timer */}
              {instance.is_test && instance.expires_at && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-orange-700 dark:text-orange-300">
                    {getTimeRemaining(instance.expires_at)}
                  </span>
                </div>
              )}

              {/* Phone Number */}
              {instance.phone_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span>{instance.phone_number}</span>
                </div>
              )}

              {/* Status Info */}
              <div className="p-3 bg-muted rounded-lg">
                {instance.status === 'connected' ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">WhatsApp conectado</span>
                  </div>
                ) : instance.status === 'qr_code' ? (
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <QrCode className="h-4 w-4" />
                    <span className="text-sm font-medium">Aguardando leitura do QR Code</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">WhatsApp desconectado</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {instance.status === 'connected' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRefreshStatus(instance)}
                      disabled={checkingStatus}
                    >
                      {checkingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDisconnect(instance)}
                      disabled={checkingStatus}
                    >
                      <WifiOff className="mr-2 h-4 w-4" />
                      Desconectar
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(instance)}
                    disabled={loading}
                  >
                    {loading && selectedInstance?.id === instance.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    Conectar WhatsApp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedInstance && !!qrCode} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância "{selectedInstance?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {qrCodeConnected ? (
              /* Success Message */
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
                    WhatsApp Conectado!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sua instância foi conectada com sucesso
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* QR Code Display */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  {qrCode && (
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Como conectar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em Menu (⋮) ou Configurações</li>
                    <li>Selecione "Aparelhos conectados"</li>
                    <li>Toque em "Conectar um aparelho"</li>
                    <li>Aponte a câmera para este QR Code</li>
                  </ol>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => selectedInstance && handleConnect(selectedInstance)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Atualizar QR Code
                </Button>

                {/* Status Check Info */}
                <p className="text-xs text-center text-muted-foreground">
                  O status será atualizado automaticamente quando você escanear o código
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Instance Dialog */}
      <Dialog open={!!instanceToEdit} onOpenChange={() => {
        setInstanceToEdit(null)
        setEditName('')
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editar Instância
            </DialogTitle>
            <DialogDescription>
              Edite o nome da instância "{instanceToEdit?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance-name">Nome da instância</Label>
              <Input
                id="instance-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Digite o novo nome"
                disabled={updating}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setInstanceToEdit(null)
                  setEditName('')
                }}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditInstance}
                disabled={updating || !editName.trim()}
              >
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Instance Dialog */}
      <Dialog open={!!instanceToDelete} onOpenChange={() => setInstanceToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Deletar Instância
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar a instância "{instanceToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação não pode ser desfeita. A instância será removida permanentemente do banco de dados
              {instanceToDelete?.api_token ? ' e da Evolution API' : ''}.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setInstanceToDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInstance}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Deletar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={!!error && !qrCode} onOpenChange={() => setError(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erro
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => setError(null)}>Fechar</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
