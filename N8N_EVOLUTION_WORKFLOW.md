# 🤖 Workflow N8N - Evolution API Campaign Dispatcher

Workflow automático para processar campanhas de instâncias de teste (15 dias) via Evolution API em background.

## 📋 Visão Geral

Este workflow elimina a necessidade do usuário manter o navegador aberto durante o envio de campanhas. Ele roda automaticamente no n8n, processando campanhas de instâncias de teste Evolution API a cada 30 segundos.

### ✨ Benefícios

- ✅ **Processamento em Background**: N8N processa sem intervenção do usuário
- ✅ **Confiável**: Retry automático em caso de falhas
- ✅ **Escalável**: Processa múltiplas campanhas simultaneamente
- ✅ **Rastreável**: Logs completos de execução
- ✅ **Específico**: Apenas instâncias de teste (is_test=true)
- ✅ **Delay Inteligente**: 35-250 segundos randômicos entre envios

---

## 🔧 Instalação

### 1. Variáveis de Ambiente

Adicione ao seu `.env.local`:

```bash
# N8N Configuration
N8N_API_KEY=sua-chave-secreta-aqui

# Evolution API (já configurado)
EVOLUTION_API_URL=https://dev.n8n.sistemabrasil.online/api/v1
EVOLUTION_API_KEY=sua-api-key-evolution

# App URL
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### 2. Importar Workflow no N8N

1. Acesse seu painel n8n
2. Clique em **"Import from File"**
3. Selecione o arquivo: `workflows/evolution-api-campaign-dispatcher.json`
4. Configure as credenciais (próximo passo)

### 3. Configurar Credenciais no N8N

O workflow precisa de acesso às seguintes variáveis de ambiente no n8n:

**Variáveis necessárias:**
- `N8N_API_KEY` - Para autenticar com sua API Next.js
- `NEXT_PUBLIC_APP_URL` - URL base da sua aplicação
- `EVOLUTION_API_URL` - URL da Evolution API

**Como configurar:**
1. No n8n, vá em **Settings → Environment Variables**
2. Adicione cada variável com seu respectivo valor
3. Salve as alterações

### 4. Ativar o Workflow

1. No editor do workflow, clique em **"Active"** no canto superior direito
2. O workflow começará a executar a cada 30 segundos

---

## 📊 Fluxo de Execução

### Diagrama do Workflow

```
┌─────────────────────┐
│ Schedule Trigger    │ ← A cada 30 segundos
│ (30s)               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch Test          │ ← GET /api/n8n/test-campaigns
│ Campaigns           │   (Campanhas de teste pendentes)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Has Campaigns?      │ ← Verifica se há campanhas
└─────┬─────────┬─────┘
      │ Sim     │ Não
      │         └─────► [No Campaigns - Fim]
      ▼
┌─────────────────────┐
│ Split Campaigns     │ ← Processa 1 campanha por vez
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch Recipients    │ ← GET /api/n8n/campaigns/[id]/items
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Status to    │ ← PATCH /api/n8n/campaigns/[id]/status
│ Processing          │   { status: "processing" }
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Has Recipients?     │ ← Verifica se há destinatários
└─────┬─────────┬─────┘
      │ Sim     │ Não
      │         └─────► [Volta para Split Campaigns]
      ▼
┌─────────────────────┐
│ Split Recipients    │ ← Processa 1 destinatário por vez
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Send Message via    │ ← POST Evolution API
│ Evolution API       │   /message/sendText/{instanceKey}
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Item Status  │ ← PATCH /api/n8n/campaign-items/[id]/status
│                     │   { status: "sent" | "failed" }
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Campaign     │ ← PATCH /api/n8n/campaigns/[id]/counters
│ Counters            │   { increment_sent: 1 ou increment_failed: 1 }
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Random Delay        │ ← Aguarda 35-250 segundos
│ (35-250s)           │   (Evita ban do WhatsApp)
└──────────┬──────────┘
           │
           └─────► [Volta para Split Recipients - Próximo destinatário]

           │ (Quando todos recipients processados)
           ▼
┌─────────────────────┐
│ Complete Campaign   │ ← PATCH /api/n8n/campaigns/[id]/complete
└──────────┬──────────┘
           │
           └─────► [Volta para Split Campaigns - Próxima campanha]
