-- =====================================================
-- FIX: Dar permissões corretas para os roles do Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Garantir que a tabela está no schema public
ALTER TABLE public.plans SET SCHEMA public;

-- 2. Dar permissões de SELECT para o role anon (usado pelo anon key)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.plans TO anon;

-- 3. Dar permissões de SELECT para o role authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.plans TO authenticated;

-- 4. Dar permissões de INSERT, UPDATE, DELETE para authenticated
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;

-- 5. Dar permissões para service_role (admin)
GRANT ALL ON public.plans TO service_role;

-- 6. Verificar as permissões
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'plans'
ORDER BY grantee, privilege_type;

-- 7. Agora testar a query (deve funcionar mesmo com RLS desabilitado)
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
