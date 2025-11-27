'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Search,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  UserPlus,
  Plus,
  Key,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  Unlock,
  Download,
  Filter,
  ArrowUpDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  Send,
  Calendar,
  User,
  Smartphone,
  Activity,
  History,
  Settings,
  ArrowRightLeft,
  Power,
  PowerOff,
} from 'lucide-react'
import { formatDate, formatNumber, getStatusColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { WhatsAppInstance, Profile, InstanceStatus } from '@/types'

interface InstancesManagerProps {
  instances: (WhatsAppInstance & { user?: Profile })[]
  users: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>[]
}

interface InstanceDetails {
  instance: WhatsAppInstance & { user?: Profile }
  stats: {
    total_campaigns: number
    total_messages_sent: number
    total_messages_failed: number
    success_rate: number
  }
  recentCampaigns: any[]
  connectionHistory: any[]
}

const STATUS_LABELS: Record<InstanceStatus, string> = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  connecting: 'Conectando',
  qr_code: 'Aguardando QR',
}

type SortField = 'created_at' | 'name' | 'status' | 'user'
type SortOrder = 'asc' | 'desc'
type FilterStatus = 'all' | InstanceStatus
type FilterUser = 'all' | 'assigned' | 'unassigned' | string

export function InstancesManager({ instances: initialInstances, users }: InstancesManagerProps) {
  const [instances, setInstances] = useState(initialInstances)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<WhatsAppInstance | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [assignInstance, setAssignInstance] = useState<WhatsAppInstance | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Seleção em massa
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])

  // Filtros e ordenação
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterUser, setFilterUser] = useState<FilterUser>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Atualização em tempo real
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)

  // Modal de detalhes
  const [viewingInstance, setViewingInstance] = useState<string | null>(null)
  const [instanceDetails, setInstanceDetails] = useState<InstanceDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Modal de edição
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null)
  const [editName, setEditName] = useState('')
  const [editWebhook, setEditWebhook] = useState('')

  // Modal de transferência
  const [transferringInstance, setTransferringInstance] = useState<(WhatsAppInstance & { user?: Profile }) | null>(null)
  const [transferUserId, setTransferUserId] = useState('')

  // Criar instância
  const [showCreateTest, setShowCreateTest] = useState(false)
  const [testInstanceName, setTestInstanceName] = useState('')
  const [testAssignUserId, setTestAssignUserId] = useState<string>('')
  const [creating, setCreating] = useState(false)

  // Editar token
  const [editTokenInstance, setEditTokenInstance] = useState<WhatsAppInstance | null>(null)
  const [newToken, setNewToken] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  // Bloquear instância
  const [blockingInstance, setBlockingInstance] = useState<WhatsAppInstance | null>(null)
  const [blockReason, setBlockReason] = useState('')

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshInstances()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const refreshInstances = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*, user:profiles(*)')
        .order('created_at', { ascending: false })

      if (data) {
        setInstances(data as any)
      }
    } catch (error) {
      console.error('Erro ao atualizar instâncias:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/sync-instances', {
        method: 'POST',
      })

      if (response.ok) {
        await refreshInstances()
        toast.success('Instâncias sincronizadas com sucesso')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao sincronizar')
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      toast.error('Erro ao sincronizar instâncias')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (instance: WhatsAppInstance) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instance.id)

      if (error) throw error

      setInstances(prev => prev.filter(i => i.id !== instance.id))
      toast.success('Instância excluída')
    } catch (error) {
      console.error('Error deleting instance:', error)
      toast.error('Erro ao excluir instância')
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedInstances.length === 0) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .in('id', selectedInstances)

      if (error) throw error

      setInstances(prev => prev.filter(i => !selectedInstances.includes(i.id)))
      setSelectedInstances([])
      toast.success(`${selectedInstances.length} instância(s) excluída(s)`)
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Erro ao excluir instâncias')
    } finally {
      setLoading(false)
      setBulkDeleteConfirm(false)
    }
  }

  const handleAssign = async () => {
    if (!assignInstance || !selectedUserId) return

    setAssigning(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ user_id: selectedUserId })
        .eq('id', assignInstance.id)

      if (error) throw error

      const newUser = users.find(u => u.id === selectedUserId)
      setInstances(prev =>
        prev.map(i =>
          i.id === assignInstance.id
            ? { ...i, user_id: selectedUserId, user: newUser as Profile }
            : i
        )
      )

      toast.success('Usuário atribuído com sucesso')
      setAssignInstance(null)
      setSelectedUserId('')
    } catch (error) {
      console.error('Error assigning instance:', error)
      toast.error('Erro ao atribuir instância')
    } finally {
      setAssigning(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferringInstance || !transferUserId) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ user_id: transferUserId })
        .eq('id', transferringInstance.id)

      if (error) throw error

      const newUser = users.find(u => u.id === transferUserId)
      setInstances(prev =>
        prev.map(i =>
          i.id === transferringInstance.id
            ? { ...i, user_id: transferUserId, user: newUser as Profile }
            : i
        )
      )

      toast.success('Instância transferida com sucesso')
      setTransferringInstance(null)
      setTransferUserId('')
    } catch (error) {
      console.error('Error transferring instance:', error)
      toast.error('Erro ao transferir instância')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async (instance: WhatsAppInstance) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ user_id: null })
        .eq('id', instance.id)

      if (error) throw error

      setInstances(prev =>
        prev.map(i =>
          i.id === instance.id
            ? { ...i, user_id: null as string | null, user: undefined }
            : i
        )
      )

      toast.success('Usuário desvinculado')
    } catch (error) {
      console.error('Error unassigning:', error)
      toast.error('Erro ao desvincular usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleEditInstance = async () => {
    if (!editingInstance) return

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({
          name: editName,
          webhook_url: editWebhook || null,
        })
        .eq('id', editingInstance.id)

      if (error) throw error

      setInstances(prev =>
        prev.map(i =>
          i.id === editingInstance.id
            ? { ...i, name: editName, webhook_url: editWebhook || null }
            : i
        )
      )

      toast.success('Instância atualizada')
      setEditingInstance(null)
    } catch (error) {
      console.error('Error editing instance:', error)
      toast.error('Erro ao editar instância')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestInstance = async () => {
    if (!testInstanceName.trim()) return

    setCreating(true)

    try {
      const response = await fetch('/api/admin/create-test-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testInstanceName.trim(),
          user_id: testAssignUserId || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar instância')
      }

      const { instance } = await response.json()
      const assignedUser = testAssignUserId ? users.find(u => u.id === testAssignUserId) : undefined
      setInstances(prev => [{
        ...instance,
        user: assignedUser as Profile,
      }, ...prev])

      toast.success('Instância criada com sucesso')
      setShowCreateTest(false)
      setTestInstanceName('')
      setTestAssignUserId('')
    } catch (error) {
      console.error('Error creating test instance:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar instância de teste')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveToken = async () => {
    if (!editTokenInstance || !newToken.trim()) return

    setSavingToken(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .update({ token: newToken.trim() })
        .eq('id', editTokenInstance.id)

      if (error) throw error

      setInstances(prev =>
        prev.map(i =>
          i.id === editTokenInstance.id
            ? { ...i, token: newToken.trim() }
            : i
        )
      )

      toast.success('Token atualizado com sucesso')
      setEditTokenInstance(null)
      setNewToken('')
    } catch (error) {
      console.error('Error updating token:', error)
      toast.error('Erro ao atualizar token')
    } finally {
      setSavingToken(false)
    }
  }

  const loadInstanceDetails = async (instanceId: string) => {
    setDetailsLoading(true)
    setViewingInstance(instanceId)

    try {
      const supabase = createClient()
      const instance = instances.find(i => i.id === instanceId)

      // Buscar campanhas
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title, status, total_recipients, sent_count, failed_count, created_at')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false })
        .limit(10)

      const recentCampaigns = campaigns || []
      const totalSent = recentCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)
      const totalFailed = recentCampaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0)

      setInstanceDetails({
        instance: instance!,
        stats: {
          total_campaigns: recentCampaigns.length,
          total_messages_sent: totalSent,
          total_messages_failed: totalFailed,
          success_rate: totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 0,
        },
        recentCampaigns,
        connectionHistory: [], // Pode ser implementado depois
      })
    } catch (error) {
      console.error('Error loading instance details:', error)
      toast.error('Erro ao carregar detalhes')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleReconnect = async (instance: WhatsAppInstance) => {
    toast.info(`Tentando reconectar ${instance.name}...`)
    // Implementar reconexão via API
  }

  const handleBulkReconnect = async () => {
    const disconnected = filteredInstances.filter(i => i.status === 'disconnected')
    toast.info(`Reconectando ${disconnected.length} instância(s)...`)
    // Implementar reconexão em massa
  }

  const exportToCSV = () => {
    const headers = ['Nome', 'Usuário', 'Status', 'Telefone', 'Instance Key', 'Criada em']
    const rows = filteredInstances.map(i => [
      i.name,
      i.user?.full_name || i.user?.email || 'N/A',
      STATUS_LABELS[i.status],
      i.phone_number || 'N/A',
      i.instance_key,
      formatDate(i.created_at),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instancias_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Lista exportada com sucesso')
  }

  // Filtragem e ordenação
  const filteredInstances = instances
    .filter(instance => {
      const matchesSearch = instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.instance_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' || instance.status === filterStatus

      let matchesUser = true
      if (filterUser === 'assigned') {
        matchesUser = !!instance.user_id
      } else if (filterUser === 'unassigned') {
        matchesUser = !instance.user_id
      } else if (filterUser !== 'all') {
        matchesUser = instance.user_id === filterUser
      }

      return matchesSearch && matchesStatus && matchesUser
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'user':
          comparison = (a.user?.full_name || a.user?.email || '').localeCompare(b.user?.full_name || b.user?.email || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const connectedCount = instances.filter(i => i.status === 'connected').length
  const disconnectedCount = instances.filter(i => i.status === 'disconnected').length
  const qrCount = instances.filter(i => i.status === 'qr_code').length

  const toggleSelectAll = () => {
    if (selectedInstances.length === filteredInstances.length) {
      setSelectedInstances([])
    } else {
      setSelectedInstances(filteredInstances.map(i => i.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedInstances(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const getStatusBadge = (status: InstanceStatus) => {
    const config = {
      connected: { icon: Wifi, color: 'bg-green-500', label: 'Conectada' },
      disconnected: { icon: WifiOff, color: 'bg-red-500', label: 'Desconectada' },
      connecting: { icon: RefreshCw, color: 'bg-yellow-500', label: 'Conectando' },
      qr_code: { icon: QrCode, color: 'bg-blue-500', label: 'Aguardando QR' },
    }
    const { icon: Icon, color, label } = config[status]
    return (
      <Badge variant="outline" className={`${color} text-white border-none`}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'connecting' ? 'animate-spin' : ''}`} />
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{instances.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{connectedCount}</div>
            <div className="text-sm text-muted-foreground">Conectadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{disconnectedCount}</div>
            <div className="text-sm text-muted-foreground">Desconectadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{qrCount}</div>
            <div className="text-sm text-muted-foreground">Aguardando QR</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar instâncias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreateTest(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="connected">Conectadas</SelectItem>
                    <SelectItem value="disconnected">Desconectadas</SelectItem>
                    <SelectItem value="connecting">Conectando</SelectItem>
                    <SelectItem value="qr_code">Aguardando QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usuário</Label>
                <Select value={filterUser} onValueChange={(v) => setFilterUser(v as FilterUser)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="assigned">Com usuário</SelectItem>
                    <SelectItem value="unassigned">Sem usuário</SelectItem>
                    <Separator className="my-1" />
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordenar por</Label>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Data de criação</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoRefresh"
                  checked={autoRefresh}
                  onCheckedChange={(v) => setAutoRefresh(!!v)}
                />
                <Label htmlFor="autoRefresh" className="text-xs">Auto atualizar ({refreshInterval}s)</Label>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterUser('all'); setSortField('created_at'); setSortOrder('desc') }}>
                <X className="h-4 w-4 mr-1" />Limpar
              </Button>
            </div>
          </Card>
        )}

        {/* Ações em massa */}
        {selectedInstances.length > 0 && (
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{selectedInstances.length} selecionada(s)</span>
              <Button variant="outline" size="sm" onClick={handleBulkReconnect}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconectar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedInstances([])}>
                <X className="h-4 w-4 mr-1" />
                Limpar seleção
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Instances Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedInstances.length === filteredInstances.length && filteredInstances.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Instance Key</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstances.map(instance => (
                <TableRow key={instance.id} className={selectedInstances.includes(instance.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedInstances.includes(instance.id)}
                      onCheckedChange={() => toggleSelect(instance.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{instance.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {instance.user?.full_name || instance.user?.email || <span className="text-muted-foreground">N/A</span>}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(instance.status)}</TableCell>
                  <TableCell>{instance.phone_number || 'N/A'}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {instance.instance_key.slice(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell>{formatDate(instance.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => loadInstanceDetails(instance.id)}>
                          <Eye className="h-4 w-4 mr-2" />Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditingInstance(instance); setEditName(instance.name); setEditWebhook(instance.webhook_url || '') }}>
                          <Edit className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditTokenInstance(instance); setNewToken(instance.token || '') }}>
                          <Key className="h-4 w-4 mr-2" />Editar token
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setAssignInstance(instance); setSelectedUserId(instance.user_id || '') }}>
                          <UserPlus className="h-4 w-4 mr-2" />Atribuir usuário
                        </DropdownMenuItem>
                        {instance.user_id && (
                          <>
                            <DropdownMenuItem onClick={() => { setTransferringInstance(instance); setTransferUserId('') }}>
                              <ArrowRightLeft className="h-4 w-4 mr-2" />Transferir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUnassign(instance)}>
                              <X className="h-4 w-4 mr-2" />Desvincular usuário
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        {instance.status === 'disconnected' && (
                          <DropdownMenuItem onClick={() => handleReconnect(instance)}>
                            <RefreshCw className="h-4 w-4 mr-2" />Reconectar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteConfirm(instance)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!viewingInstance} onOpenChange={() => { setViewingInstance(null); setInstanceDetails(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes da Instância</DialogTitle>
            <DialogDescription>{instanceDetails?.instance.name}</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : instanceDetails ? (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                <TabsTrigger value="config">Configurações</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4 h-[400px]">
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Send className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Campanhas</span></div><p className="text-2xl font-bold">{instanceDetails.stats.total_campaigns}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Mensagens</span></div><p className="text-2xl font-bold">{formatNumber(instanceDetails.stats.total_messages_sent)}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm text-muted-foreground">Falhas</span></div><p className="text-2xl font-bold">{formatNumber(instanceDetails.stats.total_messages_failed)}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-purple-500" /><span className="text-sm text-muted-foreground">Taxa Sucesso</span></div><p className="text-2xl font-bold">{instanceDetails.stats.success_rate}%</p></CardContent></Card>
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Status:</span>{getStatusBadge(instanceDetails.instance.status)}</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Usuário:</span><span>{instanceDetails.instance.user?.full_name || instanceDetails.instance.user?.email || 'Não atribuído'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Telefone:</span><span>{instanceDetails.instance.phone_number || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Instance Key:</span><code className="text-xs">{instanceDetails.instance.instance_key}</code></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Criada em:</span><span>{formatDate(instanceDetails.instance.created_at)}</span></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Últimas Campanhas</CardTitle></CardHeader>
                    <CardContent>
                      {instanceDetails.recentCampaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha</p> : (
                        <div className="space-y-2">
                          {instanceDetails.recentCampaigns.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div><p className="text-sm font-medium">{c.title || 'Sem título'}</p><p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p></div>
                              <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{c.sent_count}/{c.total_recipients}</span><Badge variant={c.status === 'completed' ? 'default' : c.status === 'failed' ? 'destructive' : 'secondary'}>{c.status}</Badge></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="config" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Configurações</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Webhook URL</Label>
                        <p className="text-sm font-mono">{instanceDetails.instance.webhook_url || 'Não configurado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Server URL</Label>
                        <p className="text-sm font-mono">{instanceDetails.instance.server_url || 'Não configurado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">É instância de teste?</Label>
                        <p className="text-sm">{instanceDetails.instance.is_test ? 'Sim' : 'Não'}</p>
                      </div>
                      {instanceDetails.instance.expires_at && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Expira em</Label>
                          <p className="text-sm">{formatDate(instanceDetails.instance.expires_at)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Instance Dialog */}
      <Dialog open={!!editingInstance} onOpenChange={() => setEditingInstance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Instância</DialogTitle>
            <DialogDescription>Atualize as informações da instância</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL (opcional)</Label>
              <Input value={editWebhook} onChange={(e) => setEditWebhook(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInstance(null)}>Cancelar</Button>
            <Button onClick={handleEditInstance} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Instance Dialog */}
      <Dialog open={!!transferringInstance} onOpenChange={() => setTransferringInstance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Transferir Instância</DialogTitle>
            <DialogDescription>
              Transferir "{transferringInstance?.name}" de {transferringInstance?.user?.full_name || transferringInstance?.user?.email || 'N/A'} para outro usuário
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Novo usuário</Label>
            <Select value={transferUserId} onValueChange={setTransferUserId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o novo usuário" /></SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id !== transferringInstance?.user_id).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                    {user.role === 'admin' && ' (Admin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferringInstance(null)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={!transferUserId || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Instância</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a instância "{deleteConfirm?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedInstances.length} Instância(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir as instâncias selecionadas?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign User Dialog */}
      <Dialog open={!!assignInstance} onOpenChange={() => { setAssignInstance(null); setSelectedUserId('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Usuário</DialogTitle>
            <DialogDescription>
              Selecione o usuário que terá acesso à instância "{assignInstance?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                    {user.role === 'admin' && ' (Admin)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignInstance(null); setSelectedUserId('') }}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || assigning}>
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Test Instance Dialog */}
      <Dialog open={showCreateTest} onOpenChange={() => { setShowCreateTest(false); setTestInstanceName(''); setTestAssignUserId('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Criar Nova Instância</DialogTitle>
            <DialogDescription>Crie uma nova instância WhatsApp e atribua a um usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Instância *</Label>
              <Input placeholder="Ex: teste-cliente-joao" value={testInstanceName} onChange={(e) => setTestInstanceName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Atribuir a Usuário (opcional)</Label>
              <Select value={testAssignUserId || "none"} onValueChange={(v) => setTestAssignUserId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Admin)</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                      {user.role === 'admin' && ' (Admin)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateTest(false); setTestInstanceName(''); setTestAssignUserId('') }}>Cancelar</Button>
            <Button onClick={handleCreateTestInstance} disabled={!testInstanceName.trim() || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Token Dialog */}
      <Dialog open={!!editTokenInstance} onOpenChange={() => { setEditTokenInstance(null); setNewToken('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Editar Token</DialogTitle>
            <DialogDescription>Atualize o token da instância "{editTokenInstance?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Token da Instância *</Label>
              <Input placeholder="Ex: 6aa45dbd-5b4a-4e47-8cae-c3a9ca997489" value={newToken} onChange={(e) => setNewToken(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Este token é usado para autenticar chamadas à API do UAZAPI para esta instância específica.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTokenInstance(null); setNewToken('') }}>Cancelar</Button>
            <Button onClick={handleSaveToken} disabled={!newToken.trim() || savingToken}>
              {savingToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
