'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MediaFile, MediaType } from '@/types'

export function useMediaLibrary() {
  const [media, setMedia] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchMedia = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMedia(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mídia')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchMedia()

    // Subscribe to media changes
    const channel = supabase
      .channel('media-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_files',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMedia(prev => [payload.new as MediaFile, ...prev])
          } else if (payload.eventType === 'DELETE') {
            setMedia(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchMedia])

  const uploadMedia = async (file: File): Promise<{ data?: MediaFile; error?: string }> => {
    try {
      // Determinar tipo de mídia
      let mediaType: MediaType = 'document'
      if (file.type.startsWith('image/')) mediaType = 'image'
      else if (file.type.startsWith('video/')) mediaType = 'video'
      else if (file.type.startsWith('audio/')) mediaType = 'audio'

      // Gerar nome único
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const storagePath = `media/${fileName}`

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath)

      // Salvar no banco
      const { data, error: dbError } = await supabase
        .from('media_files')
        .insert({
          file_name: fileName,
          original_name: file.name,
          public_url: urlData.publicUrl,
          storage_path: storagePath,
          mime_type: file.type,
          type: mediaType,
          size_bytes: file.size,
        })
        .select()
        .single()

      if (dbError) throw dbError

      return { data }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao fazer upload' }
    }
  }

  const deleteMedia = async (id: string, storagePath: string) => {
    try {
      // Deletar do Storage
      await supabase.storage.from('media').remove([storagePath])

      // Deletar do banco
      const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Erro ao deletar' }
    }
  }

  const getMediaByType = (type: MediaType) => {
    return media.filter(m => m.type === type)
  }

  const stats = {
    total: media.length,
    images: media.filter(m => m.type === 'image').length,
    videos: media.filter(m => m.type === 'video').length,
    audios: media.filter(m => m.type === 'audio').length,
    documents: media.filter(m => m.type === 'document').length,
    totalSize: media.reduce((acc, m) => acc + m.size_bytes, 0),
  }

  return {
    media,
    loading,
    error,
    stats,
    uploadMedia,
    deleteMedia,
    getMediaByType,
    refresh: fetchMedia,
  }
}
