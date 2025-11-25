'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileAudio,
  FileText,
  Trash2,
  Copy,
  Check,
  Search,
  Grid,
  List,
  Loader2,
  Pencil,
  X,
  Save,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatBytes, formatDate } from '@/lib/utils'
import type { MediaFile, MediaType, Profile } from '@/types'

interface MediaGalleryProps {
  media: MediaFile[]
  profile: Profile | null
  onUploadComplete?: () => void
  onSelect?: (media: MediaFile) => void
  selectable?: boolean
}

const MEDIA_ICONS: Record<MediaType, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: FileAudio,
  document: FileText,
}

// Limite de tamanho de arquivo: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB em bytes
const MAX_FILE_SIZE_LABEL = '50MB'

export function MediaGallery({
  media: initialMedia,
  profile,
  onUploadComplete,
  onSelect,
  selectable = false,
}: MediaGalleryProps) {
  const [mediaList, setMediaList] = useState<MediaFile[]>(initialMedia)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<MediaFile | null>(null)
  const [deleteRequestConfirm, setDeleteRequestConfirm] = useState<MediaFile | null>(null)
  const [requestingDeletion, setRequestingDeletion] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null)

  // Estados para renomear
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [savingRename, setSavingRename] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const userId = profile?.id

  // Verifica se o usuário pode editar/renomear o arquivo (admin ou dono do arquivo)
  const canEditFile = (file: MediaFile) => isAdmin || file.user_id === userId

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout | null = null

    const channel = supabase
      .channel('media-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_files'
        },
        (payload) => {
          console.log('[Realtime] Media change:', payload.eventType)

          // Debounce para evitar re-renders excessivos
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          debounceTimer = setTimeout(() => {
            reloadMedia()
          }, 500)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      supabase.removeChannel(channel)
    }
  }, [])

  // Função para sincronizar arquivos do bucket com o banco
  const syncFromBucket = async () => {
    setUploading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para sincronizar arquivos')
      setUploading(false)
      return
    }

    try {
      // Listar arquivos no bucket
      const { data: files, error: listError } = await supabase.storage
        .from('media')
        .list('', { limit: 100 })

      if (listError) throw listError

      if (!files || files.length === 0) {
        alert('Nenhum arquivo encontrado no bucket')
        return
      }

      let synced = 0
      for (const file of files) {
        // Ignorar pastas
        if (!file.name || file.id === null) continue

        // Verificar se já existe no banco
        const { data: existing } = await supabase
          .from('media_files')
          .select('id')
          .eq('storage_path', file.name)
          .single()

        if (existing) continue

        // Determinar tipo
        let mediaType: MediaType = 'document'
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mediaType = 'image'
        else if (['mp4', 'webm', 'mov'].includes(ext)) mediaType = 'video'
        else if (['mp3', 'wav', 'ogg'].includes(ext)) mediaType = 'audio'

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(file.name)

        // Inserir no banco
        const { error: dbError } = await supabase.from('media_files').insert({
          user_id: user.id,
          file_name: file.name,
          original_name: file.name.replace(/^\d+_/, ''),
          public_url: urlData.publicUrl,
          storage_path: file.name,
          mime_type: file.metadata?.mimetype || `${mediaType}/*`,
          type: mediaType,
          size_bytes: file.metadata?.size || 0,
        })

        if (!dbError) synced++
      }

      alert(`${synced} arquivo(s) sincronizado(s)`)
      await reloadMedia()
    } catch (error) {
      console.error('Sync error:', error)
      alert('Erro ao sincronizar arquivos')
    } finally {
      setUploading(false)
    }
  }

  // Função para recarregar a lista de mídias
  const reloadMedia = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setMediaList(data)
    }
  }

  // Função para renomear arquivo
  const handleRename = async (mediaFile: MediaFile) => {
    if (!newName.trim() || newName === mediaFile.original_name) {
      setRenamingId(null)
      setNewName('')
      return
    }

    setSavingRename(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('media_files')
        .update({ original_name: newName.trim() })
        .eq('id', mediaFile.id)

      if (error) throw error

      toast.success('Arquivo renomeado com sucesso!')
      setRenamingId(null)
      setNewName('')
      await reloadMedia()
    } catch (error) {
      console.error('Error renaming file:', error)
      toast.error('Erro ao renomear arquivo')
    } finally {
      setSavingRename(false)
    }
  }

  // Iniciar renomeação
  const startRename = (mediaFile: MediaFile, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRenamingId(mediaFile.id)
    setNewName(mediaFile.original_name)
  }

  // Cancelar renomeação
  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRenamingId(null)
    setNewName('')
  }

  // Upload de arquivos
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Validar tamanho dos arquivos
    const oversizedFiles = acceptedFiles.filter(file => file.size > MAX_FILE_SIZE)
    if (oversizedFiles.length > 0) {
      toast.error(`Arquivo(s) muito grande(s)! Limite: ${MAX_FILE_SIZE_LABEL}`, {
        description: oversizedFiles.map(f => `${f.name} (${formatBytes(f.size)})`).join(', ')
      })
      return
    }

    setUploading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload de arquivos')
      setUploading(false)
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const file of acceptedFiles) {
      try {
        // Determinar tipo de mídia
        let mediaType: MediaType = 'document'
        if (file.type.startsWith('image/')) mediaType = 'image'
        else if (file.type.startsWith('video/')) mediaType = 'video'
        else if (file.type.startsWith('audio/')) mediaType = 'audio'

        // Gerar nome único
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const storagePath = `${fileName}`

        console.log('Uploading file:', fileName, 'to path:', storagePath)

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(storagePath, file)

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw uploadError
        }

        console.log('Upload success:', uploadData)

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(storagePath)

        console.log('Public URL:', urlData.publicUrl)

        // Salvar no banco
        const { data: dbData, error: dbError } = await supabase.from('media_files').insert({
          user_id: user.id,
          file_name: fileName,
          original_name: file.name,
          public_url: urlData.publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          type: mediaType,
          size_bytes: file.size,
        }).select()

        if (dbError) {
          console.error('Database insert error:', dbError)
          alert(`Erro ao salvar no banco: ${dbError.message}`)
          throw dbError
        }

        console.log('Database insert success:', dbData)
        successCount++
      } catch (error) {
        console.error('Error uploading file:', error)
        errorCount++
      }
    }

    setUploading(false)
    await reloadMedia()
    onUploadComplete?.()

    // Mostrar resultado
    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`)
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} enviado(s), ${errorCount} erro(s)`)
    } else if (errorCount > 0) {
      toast.error(`Erro ao enviar ${errorCount} arquivo(s)`)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
    },
    maxSize: MAX_FILE_SIZE,
  })

  // Deletar mídia (apenas admin)
  const handleDelete = async (mediaFile: MediaFile) => {
    if (!isAdmin) return

    setDeleting(mediaFile.id)
    const supabase = createClient()

    try {
      // Deletar do Storage
      await supabase.storage.from('media').remove([mediaFile.storage_path])

      // Deletar do banco
      await supabase.from('media_files').delete().eq('id', mediaFile.id)

      toast.success('Arquivo excluído com sucesso!')
      await reloadMedia()
      onUploadComplete?.()
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Erro ao excluir arquivo')
    } finally {
      setDeleting(null)
      setDeleteConfirm(null)
    }
  }

  // Solicitar exclusão (usuário cliente)
  const handleRequestDeletion = async (mediaFile: MediaFile) => {
    setRequestingDeletion(mediaFile.id)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Você precisa estar logado')
        return
      }

      const { error } = await supabase
        .from('media_files')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_requested_by: user.id
        })
        .eq('id', mediaFile.id)

      if (error) throw error

      toast.success('Solicitação de exclusão enviada!', {
        description: 'Um administrador irá analisar sua solicitação.'
      })
      await reloadMedia()
    } catch (error) {
      console.error('Error requesting deletion:', error)
      toast.error('Erro ao solicitar exclusão')
    } finally {
      setRequestingDeletion(null)
      setDeleteRequestConfirm(null)
    }
  }

  // Cancelar solicitação de exclusão
  const handleCancelDeletionRequest = async (mediaFile: MediaFile) => {
    setRequestingDeletion(mediaFile.id)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('media_files')
        .update({
          deletion_requested_at: null,
          deletion_requested_by: null
        })
        .eq('id', mediaFile.id)

      if (error) throw error

      toast.success('Solicitação de exclusão cancelada!')
      await reloadMedia()
    } catch (error) {
      console.error('Error canceling deletion request:', error)
      toast.error('Erro ao cancelar solicitação')
    } finally {
      setRequestingDeletion(null)
    }
  }

  // Copiar link
  const handleCopyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filtrar mídia
  const filteredMedia = mediaList.filter(item =>
    item.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Upload Area - Premium Style */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer bg-gradient-to-br transition-colors ${
            isDragActive
              ? 'border-primary/60 from-primary/10 to-blue-600/10'
              : 'border-primary/30 from-primary/5 to-background hover:border-primary/60'
          }`}
        >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Enviando arquivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-primary mb-4" />
            <p className="text-lg font-semibold mb-2">
              {isDragActive
                ? 'Solte os arquivos aqui'
                : 'Arraste arquivos aqui'}
            </p>
            <p className="text-sm text-muted-foreground">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Imagens, vídeos, áudios e PDFs (máx. {MAX_FILE_SIZE_LABEL})
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={syncFromBucket}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sincronizar Bucket
          </Button>
        )}
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo na biblioteca'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item) => {
            const Icon = MEDIA_ICONS[item.type]
            return (
              <Card
                key={item.id}
                className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                onClick={() => selectable ? onSelect?.(item) : setPreviewMedia(item)}
              >
                <CardContent className="p-0">
                  {item.type === 'image' ? (
                    <div className="aspect-square bg-muted">
                      <img
                        src={item.public_url}
                        alt={item.original_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <Icon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  <div className="p-3">
                    {renamingId === item.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(item)
                            if (e.key === 'Escape') cancelRename()
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRename(item)}
                          disabled={savingRename}
                        >
                          {savingRename ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={cancelRename}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate">{item.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.size_bytes)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Badge de solicitação pendente */}
                  {item.deletion_requested_at && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        Exclusão solicitada
                      </Badge>
                    </div>
                  )}

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyLink(item.public_url, item.id)
                      }}
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {canEditFile(item) && (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={(e) => startRename(item, e)}
                        title="Renomear"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin ? (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(item)
                        }}
                        disabled={deleting === item.id}
                        title="Excluir arquivo"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    ) : canEditFile(item) && (
                      item.deletion_requested_at ? (
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelDeletionRequest(item)
                          }}
                          disabled={requestingDeletion === item.id}
                          title="Cancelar solicitação"
                        >
                          {requestingDeletion === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteRequestConfirm(item)
                          }}
                          disabled={requestingDeletion === item.id}
                          title="Solicitar exclusão"
                        >
                          {requestingDeletion === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => {
            const Icon = MEDIA_ICONS[item.type]
            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => selectable ? onSelect?.(item) : setPreviewMedia(item)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    {item.type === 'image' ? (
                      <img
                        src={item.public_url}
                        alt={item.original_name}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {renamingId === item.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(item)
                            if (e.key === 'Escape') cancelRename()
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleRename(item)}
                          disabled={savingRename}
                        >
                          {savingRename ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={cancelRename}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.original_name}</p>
                          {item.deletion_requested_at && (
                            <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              Exclusão solicitada
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge className={
                            item.type === 'image' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            item.type === 'video' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                            item.type === 'audio' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            'bg-orange-500/10 text-orange-600 border-orange-500/20'
                          }>
                            {item.type}
                          </Badge>
                          <span>{formatBytes(item.size_bytes)}</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyLink(item.public_url, item.id)
                      }}
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {canEditFile(item) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => startRename(item, e)}
                        title="Renomear"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(item)
                        }}
                        disabled={deleting === item.id}
                        title="Excluir arquivo"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    ) : canEditFile(item) && (
                      item.deletion_requested_at ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancelDeletionRequest(item)
                          }}
                          disabled={requestingDeletion === item.id}
                          title="Cancelar solicitação"
                        >
                          {requestingDeletion === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteRequestConfirm(item)
                          }}
                          disabled={requestingDeletion === item.id}
                          title="Solicitar exclusão"
                        >
                          {requestingDeletion === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog (Admin) */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{deleteConfirm?.original_name}"?
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

      {/* Delete Request Confirmation Dialog (User) */}
      <AlertDialog open={!!deleteRequestConfirm} onOpenChange={() => setDeleteRequestConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Solicitar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está solicitando a exclusão do arquivo "{deleteRequestConfirm?.original_name}".
              <br /><br />
              Um administrador irá analisar sua solicitação e poderá aprovar ou recusar a exclusão.
              Você pode cancelar esta solicitação a qualquer momento enquanto ela estiver pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRequestConfirm && handleRequestDeletion(deleteRequestConfirm)}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Solicitar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="truncate">{previewMedia?.original_name}</DialogTitle>
            <DialogDescription>
              {previewMedia && formatBytes(previewMedia.size_bytes)} • {previewMedia?.type}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 pt-2 flex items-center justify-center bg-muted/50 min-h-[300px] max-h-[70vh] overflow-auto">
            {previewMedia?.type === 'image' && (
              <img
                src={previewMedia.public_url}
                alt={previewMedia.original_name}
                className="max-w-full max-h-[65vh] object-contain"
              />
            )}
            {previewMedia?.type === 'video' && (
              <video
                src={previewMedia.public_url}
                controls
                className="max-w-full max-h-[65vh]"
              />
            )}
            {previewMedia?.type === 'audio' && (
              <audio src={previewMedia.public_url} controls className="w-full" />
            )}
            {previewMedia?.type === 'document' && (
              <div className="text-center p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Pré-visualização não disponível</p>
                <Button asChild>
                  <a href={previewMedia.public_url} target="_blank" rel="noopener noreferrer">
                    Abrir documento
                  </a>
                </Button>
              </div>
            )}
          </div>
          <div className="p-4 pt-0 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                if (previewMedia) {
                  handleCopyLink(previewMedia.public_url, previewMedia.id)
                }
              }}
            >
              {copiedId === previewMedia?.id ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </>
              )}
            </Button>
            <Button asChild>
              <a href={previewMedia?.public_url} target="_blank" rel="noopener noreferrer">
                Abrir Original
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
