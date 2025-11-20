'use client'

import { useState, useCallback } from 'react'
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
} from 'lucide-react'
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null)

  const isAdmin = profile?.role === 'admin'

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

  // Upload de arquivos
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setUploading(true)
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Você precisa estar logado para fazer upload de arquivos')
      setUploading(false)
      return
    }

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
      } catch (error) {
        console.error('Error uploading file:', error)
        alert(`Erro ao enviar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    setUploading(false)
    await reloadMedia()
    onUploadComplete?.()
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
    },
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

      await reloadMedia()
      onUploadComplete?.()
    } catch (error) {
      console.error('Error deleting file:', error)
    } finally {
      setDeleting(null)
      setDeleteConfirm(null)
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
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="mt-2 text-sm text-muted-foreground">Enviando arquivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive
                ? 'Solte os arquivos aqui'
                : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Imagens, vídeos, áudios e PDFs
            </p>
          </div>
        )}
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
                className={`group relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary`}
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
                    <p className="text-sm font-medium truncate">{item.original_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size_bytes)}
                    </p>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(item)
                        }}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
                    <p className="font-medium truncate">{item.original_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
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
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(item)
                        }}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
