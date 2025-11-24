-- Migration: Add support for test instances
-- Description: Adds is_test and expires_at columns to whatsapp_instances table

-- Add is_test column (boolean flag to identify test instances)
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE NOT NULL;

-- Add expires_at column (timestamp for when test instance expires)
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add api_token column (for Evolution API token storage)
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS api_token TEXT;

-- Create index on is_test for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_is_test
ON whatsapp_instances(is_test);

-- Create index on expires_at for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_expires_at
ON whatsapp_instances(expires_at)
WHERE is_test = TRUE;

-- Create index on user_id + is_test for checking existing test instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_test
ON whatsapp_instances(user_id, is_test)
WHERE is_test = TRUE;

-- Add comment to table
COMMENT ON COLUMN whatsapp_instances.is_test IS 'Flag indicating if this is a temporary test instance';
COMMENT ON COLUMN whatsapp_instances.expires_at IS 'Expiration timestamp for test instances (NULL for permanent instances)';
COMMENT ON COLUMN whatsapp_instances.api_token IS 'API token for Evolution API instances';
