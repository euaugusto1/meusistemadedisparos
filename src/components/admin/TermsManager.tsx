'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { FileText, Plus, CheckCircle2, Users, Calendar, AlertCircle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { TermsVersion } from '@/types'

interface TermsManagerProps {
  versions: TermsVersion[]
  acceptanceStats: Array<{ terms_version_id: string; count: number }>
}

export function TermsManager({ versions: initialVersions, acceptanceStats }: TermsManagerProps) {
  const [versions, setVersions] = useState(initialVersions)
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<TermsVersion | null>(null)

  // New version form
  const [newVersion, setNewVersion] = useState('')
  const [newContent, setNewContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreateVersion = async () => {
    if (!newVersion.trim() || !newContent.trim()) {
      setError('Versão e conteúdo são obrigatórios')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/terms/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion.trim(),
          content: newContent.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar versão')
      }

      setSuccess('Versão criada com sucesso!')
      setVersions([data.data, ...versions])
      setNewVersion('')
      setNewContent('')
      setShowNewVersionDialog(false)

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateVersion = async (versionId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/terms/versions/${versionId}/activate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao ativar versão')
      }

      setSuccess('Versão ativada com sucesso!')
      setShowActivateDialog(false)

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const getAcceptanceCount = (versionId: string) => {
    const stat = acceptanceStats.find(s => s.terms_version_id === versionId)
    return stat?.count || 0
  }

  const activeVersion = versions.find(v => v.is_active)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Versão Ativa</p>
                <p className="text-2xl font-bold">{activeVersion?.version || 'N/A'}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Versões</p>
                <p className="text-2xl font-bold">{versions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Aceites</p>
                <p className="text-2xl font-bold">
                  {formatNumber(acceptanceStats.reduce((acc, stat) => acc + stat.count, 0))}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-green-500">{success}</p>
          </CardContent>
        </Card>
      )}

      {/* Versions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Versões dos Termos de Uso</CardTitle>
              <CardDescription>
                Gerencie as diferentes versões dos termos de uso
              </CardDescription>
            </div>
            <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Versão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Nova Versão</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova versão dos Termos de Uso
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Versão *</Label>
                    <Input
                      placeholder="v1.0.0"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato recomendado: v1.0.0, v1.1.0, etc.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição da Versão *</Label>
                    <Textarea
                      placeholder="Breve descrição das mudanças nesta versão..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Descreva as principais mudanças desta versão
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewVersionDialog(false)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateVersion} disabled={loading}>
                      {loading ? 'Criando...' : 'Criar Versão'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aceites</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma versão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">{version.version}</TableCell>
                    <TableCell>
                      {version.is_active ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {formatNumber(getAcceptanceCount(version.id))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(version.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!version.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version)
                            setShowActivateDialog(true)
                          }}
                        >
                          Ativar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar Nova Versão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá desativar a versão atual ({activeVersion?.version}) e ativar a versão{' '}
              <strong>{selectedVersion?.version}</strong>. Todos os novos usuários deverão aceitar
              esta nova versão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedVersion && handleActivateVersion(selectedVersion.id)}
              disabled={loading}
            >
              {loading ? 'Ativando...' : 'Sim, Ativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