```

---

## 🔌 Endpoints API Criados

### 1. GET /api/n8n/test-campaigns

Busca campanhas pendentes de instâncias de teste.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Retorna**:
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "title": "Título da Campanha",
      "message": "Mensagem",
      "status": "scheduled",
      "instance": {
        "instance_key": "test_...",
        "api_token": "hash-evolution",
        "is_test": true,
        "expires_at": "2025-02-08T..."
      },
      "media": { /* dados da mídia se houver */ }
    }
  ],
  "count": 1
}
```

**Filtros aplicados**:
- `status` IN ('scheduled', 'draft')
- `instance.is_test` = true
- `instance.api_token` IS NOT NULL
- `instance.expires_at` > NOW() OU NULL
- `scheduled_for` <= NOW() OU NULL

---

### 2. GET /api/n8n/campaigns/[id]/items

Busca destinatários pendentes de uma campanha.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Retorna**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "title": "Título"
  },
  "items": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "recipient": "5511999999999",
      "recipient_name": "João",
      "status": "pending"
    }
  ],
  "count": 10
}
```

---

### 3. PATCH /api/n8n/campaigns/[id]/status

Atualiza status da campanha.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Body**:
```json
{
  "status": "processing"  // ou "completed", "failed", etc
}
```

**Retorna**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "processing",
    "started_at": "2025-01-24T12:00:00Z"
  }
}
```

**Status válidos**: draft, scheduled, processing, completed, failed, cancelled, paused

---

### 4. PATCH /api/n8n/campaign-items/[id]/status

Atualiza status de um destinatário.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Body**:
```json
{
  "status": "sent",  // ou "failed"
  "error_message": null,  // ou mensagem de erro
  "response_data": { /* resposta da Evolution API */ }
}
```

**Retorna**:
```json
{
  "success": true,
  "item": {
    "id": "uuid",
    "status": "sent",
    "sent_at": "2025-01-24T12:05:00Z"
  }
}
```

**Ações automáticas**:
- Se `status=sent`: Decrementa 1 crédito do usuário

---

### 5. PATCH /api/n8n/campaigns/[id]/counters

Incrementa contadores de envio/falha.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Body**:
```json
{
  "increment_sent": 1,      // quantos envios com sucesso
  "increment_failed": 0     // quantos falharam
}
```

**Retorna**:
```json
{
  "success": true,
  "campaign": {
    "sent_count": 5,
    "failed_count": 1
  },
  "progress": {
    "total": 10,
    "sent": 5,
    "failed": 1,
    "remaining": 4
  }
}
```

---

### 6. PATCH /api/n8n/campaigns/[id]/complete

