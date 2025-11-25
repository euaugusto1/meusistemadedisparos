-- Migration: Adicionar campos de solicitação de exclusão em media_files
-- Permite que usuários clientes solicitem a exclusão de arquivos para aprovação do admin

-- Adicionar colunas de solicitação de exclusão
ALTER TABLE media_files
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_requested_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Índice para facilitar consultas de arquivos com solicitação pendente
CREATE INDEX IF NOT EXISTS idx_media_files_deletion_requested
ON media_files(deletion_requested_at)
WHERE deletion_requested_at IS NOT NULL;

-- Comentários nas colunas
COMMENT ON COLUMN media_files.deletion_requested_at IS 'Data/hora em que a exclusão foi solicitada pelo usuário';
COMMENT ON COLUMN media_files.deletion_requested_by IS 'ID do usuário que solicitou a exclusão';
