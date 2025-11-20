-- =====================================================
-- FIX: Permissões e RLS para system_settings
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Dar permissões para os roles
GRANT SELECT, INSERT, UPDATE ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;

-- 2. Verificar se RLS está habilitado
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas
DROP POLICY IF EXISTS "Admin can view settings" ON system_settings;
DROP POLICY IF EXISTS "Admin can insert settings" ON system_settings;
DROP POLICY IF EXISTS "Admin can update settings" ON system_settings;

-- 4. Criar policy simples para admins verem e editarem
CREATE POLICY "admin_all_settings"
    ON system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Verificar dados salvos
SELECT * FROM system_settings WHERE key = 'mercadopago';

-- 6. Se não houver dados, verificar se houve erro ao salvar
-- Execute o INSERT manual para testar:
INSERT INTO system_settings (key, value, description)
VALUES (
    'mercadopago',
    '{"access_token":"APP_USR-test","public_key":"APP_USR-test","webhook_secret":"test123","is_enabled":false,"use_sandbox":true}'::jsonb,
    'Configurações do Mercado Pago para processamento de pagamentos'
)
ON CONFLICT (key)
DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- 7. Verificar novamente
SELECT
    key,
    value->>'access_token' as access_token_start,
    value->>'public_key' as public_key_start,
    value->>'webhook_secret' as webhook_secret,
    value->>'is_enabled' as is_enabled,
    value->>'use_sandbox' as use_sandbox,
    created_at,
    updated_at
FROM system_settings
WHERE key = 'mercadopago';
