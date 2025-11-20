-- =====================================================
-- MIGRATION: Create plans table for subscription management
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- Tabela de Planos
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL, -- 'free', 'bronze', 'silver', 'gold'
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    credits INTEGER NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_tier UNIQUE (tier)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_sort ON plans(sort_order);

-- RLS Policies
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Todos podem ver planos ativos
CREATE POLICY "Anyone can view active plans"
    ON plans FOR SELECT
    USING (is_active = TRUE OR is_admin(auth.uid()));

-- Apenas admin pode criar/editar/deletar planos
CREATE POLICY "Only admin can insert plans"
    ON plans FOR INSERT
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admin can update plans"
    ON plans FOR UPDATE
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admin can delete plans"
    ON plans FOR DELETE
    USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inserir planos padrão
INSERT INTO plans (name, description, tier, price, credits, duration_days, features, is_active, sort_order)
VALUES
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
ON CONFLICT (tier) DO NOTHING;

-- Verificar se a tabela foi criada
SELECT * FROM plans ORDER BY sort_order;
