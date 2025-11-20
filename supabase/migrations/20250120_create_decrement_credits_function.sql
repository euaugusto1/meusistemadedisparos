-- =====================================================
-- MIGRATION: Create decrement_credits function
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Função para decrementar créditos do usuário
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

-- Verificar se a função foi criada
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'decrement_credits';
