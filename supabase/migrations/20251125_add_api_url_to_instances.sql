-- Migration: Add api_url column to whatsapp_instances
-- Description: Stores the Evolution API URL per instance

-- Add api_url column for Evolution API URL
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS api_url TEXT;

-- Set default value for existing instances (from environment variable, need to update manually)
-- For production instances using UAZAPI
UPDATE whatsapp_instances
SET api_url = 'https://monitor-grupo.uazapi.com'
WHERE is_test = FALSE OR is_test IS NULL;

-- For test instances using Evolution API
UPDATE whatsapp_instances
SET api_url = 'https://dev.evo.sistemabrasil.online'
WHERE is_test = TRUE;

-- Add comment
COMMENT ON COLUMN whatsapp_instances.api_url IS 'Base URL for the WhatsApp API (UAZAPI or Evolution API)';
