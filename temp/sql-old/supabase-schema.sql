-- =====================================================
-- WHATSAPP SAAS PLATFORM - SCHEMA SQL COMPLETO
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Limpar schema existente (CUIDADO: isso apaga todos os dados!)
-- Descomente as linhas abaixo apenas se quiser recriar tudo do zero
-- DROP TABLE IF EXISTS campaign_items CASCADE;
-- DROP TABLE IF EXISTS campaigns CASCADE;
-- DROP TABLE IF EXISTS support_messages CASCADE;
-- DROP TABLE IF EXISTS support_tickets CASCADE;
-- DROP TABLE IF EXISTS message_templates CASCADE;
-- DROP TABLE IF EXISTS contacts_lists CASCADE;
-- DROP TABLE IF EXISTS media_files CASCADE;
-- DROP TABLE IF EXISTS whatsapp_instances CASCADE;
-- DROP TABLE IF EXISTS payment_transactions CASCADE;
-- DROP TABLE IF EXISTS system_settings CASCADE;
-- DROP TABLE IF EXISTS plans CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- TABELA: profiles
-- Perfis de usuários (estende auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'bronze', 'silver', 'gold')),
  plan_expires_at TIMESTAMPTZ,
  credits INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: plans
-- Planos de assinatura disponíveis
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'bronze', 'silver', 'gold')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  credits INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: system_settings
-- Configurações do sistema (Mercado Pago, UAZAPI, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: payment_transactions
-- Histórico de transações de pagamento
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free', 'bronze', 'silver', 'gold')),
  amount DECIMAL(10,2) NOT NULL,
  credits_added INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_id TEXT,
  status TEXT NOT NULL,
  payment_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: whatsapp_instances
-- Instâncias WhatsApp conectadas (UAZAPI)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  instance_key TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_code')),
  phone_number TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: media_files
-- Biblioteca de arquivos de mídia (imagens, vídeos, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document')),
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: contacts_lists
-- Listas de contatos para campanhas
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_count INTEGER NOT NULL DEFAULT 0,
  group_jid TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: message_templates
-- Templates de mensagens reutilizáveis
-- =====================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  link_url TEXT,
  button_type TEXT CHECK (button_type IN ('button', 'list', 'poll', 'carousel')),
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: campaigns
-- Campanhas de disparo em massa
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  link_url TEXT,
  button_type TEXT CHECK (button_type IN ('button', 'list', 'poll', 'carousel')),
  buttons JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  min_delay INTEGER NOT NULL DEFAULT 3,
  max_delay INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: campaign_items
-- Itens individuais de cada campanha (logs de envio)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  response_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABELA: support_tickets
-- Tickets de suporte técnico
-- =====================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- =====================================================
-- TABELA: support_messages
-- Mensagens dentro de tickets de suporte
-- =====================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON profiles(plan_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- WhatsApp Instances
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

-- Media Files
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(type);

-- Contacts Lists
CREATE INDEX IF NOT EXISTS idx_contacts_lists_user_id ON contacts_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lists_is_favorite ON contacts_lists(is_favorite);

-- Message Templates
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_favorite ON message_templates(is_favorite);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_for ON campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Campaign Items
CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign_id ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status ON campaign_items(status);

-- Support Tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Support Messages
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_lists_updated_at ON contacts_lists;
CREATE TRIGGER update_contacts_lists_updated_at BEFORE UPDATE ON contacts_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar profile automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan_tier, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    'free',
    100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar profile automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - PROFILES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS - PLANS
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;
CREATE POLICY "Anyone can view active plans" ON plans
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage plans" ON plans;
CREATE POLICY "Admins can manage plans" ON plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS - SYSTEM_SETTINGS
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS - PAYMENT_TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert transactions" ON payment_transactions;
CREATE POLICY "System can insert transactions" ON payment_transactions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all transactions" ON payment_transactions;
CREATE POLICY "Admins can view all transactions" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS - WHATSAPP_INSTANCES
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own instances" ON whatsapp_instances;
CREATE POLICY "Users can manage own instances" ON whatsapp_instances
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - MEDIA_FILES
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own media" ON media_files;
CREATE POLICY "Users can manage own media" ON media_files
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - CONTACTS_LISTS
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own contacts lists" ON contacts_lists;
CREATE POLICY "Users can manage own contacts lists" ON contacts_lists
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - MESSAGE_TEMPLATES
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Users can manage own templates" ON message_templates
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - CAMPAIGNS
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own campaigns" ON campaigns;
CREATE POLICY "Users can manage own campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS RLS - CAMPAIGN_ITEMS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own campaign items" ON campaign_items;
CREATE POLICY "Users can view own campaign items" ON campaign_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_items.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can manage campaign items" ON campaign_items;
CREATE POLICY "System can manage campaign items" ON campaign_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update campaign items" ON campaign_items;
CREATE POLICY "System can update campaign items" ON campaign_items
  FOR UPDATE USING (true);

-- =====================================================
-- POLÍTICAS RLS - SUPPORT_TICKETS
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own tickets" ON support_tickets;
CREATE POLICY "Users can manage own tickets" ON support_tickets
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;
CREATE POLICY "Admins can manage all tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS - SUPPORT_MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON support_messages;
CREATE POLICY "Users can view messages from own tickets" ON support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to own tickets" ON support_messages;
CREATE POLICY "Users can send messages to own tickets" ON support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all messages" ON support_messages;
CREATE POLICY "Admins can manage all messages" ON support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir planos padrão
INSERT INTO plans (name, description, tier, price, credits, duration_days, features, is_active, sort_order)
VALUES
  (
    'Grátis',
    'Ideal para testar a plataforma',
    'free',
    0,
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
    2.00,
    1000,
    30,
    '["1.000 créditos/mês", "1 instâncias WhatsApp", "Templates ilimitados", "Suporte prioritário", "Relatórios básicos", "Campanhas programadas"]'::jsonb,
    true,
    2
  ),
  (
    'Prata',
    'Para negócios em crescimento',
    'silver',
    3.00,
    3000,
    30,
    '["3.000 créditos/mês", "2 instâncias WhatsApp", "Templates ilimitados", "Suporte prioritário", "Relatórios avançados", "Webhooks personalizados"]'::jsonb,
    true,
    3
  ),
  (
    'Ouro',
    'Plano empresarial - Sob consulta',
    'gold',
    500.00,
    10000,
    30,
    '["Créditos personalizados", "Instâncias ilimitadas", "Templates ilimitados", "Suporte 24/7", "Relatórios personalizados", "Gerente de conta dedicado", "Treinamento incluído"]'::jsonb,
    true,
    4
  )
ON CONFLICT DO NOTHING;

-- Inserir configurações do Mercado Pago (padrão desabilitado)
INSERT INTO system_settings (key, value, description)
VALUES
  (
    'mercadopago',
    '{
      "access_token": "",
      "public_key": "",
      "webhook_secret": "",
      "is_enabled": false,
      "use_sandbox": true
    }'::jsonb,
    'Configurações do Mercado Pago para processamento de pagamentos'
  )
ON CONFLICT (key) DO NOTHING;

-- Inserir configurações da UAZAPI (padrão desabilitado)
INSERT INTO system_settings (key, value, description)
VALUES
  (
    'uazapi',
    '{
      "base_url": "https://monitor-grupo.uazapi.com",
      "admin_token": "",
      "is_enabled": false
    }'::jsonb,
    'Configurações da UAZAPI para gerenciamento de instâncias WhatsApp'
  )
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- STORAGE BUCKET PARA MEDIA FILES
-- =====================================================
-- Execute separadamente no painel do Supabase em Storage

-- Criar bucket 'media' se não existir:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('media', 'media', true)
-- ON CONFLICT DO NOTHING;

-- Políticas para o bucket media:
-- CREATE POLICY "Users can upload own media" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'media' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Anyone can view media" ON storage.objects
--   FOR SELECT USING (bucket_id = 'media');

-- CREATE POLICY "Users can delete own media" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'media' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================

-- Para verificar se tudo foi criado corretamente:
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
