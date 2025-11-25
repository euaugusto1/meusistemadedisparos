# 🤖 Workflows N8N - Evolution API Campaign System

Sistema completo de automação para processar campanhas via Evolution API em background, com suporte a **agendamento**, **recorrência** e **dual workflow** (teste + produção).

## 📋 Visão Geral

O sistema N8N elimina a necessidade do usuário manter o navegador aberto durante o envio de campanhas. Possui **DOIS workflows distintos**:

### 🔵 Workflow 1: Test Instances (Instâncias de Teste)
- **Endpoint**: `/api/n8n/test-campaigns`
- **Alvo**: Instâncias de teste de 15 dias (`is_test=true`)
- **Intervalo**: 30 segundos
- **Recursos**: Envio de texto simples
- **Workflow**: `evolution-api-campaign-dispatcher.json`

### 🟢 Workflow 2: Production Instances (Instâncias de Produção)
- **Endpoint**: `/api/n8n/scheduled-campaigns`
- **Alvo**: Instâncias de produção (`is_test=false`)
- **Intervalo**: 2 minutos (recomendado)
- **Recursos**: Mídia (base64), throttling, recorrência
- **Workflow**: `evolution-api-production-dispatcher.json` *(a criar)*

### ✨ Benefícios

- ✅ **Processamento em Background**: N8N processa sem intervenção do usuário
- ✅ **Agendamento Inteligente**: Suporte a immediate, scheduled, recurring, smart
- ✅ **Recorrência Automática**: Campanhas recorrentes são reagendadas automaticamente
- ✅ **Dual Workflow**: Separação entre teste e produção para maior estabilidade
- ✅ **Confiável**: Retry automático em caso de falhas
- ✅ **Escalável**: Processa múltiplas campanhas simultaneamente
- ✅ **Rastreável**: Logs completos de execução
- ✅ **Delay Inteligente**: 35-250 segundos randômicos ou configurável por campanha

---

## 🔧 Instalação

### ⚠️ IMPORTANTE: Limitação de Variáveis de Ambiente

O plano atual do n8n **NÃO tem acesso a variáveis de ambiente**. Por isso, você precisa configurar os valores **diretamente no workflow**.

📖 **[SIGA O GUIA COMPLETO DE CONFIGURAÇÃO](N8N_SETUP_GUIDE.md)**

### 1. Variáveis de Ambiente (Next.js)

Adicione ao seu `.env.local` **apenas para o Next.js**:

```bash
# N8N Configuration
N8N_API_KEY=sua-chave-secreta-aqui

# Evolution API (já configurado)
EVOLUTION_API_URL=https://dev.n8n.sistemabrasil.online
EVOLUTION_API_KEY=sua-api-key-evolution

# App URL
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### 2. Importar Workflows no N8N

**IMPORTANTE**: Agora existem **2 workflows separados** que devem ser importados:

#### 🔵 Workflow 1: Test Instances
1. Acesse seu painel n8n
2. Clique em **"Import from File"**
3. Selecione: `workflows/evolution-api-campaign-dispatcher.json`
4. Este workflow processa campanhas de **instâncias de teste** (trial 15 dias)
5. Executa a cada **30 segundos**

#### 🟢 Workflow 2: Production Instances
1. No painel n8n, clique em **"Import from File"** novamente
2. Selecione: `workflows/evolution-api-production-dispatcher.json`
3. Este workflow processa campanhas de **instâncias de produção**
4. Executa a cada **2 minutos** (recomendado para evitar sobrecarga)
5. Suporta **mídia (base64)**, **throttling** e **botões interativos**

**Por que 2 workflows?**
- ✅ **Isolamento**: Falhas em testes não afetam produção
- ✅ **Performance**: Produção tem intervalo maior (mais estável)
- ✅ **Recursos**: Teste usa apenas texto, produção tem mídia/botões
- ✅ **Monitoramento**: Facilita visualizar execuções separadamente

### 3. Configurar Valores Manualmente no N8N

Como o n8n não tem variáveis de ambiente, você precisa editar **CADA NODE HTTP Request**:

**📝 Valores que você precisa substituir:**

```bash
# 1. URL da sua aplicação (em 6 nodes)
De: ={{$env.NEXT_PUBLIC_APP_URL}}/api/...
Para: https://seu-dominio.com/api/...

