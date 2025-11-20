-- =====================================================
-- TEST QUERY: Verificar planos e RLS
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Verificar se os planos existem na tabela
SELECT
    id,
    name,
    tier,
    price,
    credits,
    is_active,
    sort_order
FROM plans
ORDER BY sort_order;

-- 2. Verificar as políticas RLS na tabela plans
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'plans';

-- 3. Verificar se RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'plans';

-- 4. Testar query como usuário autenticado (simula o que o Next.js faz)
-- Substitua 'SEU_USER_ID' pelo ID do seu usuário
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a6d0e1f2-3456-7890-abcd-ef1234567890"}';

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

-- Resetar role
RESET role;
