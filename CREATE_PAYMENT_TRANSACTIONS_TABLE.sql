-- =====================================================
-- TABELA: payment_transactions
-- Descrição: Registra todas as transações de pagamento
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_tier VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    credits_added INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'mercadopago',
    payment_id TEXT,
    status VARCHAR(50) NOT NULL,
    payment_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas suas próprias transações
CREATE POLICY "users_view_own_transactions"
    ON payment_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Apenas admins podem ver todas as transações
CREATE POLICY "admins_view_all_transactions"
    ON payment_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Sistema pode inserir transações (webhook)
CREATE POLICY "system_insert_transactions"
    ON payment_transactions
    FOR INSERT
    WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Comentários
COMMENT ON TABLE payment_transactions IS 'Registro de todas as transações de pagamento';
COMMENT ON COLUMN payment_transactions.user_id IS 'ID do usuário que realizou o pagamento';
COMMENT ON COLUMN payment_transactions.plan_tier IS 'Tier do plano adquirido';
COMMENT ON COLUMN payment_transactions.amount IS 'Valor pago em reais';
COMMENT ON COLUMN payment_transactions.credits_added IS 'Quantidade de créditos adicionados';
COMMENT ON COLUMN payment_transactions.payment_method IS 'Método de pagamento utilizado';
COMMENT ON COLUMN payment_transactions.payment_id IS 'ID da transação no gateway de pagamento';
COMMENT ON COLUMN payment_transactions.status IS 'Status do pagamento (approved, pending, rejected, etc)';
COMMENT ON COLUMN payment_transactions.payment_data IS 'Dados adicionais do pagamento em JSON';
