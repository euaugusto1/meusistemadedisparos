# Guia de Instalação - WhatsApp SaaS

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- UAZAPI self-hosted (opcional para testes)

---

## Passo 1: Criar Projeto no Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Preencha:
   - **Name**: whatsapp-saas
   - **Database Password**: (guarde esta senha!)
   - **Region**: South America (São Paulo)
4. Clique em **Create new project**
5. Aguarde a criação (2-3 minutos)

---

## Passo 2: Obter Credenciais do Supabase

1. No dashboard do projeto, vá em **Settings** > **API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

3. Edite o arquivo `.env.local` com essas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Passo 3: Executar o Schema SQL

1. No Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie e cole o conteúdo de `supabase/schema.sql`
4. Clique em **Run** (Ctrl+Enter)
5. Verifique se não há erros

---

## Passo 4: Configurar o Storage

1. Ainda no **SQL Editor**, crie uma nova query
2. Copie e cole o conteúdo de `supabase/setup-storage.sql`
3. Clique em **Run**

**Verificar:**
- Vá em **Storage** no menu lateral
- Deve aparecer o bucket **media**

---

## Passo 5: Habilitar Realtime

Para o chat de suporte funcionar em tempo real:

1. Vá em **Database** > **Replication**
2. Em **Supabase Realtime**, clique na tabela
3. Habilite para as tabelas:
   - `support_messages`
   - `support_tickets`
   - `campaigns`
   - `campaign_items`
   - `whatsapp_instances`

---

## Passo 6: Instalar Dependências

```bash
cd D:\VS\zero
npm install
```

Se houver erros, tente:
```bash
npm install --legacy-peer-deps
```

---

## Passo 7: Rodar em Desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Passo 8: Criar Usuário Admin

1. Acesse o app e crie uma conta (Sign Up)
2. Confirme o email (verifique a caixa de entrada)
3. No Supabase, vá em **SQL Editor** e execute:

```sql
UPDATE profiles
SET
  role = 'admin',
  plan_tier = 'gold',
  plan_expires_at = NOW() + INTERVAL '365 days',
  credits = 999999
WHERE email = 'seu-email@exemplo.com';
```

---

## Passo 9: Configurar UAZAPI (Opcional)

Se você tem uma instância UAZAPI rodando:

1. Edite `.env.local`:
```env
UAZAPI_BASE_URL=http://seu-servidor:3333
UAZAPI_ADMIN_TOKEN=seu-token
```

2. Reinicie o servidor de desenvolvimento

---

## Build para Produção

### Opção 1: Node.js

```bash
npm run build
npm start
```

### Opção 2: Docker

```bash
docker build -t whatsapp-saas .
docker run -p 3000:3000 --env-file .env.local whatsapp-saas
```

### Opção 3: Docker Compose

```bash
docker-compose up -d
```

---

## Troubleshooting

### Erro: "relation does not exist"
- Execute o schema.sql novamente
- Verifique se não houve erros no SQL Editor

### Erro: "new row violates row-level security"
- Verifique se está autenticado
- Confira as políticas RLS no SQL

### Storage não funciona
- Execute o setup-storage.sql
- Verifique se o bucket "media" foi criado

### Realtime não atualiza
- Habilite replication nas tabelas
- Verifique o console do navegador

---

## Estrutura de Arquivos de Configuração

```
D:\VS\zero\
├── .env.local           # Variáveis de ambiente
├── supabase/
│   ├── schema.sql       # Schema do banco
│   ├── setup-storage.sql # Configuração do Storage
│   └── seed.sql         # Dados iniciais (opcional)
```

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço | Sim |
| `UAZAPI_BASE_URL` | URL da API UAZAPI | Não* |
| `UAZAPI_ADMIN_TOKEN` | Token admin UAZAPI | Não* |
| `NEXT_PUBLIC_APP_URL` | URL do app | Não |

*Obrigatório para envio de mensagens funcionar

---

## Próximos Passos

1. Configurar domínio personalizado no Supabase
2. Configurar SMTP para emails
3. Deploy em Coolify/Vercel/VPS
4. Configurar backups do banco
5. Monitoramento com logs

---

## Suporte

Se encontrar problemas:
1. Verifique os logs do console
2. Confira as configurações do Supabase
3. Revise as variáveis de ambiente
