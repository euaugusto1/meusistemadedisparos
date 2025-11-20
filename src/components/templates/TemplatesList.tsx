'use client'

import { useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  Edit,
  Trash2,
  FileText,
  Image,
  Link as LinkIcon,
  Loader2,
  Minus,
  Star,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { MessageTemplate, MediaFile, ButtonType, ButtonConfig } from '@/types'

interface TemplatesListProps {
  templates: (MessageTemplate & { media?: MediaFile | null })[]
  media: MediaFile[]
}

export function TemplatesList({ templates: initialTemplates, media }: TemplatesListProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MessageTemplate | null>(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [mediaId, setMediaId] = useState<string>('')
  const [linkUrl, setLinkUrl] = useState('')
  const [buttonType, setButtonType] = useState<ButtonType | ''>('')
  const [buttons, setButtons] = useState<ButtonConfig[]>([
    { name: '', url: '', text: '', media_id: '' },
  ])

  const defaultButton = { name: '', url: '', text: '', media_id: '' }

  const addButton = () => {
    if (buttons.length < 10) {
      setButtons([...buttons, { ...defaultButton }])
    }
  }

  const removeButton = (index: number) => {
    if (buttons.length > 1) {
      setButtons(buttons.filter((_, i) => i !== index))
    }
  }

  const resetForm = () => {
    setName('')
    setMessage('')
    setMediaId('')
    setLinkUrl('')
    setButtonType('')
    setButtons([
      { name: '', url: '', text: '', media_id: '' },
    ])
    setEditingTemplate(null)
  }

  const openDialog = (template?: MessageTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setName(template.name)
      setMessage(template.message)
      setMediaId(template.media_id || '')
      setLinkUrl(template.link_url || '')
      setButtonType(template.button_type || '')
      setButtons(template.buttons.length > 0
        ? template.buttons.map(b => ({
            name: b.name,
            url: b.url || '',
            text: b.text || '',
            media_id: b.media_id || ''
          }))
        : [{ name: '', url: '', text: '', media_id: '' }]
      )
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    // Validações
    if (!name.trim()) return
    if (!message.trim()) return
    // Para botões, precisa de pelo menos 1 botão configurado
    if (buttonType === 'button') {
      const hasValidButton = buttons.some(b => b.name && b.url)
      if (!hasValidButton) return
    }

    setLoading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para criar templates')
      setLoading(false)
      return
    }

    const validButtons = buttonType === 'button'
      ? buttons
          .filter(b => b.name && b.url)
          .map(b => ({
            name: b.name,
            url: b.url,
            text: b.text || undefined,
            media_id: b.media_id || undefined,
          }))
      : []

    const templateData = {
      name: name.trim(),
      message: message.trim(),
      media_id: mediaId || null,
      link_url: buttonType === 'button' ? null : (linkUrl || null),
      button_type: buttonType || null,
      buttons: validButtons,
      user_id: user.id, // Add user_id for RLS
    }

    console.log('Saving template:', templateData)

    try {
      if (editingTemplate) {
        // Don't update user_id on edit
        const { user_id, ...updateData } = templateData
        const { data, error } = await supabase
          .from('message_templates')
          .update(updateData)
          .eq('id', editingTemplate.id)
          .select()
          .single()

        if (error) {
          console.error('Update error:', error)
          alert(`Erro ao atualizar: ${error.message}`)
          throw error
        }
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t))
      } else {
        const { data, error } = await supabase
          .from('message_templates')
          .insert(templateData)
          .select()
          .single()

        if (error) {
          console.error('Insert error:', error)
          alert(`Erro ao criar: ${error.message}`)
          throw error
        }
        console.log('Template created:', data)
        setTemplates(prev => [data, ...prev])
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (template: MessageTemplate) => {
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== template.id))
    } catch (error) {
      console.error('Error deleting template:', error)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const handleToggleFavorite = async (template: MessageTemplate) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ is_favorite: !template.is_favorite })
        .eq('id', template.id)

      if (error) throw error

      // Atualizar estado local
      setTemplates(prev =>
        prev.map(t => t.id === template.id ? { ...t, is_favorite: !t.is_favorite } : t)
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Erro ao favoritar template')
    }
  }

  const handleButtonChange = (index: number, field: 'name' | 'url' | 'text' | 'media_id', value: string) => {
    const newButtons = [...buttons]
    newButtons[index] = { ...newButtons[index], [field]: value }
    setButtons(newButtons)
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Crie um template reutilizável para suas campanhas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  placeholder="Ex: Promoção Semanal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Template</Label>
                <Select value={buttonType || 'none'} onValueChange={(v) => setButtonType(v === 'none' ? '' : v as ButtonType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mensagem Simples" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Mensagem Simples</SelectItem>
                    <SelectItem value="button">Botões (Carousel)</SelectItem>
                    <SelectItem value="list">Lista</SelectItem>
                    <SelectItem value="poll">Enquete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mensagem - sempre visível */}
              <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
              </div>

              {/* Imagem - sempre visível */}
              <div className="space-y-2">
                <Label>{buttonType === 'button' ? 'Imagem do Carousel' : 'Mídia'} (opcional)</Label>
                <Select value={mediaId || 'none'} onValueChange={(v) => setMediaId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={buttonType === 'button' ? 'Selecione uma imagem' : 'Selecione uma mídia'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {buttonType === 'button'
                      ? media.filter(m => m.type === 'image').map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.original_name}
                          </SelectItem>
                        ))
                      : media.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            [{m.type}] {m.original_name}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                {media.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma mídia disponível. Faça upload na Biblioteca de Mídia.
                  </p>
                )}
              </div>

              {/* Link - apenas para mensagem simples */}
              {buttonType !== 'button' && (
                <div className="space-y-2">
                  <Label>Link (opcional)</Label>
                  <Input
                    type="url"
                    placeholder="https://exemplo.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
              )}

              {buttonType === 'button' && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label>Configuração dos Botões ({buttons.length}/10)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addButton}
                      disabled={buttons.length >= 10}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {buttons.map((btn, index) => (
                    <div key={index} className="space-y-3 p-3 bg-background rounded-lg border">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Botão {index + 1}</Label>
                        <div className="flex items-center gap-2">
                          {(btn.name && btn.url) && (
                            <Badge variant="outline" className="text-xs">Configurado</Badge>
                          )}
                          {buttons.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeButton(index)}
                            >
                              <Minus className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Texto/Mensagem do cartão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mensagem do Cartão</Label>
                        <Input
                          placeholder="Ex: Confira nossa oferta especial"
                          value={btn.text || ''}
                          onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                        />
                      </div>

                      {/* Imagem do cartão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Imagem do Cartão</Label>
                        <Select
                          value={btn.media_id || 'none'}
                          onValueChange={(v) => handleButtonChange(index, 'media_id', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma imagem" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {media.filter(m => m.type === 'image').map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.original_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Nome do botão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome do Botão *</Label>
                        <Input
                          placeholder="Ex: Comprar Agora"
                          value={btn.name}
                          onChange={(e) => handleButtonChange(index, 'name', e.target.value)}
                        />
                      </div>

                      {/* URL do botão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">URL do Botão *</Label>
                        <Input
                          type="url"
                          placeholder="https://exemplo.com/produto"
                          value={btn.url || ''}
                          onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  loading ||
                  !name.trim() ||
                  !message.trim() ||
                  (buttonType === 'button' && !buttons.some(b => b.name && b.url))
                }
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTemplate ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum template criado</p>
            <Button className="mt-4" onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleFavorite(template)}
                      title={template.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <Star className={`h-4 w-4 ${template.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDialog(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Criado em {formatDate(template.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.message}
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.media_id && (
                    <Badge variant="outline">
                      <Image className="h-3 w-3 mr-1" />
                      Mídia
                    </Badge>
                  )}
                  {template.link_url && (
                    <Badge variant="outline">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Link
                    </Badge>
                  )}
                  {template.button_type && (
                    <Badge variant="outline">
                      {template.button_type}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{deleteConfirm?.name}"?
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
    </div>
  )
}
