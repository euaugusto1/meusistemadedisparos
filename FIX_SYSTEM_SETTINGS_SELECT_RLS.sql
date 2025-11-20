-- =====================================================
-- FIX: Permitir usuários autenticados lerem system_settings
-- (necessário para processar pagamentos)
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Remover policy antiga que permitia apenas admins
DROP POLICY IF EXISTS "admin_all_settings" ON system_settings;

-- 2. Criar policy para TODOS usuários autenticados poderem LER
CREATE POLICY "authenticated_read_settings"
    ON system_settings
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 3. Criar policy para apenas ADMINS poderem INSERIR/ATUALIZAR/DELETAR
CREATE POLICY "admin_write_settings"
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

-- 4. Verificar policies criadas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'system_settings';

-- 5. Testar query como usuário autenticado
SELECT * FROM system_settings WHERE key = 'mercadopago';
