-- =====================================================
-- FIX: Corrigir políticas RLS da tabela plans
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Remover todas as políticas antigas
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
DROP POLICY IF EXISTS "Only admin can insert plans" ON plans;
DROP POLICY IF EXISTS "Only admin can update plans" ON plans;
DROP POLICY IF EXISTS "Only admin can delete plans" ON plans;

-- 2. Criar política de SELECT para todos usuários autenticados
-- Permite que qualquer usuário logado veja planos ativos
CREATE POLICY "Authenticated users can view active plans"
    ON plans FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

-- 3. Criar política de SELECT para admins verem TODOS os planos
CREATE POLICY "Admins can view all plans"
    ON plans FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. Políticas para admin fazer INSERT/UPDATE/DELETE
CREATE POLICY "Admins can insert plans"
    ON plans FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update plans"
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

CREATE POLICY "Admins can delete plans"
    ON plans FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Verificar se RLS está habilitado
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 6. Verificar as políticas criadas
SELECT
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'plans';

-- 7. Testar query de SELECT (deve retornar os 4 planos)
SELECT
    id,
    name,
    tier,
    price,
    is_active
FROM plans
WHERE is_active = TRUE
ORDER BY sort_order;