# 2. N8N API Key (em 6 nodes - header Authorization)
De: =Bearer {{$env.N8N_API_KEY}}
Para: Bearer sua-chave-secreta-aqui

# 3. Evolution API URL (em 1 node - "Send Message via Evolution API")
De: ={{$env.EVOLUTION_API_URL}}/message/...
Para: https://dev.n8n.sistemabrasil.online/message/...
```

**🎯 Lista de Nodes para Editar (WORKFLOW 1 - TEST):**

1. ✏️ **Fetch Test Campaigns** - URL + Authorization header
2. ✏️ **Fetch Recipients** - URL + Authorization header
3. ✏️ **Update Status to Processing** - URL + Authorization header
4. ✏️ **Send Message via Evolution API** - URL (Evolution API)
5. ✏️ **Update Item Status** - URL + Authorization header
6. ✏️ **Update Campaign Counters** - URL + Authorization header
7. ✏️ **Complete Campaign** - URL + Authorization header

**🎯 Lista de Nodes para Editar (WORKFLOW 2 - PRODUCTION):**

1. ✏️ **Fetch Production Campaigns** - URL + Authorization header
2. ✏️ **Update Status to Processing** - URL + Authorization header
3. ✏️ **Send Media Message** - Já usa `instance.apiUrl` e `instance.apiToken` dinamicamente ✅
4. ✏️ **Send Text Message** - Já usa `instance.apiUrl` e `instance.apiToken` dinamicamente ✅
5. ✏️ **Update Item Status** - URL + Authorization header
6. ✏️ **Update Campaign Counters** - URL + Authorization header
7. ✏️ **Complete Campaign** - URL + Authorization header

**⚠️ ATENÇÃO**:
- No workflow TEST: "Send Message via Evolution API" usa `$env.EVOLUTION_API_URL` - você precisa substituir manualmente
- No workflow PRODUCTION: Nodes de envio usam `instance.apiUrl` e `instance.apiToken` **dinamicamente** da campanha (não precisa editar!)

### 4. Salvar e Ativar os Workflows

**Para cada workflow (Test e Production):**

1. Após editar todos os nodes, clique em **"Save"**
2. Clique no botão **"Active"** para ativar
3. Os workflows começarão a executar automaticamente:
   - 🔵 **Test Workflow**: A cada **30 segundos**
   - 🟢 **Production Workflow**: A cada **2 minutos**

**Recomendação**: Ative primeiro o Test Workflow para validar a configuração, depois ative o Production

### 📚 Guia Detalhado

Para um guia passo a passo com screenshots e troubleshooting completo, consulte:

👉 **[N8N_SETUP_GUIDE.md](N8N_SETUP_GUIDE.md)**

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

## 📅 Tipos de Agendamento (Schedule Types)

O sistema suporta 4 tipos de agendamento de campanhas:

### 1. **Immediate** (Envio Imediato)
- ✅ **Quando usar**: Campanhas que devem ser enviadas imediatamente
- 🔄 **Processamento**: N8N processa na próxima execução (30s teste / 2min produção)
- 📝 **Configuração**: `schedule_type: 'immediate'`, `scheduled_at: null`
- **Exemplo de uso**: Promoções urgentes, comunicados importantes

### 2. **Scheduled** (Agendado para Data/Hora)
- ✅ **Quando usar**: Campanhas com data e hora específica
- 🔄 **Processamento**: N8N verifica se `scheduled_at <= now` antes de processar
- 📝 **Configuração**: `schedule_type: 'scheduled'`, `scheduled_at: '2025-12-25T09:00:00-03:00'`
- **Exemplo de uso**: Feliz Natal às 9h do dia 25/12

### 3. **Recurring** (Recorrente)
- ✅ **Quando usar**: Campanhas que se repetem periodicamente
- 🔄 **Processamento**:
  - N8N processa quando `scheduled_at <= now`
  - Ao completar, endpoint `/complete` cria automaticamente próxima ocorrência
  - Nova campanha criada com mesmos destinatários e configurações
- 📝 **Configuração**:
  ```json
  {
    "schedule_type": "recurring",
    "scheduled_at": "2025-01-27T10:00:00-03:00",
    "recurrence_pattern": {
      "type": "daily|weekly|monthly",
      "interval": 1
    }
  }
  ```
- **Padrões suportados**:
  - `daily`: Diário (a cada X dias)
  - `weekly`: Semanal (a cada X semanas)
  - `monthly`: Mensal (a cada X meses)
- **Exemplo de uso**:
  - Relatório semanal toda segunda-feira às 10h
  - Newsletter mensal todo dia 1º às 9h
  - Lembrete diário de backup às 18h

### 4. **Smart** (Inteligência Artificial)
- ✅ **Quando usar**: Deixar a IA sugerir o melhor momento de envio
- 🔄 **Processamento**: N8N verifica `suggested_send_time` (se disponível) ou `scheduled_at`
- 📝 **Configuração**: `schedule_type: 'smart'`, `suggested_send_time: '2025-01-27T14:30:00-03:00'`
- **Exemplo de uso**: Campanhas de marketing onde a IA analisa histórico de engajamento

### ♻️ Fluxo de Recorrência Automática

Quando uma campanha recorrente é completada:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Campanha Recorrente Completa                                │
│    - Status: processing → completed                             │
│    - Endpoint: PATCH /api/n8n/campaigns/[id]/complete          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Sistema Calcula Próxima Ocorrência                          │
│    - daily: +1 dia (ou +interval dias)                         │
│    - weekly: +7 dias (ou +interval semanas)                    │
│    - monthly: +1 mês (ou +interval meses)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Nova Campanha Criada Automaticamente                        │
│    - Mesmo título, mensagem, mídia, botões                     │
│    - Mesmos destinatários (copiados de campaign_items)         │
│    - Nova scheduled_at calculada                               │
│    - Status: scheduled                                         │
│    - Retorna: nextOccurrenceId na resposta                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. N8N Processará Automaticamente na Próxima Execução          │
│    - Sem intervenção manual necessária                         │
│    - Ciclo se repete infinitamente                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Endpoints API Criados

### 1. GET /api/n8n/test-campaigns

Busca campanhas pendentes de **instâncias de teste** (Evolution API trial de 15 dias).

**Autenticação**: Bearer Token (N8N_API_KEY)

**Headers**:
```
Authorization: Bearer {N8N_API_KEY}
```

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
      "schedule_type": "recurring",
      "scheduled_at": "2025-01-27T10:00:00-03:00",
      "recurrence_pattern": {
        "type": "weekly",
        "interval": 1
      },
      "instance": {
        "instance_key": "test_...",
        "api_token": "hash-evolution",
        "is_test": true,
        "expires_at": "2025-02-08T..."
      },
      "media": { /* dados da mídia se houver */ }
    }
  ],
  "count": 1,
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**Filtros aplicados**:
- `status` IN ('scheduled', 'draft')
- `instance.is_test` = true
- `instance.api_token` IS NOT NULL (tem Evolution API)
- `instance.expires_at` > NOW() OU NULL (não expirado)
- **Schedule Type Filtering**:
  - `immediate`: Sempre pronto para envio
  - `scheduled`: Verifica se `scheduled_at <= now`
  - `recurring`: Verifica se `scheduled_at <= now`
  - `smart`: Verifica se `suggested_send_time <= now` ou `scheduled_at <= now`

---

### 2. GET /api/n8n/scheduled-campaigns

Busca campanhas pendentes de **instâncias de produção** (não-teste) prontas para envio.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Headers**:
```
Authorization: Bearer {N8N_API_KEY}
```

**Retorna**:
```json
{
  "success": true,
  "count": 2,
  "campaigns": [
    {
      "campaignId": "uuid",
      "title": "Newsletter Mensal",
      "message": "Olá {{name}}, confira as novidades...",
      "status": "scheduled",
      "scheduledAt": "2025-01-27T09:00:00-03:00",
      "scheduleType": "recurring",
      "timezone": "America/Sao_Paulo",
      "suggestedSendTime": null,
      "recurrencePattern": {
        "type": "monthly",
        "interval": 1
      },
      "instance": {
        "id": "uuid",
        "name": "WhatsApp Principal",
        "phoneNumber": "5511999999999",
        "apiToken": "hash-evolution-api",
        "apiUrl": "https://evo.example.com",
        "status": "connected",
        "isTest": false
      },
      "recipients": [
        {
          "id": "uuid",
          "phoneNumber": "5511888888888",
          "status": "pending"
        }
      ],
      "totalRecipients": 150,
      "media": {
        "fileName": "promo.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 245678,
        "base64": "iVBORw0KGgoAAAANS..."
      },
      "linkUrl": "https://example.com/promo",
      "buttonType": "cta",
      "buttons": [
        {
          "type": "url",
          "text": "Ver Promoção",
          "url": "https://example.com/promo"
        }
      ],
      "throttling": {
        "enabled": true,
        "messagesPerMinute": 20,
        "delayBetweenMessages": 3000,
        "minDelay": 35,
        "maxDelay": 250
      }
    }
  ],
  "timestamp": "2025-01-27T12:00:00.000Z"
}
```

**Filtros aplicados**:
- `status` = 'scheduled'
- `is_paused` != true
- `instance_id` IS NOT NULL
- `instance.is_test` = false (apenas produção)
- `instance.status` = 'connected'
- `instance.api_token` IS NOT NULL
- **Schedule Type Filtering**:
  - `immediate`: Sempre pronto para envio
  - `scheduled`: Verifica se `scheduled_at <= now`
  - `recurring`: Verifica se `scheduled_at <= now`
  - `smart`: Verifica se `suggested_send_time <= now` ou `scheduled_at <= now`

**Recursos Adicionais**:
- ✅ Retorna mídia como base64 (pronta para envio Evolution API)
- ✅ Retorna todos recipients pendentes de cada campanha
- ✅ Inclui configurações de throttling
- ✅ Suporta botões interativos (CTA, Quick Reply)

---

### 3. GET /api/n8n/campaigns/[id]/items

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

Finaliza campanha quando todos destinatários foram processados. **Suporta recorrência automática**.

**Autenticação**: Bearer Token (N8N_API_KEY)

**Retorna**:
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2025-01-27T13:00:00Z",
    "schedule_type": "recurring",
    "recurrence_pattern": {
      "type": "weekly",
      "interval": 1
    }
  },
  "statistics": {
    "total_recipients": 150,
    "sent_count": 148,
    "failed_count": 2,
    "success_rate": "98.67%",
    "final_status": "completed"
  },
  "message": "Campanha finalizada com status: completed",
  "recurring": {
    "nextOccurrenceId": "uuid-da-proxima-campanha",
    "message": "Próxima ocorrência agendada com sucesso"
  },
  "timestamp": "2025-01-27T13:00:00.000Z"
}
```

