# Guia de Configuração N8N - Campaign Dispatcher v2.1

## 📋 Pré-requisitos

Antes de configurar o workflow, você precisa ter:
- ✅ N8N instalado e rodando (v1.x ou superior)
- ✅ Acesso ao painel administrativo do N8N
- ✅ Projeto Next.js rodando em produção
- ✅ Evolution API configurada

---

## 🔧 1. CONFIGURAR VARIÁVEIS DE AMBIENTE NO N8N

Vá em **Settings → Variables** no N8N e adicione:

### Variável 1: NEXT_PUBLIC_APP_URL
```
Nome: NEXT_PUBLIC_APP_URL
Valor: https://dev.wpp.sistemabrasil.online
```

### Variável 2: N8N_API_KEY
```
Nome: N8N_API_KEY
Valor: [Copie o valor do arquivo .env do seu projeto Next.js]
```

⚠️ **IMPORTANTE**: O valor de `N8N_API_KEY` deve ser o MESMO valor que está no arquivo `.env` do seu projeto Next.js.

---

## 📥 2. IMPORTAR O WORKFLOW

1. No N8N, clique em **Workflows** → **Add workflow** → **Import from File**
2. Selecione o arquivo: `workflows/evolution-api-production-dispatcher.json`
3. Clique em **Import**

---

## 📅 3. COMO FUNCIONA O AGENDAMENTO

O sistema suporta **4 tipos de agendamento**:

### Imediato (`immediate`)
- Campanha é processada assim que o N8N verificar
- Não precisa de data específica

### Agendado (`scheduled`)
- Data e hora específica para envio
- Suporta fuso horário (timezone)
- Ex: Enviar em 25/11/2025 às 10:00 (Brasília)

### Recorrente (`recurring`)
- Campanhas que se repetem automaticamente
- Suporta: diário, semanal, mensal
- Configurável por dias da semana
- Ex: Toda segunda às 09:00

### Inteligente (`smart`)
- IA sugere o melhor horário
- Baseado em horário comercial (10h-16h)
- Evita finais de semana
- Ex: Próximo horário comercial ideal

---

## ⚙️ 4. FLUXO DO WORKFLOW

```
Schedule Trigger (60s)
    ↓
Fetch Scheduled Campaigns
    ↓
Has Campaigns? ──No──→ No Campaigns (Log)
    ↓ Yes
Extract Campaigns (Array → Items)
    ↓
Loop Campaigns (1 por vez)
    ↓
Log Campaign Info
    ↓
Status → Processing
    ↓
Has Recipients? ──No──→ Complete Campaign
    ↓ Yes
Prepare Recipients (com dados de campanha)
    ↓
Loop Recipients (1 por vez)
    ↓
Has Media? ──Yes──→ Send Media
    ↓ No          ↓
Send Text  ───────→ Merge Results
    ↓
Analyze Result (sent/failed)
    ↓
Update Item Status
    ↓
Update Counters
    ↓
Calculate Delay (aleatório)
    ↓
Wait → Loop Recipients
```

---

## 🎯 5. NODES DO WORKFLOW

### Node 1: Schedule Trigger (60s)
- **Intervalo**: 60 segundos
- Verifica campanhas a cada minuto
- Ajustável conforme necessidade

