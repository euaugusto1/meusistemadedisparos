-- =====================================================
-- MIGRATION: Create payment_transactions table
-- =====================================================

-- Create payment_transactions table for audit trail
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    credits_added INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL, -- 'mercadopago', 'stripe', etc
    payment_id TEXT, -- ID from payment provider
    status TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'refunded'
    payment_data JSONB DEFAULT '{}'::jsonb, -- Additional payment details
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
ON payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id
ON payment_transactions(payment_id);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own payment transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all payment transactions"
    ON payment_transactions FOR SELECT
    USING (is_admin(auth.uid()));

-- Only system (through service role) can insert transactions
-- No policy needed as webhook uses service role

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Verification query
SELECT 'payment_transactions table created successfully' as status;
