'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Edit,
  Shield,
  User,
  Loader2,
  Crown,
  Calendar,
} from 'lucide-react'
import { formatDate, formatNumber, getPlanColor } from '@/lib/utils'
import type { Profile, UserRole, PlanTier } from '@/types'

interface UsersManagerProps {
  users: Profile[]
}

export function UsersManager({ users: initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  // Edit form state
  const [role, setRole] = useState<UserRole>('user')
  const [planTier, setPlanTier] = useState<PlanTier>('free')
  const [credits, setCredits] = useState(0)
  const [planDays, setPlanDays] = useState(30)

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

    // Calculate new expiration date
    const newExpiration = new Date()
    newExpiration.setDate(newExpiration.getDate() + planDays)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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
            ? {
                ...u,
                role,
                plan_tier: planTier,
                credits,
                plan_expires_at: newExpiration.toISOString(),
              }
            : u
        )
      )

      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredUsers.length} usuário(s)
        </Badge>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
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
                  <TableCell>
                    {user.plan_expires_at
                      ? formatDate(user.plan_expires_at)
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planTier} onValueChange={(v) => setPlanTier(v as PlanTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Grátis</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Prata</SelectItem>
                  <SelectItem value="gold">Ouro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Créditos</Label>
              <Input
                type="number"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Dias de Validade</Label>
              <Input
                type="number"
                value={planDays}
                onChange={(e) => setPlanDays(parseInt(e.target.value) || 30)}
              />
              <p className="text-xs text-muted-foreground">
                A partir de hoje
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
