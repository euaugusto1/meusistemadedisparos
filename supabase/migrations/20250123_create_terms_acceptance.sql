-- =====================================================
-- TERMS ACCEPTANCE TABLE
-- Sistema de aceite e versionamento de Termos de Uso
-- =====================================================

-- Criar tabela de versões de termos
CREATE TABLE IF NOT EXISTS terms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Criar tabela de aceites de termos
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version_id UUID NOT NULL REFERENCES terms_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Índices para performance
  CONSTRAINT unique_user_version UNIQUE (user_id, terms_version_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at);
CREATE INDEX IF NOT EXISTS idx_terms_versions_is_active ON terms_versions(is_active);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer usuário autenticado pode ler versões ativas de termos
CREATE POLICY "Anyone can read active terms versions"
ON terms_versions
FOR SELECT
USING (is_active = true);

-- Policy: Apenas admins podem gerenciar versões de termos
CREATE POLICY "Only admins can manage terms versions"
ON terms_versions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Usuários podem ver seus próprios aceites
CREATE POLICY "Users can view their own acceptances"
ON terms_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Usuários podem criar seus próprios aceites
CREATE POLICY "Users can create their own acceptances"
ON terms_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins podem ver todos os aceites
CREATE POLICY "Admins can view all acceptances"
ON terms_acceptances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Função para obter a versão ativa atual dos termos
CREATE OR REPLACE FUNCTION get_active_terms_version()
RETURNS TABLE (
  id UUID,
  version VARCHAR(50),
  content TEXT,
  effective_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tv.id,
    tv.version,
    tv.content,
    tv.effective_date
  FROM terms_versions tv
  WHERE tv.is_active = true
  ORDER BY tv.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário aceitou a versão atual dos termos
CREATE OR REPLACE FUNCTION user_has_accepted_current_terms(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_terms_id UUID;
  v_has_accepted BOOLEAN;
BEGIN
  -- Obter ID da versão ativa atual
  SELECT id INTO v_current_terms_id
  FROM terms_versions
  WHERE is_active = true
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Verificar se usuário aceitou esta versão
  SELECT EXISTS (
    SELECT 1
    FROM terms_acceptances
    WHERE user_id = p_user_id
    AND terms_version_id = v_current_terms_id
  ) INTO v_has_accepted;

  RETURN COALESCE(v_has_accepted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSERIR VERSÃO INICIAL DOS TERMOS
-- =====================================================

INSERT INTO terms_versions (version, content, effective_date, is_active)
VALUES (
  'v1.0.0',
  'Versão inicial dos Termos de Uso da plataforma de disparos em massa para WhatsApp.',
  NOW(),
  true
)
ON CONFLICT (version) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE terms_versions IS 'Armazena as diferentes versões dos Termos de Uso';
COMMENT ON TABLE terms_acceptances IS 'Registra quando e como os usuários aceitaram os termos';
COMMENT ON COLUMN terms_acceptances.ip_address IS 'Endereço IP do usuário no momento do aceite';
COMMENT ON COLUMN terms_acceptances.user_agent IS 'User agent do navegador no momento do aceite';
COMMENT ON FUNCTION get_active_terms_version() IS 'Retorna a versão ativa atual dos Termos de Uso';
COMMENT ON FUNCTION user_has_accepted_current_terms(UUID) IS 'Verifica se o usuário aceitou a versão atual dos termos';
