-- =====================================================
-- ATUALIZAR PLANO GOLD COM AGENTES IA
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

UPDATE plans
SET
  features = '["Créditos personalizados", "Instâncias ilimitadas", "Templates ilimitados", "Suporte 24/7", "Relatórios personalizados", "Agentes IA com n8n", "API de integração", "Gerente de conta dedicado", "Treinamento incluído"]'::jsonb,
  updated_at = NOW()
WHERE tier = 'gold';

-- Verificar atualização
SELECT
  name,
  tier,
  features
FROM plans
WHERE tier = 'gold';
