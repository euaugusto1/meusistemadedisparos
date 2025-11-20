-- =====================================================
-- MIGRATIONS: Multiple updates
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- 1. MIGRATION: Add is_favorite to contacts_lists and message_templates
-- =====================================================

-- 1.1. Adicionar coluna is_favorite à tabela contacts_lists
ALTER TABLE contacts_lists
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Criar índice para melhor performance em contacts_lists
CREATE INDEX IF NOT EXISTS idx_contacts_lists_favorite
ON contacts_lists(user_id, is_favorite)
WHERE is_favorite = TRUE;

-- 3. Adicionar coluna is_favorite à tabela message_templates
ALTER TABLE message_templates
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- 4. Criar índice para melhor performance em message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_favorite
ON message_templates(user_id, is_favorite)
WHERE is_favorite = TRUE;

-- 5. Verificar se as colunas foram criadas (opcional)
SELECT 'contacts_lists' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contacts_lists'
AND column_name = 'is_favorite'
UNION ALL
SELECT 'message_templates' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'message_templates'
AND column_name = 'is_favorite';

-- Se a query acima retornar duas linhas, as migrations foram aplicadas com sucesso!

-- =====================================================
-- 2. MIGRATION: Allow admins to update any user profile
-- =====================================================

-- 2.1. Drop the existing policy that only allows users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 2.2. Create new policy that allows users to update their own profile OR admins to update any profile
CREATE POLICY "Users can update own profile or admin can update any"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR is_admin(auth.uid()))
    WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- 2.3. Verificar se a policy foi criada corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';

-- =====================================================
-- 3. MIGRATION: Create decrement_credits function
-- =====================================================

-- 3.1. Criar função para decrementar créditos do usuário
CREATE OR REPLACE FUNCTION decrement_credits(user_id UUID, amount INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar créditos do usuário (não permite valores negativos)
  UPDATE profiles
  SET credits = GREATEST(credits - amount, 0)
  WHERE id = user_id;
END;
$$;

-- 3.2. Verificar se a função foi criada
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'decrement_credits';
-- =====================================================
-- 4. MIGRATION: Create plans table
-- =====================================================

-- Execute o SQL do arquivo: supabase/migrations/20250120_create_plans_table.sql


-- =====================================================
-- 5. MIGRATION: Create system_settings table
-- =====================================================

-- Execute o SQL do arquivo: supabase/migrations/20250120_create_settings_table.sql


-- =====================================================
-- 6. MIGRATION: Create payment_transactions table
-- =====================================================

-- Execute o SQL do arquivo: supabase/migrations/20250120_create_payment_transactions.sql

