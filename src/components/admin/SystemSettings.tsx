'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Users,
  Send,
  Image,
  Wifi,
  Trash2,
  AlertTriangle,
  Loader2,
  Database,
  Server,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatNumber } from '@/lib/utils'
import type { SystemSetting, MercadoPagoSettings, CampaignSettings } from '@/types'

interface SystemSettingsProps {
  stats: {
    totalUsers: number
    totalCampaigns: number
    totalMedia: number
    activeInstances: number
  }
  settings: SystemSetting[]
}

export function SystemSettings({ stats, settings }: SystemSettingsProps) {
  const [cleanupType, setCleanupType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [savingPayment, setSavingPayment] = useState(false)
  const [showAccessToken, setShowAccessToken] = useState(false)

  // Mercado Pago Settings
  const mpSettings = settings.find(s => s.key === 'mercadopago')
  const initialMP: MercadoPagoSettings = mpSettings?.value as MercadoPagoSettings || {
    access_token: '',
    public_key: '',
    webhook_secret: '',
    is_enabled: false,
    use_sandbox: true,
  }

  const [mpAccessToken, setMpAccessToken] = useState(initialMP.access_token)
  const [mpPublicKey, setMpPublicKey] = useState(initialMP.public_key)
  const [mpWebhookSecret, setMpWebhookSecret] = useState(initialMP.webhook_secret)
  const [mpEnabled, setMpEnabled] = useState(initialMP.is_enabled)
  const [mpSandbox, setMpSandbox] = useState(initialMP.use_sandbox)

  // Campaign Settings
  const campaignSettings = settings.find(s => s.key === 'campaign_delays')
  const initialCampaign: CampaignSettings = campaignSettings?.value as CampaignSettings || {
    min_delay_seconds: 35,
    max_delay_seconds: 250,
  }

  const [minDelay, setMinDelay] = useState(initialCampaign.min_delay_seconds)
  const [maxDelay, setMaxDelay] = useState(initialCampaign.max_delay_seconds)
  const [savingCampaign, setSavingCampaign] = useState(false)

  // Atualizar estados quando as configurações mudarem
  useEffect(() => {
    console.log('Settings received in component:', settings)
    const mpSettings = settings.find(s => s.key === 'mercadopago')
    console.log('MP Settings found:', mpSettings)
    const mp: MercadoPagoSettings = mpSettings?.value as MercadoPagoSettings || {
      access_token: '',
      public_key: '',
      webhook_secret: '',
      is_enabled: false,
      use_sandbox: true,
    }
    console.log('MP Config:', mp)

    setMpAccessToken(mp.access_token)
    setMpPublicKey(mp.public_key)
    setMpWebhookSecret(mp.webhook_secret)
    setMpEnabled(mp.is_enabled)
    setMpSandbox(mp.use_sandbox)

    // Atualizar Campaign Settings
    const campaignSettings = settings.find(s => s.key === 'campaign_delays')
    const campaign: CampaignSettings = campaignSettings?.value as CampaignSettings || {
      min_delay_seconds: 35,
      max_delay_seconds: 250,
    }
    setMinDelay(campaign.min_delay_seconds)
    setMaxDelay(campaign.max_delay_seconds)
  }, [settings])

  const handleCleanup = async (type: string) => {
    setLoading(true)
    setResult(null)
    const supabase = createClient()

    try {
      let deletedCount = 0

      switch (type) {
        case 'old-campaigns': {
          // Deletar campanhas concluídas/canceladas há mais de 30 dias
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const { data, error } = await supabase
            .from('campaigns')
            .delete()
            .in('status', ['completed', 'cancelled', 'failed'])
            .lt('completed_at', thirtyDaysAgo.toISOString())
            .select()

          if (error) throw error
          deletedCount = data?.length || 0
          break
        }

        case 'orphan-media': {
          // Buscar mídias não usadas em templates ou campanhas
          const { data: orphanMedia, error } = await supabase
            .from('media_files')
            .select('id')
            .not('id', 'in', (
              supabase.from('message_templates').select('media_id').not('media_id', 'is', null)
            ))
            .not('id', 'in', (
              supabase.from('campaigns').select('media_id').not('media_id', 'is', null)
            ))

          // Por segurança, apenas informar quantas seriam deletadas
          deletedCount = orphanMedia?.length || 0
          setResult(`${deletedCount} mídia(s) órfã(s) encontrada(s). Exclusão manual recomendada.`)
          setCleanupType(null)
          setLoading(false)
          return
        }

        case 'closed-tickets': {
          // Deletar tickets fechados há mais de 60 dias
          const sixtyDaysAgo = new Date()
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

          const { data, error } = await supabase
            .from('support_tickets')
            .delete()
            .eq('status', 'closed')
            .lt('closed_at', sixtyDaysAgo.toISOString())
            .select()

          if (error) throw error
          deletedCount = data?.length || 0
          break
        }

        default:
          throw new Error('Tipo de limpeza inválido')
      }

      setResult(`${deletedCount} registro(s) removido(s) com sucesso.`)
    } catch (error) {
      console.error('Cleanup error:', error)
      setResult('Erro ao executar limpeza.')
    } finally {
      setLoading(false)
      setCleanupType(null)
    }
  }

  const handleSavePaymentSettings = async () => {
    setSavingPayment(true)
    const supabase = createClient()

    try {
      const paymentSettings: MercadoPagoSettings = {
        access_token: mpAccessToken,
        public_key: mpPublicKey,
        webhook_secret: mpWebhookSecret,
        is_enabled: mpEnabled,
        use_sandbox: mpSandbox,
      }

      if (mpSettings) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('system_settings')
          .update({ value: paymentSettings })
          .eq('id', mpSettings.id)

        if (error) throw error
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'mercadopago',
            value: paymentSettings,
            description: 'Configurações do Mercado Pago para processamento de pagamentos',
          })

        if (error) throw error
      }

      setResult('Configurações de pagamento salvas com sucesso!')
    } catch (error) {
      console.error('Error saving payment settings:', error)
      setResult('Erro ao salvar configurações de pagamento.')
    } finally {
      setSavingPayment(false)
    }
  }

  const handleSaveCampaignSettings = async () => {
    // Validação
    if (minDelay < 10 || minDelay > 300) {
      setResult('Delay mínimo deve estar entre 10 e 300 segundos.')
      return
    }
    if (maxDelay < 10 || maxDelay > 600) {
      setResult('Delay máximo deve estar entre 10 e 600 segundos.')
      return
    }
    if (minDelay >= maxDelay) {
      setResult('Delay mínimo deve ser menor que o delay máximo.')
      return
    }

    setSavingCampaign(true)
    const supabase = createClient()

    try {
      const delaySettings: CampaignSettings = {
        min_delay_seconds: minDelay,
        max_delay_seconds: maxDelay,
      }

      if (campaignSettings) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('system_settings')
          .update({ value: delaySettings })
          .eq('id', campaignSettings.id)

        if (error) throw error
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'campaign_delays',
            value: delaySettings,
            description: 'Configurações de delay para envio de campanhas',
          })

        if (error) throw error
      }

      setResult('Configurações de campanha salvas com sucesso!')

      // Recarregar a página após 1 segundo para garantir que as configs sejam aplicadas
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error saving campaign settings:', error)
      setResult('Erro ao salvar configurações de campanha.')
    } finally {
      setSavingCampaign(false)
    }
  }

  const statCards = [
    {
      title: 'Total de Usuários',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Total de Campanhas',
      value: formatNumber(stats.totalCampaigns),
      icon: Send,
      color: 'text-green-500',
    },
    {
      title: 'Arquivos de Mídia',
      value: formatNumber(stats.totalMedia),
      icon: Image,
      color: 'text-purple-500',
    },
    {
      title: 'Instâncias Ativas',
      value: formatNumber(stats.activeInstances),
      icon: Wifi,
      color: 'text-yellow-500',
    },
  ]

  const cleanupOptions = [
    {
      id: 'old-campaigns',
      title: 'Campanhas Antigas',
      description: 'Remove campanhas concluídas/canceladas há mais de 30 dias',
      icon: Clock,
    },
    {
      id: 'orphan-media',
      title: 'Mídias Órfãs',
      description: 'Identifica mídias não utilizadas em templates ou campanhas',
      icon: Image,
    },
    {
      id: 'closed-tickets',
      title: 'Tickets Fechados',
      description: 'Remove tickets de suporte fechados há mais de 60 dias',
      icon: Trash2,
    },
  ]

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Versão</div>
              <div className="font-medium">{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ambiente</div>
              <Badge variant={process.env.NODE_ENV === 'production' ? 'default' : 'outline'}>
                {process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento'}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Database</div>
              <Badge variant="outline">
                Supabase PostgreSQL {process.env.NEXT_PUBLIC_SUPABASE_URL ? '(Conectado)' : '(Desconectado)'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Settings - Delay Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Configurações de Campanhas
          </CardTitle>
          <CardDescription>
            Configure o intervalo de delay entre envios de mensagens nas campanhas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delay Mínimo (segundos) *</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={minDelay}
                onChange={(e) => setMinDelay(Number(e.target.value))}
                placeholder="35"
              />
              <p className="text-xs text-muted-foreground">
                Tempo mínimo de espera entre envios (10-300s)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Delay Máximo (segundos) *</Label>
              <Input
                type="number"
                min={10}
                max={600}
                value={maxDelay}
                onChange={(e) => setMaxDelay(Number(e.target.value))}
                placeholder="250"
              />
              <p className="text-xs text-muted-foreground">
                Tempo máximo de espera entre envios (10-600s)
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-400">Como funciona?</p>
                <p className="text-sm text-muted-foreground">
                  O sistema escolherá um delay aleatório entre o mínimo e máximo configurado para cada envio.
                  Isso ajuda a evitar bloqueios do WhatsApp tornando os envios mais naturais.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Configuração atual:</strong> Entre {minDelay}s e {maxDelay}s (média de {Math.round((minDelay + maxDelay) / 2)}s)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveCampaignSettings} disabled={savingCampaign} className="flex-1">
              {savingCampaign && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/admin/campaign-settings')
                  const data = await response.json()
                  console.log('📊 Current Settings:', data)
                  alert(JSON.stringify(data, null, 2))
                } catch (error) {
                  console.error('Error:', error)
                }
              }}
            >
              Testar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings - Mercado Pago */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Configurações de Pagamento - Mercado Pago
          </CardTitle>
          <CardDescription>
            Configure as credenciais do Mercado Pago para processar pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Access Token *</Label>
              <div className="relative">
                <Input
                  type={showAccessToken ? 'text' : 'password'}
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  placeholder="APP_USR-..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                >
                  {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Public Key *</Label>
              <Input
                value={mpPublicKey}
                onChange={(e) => setMpPublicKey(e.target.value)}
                placeholder="APP_USR-..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <Input
              value={mpWebhookSecret}
              onChange={(e) => setMpWebhookSecret(e.target.value)}
              placeholder="Secret para validar webhooks"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label>Habilitar Mercado Pago</Label>
              <div className="text-sm text-muted-foreground">
                Ativar processamento de pagamentos
              </div>
            </div>
            <Switch checked={mpEnabled} onCheckedChange={setMpEnabled} />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label>Modo Sandbox</Label>
              <div className="text-sm text-muted-foreground">
                Usar ambiente de teste
              </div>
            </div>
            <Switch checked={mpSandbox} onCheckedChange={setMpSandbox} />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSavePaymentSettings} disabled={savingPayment}>
              {savingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
            {mpEnabled && (
              <Badge variant="default">Ativo</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Limpeza do Sistema
          </CardTitle>
          <CardDescription>
            Execute tarefas de manutenção para otimizar o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              {result}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {cleanupOptions.map(option => (
              <Card key={option.id} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <option.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{option.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setCleanupType(option.id)}
                      >
                        Executar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Confirmation */}
      <AlertDialog open={!!cleanupType} onOpenChange={() => setCleanupType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirmar Limpeza
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover dados permanentemente do sistema.
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cleanupType && handleCleanup(cleanupType)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
