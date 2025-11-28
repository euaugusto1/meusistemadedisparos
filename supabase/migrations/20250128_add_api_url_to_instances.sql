-- Adicionar coluna api_url para armazenar a URL da Evolution API de cada instância
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS api_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN whatsapp_instances.api_url IS 'URL da Evolution API usada por esta instância';
