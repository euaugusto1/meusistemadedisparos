'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ScrollText,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  MessageSquare,
  Activity,
  Download,
  Filter,
  Calendar,
  Clock,
  Eye,
  Copy,
  ExternalLink,
  MoreVertical,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  X,
  Play,
  Pause,
  Settings,
} from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'
import { toast } from 'sonner'
import type { Profile, WhatsAppInstance } from '@/types'

interface SystemLog {
  id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  level: 'info' | 'warning' | 'error' | 'success'
  ip_address: string | null
  user_agent: string | null
  created_at: string
  user?: Pick<Profile, 'id' | 'email' | 'full_name'> | null
}

interface CampaignLog {
  id: string
  campaign_id: string
  recipient: string
  recipient_name: string | null
  status: string
  error_message: string | null
  sent_at: string
  response_data: Record<string, unknown> | null
  campaign: {
    id: string
    title: string
    user_id: string
    instance_id: string | null
    message: string
  } | null
}

interface LogsViewerProps {
  systemLogs: SystemLog[]
  campaignLogs: CampaignLog[]
  users?: Pick<Profile, 'id' | 'email' | 'full_name'>[]
  instances?: Pick<WhatsAppInstance, 'id' | 'name' | 'phone_number'>[]
}

type SortField = 'created_at' | 'status' | 'recipient'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const AUTO_REFRESH_INTERVALS = [
  { value: 10, label: '10 segundos' },
  { value: 30, label: '30 segundos' },
  { value: 60, label: '1 minuto' },
  { value: 300, label: '5 minutos' },
]

