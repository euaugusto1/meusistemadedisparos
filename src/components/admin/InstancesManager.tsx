'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { formatDate, getStatusColor } from '@/lib/utils'
import type { WhatsAppInstance, Profile, InstanceStatus } from '@/types'

interface InstancesManagerProps {
  instances: (WhatsAppInstance & { user?: Profile })[]
  users: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>[]
}

const STATUS_LABELS: Record<InstanceStatus, string> = {
  connected: 'Conectada',
  disconnected: 'Desconectada',
  connecting: 'Conectando',
  qr_code: 'Aguardando QR',
}

export function InstancesManager({ instances: initialInstances, users }: InstancesManagerProps) {
  const [instances, setInstances] = useState(initialInstances)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<WhatsAppInstance | null>(null)
  const [assignInstance, setAssignInstance] = useState<WhatsAppInstance | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Test instance creation
  const [showCreateTest, setShowCreateTest] = useState(false)
  const [testInstanceName, setTestInstanceName] = useState('')
  const [testAssignUserId, setTestAssignUserId] = useState<string>('')
  const [creating, setCreating] = useState(false)

  // Edit token state
  const [editTokenInstance, setEditTokenInstance] = useState<WhatsAppInstance | null>(null)
  const [newToken, setNewToken] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/sync-instances', {
        method: 'POST',
      })

      if (response.ok) {
        // Recarregar a página para mostrar as novas instâncias
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao sincronizar')
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      alert('Erro ao sincronizar instâncias')
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
    } catch (error) {
      console.error('Error deleting instance:', error)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
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

      // Atualizar estado local com o novo usuário
      const newUser = users.find(u => u.id === selectedUserId)
      setInstances(prev =>
        prev.map(i =>
          i.id === assignInstance.id
            ? { ...i, user_id: selectedUserId, user: newUser as Profile }
            : i
        )
      )

      setAssignInstance(null)
      setSelectedUserId('')
    } catch (error) {
      console.error('Error assigning instance:', error)
      alert('Erro ao atribuir instância')
    } finally {
      setAssigning(false)
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

      // Adicionar à lista local
      const assignedUser = testAssignUserId ? users.find(u => u.id === testAssignUserId) : undefined
      setInstances(prev => [{
        ...instance,
        user: assignedUser as Profile,
      }, ...prev])

      setShowCreateTest(false)
      setTestInstanceName('')
      setTestAssignUserId('')
    } catch (error) {
      console.error('Error creating test instance:', error)
      alert(error instanceof Error ? error.message : 'Erro ao criar instância de teste')
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

      // Atualizar estado local
      setInstances(prev =>
        prev.map(i =>
          i.id === editTokenInstance.id
            ? { ...i, token: newToken.trim() }
            : i
        )
      )

      setEditTokenInstance(null)
      setNewToken('')
      alert('Token atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating token:', error)
      alert('Erro ao atualizar token')
    } finally {
      setSavingToken(false)
    }
  }

  const filteredInstances = instances.filter(instance =>
    instance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.instance_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instance.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const connectedCount = instances.filter(i => i.status === 'connected').length

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
            <div className="text-2xl font-bold text-red-500">
              {instances.filter(i => i.status === 'disconnected').length}
            </div>
            <div className="text-sm text-muted-foreground">Desconectadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">
              {instances.filter(i => i.status === 'qr_code').length}
            </div>
            <div className="text-sm text-muted-foreground">Aguardando QR</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instâncias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowCreateTest(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Instância
        </Button>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sincronizar UAZAPI
        </Button>
      </div>

      {/* Instances Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">{instance.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {instance.user?.full_name || instance.user?.email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{instance.phone_number || 'N/A'}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {instance.instance_key.slice(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell>{formatDate(instance.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditTokenInstance(instance)
                          setNewToken(instance.token || '')
                        }}
                        title="Editar token"
                      >
                        <Key className="h-4 w-4 text-yellow-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setAssignInstance(instance)
                          setSelectedUserId(instance.user_id || '')
                        }}
                        title="Atribuir usuário"
                      >
                        <UserPlus className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(instance)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Assign User Dialog */}
      <Dialog open={!!assignInstance} onOpenChange={() => {
        setAssignInstance(null)
        setSelectedUserId('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Usuário</DialogTitle>
            <DialogDescription>
              Selecione o usuário que terá acesso à instância "{assignInstance?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
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
            <Button
              variant="outline"
              onClick={() => {
                setAssignInstance(null)
                setSelectedUserId('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assigning}
            >
              {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Test Instance Dialog */}
      <Dialog open={showCreateTest} onOpenChange={() => {
        setShowCreateTest(false)
        setTestInstanceName('')
        setTestAssignUserId('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Nova Instância
            </DialogTitle>
            <DialogDescription>
              Crie uma nova instância WhatsApp e atribua a um usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Instância *</Label>
              <Input
                placeholder="Ex: teste-cliente-joao"
                value={testInstanceName}
                onChange={(e) => setTestInstanceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Atribuir a Usuário (opcional)</Label>
              <Select value={testAssignUserId || "none"} onValueChange={(v) => setTestAssignUserId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
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
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateTest(false)
                setTestInstanceName('')
                setTestAssignUserId('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTestInstance}
              disabled={!testInstanceName.trim() || creating}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Token Dialog */}
      <Dialog open={!!editTokenInstance} onOpenChange={() => {
        setEditTokenInstance(null)
        setNewToken('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Editar Token
            </DialogTitle>
            <DialogDescription>
              Atualize o token da instância "{editTokenInstance?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Token da Instância *</Label>
              <Input
                placeholder="Ex: 6aa45dbd-5b4a-4e47-8cae-c3a9ca997489"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Este token é usado para autenticar chamadas à API do UAZAPI para esta instância específica.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTokenInstance(null)
                setNewToken('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveToken}
              disabled={!newToken.trim() || savingToken}
            >
              {savingToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