**Lógica de status final**:
- `completed`: Se pelo menos 1 enviado com sucesso
- `failed`: Se 0 enviados com sucesso E tem falhas
- `processing`: Se ainda há items pendentes (retorna erro)

**Recorrência Automática**:

Se a campanha for `schedule_type: 'recurring'` e completada com sucesso:

1. **Calcula próxima ocorrência**:
   - `daily`: `scheduled_at + interval dias`
   - `weekly`: `scheduled_at + (interval × 7) dias`
   - `monthly`: `scheduled_at + interval meses`

2. **Cria nova campanha** com:
   - ✅ Mesmo título, mensagem, mídia, botões
   - ✅ Mesmos destinatários (copiados de `campaign_items`)
   - ✅ Nova `scheduled_at` calculada
   - ✅ `status: 'scheduled'` (pronta para N8N processar)
   - ✅ Mesmo `recurrence_pattern`

3. **Retorna `nextOccurrenceId`** para tracking

4. **N8N processará automaticamente** na próxima execução

**Exemplo de Resposta (Sem Recorrência)**:
```json
{
  "success": true,
  "campaign": { "id": "uuid", "status": "completed" },
  "statistics": { ... },
  "message": "Campanha finalizada com status: completed",
  "recurring": null,
  "timestamp": "2025-01-27T13:00:00.000Z"
}
```

