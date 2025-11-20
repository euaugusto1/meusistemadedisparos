-- =====================================================
-- ATUALIZAR PLANOS EXISTENTES OU CRIAR NOVOS
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Deletar planos existentes (opcional - remova o comentário se quiser limpar antes)
-- DELETE FROM plans;

-- Inserir ou atualizar planos
INSERT INTO plans (name, description, tier, price, credits, duration_days, features, is_active, sort_order)
VALUES
    -- PLANO GRÁTIS
    (
        'Grátis',
        'Ideal para testar a plataforma',
        'free',
        0.00,
        100,
        30,
        '["100 créditos/mês", "1 instância WhatsApp", "Templates básicos", "Suporte por email"]'::jsonb,
        true,
        1
    ),

    -- PLANO BRONZE - R$ 70,00
    (
        'Bronze',
        'Ideal para pequenos negócios',
        'bronze',
        70.00,
        1000,
        30,
        '["1.000 créditos/mês", "3 instâncias WhatsApp", "Templates ilimitados", "Suporte prioritário", "Relatórios básicos", "Campanhas programadas"]'::jsonb,
        true,
        2
    ),

    -- PLANO PRATA - R$ 100,00
    (
        'Prata',
        'Para negócios em crescimento',
        'silver',
        100.00,
        3000,
        30,
        '["3.000 créditos/mês", "10 instâncias WhatsApp", "Templates ilimitados", "Suporte prioritário", "Relatórios avançados", "API de integração", "Webhooks personalizados"]'::jsonb,
        true,
        3
    ),

    -- PLANO OURO - SOB CONSULTA
    (
        'Ouro',
        'Plano empresarial - Sob consulta',
        'gold',
        0.00,
        10000,
        30,
        '["Créditos personalizados", "Instâncias ilimitadas", "Templates ilimitados", "Suporte 24/7", "Relatórios personalizados", "API de integração", "Gerente de conta dedicado", "Treinamento incluído"]'::jsonb,
        true,
        4
    )

-- Se o plano já existir (mesmo tier), atualiza os dados
ON CONFLICT (tier)
DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    credits = EXCLUDED.credits,
    duration_days = EXCLUDED.duration_days,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Verificar planos criados
SELECT
    name,
    tier,
    price,
    credits,
    duration_days,
    is_active,
    sort_order
FROM plans
ORDER BY sort_order;
