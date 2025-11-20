-- =====================================================
-- SEED DATA - Dados iniciais do sistema
-- Execute APÓS o schema.sql e setup-storage.sql
-- =====================================================

-- Nota: O primeiro usuário admin deve ser criado manualmente:
-- 1. Crie uma conta via signup no app
-- 2. Execute o comando abaixo substituindo o email

-- Promover usuário a admin (substitua o email)
-- UPDATE profiles
-- SET role = 'admin', plan_tier = 'gold', plan_expires_at = NOW() + INTERVAL '365 days', credits = 999999
-- WHERE email = 'seu-email@exemplo.com';

-- =====================================================
-- Exemplo: Criar usuário admin diretamente (NÃO RECOMENDADO EM PRODUÇÃO)
-- =====================================================

-- Se quiser criar um admin de teste, primeiro crie o usuário via Auth
-- e depois execute o UPDATE acima.

-- =====================================================
-- Dados de exemplo para desenvolvimento
-- =====================================================

-- Isso só deve ser usado em ambiente de desenvolvimento
-- Descomente se necessário

/*
-- Template de exemplo
INSERT INTO message_templates (user_id, name, message, button_type, buttons)
SELECT
  id,
  'Boas Vindas',
  'Olá! Seja bem-vindo ao nosso serviço. Estamos felizes em tê-lo conosco!',
  'button',
  '[{"name": "Ver Planos", "url": "https://exemplo.com/planos"}, {"name": "Fale Conosco", "url": "https://wa.me/5511999999999"}]'::jsonb
FROM profiles
WHERE role = 'admin'
LIMIT 1;

-- Lista de contatos de exemplo
INSERT INTO contacts_lists (user_id, name, description, contacts)
SELECT
  id,
  'Contatos de Teste',
  'Lista para testes de desenvolvimento',
  '[{"number": "5511999999999"}, {"number": "5511888888888"}, {"number": "5511777777777"}]'::jsonb
FROM profiles
WHERE role = 'admin'
LIMIT 1;
*/
