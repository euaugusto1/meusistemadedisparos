'use client'

import React, { useState } from 'react'
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
  X,
  Video,
  Music,
  File,
  MessageSquare,
  MousePointerClick,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { MessageTemplate, MediaFile, ButtonType, ButtonConfig } from '@/types'

interface TemplatesListProps {
  templates: (MessageTemplate & { media?: MediaFile | null })[]
  media: MediaFile[]
  isAdmin?: boolean
}

// Componente de Preview de Mídia
interface MediaPreviewProps {
  media: MediaFile | undefined
  onRemove: () => void
  size?: 'sm' | 'md' | 'lg'
}

function MediaPreview({ media, onRemove, size = 'md' }: MediaPreviewProps) {
  if (!media) {
    return null
  }

  const sizeClasses = {
    sm: 'h-24 w-24',
    md: 'h-40 w-40',
    lg: 'h-48 w-48',
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return Image
      case 'video':
        return Video
      case 'audio':
        return Music
      default:
        return File
    }
  }

  const Icon = getMediaIcon(media.type)
  const [imageError, setImageError] = React.useState(false)

  return (
    <div className="relative w-full mt-3">
      <div className="relative bg-card border-2 border-primary/30 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {media.original_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {media.type.toUpperCase()} • {(media.size_bytes / 1024).toFixed(0)}KB
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-destructive/20 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault()
              onRemove()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className={`${sizeClasses[size]} mx-auto rounded-lg overflow-hidden bg-muted border-2 flex items-center justify-center`}>
          {media.type === 'image' && !imageError ? (
            <img
              src={media.public_url}
              alt={media.original_name}
              className="w-full h-full object-cover"
              onError={() => {
                console.error('Image load error:', media.public_url)
                setImageError(true)
              }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4">
              <Icon className="h-12 w-12 text-primary" />
              <span className="text-xs font-medium text-center">{media.type}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TemplatesList({ templates: initialTemplates, media, isAdmin = false }: TemplatesListProps) {
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
          .select(`
            *,
            media:media_files(id, public_url, original_name, type)
          `)
          .single()

        if (error) {
          console.error('Update error:', error)
          toast.error('Erro ao atualizar template', {
            description: error.message
          })
          throw error
        }
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t))

        // Fechar modal e mostrar sucesso
        setIsDialogOpen(false)
        resetForm()

        toast.success('Template atualizado!', {
          description: `"${data.name}" foi salvo com sucesso.`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />
        })
      } else {
        const { data, error } = await supabase
          .from('message_templates')
          .insert(templateData)
          .select(`
            *,
            media:media_files(id, public_url, original_name, type)
          `)
          .single()

        if (error) {
          console.error('Insert error:', error)
          toast.error('Erro ao criar template', {
            description: error.message
          })
          throw error
        }

        // Adicionar à lista
        setTemplates(prev => [data, ...prev])

        // Fechar modal e mostrar sucesso
        setIsDialogOpen(false)
        resetForm()

        toast.success('Template criado!', {
          description: `"${data.name}" está pronto para uso nas suas campanhas.`,
          icon: <CheckCircle className="h-5 w-5 text-green-500" />
        })
      }
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

      toast.success('Template excluído', {
        description: `"${template.name}" foi removido.`
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Erro ao excluir template')
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

      toast.success(template.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Erro ao favoritar template')
    }
  }

  const handleDuplicate = async (template: MessageTemplate) => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Você precisa estar logado para duplicar templates')
        setLoading(false)
        return
      }

      const duplicateData = {
        name: `${template.name} (Cópia)`,
        message: template.message,
        media_id: template.media_id || null,
        link_url: template.link_url || null,
        button_type: template.button_type || null,
        buttons: template.buttons || [],
        user_id: user.id,
        is_favorite: false,
      }

      const { data, error } = await supabase
        .from('message_templates')
        .insert(duplicateData)
        .select(`
          *,
          media:media_files(id, public_url, original_name, type)
        `)
        .single()

      if (error) throw error

      // Adicionar à lista
      setTemplates(prev => [data, ...prev])

      toast.success('Template duplicado com sucesso!', {
        description: `"${data.name}" foi criado.`
      })
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error('Erro ao duplicar template')
    } finally {
      setLoading(false)
    }
  }

  const handleButtonChange = (index: number, field: 'name' | 'url' | 'text' | 'media_id', value: string) => {
    const newButtons = [...buttons]
    newButtons[index] = { ...newButtons[index], [field]: value }
    setButtons(newButtons)
  }

  return (
    <div className="space-y-4">
      {/* Action Button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => openDialog()}
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] backdrop-blur-sm bg-background/95 border-2 shadow-2xl overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto pr-2 scrollbar-hide [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
              <DialogDescription>
                Crie um template reutilizável para suas campanhas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Nome do Template *
                </Label>
                <Input
                  placeholder="Ex: Promoção Semanal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-primary" />
                  Tipo de Template
                </Label>
                {isAdmin ? (
                  <Select value={buttonType || 'none'} onValueChange={(v) => setButtonType(v === 'none' ? '' : v as ButtonType)}>
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Mensagem Simples" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Mensagem Simples</SelectItem>
                      <SelectItem value="button">Botões (Carousel)</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                      <SelectItem value="poll">Enquete</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Mensagem Simples</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Disponível
                    </Badge>
                  </div>
                )}
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Outros tipos de template (Botões, Lista, Enquete) estarão disponíveis em breve.
                  </p>
                )}
              </div>

              {/* Mensagem - sempre visível */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Mensagem *
                  <span className="ml-auto text-xs text-muted-foreground">
                    {message.length} caracteres
                  </span>
                </Label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Imagem - sempre visível */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  {buttonType === 'button' ? 'Imagem do Carousel' : 'Mídia'} (opcional)
                </Label>
                <Select value={mediaId || 'none'} onValueChange={(v) => setMediaId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
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

                {/* Preview da Mídia Selecionada */}
                {mediaId && (
                  <MediaPreview
                    media={media.find(m => m.id === mediaId)}
                    onRemove={() => setMediaId('')}
                    size="md"
                  />
                )}
              </div>

              {/* Link - apenas para mensagem simples */}
              {buttonType !== 'button' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Link (opcional)
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://exemplo.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
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
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Mensagem do Cartão
                        </Label>
                        <Input
                          placeholder="Ex: Confira nossa oferta especial"
                          value={btn.text || ''}
                          onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* Imagem do cartão */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          Imagem do Cartão
                        </Label>
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

                        {/* Preview da Mídia do Botão */}
                        {btn.media_id && (
                          <MediaPreview
                            media={media.find(m => m.id === btn.media_id)}
                            onRemove={() => handleButtonChange(index, 'media_id', '')}
                            size="sm"
                          />
                        )}
                      </div>

                      {/* Nome do botão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" />
                          Nome do Botão *
                        </Label>
                        <Input
                          placeholder="Ex: Comprar Agora"
                          value={btn.name}
                          onChange={(e) => handleButtonChange(index, 'name', e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* URL do botão */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          URL do Botão *
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://exemplo.com/produto"
                          value={btn.url || ''}
                          onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={
                  loading ||
                  !name.trim() ||
                  !message.trim() ||
                  (buttonType === 'button' && !buttons.some(b => b.name && b.url))
                }
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
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
        <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background via-muted/5 to-background">
          <CardContent className="py-16 text-center space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-primary/10 to-blue-600/10 p-6 rounded-full">
                <FileText className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Crie seu primeiro template
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-base">
                Templates reutilizáveis economizam tempo e padronizam suas mensagens
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={() => openDialog()}
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/50">
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
                      onClick={() => handleDuplicate(template)}
                      title="Duplicar template"
                      disabled={loading}
                    >
                      <Copy className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDialog(template)}
                      title="Editar template"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(template)}
                      title="Excluir template"
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
                {/* Preview with decorative border */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 mb-3">
                  <div className="bg-background p-3 rounded-xl">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.message}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {template.media_id && (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      <Image className="h-3 w-3 mr-1" />
                      Mídia
                    </Badge>
                  )}
                  {template.link_url && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Link
                    </Badge>
                  )}
                  {template.button_type && (
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
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