### Node 2: Fetch Scheduled Campaigns
- **Método**: GET
- **URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/scheduled-campaigns`
- **Retorna**: Campanhas com `scheduled_at <= NOW()` e `status = 'scheduled'`

### Node 3: Extract Campaigns
- Converte array de campanhas em items individuais
- Adiciona log com quantidade de campanhas

### Node 4: Log Campaign Info
Exibe informações detalhadas:
- Título e ID
- Tipo de agendamento
- Timezone
- Quantidade de destinatários
- Recorrência (se aplicável)
- Configuração de throttling

### Node 5: Prepare Recipients
Prepara cada destinatário com:
- Dados da campanha (mensagem, mídia)
- Dados da instância WhatsApp
- Configuração de delay (min/max)
- Progresso (1/100, 2/100, etc.)

### Node 6: Send Media / Send Text
- **Media**: Imagem/vídeo com legenda
- **Text**: Apenas mensagem de texto
- **Timeout**: 60 segundos
- **Continue on Fail**: Sim (não para em erros)

### Node 7: Analyze Result
- Verifica se houve erro
- Define status: `sent` ou `failed`
- Log com emoji: ✅ ou ❌

### Node 8: Calculate Delay
- Calcula delay aleatório
- Baseado nas configurações de throttling
- Anti-detecção (variação no tempo)

---

## 📊 6. DADOS DO AGENDAMENTO

A API retorna todos os dados necessários:

```json
{
  "campaignId": "uuid",
  "title": "Black Friday 2025",
  "message": "Olá! Aproveite...",
  "scheduleType": "scheduled",
  "scheduledAt": "2025-11-25T10:00:00Z",
  "timezone": "America/Sao_Paulo",
  "recurrencePattern": {
    "type": "weekly",
    "interval": 1,
    "days": [1, 3, 5],
    "time": "10:00"
  },
  "instance": {
    "name": "WhatsApp Principal",
    "apiUrl": "https://api.uazapi.com",
    "apiToken": "xxx"
  },
  "recipients": [
    { "id": "uuid", "phoneNumber": "5511999999999" }
  ],
  "media": {
    "fileName": "promo.jpg",
    "mimeType": "image/jpeg",
    "base64": "..."
  },
  "throttling": {
    "enabled": true,
    "messagesPerMinute": 60,
    "delayBetweenMessages": 2,
    "minDelay": 1000,
    "maxDelay": 3000
  }
}
```

---

## 🧪 7. TESTAR O WORKFLOW

### Teste 1: Verificar Conexão
1. Clique no node **"Fetch Scheduled Campaigns"**
2. Clique em **"Execute Node"**
3. Deve retornar:
```json
{
  "success": true,
  "count": 0,
  "campaigns": [],
  "message": "No campaigns ready to send"
}
```

### Teste 2: Criar Campanha Agendada
1. No sistema, crie uma campanha
2. Clique em "Agendar Campanha"
3. Configure para 1-2 minutos no futuro
4. Aguarde o N8N processar

### Teste 3: Verificar Logs
No console do N8N, você verá:
```
========================================
📋 1 campanha(s) pronta(s) para envio
⏰ Timestamp: 2025-11-25T10:00:00.000Z
========================================

📤 Iniciando: Black Friday 2025
   ID: abc123
   Tipo: scheduled
   Agendado: 2025-11-25T10:00:00Z
   Timezone: America/Sao_Paulo
   Destinatários: 50
   Throttle: 60msg/min

⏱️ Delay configurado: 800-1200ms

✅ [1/50] 5511999999999
✅ [2/50] 5511988888888
...
```

---

## 🚀 8. ATIVAR O WORKFLOW

1. Clique no botão **"Inactive"** no canto superior direito
2. Mude para **"Active"**
3. O workflow rodará automaticamente a cada 60 segundos

---

## 🔍 9. TROUBLESHOOTING

### Erro: "401 Unauthorized"
**Causa**: N8N_API_KEY incorreta
**Solução**:
1. Verifique o valor em Settings → Variables
2. Compare com o arquivo `.env` do Next.js
3. Não inclua espaços extras

### Erro: "ECONNREFUSED"
**Causa**: URL incorreta ou servidor offline
**Solução**:
1. Verifique NEXT_PUBLIC_APP_URL
2. Confirme que o Next.js está rodando
3. Teste a URL no navegador

### Campanhas não são processadas
**Causa**: Condições não atendidas
**Verificar**:
1. Status da campanha = `scheduled`
2. `scheduled_at` <= data/hora atual
3. Instância conectada (`status = 'connected'`)
4. Instância não é teste (`is_test = false`)
5. Campanha não pausada (`is_paused = false`)

### Mensagens falhando
**Causa**: Problema com Evolution API
**Verificar**:
1. Token da instância válido
2. Instância conectada ao WhatsApp
3. Número do destinatário válido
4. Logs do Evolution API

### Delay não está funcionando
**Causa**: Throttling desabilitado
**Verificar**:
```sql
SELECT throttle_enabled, throttle_rate, throttle_delay
FROM campaigns WHERE id = 'uuid';
```

---

## ✅ 10. CHECKLIST FINAL

- [ ] Variável `NEXT_PUBLIC_APP_URL` configurada
- [ ] Variável `N8N_API_KEY` configurada
- [ ] Workflow importado do arquivo JSON
- [ ] Teste do node "Fetch Scheduled Campaigns" OK
- [ ] Workflow ativado
- [ ] Primeira campanha agendada com sucesso

---

## 📝 NOTAS IMPORTANTES

1. **Intervalo**: O workflow verifica campanhas a cada 60 segundos
2. **Produção Only**: Apenas instâncias com `is_test = false`
3. **Throttling**: Delay aleatório para evitar bloqueio
4. **Recorrência**: Campanhas recorrentes são reagendadas automaticamente
5. **Logs**: Todos os envios são logados no console do N8N
6. **Falhas**: Mensagens com erro são marcadas como `failed` no banco

---

## 🔗 ENDPOINTS UTILIZADOS

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/n8n/scheduled-campaigns` | GET | Busca campanhas prontas |
| `/api/n8n/campaigns/:id/status` | PATCH | Atualiza status |
| `/api/n8n/campaign-items/:id/status` | PATCH | Atualiza item |
| `/api/n8n/campaigns/:id/counters` | PATCH | Incrementa contadores |

