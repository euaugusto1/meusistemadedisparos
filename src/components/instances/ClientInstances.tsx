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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Poll para verificar status quando aguardando QR
  useEffect(() => {
    if (selectedInstance && qrCode) {
      pollIntervalRef.current = setInterval(async () => {
        const status = await checkInstanceStatus(selectedInstance)
        if (status === 'connected') {
          setQrCode(null)
          setSelectedInstance(null)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
        }
      }, 5000) // Verificar a cada 5 segundos
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [selectedInstance, qrCode])

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

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma instância disponível</h3>
          <p className="text-muted-foreground">
            Entre em contato com o administrador para solicitar uma instância WhatsApp.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instances Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances.map(instance => (
          <Card key={instance.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                  <CardDescription>
                    Criada em {formatDate(instance.created_at)}
                  </CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
