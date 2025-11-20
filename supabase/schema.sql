-- =====================================================
-- MICRO SAAS WHATSAPP AUTOMATION - DATABASE SCHEMA
-- Supabase PostgreSQL com Row Level Security (RLS)
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE plan_tier AS ENUM ('free', 'bronze', 'silver', 'gold');
CREATE TYPE instance_status AS ENUM ('connected', 'disconnected', 'connecting', 'qr_code');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE campaign_item_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE media_type AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE button_type AS ENUM ('button', 'list', 'poll', 'carousel');

-- =====================================================
-- 2. TABELAS
-- =====================================================

-- Profiles (extensão do auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user' NOT NULL,
    plan_tier plan_tier DEFAULT 'free' NOT NULL,
    plan_expires_at TIMESTAMPTZ,
    credits INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Instâncias WhatsApp
CREATE TABLE whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    instance_key TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    status instance_status DEFAULT 'disconnected' NOT NULL,
    phone_number TEXT,
    webhook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Biblioteca de Mídia (compartilhada globalmente)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    public_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    type media_type NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Templates de Mensagem
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    link_url TEXT,
    button_type button_type,
    buttons JSONB DEFAULT '[]'::jsonb,
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Listas de Contatos
CREATE TABLE contacts_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    contacts JSONB DEFAULT '[]'::jsonb NOT NULL,
    contact_count INTEGER DEFAULT 0 NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Campanhas
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL,
    template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    link_url TEXT,
    button_type button_type,
    buttons JSONB DEFAULT '[]'::jsonb,
    status campaign_status DEFAULT 'draft' NOT NULL,
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0 NOT NULL,
    sent_count INTEGER DEFAULT 0 NOT NULL,
    failed_count INTEGER DEFAULT 0 NOT NULL,
    min_delay INTEGER DEFAULT 5 NOT NULL,
    max_delay INTEGER DEFAULT 20 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Itens da Campanha (fila de envio detalhada)
CREATE TABLE campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    recipient_name TEXT,
    status campaign_item_status DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tickets de Suporte
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status ticket_status DEFAULT 'open' NOT NULL,
    priority INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ
);

-- Mensagens de Suporte
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Logs de Atividade (auditoria)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- 3. ÍNDICES
-- =====================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_plan_tier ON profiles(plan_tier);
CREATE INDEX idx_profiles_plan_expires_at ON profiles(plan_expires_at);

-- WhatsApp Instances
CREATE INDEX idx_instances_user_id ON whatsapp_instances(user_id);
CREATE INDEX idx_instances_status ON whatsapp_instances(status);

-- Media Files
CREATE INDEX idx_media_user_id ON media_files(user_id);
CREATE INDEX idx_media_type ON media_files(type);
CREATE INDEX idx_media_created_at ON media_files(created_at DESC);

-- Message Templates
CREATE INDEX idx_templates_user_id ON message_templates(user_id);
CREATE INDEX idx_message_templates_favorite ON message_templates(user_id, is_favorite) WHERE is_favorite = TRUE;

-- Contacts Lists
CREATE INDEX idx_contacts_lists_user_id ON contacts_lists(user_id);
CREATE INDEX idx_contacts_lists_favorite ON contacts_lists(user_id, is_favorite) WHERE is_favorite = TRUE;

-- Campaigns
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_for ON campaigns(scheduled_for);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Campaign Items
CREATE INDEX idx_campaign_items_campaign_id ON campaign_items(campaign_id);
CREATE INDEX idx_campaign_items_status ON campaign_items(status);

-- Support Tickets
CREATE INDEX idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);

-- Support Messages
CREATE INDEX idx_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_messages_sender_id ON support_messages(sender_id);

-- Activity Logs
CREATE INDEX idx_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_logs_created_at ON activity_logs(created_at DESC);

-- =====================================================
-- 4. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se plano está ativo
CREATE OR REPLACE FUNCTION is_plan_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND (plan_expires_at IS NULL OR plan_expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar profile automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar contagem de contatos
CREATE OR REPLACE FUNCTION update_contact_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.contact_count = jsonb_array_length(NEW.contacts);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para decrementar créditos do usuário
CREATE OR REPLACE FUNCTION decrement_credits(user_id UUID, amount INTEGER DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar créditos do usuário (não permite valores negativos)
  UPDATE profiles
  SET credits = GREATEST(credits - amount, 0)
  WHERE id = user_id;
END;
$$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger para criar profile após signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_instances_updated_at
    BEFORE UPDATE ON whatsapp_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_lists_updated_at
    BEFORE UPDATE ON contacts_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para contagem de contatos
CREATE TRIGGER update_contacts_count
    BEFORE INSERT OR UPDATE ON contacts_lists
    FOR EACH ROW EXECUTE FUNCTION update_contact_count();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: profiles
-- =====================================================

-- Usuários podem ver seu próprio perfil, admin vê todos
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR is_admin(auth.uid()));

-- Usuários podem atualizar seu próprio perfil, admin pode atualizar qualquer perfil
CREATE POLICY "Users can update own profile or admin can update any"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR is_admin(auth.uid()))
    WITH CHECK (auth.uid() = id OR is_admin(auth.uid()));

-- Apenas admin pode deletar perfis
CREATE POLICY "Only admin can delete profiles"
    ON profiles FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- POLICIES: whatsapp_instances
-- =====================================================

-- Usuários veem suas instâncias, admin vê todas
CREATE POLICY "Users can view own instances"
    ON whatsapp_instances FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem criar instâncias (se plano ativo)
CREATE POLICY "Users can create instances"
    ON whatsapp_instances FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_plan_active(auth.uid()));