---

## 🚀 Como Funciona

### 🔵 Workflow 1: Test Instances (30 segundos)

**1. Detecção de Campanhas de Teste**
- Faz GET em `/api/n8n/test-campaigns`
- Filtra campanhas de instâncias `is_test=true`
- Verifica se `scheduled_at <= now` (baseado em `schedule_type`)

**2. Processamento**
- Para cada campanha: busca destinatários pendentes
- Atualiza status para "processing"
- Processa 1 destinatário por vez

**3. Envio (Texto Simples)**
- Chama Evolution API: `POST /message/sendText`
- Atualiza status do item (sent/failed)
- Atualiza contadores da campanha
- **Decrementa crédito do usuário** (se sucesso)
- Aguarda delay randômico (35-250s)

**4. Finalização**
- Marca campanha como "completed" ou "failed"
- Calcula estatísticas finais
- **Se recorrente**: Cria próxima ocorrência automaticamente

---

### 🟢 Workflow 2: Production Instances (2 minutos)

**1. Detecção de Campanhas de Produção**
- Faz GET em `/api/n8n/scheduled-campaigns`
- Filtra campanhas de instâncias `is_test=false`
- Verifica se instância está `connected`
- Verifica se `scheduled_at <= now` (baseado em `schedule_type`)

**2. Processamento Avançado**
- Endpoint retorna mídia como **base64** (pronta para uso)
- Retorna **todos recipients** em um único request
- Inclui configurações de **throttling**
- Suporta **botões interativos**

