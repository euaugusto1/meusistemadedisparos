-- =====================================================
-- FINAL: Reativar RLS com políticas corretas
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Reabilitar RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 2. Remover policies antigas se existirem
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

-- 3. Criar policy simples para todos usuários autenticados verem planos ativos
CREATE POLICY "select_active_plans"
    ON plans FOR SELECT
    USING (is_active = TRUE);

-- 4. Criar policy para admins verem todos os planos
CREATE POLICY "admin_select_all"
    ON plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 5. Políticas para admin gerenciar planos
CREATE POLICY "admin_insert"
    ON plans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_update"
    ON plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "admin_delete"
    ON plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 6. Verificar policies criadas
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'plans';

-- 7. Testar query final
SELECT id, name, tier, price FROM plans WHERE is_active = TRUE ORDER BY sort_order;
