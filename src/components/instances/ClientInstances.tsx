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
  Server,
  Globe,
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
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background overflow-hidden">
        <CardContent className="py-16 px-6 text-center space-y-6">
          {/* Icon with glow effect */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 p-6 rounded-full">
              <Smartphone className="h-16 w-16 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {/* Title with gradient */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 bg-clip-text text-transparent">
              Comece sua jornada
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto text-base">
              Crie sua primeira instância de WhatsApp e alcance milhares de clientes com mensagens automatizadas.
            </p>
          </div>

          {/* Test Instance Button - Premium Design */}
          <div className="pt-4 max-w-md mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 dark:from-orange-950 dark:via-yellow-950 dark:to-orange-950 border-2 border-orange-300/50 dark:border-orange-700/50 rounded-xl shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-3 rounded-lg shadow-md">
                    <TestTube2 className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-base mb-0.5 text-orange-900 dark:text-orange-100">
                      Teste Grátis por 15 Dias
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Servidor Evolution API • Sem cartão de crédito
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCreateTestInstance}
                  disabled={creatingTest}
                  size="lg"
                  className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {creatingTest ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <TestTube2 className="mr-2 h-5 w-5" />
                  )}
                  {creatingTest ? 'Criando sua instância...' : 'Criar Instância Grátis Agora'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Test Instance Creation Button - Enhanced with shimmer effect */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
        <Card className="relative bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 dark:from-orange-950 dark:via-yellow-950 dark:to-orange-950 border-2 border-orange-300/50 dark:border-orange-700/50 shadow-lg">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-3 rounded-xl shadow-md">
                  <TestTube2 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-orange-900 dark:text-orange-100">
                    Servidor Grátis para Testes
                  </h4>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    15 dias grátis • Evolution API • Sem cartão de crédito
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateTestInstance}
                disabled={creatingTest}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex-shrink-0"
              >
                {creatingTest ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-5 w-5" />
                )}
                {creatingTest ? 'Criando...' : 'Criar Instância Grátis'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map(instance => (
          <Card key={instance.id} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${instance.is_test ? 'border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20' : 'hover:border-primary/50'}`}>
            {/* Test Instance Badge - Enhanced with gradient */}
            {instance.is_test && (
              <div className="absolute top-0 right-0 bg-gradient-to-br from-orange-500 to-yellow-500 text-white text-xs px-3 py-1.5 rounded-bl-xl font-bold flex items-center gap-1.5 shadow-md z-10">
                <TestTube2 className="h-3.5 w-3.5" />
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
                    className={`${getStatusColor(instance.status)} text-white border-none shadow-md transition-all duration-300 ${instance.status === 'connecting' ? 'animate-pulse' : ''}`}
                  >
                    {instance.status === 'connected' ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                      </>
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
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
              {/* Test Instance Timer - Enhanced with animation */}
              {instance.is_test && instance.expires_at && (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 animate-pulse"></div>
                  <div className="relative flex items-center gap-2.5 text-sm px-3.5 py-2.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 border-2 border-orange-300 dark:border-orange-600 rounded-xl shadow-sm">
                    <div className="bg-orange-500 dark:bg-orange-600 p-1.5 rounded-lg">
                      <Clock className="h-3.5 w-3.5 text-white animate-pulse" />
                    </div>
                    <span className="font-bold text-orange-800 dark:text-orange-200">
                      {getTimeRemaining(instance.expires_at)}
                    </span>
                  </div>
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

              {/* Info da Instância - Para todas as instâncias */}
              <div className={`p-3 rounded-lg border ${
                instance.is_test
                  ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
              }`}>
                {/* Header com tipo de API */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Server className={`h-3.5 w-3.5 ${instance.is_test ? 'text-orange-500' : 'text-blue-500'}`} />
                  <span className={`text-xs font-semibold ${instance.is_test ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {instance.is_test ? 'Evolution API' : 'UAZAPI'}
                  </span>
                  {!instance.is_test && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                      Produção
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                  {/* ID da Instância */}
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    ID:
                  </span>
                  <code className={`px-1.5 py-0.5 rounded text-[10px] truncate ${
                    instance.is_test
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  }`}>
                    {instance.instance_key || instance.name}
                  </code>

                  {/* Número de Telefone */}
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Número:
                  </span>
                  <span className={instance.phone_number ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground italic"}>
                    {instance.phone_number
                      ? `+${instance.phone_number.replace(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/, '$1 ($2) $3-$4')}`
                      : 'Aguardando conexão'}
                  </span>

                  {/* Status da Conexão - Apenas UAZAPI */}
                  {!instance.is_test && (
                    <>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        Status:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`relative flex h-2 w-2 ${instance.status === 'connected' ? 'text-green-500' : 'text-gray-400'}`}>
                          {instance.status === 'connected' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${instance.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        </span>
                        <span className={`font-medium ${
                          instance.status === 'connected'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {STATUS_LABELS[instance.status]}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions - Enhanced buttons */}
              <div className="flex gap-2">
                {instance.status === 'connected' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-md"
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
                      className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      onClick={() => handleDisconnect(instance)}
                      disabled={checkingStatus}
                    >
                      <WifiOff className="mr-2 h-4 w-4" />
                      Desconectar
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 hover:shadow-lg"
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

      {/* QR Code Dialog - Enhanced with backdrop blur and animations */}
      <Dialog open={!!selectedInstance && !!qrCode} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-lg">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription className="text-base">
              Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância <span className="font-semibold text-foreground">"{selectedInstance?.name}"</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {qrCodeConnected ? (
              /* Success Message - Enhanced with animation */
              <div className="flex flex-col items-center justify-center py-10 space-y-5 animate-in zoom-in-95 duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 shadow-lg">
                    <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    Conectado com Sucesso!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sua instância está pronta para enviar mensagens
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* QR Code Display - Enhanced with decorative border */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600">
                  <div className="flex justify-center p-5 bg-white dark:bg-gray-900 rounded-xl">
                    {qrCode && (
                      <img
                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code"
                        className="w-64 h-64 rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {/* Instructions - Enhanced with icons */}
                <div className="space-y-3 text-sm">
                  <p className="font-bold text-foreground text-base flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Como conectar:
                  </p>
                  <ol className="space-y-2 ml-1">
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
                      <span className="text-muted-foreground pt-0.5">Abra o WhatsApp no seu celular</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
                      <span className="text-muted-foreground pt-0.5">Toque em Menu (⋮) ou Configurações</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">3</span>
                      <span className="text-muted-foreground pt-0.5">Selecione "Aparelhos conectados"</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">4</span>
                      <span className="text-muted-foreground pt-0.5">Toque em "Conectar um aparelho"</span>
                    </li>
                    <li className="flex gap-3 items-start">
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">5</span>
                      <span className="text-muted-foreground pt-0.5">Aponte a câmera para este QR Code</span>
                    </li>
                  </ol>
                </div>

                {/* Refresh Button - Enhanced */}
                <Button
                  variant="outline"
                  className="w-full transition-all duration-300 hover:scale-105 hover:shadow-md border-2"
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
                <div className="flex items-center justify-center gap-2 text-xs text-center text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Status atualizado automaticamente após escanear
                </div>
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
