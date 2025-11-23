-- Add test instance fields to whatsapp_instances table
ALTER TABLE whatsapp_instances
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS server_url TEXT;

-- Add comment to explain test instances
COMMENT ON COLUMN whatsapp_instances.is_test IS 'Indica se é uma instância de teste (duração de 1 hora)';
COMMENT ON COLUMN whatsapp_instances.expires_at IS 'Data/hora de expiração para instâncias de teste';
COMMENT ON COLUMN whatsapp_instances.server_url IS 'URL do servidor UAZAPI (padrão ou teste)';

-- Create index for expired instances cleanup
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_expires_at
ON whatsapp_instances(expires_at)
WHERE expires_at IS NOT NULL;

-- Function to clean up expired test instances
CREATE OR REPLACE FUNCTION cleanup_expired_test_instances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM whatsapp_instances
  WHERE is_test = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_test_instances() TO authenticated;