**3. Envio (Com Mídia e Botões)**
- Se tem mídia: `POST /message/sendMedia` (base64)
- Se texto simples: `POST /message/sendText`
- Suporta botões CTA e Quick Reply
- Respeita throttling configurado
- Atualiza status e contadores
- **Decrementa crédito do usuário** (se sucesso)
- Aguarda delay configurado (min_delay - max_delay)

**4. Finalização com Recorrência**
- Marca campanha como "completed" ou "failed"
- **Se recorrente**: Calcula próxima data e cria nova campanha
- Copia destinatários automaticamente
- Retorna `nextOccurrenceId`

---

### 🔄 Fluxo Comum (Ambos Workflows)

**Para cada destinatário:**
1. Envia via Evolution API usando o `api_token` da instância
2. Atualiza status do item (sent/failed)
3. Atualiza contadores da campanha: `PATCH /api/n8n/campaigns/[id]/counters`
4. **Decrementa crédito do usuário** (se enviado com sucesso)
5. Aguarda delay randômico (evita ban do WhatsApp)

**Quando todos destinatários processados:**
1. Finaliza campanha: `PATCH /api/n8n/campaigns/[id]/complete`
2. Registra `completed_at`
3. Calcula estatísticas finais (success_rate)
4. Se recorrente: Cria próxima ocorrência automaticamente

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