---

## 🔧 11. CONFIGURAÇÃO DETALHADA DOS NÓS

### A) Fetch Scheduled Campaigns
```
Método: GET
URL: https://dev.wpp.sistemabrasil.online/api/n8n/scheduled-campaigns
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
```

### B) Status → Processing
```
Método: PATCH
URL: https://dev.wpp.sistemabrasil.online/api/n8n/campaigns/{{ $json.campaignId }}/status
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
Body (JSON):
{
  "status": "processing"
}
```

### C) Update Item Status (após envio)
```
Método: PATCH
URL: https://dev.wpp.sistemabrasil.online/api/n8n/campaign-items/{{ $json.recipientId }}/status
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
Body (JSON) - Sucesso:
{
  "status": "sent"
}

Body (JSON) - Falha:
{
  "status": "failed",
  "error_message": "{{ $json.error }}"
}
```

### D) Update Counters
```
Método: PATCH
URL: https://dev.wpp.sistemabrasil.online/api/n8n/campaigns/{{ $json.campaignId }}/counters
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
Body (JSON) - Incrementar enviados:
{
  "increment_sent": 1
}

Body (JSON) - Incrementar falhas:
{
  "increment_failed": 1
}
```

### E) Complete Campaign (quando todos enviados)
```
Método: PATCH
URL: https://dev.wpp.sistemabrasil.online/api/n8n/campaigns/{{ $json.campaignId }}/status
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
Body (JSON):
{
  "status": "completed"
}
```

### F) No Recipients (marcar como completed)
```
Método: PATCH
URL: https://dev.wpp.sistemabrasil.online/api/n8n/campaigns/{{ $json.campaignId }}/status
Headers:
  - Name: Authorization
  - Value: Bearer [SEU_N8N_API_KEY]
Body (JSON):
{
  "status": "completed"
}
```

---

## ⚠️ 12. ERROS COMUNS E SOLUÇÕES

### Erro: "404 - Page not found"
**Causa**: URL incorreta ou variável não substituída
**Verificar**:
- A URL deve mostrar o ID real, não `{{ $json.campaignId }}`
- Use `$json.campaignId` (minúsculo), não `$json.campaign.Id`

### Erro: "JSON parameter needs to be valid JSON"
**Causa**: Body mal formatado
**Solução**:
- Verifique se o JSON está correto
- Use aspas duplas `"`, não simples `'`
- Não inclua vírgulas extras

### Erro: "invalid input syntax for type timestamp"
**Causa**: Expressão N8N não executada no body
**Solução**:
- Use `{{ $now.toISO() }}` ao invés de `{{ new Date().toISOString() }}`
- Ou simplesmente omita o campo (o servidor preenche automaticamente)

### Erro: "401 Unauthorized"
**Causa**: Token inválido ou ausente
**Solução**:
- Verifique se o header Authorization está configurado
- Formato: `Bearer SEU_TOKEN_AQUI`
- Não inclua `{{ }}` no token se for fixo

---

## 📊 13. ESTRUTURA DOS DADOS (JSON)

### Dados retornados por /scheduled-campaigns:
```json
{
  "success": true,
  "count": 1,
  "campaigns": [
    {
      "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
      "title": "Modelo para o n8n",
      "message": "Mensagem de teste",
      "status": "scheduled",
      "scheduledAt": "2025-11-25T13:17:00+00:00",
      "scheduleType": "scheduled",
      "timezone": "America/Sao_Paulo",
      "instance": {
        "id": "cd03378d-a629-4dc6-93ac-e3b76012161b",
        "name": "Teste Grátis - 15 dias",
        "phoneNumber": null,
        "apiToken": "AF99CF7D-D31F-453F-9545-D13766898E0C",
        "apiUrl": "https://dev.evo.sistemabrasil.online",
        "status": "connected",
        "isTest": true
      },
      "recipients": [
        {
          "id": "b008d461-8887-4f74-b3c8-bbeb548b3f31",
          "phoneNumber": "559884100789-1501047849@g.us",
          "status": "pending"
        }
      ],
      "totalRecipients": 1,
      "media": null,
      "linkUrl": null,
      "buttonType": null,
      "buttons": [],
      "throttling": {
        "enabled": false,
        "messagesPerMinute": null,
        "delayBetweenMessages": null,
        "minDelay": null,
        "maxDelay": null
      }
    }
  ]
}
```

