-- Script para configurar delays de campanha
-- Execute este script no seu banco de dados Supabase

-- Primeiro, verificar se já existe a configuração
SELECT * FROM system_settings WHERE key = 'campaign_delays';

-- Se não existir, criar com valores padrão (50-150 como você configurou)
INSERT INTO system_settings (key, value, description)
VALUES (
  'campaign_delays',
  '{"min_delay_seconds": 50, "max_delay_seconds": 150}'::jsonb,
  'Configurações de delay para envio de campanhas'
)
ON CONFLICT (key)
DO UPDATE SET
  value = '{"min_delay_seconds": 50, "max_delay_seconds": 150}'::jsonb,
  updated_at = NOW();

-- Verificar se foi criado/atualizado corretamente
SELECT * FROM system_settings WHERE key = 'campaign_delays';