-- Usuários podem atualizar suas instâncias
CREATE POLICY "Users can update own instances"
    ON whatsapp_instances FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem deletar suas instâncias
CREATE POLICY "Users can delete own instances"
    ON whatsapp_instances FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- =====================================================
-- POLICIES: media_files
-- =====================================================

-- Todos usuários autenticados podem ver todas as mídias (biblioteca compartilhada)
CREATE POLICY "Authenticated users can view all media"
    ON media_files FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Usuários podem fazer upload (se plano ativo)
CREATE POLICY "Users can upload media"
    ON media_files FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_plan_active(auth.uid()));

-- APENAS admin pode deletar mídias
CREATE POLICY "Only admin can delete media"
    ON media_files FOR DELETE
    USING (is_admin(auth.uid()));

-- =====================================================
-- POLICIES: message_templates
-- =====================================================

-- Usuários veem seus templates, admin vê todos
CREATE POLICY "Users can view own templates"
    ON message_templates FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem criar templates (se plano ativo)
CREATE POLICY "Users can create templates"
    ON message_templates FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_plan_active(auth.uid()));

-- Usuários podem atualizar seus templates
CREATE POLICY "Users can update own templates"
    ON message_templates FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem deletar seus templates
CREATE POLICY "Users can delete own templates"
    ON message_templates FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- =====================================================
-- POLICIES: contacts_lists
-- =====================================================

-- Usuários veem suas listas, admin vê todas
CREATE POLICY "Users can view own lists"
    ON contacts_lists FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem criar listas (se plano ativo)
CREATE POLICY "Users can create lists"
    ON contacts_lists FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_plan_active(auth.uid()));

-- Usuários podem atualizar suas listas
CREATE POLICY "Users can update own lists"
    ON contacts_lists FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem deletar suas listas
CREATE POLICY "Users can delete own lists"
    ON contacts_lists FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- =====================================================
-- POLICIES: campaigns
-- =====================================================

-- Usuários veem suas campanhas, admin vê todas
CREATE POLICY "Users can view own campaigns"
    ON campaigns FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem criar campanhas (se plano ativo)
CREATE POLICY "Users can create campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_plan_active(auth.uid()));

-- Usuários podem atualizar suas campanhas
CREATE POLICY "Users can update own campaigns"
    ON campaigns FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem deletar suas campanhas
CREATE POLICY "Users can delete own campaigns"
    ON campaigns FOR DELETE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- =====================================================
-- POLICIES: campaign_items
-- =====================================================

-- Usuários veem itens de suas campanhas
CREATE POLICY "Users can view own campaign items"
    ON campaign_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_items.campaign_id
            AND (campaigns.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- Usuários podem criar itens em suas campanhas
CREATE POLICY "Users can create campaign items"
    ON campaign_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_items.campaign_id
            AND campaigns.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar itens de suas campanhas
CREATE POLICY "Users can update own campaign items"
    ON campaign_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_items.campaign_id
            AND (campaigns.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- Usuários podem deletar itens de suas campanhas
CREATE POLICY "Users can delete own campaign items"
    ON campaign_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM campaigns
            WHERE campaigns.id = campaign_items.campaign_id
            AND (campaigns.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- =====================================================
-- POLICIES: support_tickets
-- =====================================================

-- Usuários veem seus tickets, admin vê todos
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Usuários podem criar tickets
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Usuários podem atualizar seus tickets, admin todos
CREATE POLICY "Users can update own tickets"
    ON support_tickets FOR UPDATE
    USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- =====================================================
-- POLICIES: support_messages
-- =====================================================

-- Usuários veem mensagens de seus tickets, admin vê todas
CREATE POLICY "Users can view messages of own tickets"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- Usuários podem enviar mensagens em seus tickets
CREATE POLICY "Users can send messages to own tickets"
    ON support_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND (support_tickets.user_id = auth.uid() OR is_admin(auth.uid()))
        )
    );

-- =====================================================
-- POLICIES: activity_logs
-- =====================================================

-- Apenas admin pode ver logs
CREATE POLICY "Only admin can view logs"
    ON activity_logs FOR SELECT
    USING (is_admin(auth.uid()));

-- Sistema pode inserir logs (via service role)
CREATE POLICY "System can insert logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 7. VIEWS ÚTEIS
-- =====================================================

-- View de estatísticas do dashboard
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    p.id as user_id,
    p.plan_tier,
    p.plan_expires_at,
    p.credits,
    EXTRACT(DAY FROM (p.plan_expires_at - NOW())) as days_remaining,
    (SELECT COUNT(*) FROM whatsapp_instances wi WHERE wi.user_id = p.id AND wi.status = 'connected') as connected_instances,
    (SELECT COUNT(*) FROM campaigns c WHERE c.user_id = p.id) as total_campaigns,
    (SELECT COALESCE(SUM(c.sent_count), 0) FROM campaigns c WHERE c.user_id = p.id) as total_sent,
    (SELECT COALESCE(SUM(c.failed_count), 0) FROM campaigns c WHERE c.user_id = p.id) as total_failed
FROM profiles p;

-- View de campanhas com detalhes
CREATE OR REPLACE VIEW campaigns_detailed AS
SELECT
    c.*,
    p.email as user_email,
    p.full_name as user_name,
    wi.name as instance_name,
    mf.public_url as media_url
FROM campaigns c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN whatsapp_instances wi ON c.instance_id = wi.id
LEFT JOIN media_files mf ON c.media_id = mf.id;

-- =====================================================
-- 8. DADOS INICIAIS (SEED)
-- =====================================================

-- Nota: Execute após criar o primeiro usuário admin via Auth
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@seudominio.com';