### Campos importantes para usar no N8N:
- `{{ $json.campaignId }}` - ID da campanha
- `{{ $json.title }}` - Título
- `{{ $json.message }}` - Mensagem a enviar
- `{{ $json.instance.apiToken }}` - Token da API WhatsApp
- `{{ $json.instance.apiUrl }}` - URL da API (Evolution ou UAZAPI)
- `{{ $json.recipients[0].id }}` - ID do recipient (para Loop)
- `{{ $json.recipients[0].phoneNumber }}` - Número do destinatário

---

## 📊 14. RESPOSTAS PADRONIZADAS DAS APIS

### ⚠️ IMPORTANTE: Padrão de Nomenclatura

**TODAS as APIs retornam `campaignId` no NÍVEL RAIZ da resposta.**

Isso significa que em QUALQUER nó do N8N você pode usar:
- `{{ $json.campaignId }}` - Sempre disponível

---

### A) POST /api/n8n/campaigns/{id}/status
**Resposta:**
```json
{
  "success": true,
  "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
  "title": "Modelo para o n8n",
  "status": "processing",
  "startedAt": "2025-11-25T10:00:00Z",
  "updatedAt": "2025-11-25T10:00:00Z",
  "message": "Status atualizado para: processing",
  "timestamp": "2025-11-25T10:00:00Z"
}
```

### B) POST /api/n8n/campaigns/{id}/complete
**Resposta (sucesso):**
```json
{
  "success": true,
  "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
  "title": "Modelo para o n8n",
  "status": "completed",
  "completedAt": "2025-11-25T10:30:00Z",
  "statistics": {
    "totalRecipients": 100,
    "sentCount": 95,
    "failedCount": 5,
    "successRate": "95.00%",
    "finalStatus": "completed"
  },
  "message": "Campanha finalizada com status: completed",
  "recurring": null,
  "timestamp": "2025-11-25T10:30:00Z"
}
```

**Resposta (pendentes):**
```json
{
  "success": false,
  "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
  "title": "Modelo para o n8n",
  "status": "processing",
  "message": "Ainda há destinatários pendentes",
  "pendingCount": 10
}
```

### C) POST /api/n8n/campaigns/{id}/counters
**Resposta:**
```json
{
  "success": true,
  "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
  "title": "Modelo para o n8n",
  "incremented": {
    "sent": 1,
    "failed": 0
  },
  "progress": {
    "total": 100,
    "sent": 50,
    "failed": 5,
    "remaining": 45
  },
  "timestamp": "2025-11-25T10:15:00Z"
}
```

### D) POST /api/n8n/campaign-items/{id}/status
**Resposta:**
```json
{
  "success": true,
  "itemId": "b008d461-8887-4f74-b3c8-bbeb548b3f31",
  "campaignId": "0e259ce3-5b80-4b8c-a6e7-f5c9d7cc0b8f",
  "recipient": "5511999999999",
  "status": "sent",
  "sentAt": "2025-11-25T10:10:00Z",
  "errorMessage": null,
  "message": "Status atualizado para: sent",
  "timestamp": "2025-11-25T10:10:00Z"
}
```

---

## 📋 15. REFERÊNCIA RÁPIDA N8N

### Dentro do Loop de Campanhas:
```
{{ $json.campaignId }}           - ID da campanha atual
{{ $json.title }}                - Título da campanha
{{ $json.message }}              - Mensagem a enviar
{{ $json.instance.apiUrl }}      - URL da API WhatsApp
{{ $json.instance.apiToken }}    - Token da API
```

### Dentro do Loop de Recipients:
```
{{ $json.recipientId }}          - ID do item/recipient
{{ $json.phoneNumber }}          - Número do destinatário
{{ $json.campaignId }}           - ID da campanha (herdado)
{{ $json.campaignMessage }}      - Mensagem da campanha (herdado)
```

### Após qualquer chamada de API:
```
{{ $json.campaignId }}           - SEMPRE disponível no nível raiz
{{ $json.success }}              - true/false
{{ $json.status }}               - Status atual
```

---

**Última atualização**: 2025-11-25
**Versão do Workflow**: 3.0
**Versão da API**: 2.0 (Padronizada)
**Compatível com**: N8N v1.x, Evolution API v2.x
