-- =====================================================
-- CONFIGURAÇÃO RÁPIDA - Apenas o essencial
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Criar tabela system_settings (se não existir)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Política RLS para admins
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Inserir configurações do Mercado Pago
INSERT INTO system_settings (key, value, description)
VALUES
  (
    'mercadopago',
    '{
      "access_token": "APP_USR-6037266391831279-112010-6432c34a45d9082c48d899f78b7989d6-222539465",
      "public_key": "APP_USR-d4df9ecc-021a-46d8-9cd6-67298e2a7f89",
      "webhook_secret": "d4904bcab73e2cc96b92271208b4046f5aaca477b14c1d6e1fff95376bf168bf",
      "is_enabled": true,
      "use_sandbox": false
    }'::jsonb,
    'Configurações do Mercado Pago para processamento de pagamentos'
  )
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value;

-- 5. Verificar se foi criado
SELECT key, value->>'is_enabled' as enabled, description
FROM system_settings
WHERE key = 'mercadopago';
