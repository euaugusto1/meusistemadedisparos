'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Edit,
  Shield,
  User,
  Loader2,
  Crown,
  Trash2,
  MoreVertical,
  Ban,
  Unlock,
  Plus,
  MessageSquare,
  Send,
  Smartphone,
  BarChart3,
  Key,
  Download,
  ArrowUpDown,
  Filter,
  X,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { formatDate, formatNumber, getPlanColor } from '@/lib/utils'
import { toast } from 'sonner'
import type { Profile, UserRole, PlanTier, PaymentTransaction } from '@/types'

interface UsersManagerProps {
  users: Profile[]
}

interface UserDetails {
  profile: Profile
  stats: {
    total_campaigns: number
    total_messages_sent: number
    total_messages_failed: number
    success_rate: number
    active_instances: number
    total_instances: number
    total_lists: number
    total_contacts: number
  }
  campaigns: any[]
  instances: any[]
  lists: any[]
  payments: PaymentTransaction[]
  notes: any[]
}

type SortField = 'created_at' | 'credits' | 'plan_tier' | 'full_name'
type SortOrder = 'asc' | 'desc'
type FilterPlan = 'all' | PlanTier
type FilterStatus = 'all' | 'active' | 'blocked' | 'expired'

export function UsersManager({ users: initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [viewingUser, setViewingUser] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Filtros e ordenação
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterPlan, setFilterPlan] = useState<FilterPlan>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Edit form state
  const [role, setRole] = useState<UserRole>('user')
  const [planTier, setPlanTier] = useState<PlanTier>('free')
  const [credits, setCredits] = useState(0)
  const [planDays, setPlanDays] = useState(30)

  // Action modals
  const [blockingUser, setBlockingUser] = useState<Profile | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [addingCredits, setAddingCredits] = useState<Profile | null>(null)
  const [creditsToAdd, setCreditsToAdd] = useState(0)
  const [creditsDescription, setCreditsDescription] = useState('')
  const [newNote, setNewNote] = useState('')

  // Carregar detalhes do usuário
  const loadUserDetails = async (userId: string) => {
    setDetailsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error('Failed to load user details')
      const data = await response.json()
      setUserDetails(data)
      setViewingUser(userId)
    } catch (error) {
      toast.error('Erro ao carregar detalhes do usuário')
    } finally {
      setDetailsLoading(false)
    }
  }

  const openEditDialog = (user: Profile) => {
    setEditingUser(user)
    setRole(user.role)
    setPlanTier(user.plan_tier)
    setCredits(user.credits)
    setPlanDays(30)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setLoading(true)

    const newExpiration = new Date()
    newExpiration.setDate(newExpiration.getDate() + planDays)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          role,
          plan_tier: planTier,
          credits,
          plan_expires_at: newExpiration.toISOString(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === editingUser.id
            ? { ...u, role, plan_tier: planTier, credits, plan_expires_at: newExpiration.toISOString() }
            : u
        )
      )

      toast.success('Usuário atualizado com sucesso')
      setEditingUser(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setLoading(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
      toast.success('Usuário excluído com sucesso')
      setDeletingUser(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!blockingUser) return
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${blockingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', reason: blockReason }),
      })

      if (!response.ok) throw new Error('Failed to block user')

      setUsers(prev =>
        prev.map(u =>
          u.id === blockingUser.id
            ? { ...u, status: 'blocked' as const, blocked_reason: blockReason }
            : u
        )
      )

      toast.success('Usuário bloqueado')
      setBlockingUser(null)
      setBlockReason('')
    } catch (error) {
      toast.error('Erro ao bloquear usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblockUser = async (userId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock' }),
      })

      if (!response.ok) throw new Error('Failed to unblock user')

      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, status: 'active' as const, blocked_reason: null }
            : u
        )
      )

      toast.success('Usuário desbloqueado')
    } catch (error) {
      toast.error('Erro ao desbloquear usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredits = async () => {
    if (!addingCredits || creditsToAdd <= 0) return
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${addingCredits.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_credits',
          amount: creditsToAdd,
          description: creditsDescription,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to add credits')

      setUsers(prev =>
        prev.map(u =>
          u.id === addingCredits.id
            ? { ...u, credits: data.newBalance }
            : u
        )
      )

      toast.success(`${creditsToAdd} créditos adicionados`)
      setAddingCredits(null)
      setCreditsToAdd(0)
      setCreditsDescription('')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar créditos')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (userId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      })

      if (!response.ok) throw new Error('Failed to send reset email')

      toast.success('Email de redefinição de senha enviado')
    } catch (error) {
      toast.error('Erro ao enviar email de redefinição')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!viewingUser || !newNote.trim()) return
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${viewingUser}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', note: newNote }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to add note')

      if (userDetails) {
        setUserDetails({
          ...userDetails,
          notes: [data.note, ...userDetails.notes],
        })
      }

      toast.success('Nota adicionada')
      setNewNote('')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar nota')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!viewingUser) return

    try {
      const response = await fetch(`/api/admin/users/${viewingUser}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_note', noteId }),
      })

      if (!response.ok) throw new Error('Failed to delete note')

      if (userDetails) {
        setUserDetails({
          ...userDetails,
          notes: userDetails.notes.filter((n: any) => n.id !== noteId),
        })
      }

      toast.success('Nota excluída')
    } catch (error) {
      toast.error('Erro ao excluir nota')
    }
  }

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Plano', 'Créditos', 'Status', 'Criado em', 'Expira em']
    const rows = filteredUsers.map(u => [
      u.full_name || 'Sem nome',
      u.email,
      u.plan_tier,
      u.credits,
      u.status || 'active',
      formatDate(u.created_at),
      u.plan_expires_at ? formatDate(u.plan_expires_at) : 'N/A',
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Lista exportada com sucesso')
  }

  // Filtragem e ordenação
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = filterPlan === 'all' || user.plan_tier === filterPlan
      let matchesStatus = true
      if (filterStatus === 'blocked') {
        matchesStatus = user.status === 'blocked'
      } else if (filterStatus === 'expired') {
        // Admins nunca expiram
        matchesStatus = user.role !== 'admin' && user.plan_expires_at ? new Date(user.plan_expires_at) < new Date() : false
      } else if (filterStatus === 'active') {
        // Admins sempre ativos (nunca expiram)
        matchesStatus = user.status !== 'blocked' && (user.role === 'admin' || !user.plan_expires_at || new Date(user.plan_expires_at) >= new Date())
      }
      return matchesSearch && matchesPlan && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'credits':
          comparison = a.credits - b.credits
          break
        case 'plan_tier':
          const planOrder = { free: 0, bronze: 1, silver: 2, gold: 3 }
          comparison = planOrder[a.plan_tier] - planOrder[b.plan_tier]
          break
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '')
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const getStatusBadge = (user: Profile) => {
    if (user.status === 'blocked') {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Bloqueado</Badge>
    }
    // Admins nunca expiram
    if (user.role !== 'admin' && user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) {
      return <Badge variant="outline" className="gap-1 text-yellow-500 border-yellow-500"><Clock className="h-3 w-3" /> Expirado</Badge>
    }
    return <Badge variant="outline" className="gap-1 text-green-500 border-green-500"><CheckCircle2 className="h-3 w-3" /> Ativo</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Badge variant="secondary">{filteredUsers.length} usuário(s)</Badge>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Plano</Label>
                <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v as FilterPlan)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="free">Grátis</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Prata</SelectItem>
                    <SelectItem value="gold">Ouro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="blocked">Bloqueados</SelectItem>
                    <SelectItem value="expired">Expirados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordenar por</Label>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Data de criação</SelectItem>
                    <SelectItem value="credits">Créditos</SelectItem>
                    <SelectItem value="plan_tier">Plano</SelectItem>
                    <SelectItem value="full_name">Nome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setFilterPlan('all'); setFilterStatus('all'); setSortField('created_at'); setSortOrder('desc') }}>
                <X className="h-4 w-4 mr-1" />Limpar
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id} className={user.status === 'blocked' ? 'opacity-60' : ''}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name || 'Sem nome'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPlanColor(user.plan_tier)}>
                      <Crown className="h-3 w-3 mr-1" />
                      {user.plan_tier.charAt(0).toUpperCase() + user.plan_tier.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatNumber(user.credits)}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{user.role === 'admin' ? <span className="text-green-500 font-medium">Nunca</span> : (user.plan_expires_at ? formatDate(user.plan_expires_at) : 'N/A')}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => loadUserDetails(user.id)}><Eye className="h-4 w-4 mr-2" />Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(user)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAddingCredits(user)}><Plus className="h-4 w-4 mr-2" />Adicionar créditos</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'blocked' ? (
                          <DropdownMenuItem onClick={() => handleUnblockUser(user.id)}><Unlock className="h-4 w-4 mr-2" />Desbloquear</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setBlockingUser(user)} className="text-yellow-600"><Ban className="h-4 w-4 mr-2" />Bloquear</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleResetPassword(user.id)}><Key className="h-4 w-4 mr-2" />Resetar senha</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => { setViewingUser(null); setUserDetails(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>{userDetails?.profile.email}</DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : userDetails ? (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                <TabsTrigger value="resources">Recursos</TabsTrigger>
                <TabsTrigger value="payments">Pagamentos</TabsTrigger>
                <TabsTrigger value="notes">Notas</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4 h-[400px]">
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Send className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Campanhas</span></div><p className="text-2xl font-bold">{userDetails.stats.total_campaigns}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">Mensagens</span></div><p className="text-2xl font-bold">{formatNumber(userDetails.stats.total_messages_sent)}</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-500" /><span className="text-sm text-muted-foreground">Taxa de Sucesso</span></div><p className="text-2xl font-bold">{userDetails.stats.success_rate}%</p></CardContent></Card>
                    <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-yellow-500" /><span className="text-sm text-muted-foreground">Instâncias</span></div><p className="text-2xl font-bold">{userDetails.stats.active_instances}/{userDetails.stats.total_instances}</p></CardContent></Card>
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span>{userDetails.profile.full_name || 'Não informado'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Plano:</span><Badge variant="outline" className={getPlanColor(userDetails.profile.plan_tier)}>{userDetails.profile.plan_tier}</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Créditos:</span><span className="font-medium">{formatNumber(userDetails.profile.credits)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Expira em:</span><span>{userDetails.profile.plan_expires_at ? formatDate(userDetails.profile.plan_expires_at) : 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Listas:</span><span>{userDetails.stats.total_lists} ({formatNumber(userDetails.stats.total_contacts)} contatos)</span></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Últimas Campanhas</CardTitle></CardHeader>
                    <CardContent>
                      {userDetails.campaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha</p> : (
                        <div className="space-y-2">
                          {userDetails.campaigns.map((c: any) => (
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

                <TabsContent value="resources" className="mt-0 space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Instâncias WhatsApp</CardTitle></CardHeader>
                    <CardContent>
                      {userDetails.instances.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma instância</p> : (
                        <div className="space-y-2">
                          {userDetails.instances.map((i: any) => (
                            <div key={i.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.phone_number || 'Sem número'}</p></div>
                              <Badge variant={i.status === 'connected' ? 'default' : 'secondary'}>{i.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Listas de Contatos</CardTitle></CardHeader>
                    <CardContent>
                      {userDetails.lists.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma lista</p> : (
                        <div className="space-y-2">
                          {userDetails.lists.map((l: any) => (
                            <div key={l.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div><p className="text-sm font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{formatDate(l.created_at)}</p></div>
                              <Badge variant="outline">{l.contact_count} contatos</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Histórico de Pagamentos</CardTitle></CardHeader>
                    <CardContent>
                      {userDetails.payments.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pagamento</p> : (
                        <div className="space-y-2">
                          {userDetails.payments.map((p: PaymentTransaction) => (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <div><p className="text-sm font-medium">R$ {p.amount.toFixed(2)}</p><p className="text-xs text-muted-foreground">{formatDate(p.created_at)} - {p.credits_added} créditos</p></div>
                              <Badge variant={p.status === 'approved' ? 'default' : 'secondary'}>{p.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Notas Internas</CardTitle><CardDescription>Visíveis apenas para administradores</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Textarea placeholder="Adicionar uma nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1" />
                        <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                      </div>
                      <Separator />
                      {userDetails.notes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota</p> : (
                        <div className="space-y-3">
                          {userDetails.notes.map((n: any) => (
                            <div key={n.id} className="p-3 rounded bg-muted/50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1"><p className="text-sm">{n.note}</p><p className="text-xs text-muted-foreground mt-1">Por {n.admin?.full_name || 'Admin'} em {formatDate(n.created_at)}</p></div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteNote(n.id)}><X className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle><DialogDescription>{editingUser?.email}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planTier} onValueChange={(v) => setPlanTier(v as PlanTier)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="free">Grátis</SelectItem><SelectItem value="bronze">Bronze</SelectItem><SelectItem value="silver">Prata</SelectItem><SelectItem value="gold">Ouro</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Créditos</Label>
              <Input type="number" value={credits} onChange={(e) => setCredits(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Alterar desconta a diferença dos seus créditos</p>
            </div>
            <div className="space-y-2">
              <Label>Dias de Validade</Label>
              <Input type="number" value={planDays} onChange={(e) => setPlanDays(parseInt(e.target.value) || 30)} />
              <p className="text-xs text-muted-foreground">A partir de hoje</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button><Button onClick={handleSave} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={!!blockingUser} onOpenChange={() => { setBlockingUser(null); setBlockReason('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Bloquear Usuário</DialogTitle><DialogDescription>Tem certeza que deseja bloquear <strong>{blockingUser?.email}</strong>?</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Motivo do bloqueio (opcional)</Label><Textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Descreva o motivo..." className="mt-2" /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setBlockingUser(null); setBlockReason('') }}>Cancelar</Button><Button variant="destructive" onClick={handleBlockUser} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Bloquear</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={!!addingCredits} onOpenChange={() => { setAddingCredits(null); setCreditsToAdd(0); setCreditsDescription('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-green-500" />Adicionar Créditos</DialogTitle><DialogDescription>Adicionar créditos para <strong>{addingCredits?.email}</strong></DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min={1} value={creditsToAdd} onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)} placeholder="Ex: 1000" /><p className="text-xs text-muted-foreground">Serão descontados da sua conta</p></div>
            <div className="space-y-2"><Label>Descrição (opcional)</Label><Input value={creditsDescription} onChange={(e) => setCreditsDescription(e.target.value)} placeholder="Ex: Bônus" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setAddingCredits(null); setCreditsToAdd(0); setCreditsDescription('') }}>Cancelar</Button><Button onClick={handleAddCredits} disabled={loading || creditsToAdd <= 0}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar{creditsToAdd > 0 && ` ${creditsToAdd}`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle><DialogDescription>Excluir <strong>{deletingUser?.email}</strong>?</DialogDescription></DialogHeader>
          <div className="py-4"><div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4"><p className="text-sm text-red-800 dark:text-red-200"><strong>Atenção:</strong> Esta ação é irreversível.</p></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setDeletingUser(null)} disabled={loading}>Cancelar</Button><Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
