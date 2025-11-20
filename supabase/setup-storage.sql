-- =====================================================
-- SETUP DO SUPABASE STORAGE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar bucket para mídia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/pdf'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de acesso ao bucket

-- Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Permitir leitura pública
CREATE POLICY "Public can read media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (
    -- Admin pode deletar qualquer arquivo
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Usuário pode deletar apenas seus arquivos
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');
