# 🚀 Guia de Configuração do Supabase

## 📋 Pré-requisitos

- Conta no Supabase (https://supabase.com)
- Projeto criado no Supabase
- Acesso ao SQL Editor

## 🗄️ Passo 1: Executar o Schema SQL

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor** (no menu lateral esquerdo)
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo `supabase-schema.sql`
5. Cole no editor SQL
6. Clique em **Run** ou pressione `Ctrl+Enter`

✅ **Resultado esperado:** Todas as tabelas, índices, triggers e políticas RLS serão criados.

## 📂 Passo 2: Configurar Storage (Bucket para Mídias)

### 2.1 Criar Bucket

1. Vá em **Storage** no menu lateral
2. Clique em **Create a new bucket**
3. Configure:
   - **Name:** `media`
   - **Public bucket:** ✅ Marcado (para permitir acesso público às mídias)
4. Clique em **Create bucket**

### 2.2 Configurar Políticas do Bucket

1. Clique no bucket `media` que você acabou de criar
2. Vá na aba **Policies**
3. Clique em **New Policy**

**Política 1: Upload de Mídia**
```sql
CREATE POLICY "Users can upload own media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Política 2: Visualizar Mídia**
```sql
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');
```

**Política 3: Deletar Mídia**
```sql
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🔐 Passo 3: Verificar Configurações de Autenticação

1. Vá em **Authentication** > **Settings**
2. Certifique-se que está habilitado:
   - ✅ Enable email confirmations (se quiser confirmação por email)
   - ✅ Enable email signups

## 🔑 Passo 4: Copiar Credenciais

1. Vá em **Project Settings** > **API**
2. Copie as seguintes informações:

```bash
# URL do Projeto
NEXT_PUBLIC_SUPABASE_URL=sua-url-aqui

# Chave Anon (pública)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Service Role Key (NUNCA exponha no frontend!)
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

3. Adicione no arquivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

## ✅ Passo 5: Verificar Instalação

Execute no SQL Editor para verificar se todas as tabelas foram criadas:

```sql
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Você deve ver as seguintes tabelas:**
- ✅ campaign_items
- ✅ campaigns
- ✅ contacts_lists
- ✅ media_files
- ✅ message_templates
- ✅ payment_transactions
- ✅ plans
- ✅ profiles
- ✅ support_messages
- ✅ support_tickets
- ✅ system_settings
- ✅ whatsapp_instances

## 👤 Passo 6: Criar Primeiro Usuário Admin

1. Vá em **Authentication** > **Users**
2. Clique em **Add user** > **Create new user**
3. Preencha email e senha
4. Após criar, vá no SQL Editor e execute:

```sql
-- Substitua o email pelo email do usuário que você criou
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu-email@exemplo.com';
```

## 🎨 Passo 7: Configurar RLS (Row Level Security)

As políticas RLS já foram criadas automaticamente pelo script, mas você pode verificar:

1. Vá em **Database** > **Tables**
2. Clique em qualquer tabela (ex: `profiles`)
3. Vá na aba **Policies**
4. Você deve ver as políticas configuradas

## 📊 Passo 8: Verificar Dados Iniciais

Execute no SQL Editor:

```sql
-- Verificar planos criados
SELECT * FROM plans ORDER BY sort_order;

-- Verificar configurações do sistema
SELECT key, description FROM system_settings;
```

**Você deve ver:**
- 4 planos (Grátis, Bronze, Prata, Ouro)
- 2 configurações (mercadopago, uazapi)

## 🔧 Configurações Adicionais

### Configurar Mercado Pago

1. Vá em **SQL Editor**
2. Execute:

```sql
UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        value,
        '{access_token}',
        '"SEU_ACCESS_TOKEN_AQUI"'
      ),
      '{public_key}',
      '"SUA_PUBLIC_KEY_AQUI"'
    ),
    '{webhook_secret}',
    '"SEU_WEBHOOK_SECRET_AQUI"'
  ),
  '{is_enabled}',
  'true'
)
WHERE key = 'mercadopago';
```

### Configurar UAZAPI

```sql
UPDATE system_settings
SET value = jsonb_set(
  jsonb_set(
    value,
    '{admin_token}',
    '"SEU_ADMIN_TOKEN_AQUI"'
  ),
  '{is_enabled}',
  'true'
)
WHERE key = 'uazapi';
```

## 🐛 Troubleshooting

### Erro: "relation does not exist"
- Certifique-se que executou todo o script SQL
- Verifique se está usando o projeto correto

### Erro: "permission denied"
- Verifique se está logado com uma conta válida
- Verifique as políticas RLS

### Erro: "Could not find the table 'public.payment_transactions'"
- Execute novamente a parte do script que cria a tabela `payment_transactions`
- Ou execute manualmente no SQL Editor

### Storage não funciona
- Certifique-se que criou o bucket `media`
- Verifique se o bucket está marcado como público
- Verifique se as políticas do Storage foram criadas

## 📝 Notas Importantes

1. **Backup:** Sempre faça backup antes de executar scripts SQL em produção
2. **Service Role Key:** Nunca exponha a Service Role Key no frontend
3. **RLS:** Não desabilite o Row Level Security em produção
4. **Indexes:** Os índices já foram criados para otimizar performance

## ✅ Checklist Final

- [ ] Schema SQL executado com sucesso
- [ ] Bucket `media` criado
- [ ] Políticas do Storage configuradas
- [ ] Credenciais copiadas para `.env.local`
- [ ] Todas as tabelas criadas (verificado)
- [ ] Planos iniciais criados
- [ ] Primeiro usuário admin criado
- [ ] Mercado Pago configurado (opcional)
- [ ] UAZAPI configurado (opcional)

---

🎉 **Pronto! Seu banco de dados Supabase está configurado e pronto para uso!**
