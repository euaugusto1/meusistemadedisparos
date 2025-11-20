-- =====================================================
-- TESTE: Desabilitar RLS temporariamente para debug
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- ATENÇÃO: Isso remove a segurança! Use apenas para debug!
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- Testar query de SELECT (deve retornar os 4 planos)
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
