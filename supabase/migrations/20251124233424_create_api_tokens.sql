-- Migration: Create API Tokens System for Admin
-- Description: Allows admins to generate API tokens for external integrations
-- Created: 2025-11-24

-- ============================================================================
-- TABLE: api_tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scopes TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,

  -- Constraints
  CONSTRAINT api_tokens_name_check CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
  CONSTRAINT api_tokens_token_check CHECK (char_length(token) >= 32)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast token lookup (most common operation)
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token) WHERE is_active = TRUE;

-- Index for user's tokens lookup
CREATE INDEX idx_api_tokens_user_id ON public.api_tokens(user_id) WHERE is_active = TRUE;

-- Index for expired tokens cleanup
CREATE INDEX idx_api_tokens_expires_at ON public.api_tokens(expires_at) WHERE is_active = TRUE AND expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all tokens
CREATE POLICY "Admins can view all API tokens"
  ON public.api_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Users can only view their own tokens
CREATE POLICY "Users can view their own API tokens"
  ON public.api_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Only admins can create tokens
CREATE POLICY "Only admins can create API tokens"
  ON public.api_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND user_id = auth.uid()
  );

-- Policy: Only admins can update their own tokens
CREATE POLICY "Admins can update their own API tokens"
  ON public.api_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete their own tokens
CREATE POLICY "Admins can delete their own API tokens"
  ON public.api_tokens
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Generate secure random token
CREATE OR REPLACE FUNCTION public.generate_api_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_prefix TEXT := 'wpp_';
  random_part TEXT;
  full_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 48-character string (base64url safe)
    random_part := encode(gen_random_bytes(36), 'base64');
    random_part := replace(random_part, '+', '');
    random_part := replace(random_part, '/', '');
    random_part := replace(random_part, '=', '');
    random_part := substring(random_part, 1, 48);

    full_token := token_prefix || random_part;

    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.api_tokens WHERE token = full_token) INTO token_exists;

    -- Exit loop if token is unique
    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN full_token;
END;
$$;

-- Function: Update last_used_at when token is used
CREATE OR REPLACE FUNCTION public.update_api_token_last_used(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_tokens
  SET last_used_at = NOW()
  WHERE token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$;

-- Function: Validate API token and return user_id
CREATE OR REPLACE FUNCTION public.validate_api_token(p_token TEXT)
RETURNS TABLE (
  user_id UUID,
  scopes TEXT[],
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.user_id,
    t.scopes,
    (t.is_active
     AND (t.expires_at IS NULL OR t.expires_at > NOW())
    ) AS is_valid
  FROM public.api_tokens t
  WHERE t.token = p_token;

  -- If no token found, return null row
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT[], FALSE;
  END IF;
END;
$$;

-- Function: Deactivate expired tokens (to be run by cron)
CREATE OR REPLACE FUNCTION public.deactivate_expired_api_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.api_tokens
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE is_active = TRUE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_api_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_api_tokens_updated_at
  BEFORE UPDATE ON public.api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_api_tokens_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.api_tokens IS 'API tokens for external integrations and admin access';
COMMENT ON COLUMN public.api_tokens.id IS 'Unique identifier for the token';
COMMENT ON COLUMN public.api_tokens.user_id IS 'User (admin) who owns this token';
COMMENT ON COLUMN public.api_tokens.token IS 'The actual token string (format: wpp_XXXXXXXX...)';
COMMENT ON COLUMN public.api_tokens.name IS 'Human-readable name for the token';
COMMENT ON COLUMN public.api_tokens.description IS 'Optional description of token purpose';
COMMENT ON COLUMN public.api_tokens.scopes IS 'Array of permission scopes (future use)';
COMMENT ON COLUMN public.api_tokens.expires_at IS 'When the token expires (NULL = never)';
COMMENT ON COLUMN public.api_tokens.last_used_at IS 'Last time this token was used';
COMMENT ON COLUMN public.api_tokens.is_active IS 'Whether the token is active';

COMMENT ON FUNCTION public.generate_api_token() IS 'Generates a unique, secure API token';
COMMENT ON FUNCTION public.update_api_token_last_used(TEXT) IS 'Updates last_used_at timestamp for a token';
COMMENT ON FUNCTION public.validate_api_token(TEXT) IS 'Validates a token and returns user info';
COMMENT ON FUNCTION public.deactivate_expired_api_tokens() IS 'Deactivates all expired tokens';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_api_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_api_token_last_used(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_api_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_api_tokens() TO service_role;
