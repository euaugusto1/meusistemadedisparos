'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ApiToken } from '@/types'

interface ApiTokensManagerProps {
  tokens: ApiToken[]
  adminEmail: string
}

export function ApiTokensManager({ tokens: initialTokens, adminEmail }: ApiTokensManagerProps) {
  const [tokens, setTokens] = useState<ApiToken[]>(initialTokens)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null)
  const [newTokenValue, setNewTokenValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number>(90)

  const handleCreateToken = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/tokens/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          expiresInDays: expiresInDays || undefined,
          scopes: []
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create token')
      }

      const data = await response.json()

      // Add new token to list (with sanitized token)
      setTokens([data.token, ...tokens])

      // Show the actual token value for copying
      setNewTokenValue(data.tokenString)
      setShowTokenDialog(true)

      // Reset form
      setName('')
      setDescription('')
      setExpiresInDays(90)
      setShowCreateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating token')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteToken = async () => {
    if (!selectedToken) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tokens/${selectedToken.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete token')
      }

      // Remove from list
      setTokens(tokens.filter(t => t.id !== selectedToken.id))
      setShowDeleteDialog(false)
      setSelectedToken(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting token')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const isTokenExpired = (token: ApiToken) => {
    if (!token.expires_at) return false
    return new Date(token.expires_at) < new Date()
  }

  const getTokenStatus = (token: ApiToken) => {
    if (!token.is_active) {
      return { label: 'Inativo', variant: 'secondary' as const, icon: XCircle }
    }
    if (isTokenExpired(token)) {
      return { label: 'Expirado', variant: 'destructive' as const, icon: Clock }
    }
    return { label: 'Ativo', variant: 'default' as const, icon: CheckCircle }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tokens.length}</div>
            <p className="text-xs text-muted-foreground">Todos os tokens criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Ativos</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tokens.filter(t => t.is_active && !isTokenExpired(t)).length}
            </div>
            <p className="text-xs text-muted-foreground">Funcionando normalmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Expirados</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {tokens.filter(t => isTokenExpired(t)).length}
            </div>
            <p className="text-xs text-muted-foreground">Precisam renovação</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Erro</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Main Card - Tokens List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Seus API Tokens</CardTitle>
              <CardDescription>
                Gere e gerencie tokens de API para integrações externas
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Token
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Key className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum token criado</h3>
                <p className="text-sm text-muted-foreground">
                  Crie seu primeiro token de API para começar
                </p>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Token
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => {
                  const status = getTokenStatus(token)
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{token.name}</div>
                          {token.description && (
                            <div className="text-xs text-muted-foreground">{token.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {token.token}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {token.last_used_at ? (
                          formatDistanceToNow(new Date(token.last_used_at), {
                            addSuffix: true,
                            locale: ptBR
                          })
                        ) : (
                          'Nunca usado'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {token.expires_at ? (
                          <span className={isTokenExpired(token) ? 'text-orange-600' : ''}>
                            {formatDistanceToNow(new Date(token.expires_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        ) : (
                          'Nunca'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedToken(token)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Token Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Criar Novo Token de API
            </DialogTitle>
            <DialogDescription>
              Gere um token de API para integrar com aplicações externas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Token *</Label>
              <Input
                id="name"
                placeholder="Minha Integração"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Um nome descritivo para identificar este token
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Token para integração com sistema XYZ"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expira em (dias)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="365"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para token sem expiração (não recomendado)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreateDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateToken}
              disabled={!name || isLoading}
            >
              {isLoading ? 'Gerando...' : 'Gerar Token'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show New Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Token Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              ⚠️ <strong>Copie este token agora!</strong> Você não poderá vê-lo novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seu Token de API</Label>
              <div className="flex gap-2">
                <Input
                  value={newTokenValue}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newTokenValue)}
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Card className="bg-orange-500/10 border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Importante
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>• Guarde este token em um local seguro</p>
                <p>• Não compartilhe este token publicamente</p>
                <p>• Use-o nos headers de suas requisições: <code>Authorization: Bearer {'{token}'}</code></p>
                <p>• Se perder, você precisará gerar um novo token</p>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => {
              setShowTokenDialog(false)
              setNewTokenValue('')
            }}
            className="w-full"
          >
            Entendi, Salvei o Token
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o token <strong>{selectedToken?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita. Todas as integrações usando este token pararão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteToken}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? 'Deletando...' : 'Deletar Token'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