export function LogsViewer({ systemLogs: initialSystemLogs, campaignLogs: initialCampaignLogs, users = [], instances = [] }: LogsViewerProps) {
  const supabase = createClient()

  // Data state
  const [systemLogs, setSystemLogs] = useState(initialSystemLogs)
  const [campaignLogs, setCampaignLogs] = useState(initialCampaignLogs)

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [instanceFilter, setInstanceFilter] = useState<string>('all')
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // UI state
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<CampaignLog | null>(null)
  const [selectedSystemLog, setSelectedSystemLog] = useState<SystemLog | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteDays, setDeleteDays] = useState(30)
  const [activeTab, setActiveTab] = useState('campaigns')

  // Get unique error types
  const errorTypes = Array.from(new Set(
    campaignLogs
      .filter(l => l.error_message)
      .map(l => {
        const msg = l.error_message || ''
        if (msg.includes('timeout')) return 'Timeout'
        if (msg.includes('invalid') || msg.includes('inválido')) return 'Número Inválido'
        if (msg.includes('blocked') || msg.includes('bloqueado')) return 'Bloqueado'
        if (msg.includes('not found') || msg.includes('não encontrado')) return 'Não Encontrado'
        if (msg.includes('rate limit')) return 'Rate Limit'
        return 'Outro'
      })
  ))

  // Refresh logs
  const refreshLogs = useCallback(async () => {
    setLoading(true)
    try {
      // Refresh campaign logs
      const { data: newCampaignLogs } = await supabase
        .from('campaign_items')
        .select(`
          id,
          campaign_id,
          recipient,
          recipient_name,
          status,
          error_message,
          sent_at,
          response_data,
          campaign:campaigns(id, title, user_id, instance_id, message)
        `)
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(500)

      if (newCampaignLogs) {
        setCampaignLogs(newCampaignLogs as CampaignLog[])
      }

      // Refresh system logs
      const { data: newSystemLogs } = await supabase
        .from('system_logs')
        .select(`
          *,
          user:profiles!user_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (newSystemLogs) {
        setSystemLogs(newSystemLogs as SystemLog[])
      }

      setLastRefresh(new Date())
      toast.success('Logs atualizados')
    } catch (error) {
      console.error('Error refreshing logs:', error)
      toast.error('Erro ao atualizar logs')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshLogs()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshLogs])

  // Filter campaign logs
  const filteredCampaignLogs = campaignLogs
    .filter(log => {
      // Search
      const matchesSearch =
        log.recipient.includes(searchTerm) ||
        log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.campaign?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.error_message?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter

      // User
      const matchesUser = userFilter === 'all' || log.campaign?.user_id === userFilter

      // Instance
      const matchesInstance = instanceFilter === 'all' || log.campaign?.instance_id === instanceFilter

      // Error type
      let matchesErrorType = true
      if (errorTypeFilter !== 'all' && log.error_message) {
        const msg = log.error_message.toLowerCase()
        switch (errorTypeFilter) {
          case 'Timeout':
            matchesErrorType = msg.includes('timeout')
            break
          case 'Número Inválido':
            matchesErrorType = msg.includes('invalid') || msg.includes('inválido')
            break
          case 'Bloqueado':
            matchesErrorType = msg.includes('blocked') || msg.includes('bloqueado')
            break
          case 'Não Encontrado':
            matchesErrorType = msg.includes('not found') || msg.includes('não encontrado')
            break
          case 'Rate Limit':
            matchesErrorType = msg.includes('rate limit')
            break
          case 'Outro':
            matchesErrorType = !['timeout', 'invalid', 'inválido', 'blocked', 'bloqueado', 'not found', 'não encontrado', 'rate limit']
              .some(kw => msg.includes(kw))
            break
        }
      } else if (errorTypeFilter !== 'all') {
        matchesErrorType = false
      }

      // Date range
      let matchesDate = true
      if (dateFrom) {
        const logDate = new Date(log.sent_at)
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        matchesDate = matchesDate && logDate >= fromDate
      }
      if (dateTo) {
        const logDate = new Date(log.sent_at)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        matchesDate = matchesDate && logDate <= toDate
      }

      return matchesSearch && matchesStatus && matchesUser && matchesInstance && matchesErrorType && matchesDate
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'recipient':
          comparison = a.recipient.localeCompare(b.recipient)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Filter system logs
  const filteredSystemLogs = systemLogs
    .filter(log => {
      const matchesSearch =
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLevel = levelFilter === 'all' || log.level === levelFilter

      const matchesUser = userFilter === 'all' || log.user_id === userFilter

      // Date range
      let matchesDate = true
      if (dateFrom) {
        const logDate = new Date(log.created_at)
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        matchesDate = matchesDate && logDate >= fromDate
      }
      if (dateTo) {
        const logDate = new Date(log.created_at)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        matchesDate = matchesDate && logDate <= toDate
      }

      return matchesSearch && matchesLevel && matchesUser && matchesDate
    })
    .sort((a, b) => {
      const comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Pagination
  const totalItems = activeTab === 'campaigns' ? filteredCampaignLogs.length : filteredSystemLogs.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage

  const paginatedCampaignLogs = filteredCampaignLogs.slice(startIndex, endIndex)
  const paginatedSystemLogs = filteredSystemLogs.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, levelFilter, userFilter, instanceFilter, errorTypeFilter, dateFrom, dateTo, activeTab])

  // Statistics
  const campaignStats = {
    total: campaignLogs.length,
    sent: campaignLogs.filter(l => l.status === 'sent').length,
    failed: campaignLogs.filter(l => l.status === 'failed').length,
    todaySent: campaignLogs.filter(l => {
      const today = new Date()
      const logDate = new Date(l.sent_at)
      return l.status === 'sent' &&
        logDate.getDate() === today.getDate() &&
        logDate.getMonth() === today.getMonth() &&
        logDate.getFullYear() === today.getFullYear()
    }).length,
    todayFailed: campaignLogs.filter(l => {
      const today = new Date()
      const logDate = new Date(l.sent_at)
      return l.status === 'failed' &&
        logDate.getDate() === today.getDate() &&
        logDate.getMonth() === today.getMonth() &&
        logDate.getFullYear() === today.getFullYear()
    }).length,
  }

  const systemStats = {
    total: systemLogs.length,
    success: systemLogs.filter(l => l.level === 'success').length,
    errors: systemLogs.filter(l => l.level === 'error').length,
    warnings: systemLogs.filter(l => l.level === 'warning').length,
  }

  // Calculate failure rate
  const failureRate = campaignStats.total > 0
    ? Math.round((campaignStats.failed / campaignStats.total) * 100)
    : 0
  const isHighFailureRate = failureRate > 10

  // Hourly stats for chart
  const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
    const hourLogs = campaignLogs.filter(l => {
      const logDate = new Date(l.sent_at)
      const today = new Date()
      return logDate.getHours() === hour &&
        logDate.getDate() === today.getDate() &&
        logDate.getMonth() === today.getMonth() &&
        logDate.getFullYear() === today.getFullYear()
    })
    return {
      hour,
      sent: hourLogs.filter(l => l.status === 'sent').length,
      failed: hourLogs.filter(l => l.status === 'failed').length,
    }
  })

  const maxHourlyValue = Math.max(...hourlyStats.map(h => h.sent + h.failed), 1)

  // Helper functions
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-500/10 text-green-500 border-green-500/20',
      error: 'bg-red-500/10 text-red-500 border-red-500/20',
      warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    }
    return (
      <Badge variant="outline" className={colors[level] || colors.info}>
        {level.toUpperCase()}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    if (status === 'sent') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Enviado
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
        <XCircle className="h-3 w-3 mr-1" />
        Falha
      </Badge>
    )
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Export to CSV
  const exportToCSV = () => {
    const logs = activeTab === 'campaigns' ? filteredCampaignLogs : filteredSystemLogs

    let csv = ''

    if (activeTab === 'campaigns') {
      csv = 'Data/Hora,Campanha,Destinatário,Nome,Status,Erro\n'
      csv += (logs as CampaignLog[]).map(log =>
        `"${formatDate(log.sent_at)}","${log.campaign?.title || ''}","${log.recipient}","${log.recipient_name || ''}","${log.status}","${log.error_message || ''}"`
      ).join('\n')
    } else {
      csv = 'Data/Hora,Nível,Ação,Usuário,Detalhes\n'
      csv += (logs as SystemLog[]).map(log =>
        `"${formatDate(log.created_at)}","${log.level}","${log.action}","${log.user?.email || 'Sistema'}","${JSON.stringify(log.details || {})}"`
      ).join('\n')
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `logs_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Exportação concluída!')
  }

  // Resend failed message
  const resendMessage = async (log: CampaignLog) => {
    if (!log.campaign) {
      toast.error('Campanha não encontrada')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/dispatch/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: log.campaign.instance_id,
          number: log.recipient,
          message: log.campaign.message,
        }),
      })

      if (response.ok) {
        toast.success('Mensagem reenviada com sucesso!')
        refreshLogs()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao reenviar mensagem')
      }
    } catch (error) {
      console.error('Error resending message:', error)
      toast.error('Erro ao reenviar mensagem')
    } finally {
      setLoading(false)
    }
  }

  // Delete old logs
  const deleteOldLogs = async () => {
    setLoading(true)
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - deleteDays)

      // Delete old campaign items
      const { error: campaignError } = await supabase
        .from('campaign_items')
        .delete()
        .lt('sent_at', cutoffDate.toISOString())

      // Delete old system logs
      const { error: systemError } = await supabase
        .from('system_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      if (campaignError || systemError) {
        throw new Error('Erro ao excluir logs')
      }

      toast.success(`Logs com mais de ${deleteDays} dias excluídos!`)
      setShowDeleteDialog(false)
      refreshLogs()
    } catch (error) {
      console.error('Error deleting logs:', error)
      toast.error('Erro ao excluir logs antigos')
    } finally {
      setLoading(false)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setLevelFilter('all')
    setUserFilter('all')
    setInstanceFilter('all')
    setErrorTypeFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || levelFilter !== 'all' ||
    userFilter !== 'all' || instanceFilter !== 'all' || errorTypeFilter !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(systemStats.total + campaignStats.total)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(campaignStats.todaySent + campaignStats.todayFailed)} hoje
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatNumber(campaignStats.sent)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {formatNumber(campaignStats.todaySent)} hoje
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas de Envio</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatNumber(campaignStats.failed)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {isHighFailureRate ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingUp className="h-3 w-3 text-green-500" />
              )}
              {failureRate}% taxa de falha
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros do Sistema</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{formatNumber(systemStats.errors)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(systemStats.warnings)} avisos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Failure Rate Alert */}
      {isHighFailureRate && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-medium text-red-500">Taxa de Falha Alta Detectada</p>
              <p className="text-sm text-muted-foreground">
                A taxa de falha está em {failureRate}%. Verifique os erros mais comuns nos filtros.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Envios por Hora (Hoje)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-20">
            {hourlyStats.map((stat, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col-reverse">
                  {stat.sent > 0 && (
                    <div
                      className="bg-green-500 rounded-t"
                      style={{ height: `${(stat.sent / maxHourlyValue) * 60}px` }}
                      title={`${stat.sent} enviados às ${idx}h`}
                    />
                  )}
                  {stat.failed > 0 && (
                    <div
                      className="bg-red-500 rounded-t"
                      style={{ height: `${(stat.failed / maxHourlyValue) * 60}px` }}
                      title={`${stat.failed} falhas às ${idx}h`}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{idx}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Enviados</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span>Falhas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Logs de Envio
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs do Sistema
            </TabsTrigger>
          </TabsList>

          {/* Auto-refresh controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Última atualização: {lastRefresh.toLocaleTimeString()}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {autoRefresh ? (
                    <Pause className="h-3 w-3 text-green-500" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Auto-refresh
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto-refresh</Label>
                    <Switch
                      checked={autoRefresh}
                      onCheckedChange={setAutoRefresh}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Intervalo</Label>
                    <Select
                      value={refreshInterval.toString()}
                      onValueChange={(v) => setRefreshInterval(parseInt(v))}
                      disabled={!autoRefresh}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTO_REFRESH_INTERVALS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Campaign Logs Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Logs de Envio de Mensagens</CardTitle>
                  <CardDescription>
                    Histórico de mensagens enviadas e falhas
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Antigos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por número, nome, campanha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="sent">Enviados</SelectItem>
                        <SelectItem value="failed">Falhas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={showFilters ? 'default' : 'outline'}
                      onClick={() => setShowFilters(!showFilters)}
                      className="shrink-0"
                    >
                      <Filter className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filtros</span>
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                          !
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={refreshLogs}
                      disabled={loading}
                      className="shrink-0"
                    >
                      <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <Card className="p-4 bg-muted/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Data Inicial</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data Final</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Usuário</Label>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Instância</Label>
                        <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {instances.map(instance => (
                              <SelectItem key={instance.id} value={instance.id}>
                                {instance.name} {instance.phone_number && `(${instance.phone_number})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Tipo de Erro</Label>
                        <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {errorTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Ordenar por</Label>
                        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">Data</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="recipient">Destinatário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Ordem</Label>
                        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Mais recentes</SelectItem>
                            <SelectItem value="asc">Mais antigos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button variant="ghost" onClick={clearFilters} className="w-full">
                          <X className="h-4 w-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                <span>
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredCampaignLogs.length)} de {filteredCampaignLogs.length} registros
                </span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()}>{opt} / página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCampaignLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum log de envio encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCampaignLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(log.sent_at)}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {log.campaign?.title || 'Campanha removida'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{log.recipient}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(log.recipient, 'Número')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {log.recipient_name && (
                              <span className="text-xs text-muted-foreground">{log.recipient_name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {log.error_message || '-'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyToClipboard(log.recipient, 'Número')}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Número
                                </DropdownMenuItem>
                                {log.campaign && (
                                  <DropdownMenuItem onClick={() => window.open(`/campaigns/${log.campaign?.id}`, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver Campanha
                                  </DropdownMenuItem>
                                )}
                                {log.status === 'failed' && log.campaign?.instance_id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => resendMessage(log)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Reenviar Mensagem
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Logs do Sistema</CardTitle>
                  <CardDescription>
                    Eventos e ações registrados no sistema
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Antigos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por ação, usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={showFilters ? 'default' : 'outline'}
                      onClick={() => setShowFilters(!showFilters)}
                      className="shrink-0"
                    >
                      <Filter className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filtros</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={refreshLogs}
                      disabled={loading}
                      className="shrink-0"
                    >
                      <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <Card className="p-4 bg-muted/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Data Inicial</Label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data Final</Label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Usuário</Label>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button variant="ghost" onClick={clearFilters} className="w-full">
                          <X className="h-4 w-4 mr-2" />
                          Limpar Filtros
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Results count */}
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                <span>
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredSystemLogs.length)} de {filteredSystemLogs.length} registros
                </span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt.toString()}>{opt} / página</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSystemLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum log do sistema encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSystemLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getLevelIcon(log.level)}
                              {getLevelBadge(log.level)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.action}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.user?.email || log.user_id || 'Sistema'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedSystemLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Envio</DialogTitle>
            <DialogDescription>
              Informações completas sobre o envio
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                    <p className="mt-1 font-medium">{formatDate(selectedLog.sent_at)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Campanha</Label>
                  <p className="mt-1 font-medium">{selectedLog.campaign?.title || 'Campanha removida'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Destinatário</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono">{selectedLog.recipient}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(selectedLog.recipient, 'Número')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <p className="mt-1">{selectedLog.recipient_name || '-'}</p>
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Mensagem de Erro</Label>
                    <div className="mt-1 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                      <p className="text-sm text-red-500">{selectedLog.error_message}</p>
                    </div>
                  </div>
                )}

                {selectedLog.campaign?.message && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Mensagem Enviada</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{selectedLog.campaign.message}</p>
                    </div>
                  </div>
                )}

                {selectedLog.response_data && Object.keys(selectedLog.response_data).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Resposta da API</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md overflow-x-auto">
                      <pre className="text-xs">{JSON.stringify(selectedLog.response_data, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            {selectedLog?.status === 'failed' && selectedLog?.campaign?.instance_id && (
              <Button onClick={() => {
                resendMessage(selectedLog)
                setSelectedLog(null)
              }} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Reenviar Mensagem
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Log Details Modal */}
      <Dialog open={!!selectedSystemLog} onOpenChange={() => setSelectedSystemLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informações completas do evento
            </DialogDescription>
          </DialogHeader>
          {selectedSystemLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nível</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {getLevelIcon(selectedSystemLog.level)}
                      {getLevelBadge(selectedSystemLog.level)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                    <p className="mt-1 font-medium">{formatDate(selectedSystemLog.created_at)}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Ação</Label>
                  <p className="mt-1 font-medium">{selectedSystemLog.action}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Usuário</Label>
                  <p className="mt-1">{selectedSystemLog.user?.email || selectedSystemLog.user_id || 'Sistema'}</p>
                </div>

                {selectedSystemLog.ip_address && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Endereço IP</Label>
                    <p className="mt-1 font-mono text-sm">{selectedSystemLog.ip_address}</p>
                  </div>
                )}

                {selectedSystemLog.user_agent && (
                  <div>
                    <Label className="text-xs text-muted-foreground">User Agent</Label>
                    <p className="mt-1 text-sm text-muted-foreground break-all">{selectedSystemLog.user_agent}</p>
                  </div>
                )}

                {selectedSystemLog.details && Object.keys(selectedSystemLog.details).length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Detalhes</Label>
                    <div className="mt-1 p-3 bg-muted rounded-md overflow-x-auto">
                      <pre className="text-xs">{JSON.stringify(selectedSystemLog.details, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSystemLog(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Old Logs Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Logs Antigos</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente todos os logs com mais de {deleteDays} dias.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Excluir logs com mais de:</Label>
            <Select value={deleteDays.toString()} onValueChange={(v) => setDeleteDays(parseInt(v))}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOldLogs}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
