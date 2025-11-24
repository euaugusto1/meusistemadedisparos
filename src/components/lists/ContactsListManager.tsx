'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Upload,
  FileText,
  Loader2,
  Download,
  RefreshCw,
  UsersRound,
  Search,
  Star,
  Lock,
  CheckCircle2,
  Sparkles,
  Smartphone,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { formatDate, formatNumber, parseRecipients } from '@/lib/utils'
import type { ContactsList, WhatsAppInstance, Contact } from '@/types'
import { UpgradeModal } from '@/components/agents/UpgradeModal'

interface WhatsAppGroup {
  id: string
  name: string
  subject?: string
  participants?: Array<{ id: string; admin?: boolean }>
}

interface ContactsListManagerProps {
  lists: ContactsList[]
  instances: WhatsAppInstance[]
}

export function ContactsListManager({ lists: initialLists, instances }: ContactsListManagerProps) {
  const [lists, setLists] = useState(initialLists)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingList, setEditingList] = useState<ContactsList | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<ContactsList | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contactsText, setContactsText] = useState('')

  // Groups import state
  const [showGroupsDialog, setShowGroupsDialog] = useState(false)
  const [showImportTypeDialog, setShowImportTypeDialog] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<string>('')
  const [groups, setGroups] = useState<WhatsAppGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [savingGroups, setSavingGroups] = useState(false)
  const [groupSearchTerm, setGroupSearchTerm] = useState('')

  // Plan access state
  const [hasGoldPlan, setHasGoldPlan] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState({ title: '', description: '' })

  const connectedInstances = instances.filter(i => i.status === 'connected')

  // Check user plan on mount
  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier, role')
          .eq('id', user.id)
          .single()

        const hasAccess = profile?.role === 'admin' || profile?.plan_tier === 'gold'
        setHasGoldPlan(hasAccess)
      } catch (err) {
        console.error('Error checking user plan:', err)
      }
    }

    checkUserPlan()
  }, [])

  // Buscar grupos da instância
  const fetchGroups = async (instanceId: string) => {
    if (!instanceId) return

    setLoadingGroups(true)
    setGroups([])
    setSelectedGroups([])
    setGroupSearchTerm('')

    try {
      const response = await fetch(`/api/instances/${instanceId}/groups?noparticipants=false`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao buscar grupos')
      }

      const data = await response.json()
      setGroups(data.groups || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
      alert(error instanceof Error ? error.message : 'Erro ao buscar grupos')
    } finally {
      setLoadingGroups(false)
    }
  }

  // Abrir diálogo de escolha de tipo de importação
  const openImportTypeDialog = () => {
    if (selectedGroups.length === 0) {
      alert('Selecione pelo menos um grupo')
      return
    }
    setShowImportTypeDialog(true)
  }

  // Importar participantes dos grupos
  const importParticipants = async () => {
    // Check if user has Gold plan
    if (!hasGoldPlan) {
      setShowImportTypeDialog(false)
      setShowUpgradeModal(true)
      return
    }

    setShowImportTypeDialog(false)
    setSavingGroups(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para criar listas')
      setSavingGroups(false)
      return
    }

    try {
      const savedLists: ContactsList[] = []

      for (const groupId of selectedGroups) {
        const group = groups.find(g => g.id === groupId)
        if (!group) continue

        // Extrair números dos participantes
        const contacts: Contact[] = (group.participants || []).map(p => ({
          number: p.id.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '')
        }))

        const listData = {
          name: group.name || `Grupo ${groupId}`,
          description: `Participantes do grupo WhatsApp (${contacts.length} participantes)`,
          contacts,
          user_id: user.id,
          group_jid: group.id, // Salvar JID do grupo
        }

        const { data, error } = await supabase
          .from('contacts_lists')
          .insert(listData)
          .select()
          .single()

        if (error) {
          console.error('Error saving group:', error)
          alert(`Erro ao salvar grupo "${group.name}": ${error.message}`)
        } else if (data) {
          savedLists.push(data)
        }
      }

      if (savedLists.length > 0) {
        setLists(prev => [...savedLists, ...prev])
        setSuccessMessage({
          title: 'Importação concluída com sucesso!',
          description: `${savedLists.length} lista(s) de participantes criada(s) com todos os números dos participantes.`
        })
        setShowSuccessModal(true)
        setShowGroupsDialog(false)
        setSelectedGroups([])
        setGroups([])
        setSelectedInstance('')
      }
    } catch (error) {
      console.error('Error saving groups:', error)
      alert('Erro ao salvar grupos')
    } finally {
      setSavingGroups(false)
    }
  }

  // Importar JIDs dos grupos
  const importGroupJIDs = async () => {
    setShowImportTypeDialog(false)
    setSavingGroups(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para criar listas')
      setSavingGroups(false)
      return
    }

    try {
      // Criar uma única lista com os JIDs dos grupos
      const contacts: Contact[] = selectedGroups.map(groupId => {
        return {
          number: groupId // Usar o JID do grupo como "número"
        }
      })

      const groupNames = selectedGroups
        .map(groupId => groups.find(g => g.id === groupId)?.name)
        .filter(Boolean)
        .join(', ')

      const listData = {
        name: `IDs de Grupos WhatsApp (${selectedGroups.length})`,
        description: `Grupos selecionados: ${groupNames.substring(0, 150)}${groupNames.length > 150 ? '...' : ''}`,
        contacts,
        user_id: user.id,
      }

      const { data, error } = await supabase
        .from('contacts_lists')
        .insert(listData)
        .select()
        .single()

      if (error) {
        console.error('Error saving group IDs:', error)
        alert(`Erro ao salvar IDs dos grupos: ${error.message}`)
      } else if (data) {
        setLists(prev => [data, ...prev])
        setSuccessMessage({
          title: 'Importação concluída com sucesso!',
          description: `Lista criada com ${selectedGroups.length} identificador(es) de grupos.`
        })
        setShowSuccessModal(true)
        setShowGroupsDialog(false)
        setSelectedGroups([])
        setGroups([])
        setSelectedInstance('')
      }
    } catch (error) {
      console.error('Error saving group IDs:', error)
      alert('Erro ao salvar IDs dos grupos')
    } finally {
      setSavingGroups(false)
    }
  }

  // Toggle seleção de grupo
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // Selecionar/deselecionar todos
  const toggleAllGroups = () => {
    if (selectedGroups.length === groups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(groups.map(g => g.id))
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setContactsText('')
    setEditingList(null)
  }

  const openDialog = (list?: ContactsList) => {
    if (list) {
      setEditingList(list)
      setName(list.name)
      setDescription(list.description || '')
      setContactsText(list.contacts.map(c => c.number).join('\n'))
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  // CSV Drop Handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const text = await file.text()
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    // Se já tem contatos, adiciona
    const existingContacts = contactsText.trim()
    const newText = existingContacts
      ? `${existingContacts}\n${lines.join('\n')}`
      : lines.join('\n')

    setContactsText(newText)
  }, [contactsText])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  })

  const handleSave = async () => {
    if (!name.trim()) return

    setLoading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para criar listas')
      setLoading(false)
      return
    }

    const numbers = parseRecipients(contactsText)
    const contacts: Contact[] = numbers.map(number => ({ number }))

    const listData = {
      name: name.trim(),
      description: description.trim() || null,
      contacts,
      user_id: user.id, // Add user_id for RLS
    }

    try {
      if (editingList) {
        // Don't update user_id on edit
        const { user_id, ...updateData } = listData
        const { data, error } = await supabase
          .from('contacts_lists')
          .update(updateData)
          .eq('id', editingList.id)
          .select()
          .single()

        if (error) {
          console.error('Update error:', error)
          alert(`Erro ao atualizar: ${error.message}`)
          throw error
        }
        setLists(prev => prev.map(l => l.id === editingList.id ? data : l))
      } else {
        const { data, error } = await supabase
          .from('contacts_lists')
          .insert(listData)
          .select()
          .single()

        if (error) {
          console.error('Insert error:', error)
          alert(`Erro ao criar: ${error.message}`)
          throw error
        }
        setLists(prev => [data, ...prev])
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving list:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (list: ContactsList) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('contacts_lists')
        .delete()
        .eq('id', list.id)

      if (error) throw error
      setLists(prev => prev.filter(l => l.id !== list.id))
    } catch (error) {
      console.error('Error deleting list:', error)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const handleToggleFavorite = async (list: ContactsList) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('contacts_lists')
        .update({ is_favorite: !list.is_favorite })
        .eq('id', list.id)

      if (error) throw error

      // Atualizar estado local
      setLists(prev =>
        prev.map(l => l.id === list.id ? { ...l, is_favorite: !l.is_favorite } : l)
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Erro ao favoritar lista')
    }
  }

  const handleExport = (list: ContactsList) => {
    const content = list.contacts.map(c => c.number).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${list.name.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const contactCount = parseRecipients(contactsText).length

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {/* Import Groups Button */}
        {connectedInstances.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowGroupsDialog(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-300 hover:scale-105 border-none"
          >
            <UsersRound className="mr-2 h-4 w-4" />
            Importar Grupos
          </Button>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => openDialog()}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl backdrop-blur-sm bg-background/95 border-2 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
                {editingList ? 'Editar Lista' : 'Nova Lista de Contatos'}
              </DialogTitle>
              <DialogDescription>
                Crie uma lista de contatos para usar nas suas campanhas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Lista *</Label>
                <Input
                  placeholder="Ex: Clientes VIP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Ex: Lista de clientes premium"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* CSV Upload */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  {isDragActive
                    ? 'Solte o arquivo aqui'
                    : 'Arraste um CSV/TXT ou clique para importar'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Contatos</Label>
                  <span className="text-sm text-muted-foreground">
                    {contactCount} contato(s)
                  </span>
                </div>
                <Textarea
                  placeholder="Cole um número por linha. Ex:&#10;5511999999999&#10;5521888888888"
                  value={contactsText}
                  onChange={(e) => setContactsText(e.target.value)}
                  rows={8}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="transition-all duration-300 hover:scale-105"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !name.trim()}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingList ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
          <CardContent className="py-16 text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary/10 to-blue-600/10 p-6 rounded-full">
                <Users className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Crie sua primeira lista
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-base">
                Organize seus contatos em listas para facilitar o envio de campanhas
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => openDialog()}
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeira Lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <Card key={list.id} className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleFavorite(list)}
                      title={list.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <Star className={`h-4 w-4 ${list.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleExport(list)}
                      title="Exportar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDialog(list)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(list)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {list.description || 'Sem descrição'}
                </CardDescription>
                {list.group_jid && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono truncate" title={list.group_jid}>
                    JID: {list.group_jid}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary border-primary/20 shadow-sm">
                    <Users className="h-3 w-3 mr-1" />
                    {formatNumber(list.contact_count)} contatos
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(list.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Groups Dialog */}
      <Dialog open={showGroupsDialog} onOpenChange={setShowGroupsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Importar Grupos do WhatsApp</DialogTitle>
                <DialogDescription className="text-sm">
                  Selecione uma instância e escolha os grupos para criar listas de contatos
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Instance Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Instância WhatsApp
              </Label>
              <div className="flex gap-2">
                <Select
                  value={selectedInstance}
                  onValueChange={(value) => {
                    setSelectedInstance(value)
                    fetchGroups(value)
                  }}
                >
                  <SelectTrigger className="flex-1 h-11">
                    <SelectValue placeholder="Selecione uma instância conectada" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedInstances.map(instance => (
                      <SelectItem key={instance.id} value={instance.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {instance.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInstance && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => fetchGroups(selectedInstance)}
                    disabled={loadingGroups}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingGroups ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>

            {/* Groups List */}
            {loadingGroups ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando grupos...</p>
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">
                      Grupos Disponíveis <span className="text-muted-foreground font-normal">({groups.length})</span>
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllGroups}
                    className="h-8 text-xs"
                  >
                    {selectedGroups.length === groups.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </div>

                {/* Search Groups */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar grupo..."
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                <div className="border rounded-lg flex-1 overflow-y-auto bg-muted/20">
                  {groups
                    .filter(group =>
                      group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
                    )
                    .map(group => {
                      const isSelected = selectedGroups.includes(group.id)
                      return (
                        <div
                          key={group.id}
                          className={`flex items-center gap-3 p-4 border-b last:border-b-0 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleGroup(group.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm mb-1.5 truncate ${
                              isSelected ? 'text-foreground' : 'text-foreground'
                            }`} title={group.name}>
                              {group.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-normal">
                                <Users className="h-3 w-3 mr-1" />
                                {group.participants?.length || 0} participantes
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {groups.filter(group =>
                    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
                  ).length === 0 && groupSearchTerm && (
                    <div className="p-12 text-center text-muted-foreground">
                      <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-medium">Nenhum grupo encontrado</p>
                      <p className="text-xs mt-1">Tente outro termo de busca</p>
                    </div>
                  )}
                </div>
                {selectedGroups.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-primary">
                        {selectedGroups.length} grupo(s) selecionado(s)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedInstance ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <UsersRound className="h-10 w-10 opacity-50" />
                </div>
                <p className="font-semibold text-base">Nenhum grupo encontrado</p>
                <p className="text-sm mt-2 max-w-xs">
                  Esta instância não possui grupos ou você não é participante de nenhum grupo
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setShowGroupsDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={openImportTypeDialog}
              disabled={savingGroups || selectedGroups.length === 0}
              className="min-w-32"
            >
              {savingGroups && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingGroups ? 'Importando...' : `Importar ${selectedGroups.length > 0 ? `(${selectedGroups.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Type Dialog */}
      <AlertDialog open={showImportTypeDialog} onOpenChange={setShowImportTypeDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Escolha o tipo de importação</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Você selecionou <span className="font-semibold text-foreground">{selectedGroups.length}</span> grupo(s). Como deseja importar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-6">
            {/* Participantes dos Grupos - Gold Exclusive */}
            <div
              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                !hasGoldPlan
                  ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-yellow-500/5'
                  : 'border-border hover:border-primary/50 cursor-pointer'
              }`}
              onClick={!savingGroups ? importParticipants : undefined}
            >
              {!hasGoldPlan && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold shadow-lg">
                    <Lock className="h-3 w-3 mr-1" />
                    Gold
                  </Badge>
                </div>
              )}
              <button
                type="button"
                onClick={importParticipants}
                disabled={savingGroups}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    !hasGoldPlan
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20'
                      : 'bg-primary/10'
                  }`}>
                    <UsersRound className={`h-6 w-6 ${
                      !hasGoldPlan ? 'text-yellow-500' : 'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">Participantes dos Grupos</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Criar uma lista separada para cada grupo selecionado contendo todos os números de telefone dos participantes. Ideal para campanhas segmentadas por grupo.
                    </p>
                    {!hasGoldPlan && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium mt-3">
                        🔒 Recurso exclusivo do plano Gold. Faça upgrade para desbloquear!
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Grupos Selecionados (IDs) */}
            <div
              className="relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-all cursor-pointer"
              onClick={!savingGroups ? importGroupJIDs : undefined}
            >
              <button
                type="button"
                onClick={importGroupJIDs}
                disabled={savingGroups}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">IDs dos Grupos Selecionados</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Criar uma única lista contendo os identificadores (JIDs) dos grupos selecionados. Use para enviar mensagens diretamente para os grupos.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        Disponível em todos os planos
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingGroups}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{deleteConfirm?.name}" com {deleteConfirm?.contact_count} contatos?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">{successMessage.title}</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {successMessage.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Suas listas estão prontas para uso!
              </span>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  )
}
