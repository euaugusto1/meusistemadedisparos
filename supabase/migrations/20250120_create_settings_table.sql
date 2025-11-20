-- =====================================================
-- MIGRATION: Create settings table for payment configuration
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(key);

-- RLS Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ver e gerenciar configurações
CREATE POLICY "Only admin can view settings"
    ON system_settings FOR SELECT
    USING (is_admin(auth.uid()));

CREATE POLICY "Only admin can insert settings"
    ON system_settings FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admin can update settings"
    ON system_settings FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admin can delete settings"
    ON system_settings FOR DELETE
    USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inserir configurações padrão do Mercado Pago
INSERT INTO system_settings (key, value, description)
VALUES
    (
        'mercadopago',
        '{
            "access_token": "",
            "public_key": "",
            "webhook_secret": "",
            "is_enabled": false,
            "use_sandbox": true
        }'::jsonb,
        'Configurações do Mercado Pago para processamento de pagamentos'
    )
ON CONFLICT (key) DO NOTHING;

-- Verificar se a tabela foi criada
SELECT * FROM system_settings;
