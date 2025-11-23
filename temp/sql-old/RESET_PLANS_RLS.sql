-- =====================================================
-- RESET COMPLETO: Remove e recria políticas RLS
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Desabilitar RLS temporariamente para fazer limpeza
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes (forçado)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'plans'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON plans', pol.policyname);
    END LOOP;
END $$;

-- 3. Reabilitar RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 4. Criar política de SELECT para todos usuários autenticados
CREATE POLICY "authenticated_view_active"
    ON plans FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- 5. Criar política de SELECT para admins verem TODOS os planos
CREATE POLICY "admin_view_all"
    ON plans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 6. Políticas para admin fazer INSERT/UPDATE/DELETE
CREATE POLICY "admin_insert"
    ON plans FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_update"
    ON plans FOR UPDATE
    TO authenticated
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

CREATE POLICY "admin_delete"
    ON plans FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 7. Verificar as políticas criadas
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'plans'
ORDER BY policyname;

-- 8. Testar query de SELECT (deve retornar os 4 planos)
SELECT
    id,
    name,
    tier,
    price,
    credits,
    is_active
FROM plans
WHERE is_active = TRUE
ORDER BY sort_order;