Finaliza campanha quando todos destinatários foram processados.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Retorna**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "completed",  // ou "failed" se nenhum sucesso
    "completed_at": "2025-01-24T13:00:00Z"
  },
  "statistics": {
    "total_recipients": 10,
    "sent_count": 9,
    "failed_count": 1,
    "success_rate": "90.00%"
  }
}
```

**Lógica de status final**:
- `completed`: Se pelo menos 1 enviado com sucesso
- `failed`: Se 0 enviados com sucesso E tem falhas

---

## 🚀 Como Funciona

### 1. Detecção de Campanhas

A cada 30 segundos, o workflow:
1. Faz GET em `/api/n8n/test-campaigns`
2. Filtra campanhas de instâncias de teste Evolution API
3. Verifica se há campanhas prontas para envio

### 2. Processamento de Campanha

Para cada campanha encontrada:
1. Busca todos destinatários pendentes
2. Atualiza status para "processing"
3. Processa 1 destinatário por vez

### 3. Envio de Mensagem

Para cada destinatário:
1. Envia via Evolution API usando o `api_token` da instância
2. Atualiza status do item (sent/failed)
3. Atualiza contadores da campanha
4. **Decrementa crédito do usuário** (se enviado com sucesso)
5. Aguarda delay randômico (35-250s)

### 4. Finalização

Quando todos destinatários foram processados:
1. Marca campanha como "completed" ou "failed"
2. Registra completed_at
3. Calcula estatísticas finais

---

## 🔒 Segurança

### Autenticação

Todos endpoints N8N requerem:
```bash
Authorization: Bearer {N8N_API_KEY}
```

Se o token estiver incorreto ou ausente, retorna **401 Unauthorized**.

### Validações

- ✅ Apenas campanhas de instâncias de teste
- ✅ Apenas campanhas do próprio usuário (via RLS)
- ✅ Instâncias não expiradas
- ✅ Tokens Evolution API válidos

### Rate Limiting

- Delay randômico: 35-250 segundos entre envios
- Evita ban do WhatsApp
- Configurável no node "Random Delay"

---

## 📈 Monitoramento

### Logs do N8N

1. Acesse o painel n8n
2. Vá em **Executions**
3. Visualize logs de cada execução:
   - Campanhas processadas
   - Mensagens enviadas/falhadas
   - Erros detalhados

### Banco de Dados

Acompanhe em tempo real:

**Campanhas**:
```sql
SELECT id, title, status, sent_count, failed_count, total_recipients
FROM campaigns
WHERE status = 'processing'
ORDER BY started_at DESC;
```

**Items**:
```sql
SELECT status, COUNT(*) as count
FROM campaign_items
WHERE campaign_id = 'uuid'
GROUP BY status;
```

---

## ⚠️ Troubleshooting

### Workflow não está executando

**Problema**: Workflow não roda automaticamente

**Solução**:
1. Verifique se está **Active** (botão verde no n8n)
2. Verifique se o Schedule Trigger está configurado (30s)
3. Veja logs de erro em **Executions**

---

### Erro 401 Unauthorized

**Problema**: Endpoints retornam 401

**Solução**:
1. Verifique se `N8N_API_KEY` está configurada no n8n
2. Verifique se a mesma chave está no `.env.local` do Next.js
3. As chaves devem ser idênticas

---

### Mensagens não são enviadas

**Problema**: Items ficam em "pending"

**Solução**:
1. Verifique se a Evolution API está online
2. Teste manualmente: `curl -H "apikey: TOKEN" EVOLUTION_URL/instance/connectionState/INSTANCE_KEY`
3. Verifique se `api_token` da instância é válido
4. Veja logs de erro no node "Send Message via Evolution API"

---

### Créditos não decrementam

**Problema**: Usuário não perde créditos após envio

**Solução**:
1. Verifique se a função `decrement_user_credits` existe no Supabase
2. Execute:
```sql
CREATE OR REPLACE FUNCTION decrement_user_credits(user_uuid UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET credits = GREATEST(credits - amount, 0)
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Delay muito longo entre envios

**Problema**: Demora muito entre mensagens

**Solução**:
1. Edite o node "Random Delay (35-250s)"
2. Altere a fórmula:
   - Mínimo: `35` → novo valor (ex: 10)
   - Máximo: `250` → novo valor (ex: 60)
   - Fórmula: `Math.floor(Math.random() * (MAX - MIN + 1)) + MIN`

---

## 🎯 Próximos Passos

### Melhorias Sugeridas

1. **Suporte a Mídia**
   - Atualmente envia apenas texto
   - Adicionar nodes para enviar imagem/vídeo/áudio

2. **Webhooks de Delivery**
   - Receber confirmação de entrega do WhatsApp
   - Atualizar status de "sent" para "delivered"

3. **Analytics Integration**
   - Salvar eventos na tabela `analytics_events`
   - Rastrear taxa de abertura e resposta

4. **Notificações**
   - Enviar email quando campanha finalizar
   - Integrar com Telegram/Discord para alertas

5. **Dashboard de Monitoramento**
   - Página dedicada para acompanhar campanhas em processamento
   - Real-time updates via Supabase Realtime

---

## 📚 Referências

- [N8N Documentation](https://docs.n8n.io/)
- [Evolution API Docs](https://doc.evolution-api.com/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🤝 Suporte

Problemas com o workflow?

1. Verifique os logs do n8n em **Executions**
2. Verifique os logs do Next.js no terminal
3. Consulte esta documentação
4. Entre em contato com o suporte técnico

---

**Desenvolvido com N8N + Evolution API + Next.js 14**
