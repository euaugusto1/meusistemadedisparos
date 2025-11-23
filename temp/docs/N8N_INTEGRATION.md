# Integração com n8n para Processamento de Campanhas

## Visão Geral

O n8n pode substituir os cron jobs do Vercel para processar campanhas agendadas. Você terá controle total sobre os workflows e poderá adicionar lógica personalizada.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     n8n Workflow                         │
├─────────────────────────────────────────────────────────┤
│  1. Trigger (Schedule: Every 1 minute)                   │
│  2. HTTP Request → GET /api/cron/process-scheduled       │
│  3. Conditional: If campaigns found                      │
│  4. Loop through campaigns                               │
│  5. Process each campaign                                │
│  6. (Optional) Send notifications                        │
└─────────────────────────────────────────────────────────┘
```

## Endpoints Disponíveis

### 1. Processar Campanhas Agendadas

```
GET/POST https://seu-dominio.vercel.app/api/cron/process-scheduled-campaigns
```

**Response**:

```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "id": "uuid-campanha-1",
      "title": "Black Friday",
      "status": "started"
    },
    {
      "id": "uuid-campanha-2",
      "title": "Promoção Natal",
      "status": "started"
    }
  ],
  "timestamp": "2025-01-22T10:00:00.000Z"
}
```

### 2. Verificar Campanhas Pausadas

```
GET/POST https://seu-dominio.vercel.app/api/cron/check-paused-campaigns
```

**Response**:

```json
{
  "success": true,
  "resumed": 1,
  "results": [
    {
      "id": "uuid-campanha",
      "title": "Campanha Pausada",
      "status": "resumed",
      "new_status": "processing"
    }
  ],
  "timestamp": "2025-01-22T10:05:00.000Z"
}
```

### 3. Obter Campanhas Agendadas (Novo Endpoint)

```
GET https://seu-dominio.vercel.app/api/campaigns/scheduled
```

**Response**:

```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "title": "Campanha 1",
      "scheduled_at": "2025-01-23T10:00:00Z",
      "schedule_type": "scheduled",
      "status": "scheduled",
      "total_recipients": 100,
      "timezone": "America/Sao_Paulo"
    }
  ],
  "count": 1
}
```

## Workflows n8n

### Workflow 1: Processar Campanhas Agendadas

```json
{
  "name": "Processar Campanhas Agendadas",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 1
            }
          ]
        }
      }
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/cron/process-scheduled-campaigns",
        "method": "GET",
        "responseFormat": "json"
      }
    },
    {
      "name": "IF Campaigns Found",
      "type": "n8n-nodes-base.if",
      "position": [650, 300],
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.processed}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      }
    },
    {
      "name": "Loop Campaigns",
      "type": "n8n-nodes-base.splitInBatches",
      "position": [850, 300],
      "parameters": {
        "batchSize": 1,
        "options": {}
      }
    },
    {
      "name": "Log Success",
      "type": "n8n-nodes-base.function",
      "position": [1050, 300],
      "parameters": {
        "functionCode": "console.log('Campanha processada:', $json);\nreturn $json;"
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]]
    },
    "HTTP Request": {
      "main": [[{ "node": "IF Campaigns Found", "type": "main", "index": 0 }]]
    },
    "IF Campaigns Found": {
      "main": [[{ "node": "Loop Campaigns", "type": "main", "index": 0 }]]
    },
    "Loop Campaigns": {
      "main": [[{ "node": "Log Success", "type": "main", "index": 0 }]]
    }
  }
}
```

### Workflow 2: Monitorar Campanhas com Notificações

```json
{
  "name": "Monitorar Campanhas com Notificações",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300],
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      }
    },
    {
      "name": "Get Scheduled Campaigns",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/campaigns/scheduled",
        "method": "GET",
        "responseFormat": "json"
      }
    },
    {
      "name": "Filter Upcoming",
      "type": "n8n-nodes-base.function",
      "position": [650, 300],
      "parameters": {
        "functionCode": "const now = new Date();\nconst oneHour = 60 * 60 * 1000;\n\nreturn items.filter(item => {\n  const scheduled = new Date(item.json.scheduled_at);\n  const diff = scheduled - now;\n  return diff > 0 && diff < oneHour;\n});"
      }
    },
    {
      "name": "Send Email Alert",
      "type": "n8n-nodes-base.emailSend",
      "position": [850, 300],
      "parameters": {
        "fromEmail": "seu-email@gmail.com",
        "toEmail": "admin@example.com",
        "subject": "Campanha será enviada em breve",
        "text": "A campanha '{{$json.title}}' será enviada em {{$json.scheduled_at}}"
      }
    }
  ]
}
```

## Configuração Passo a Passo

### 1. Instalar n8n

**Opção A - Docker** (Recomendado):

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Opção B - npm**:

```bash
npm install n8n -g
n8n start
```

**Opção C - Cloud**:
Use [n8n.cloud](https://n8n.cloud) (serviço gerenciado)

### 2. Criar Workflow no n8n

1. Acesse http://localhost:5678 (ou seu n8n.cloud)
2. Clique em "Add Workflow"
3. Adicione os nodes:

#### Node 1: Schedule Trigger

- Tipo: Schedule Trigger
- Interval: Every 1 minute
- (ou use Cron: `* * * * *`)

#### Node 2: HTTP Request

- URL: `https://seu-app.vercel.app/api/cron/process-scheduled-campaigns`
- Method: GET
- Response Format: JSON

#### Node 3: IF (Opcional)

- Condition: `{{$json.processed}} > 0`
- Só continua se houver campanhas processadas

### 3. Adicionar Autenticação (Opcional)

Para proteger seus endpoints, adicione autenticação:

**No n8n**:

- No node HTTP Request
- Authentication: Header Auth
- Header Name: `x-api-key`
- Header Value: `sua-chave-secreta`

**Na API** (`route.ts`):

```typescript
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (apiKey !== process.env.CRON_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... resto do código
}
```

**No `.env.local`**:

```
CRON_API_KEY=sua-chave-secreta-aqui
```

### 4. Adicionar Notificações

Você pode adicionar nodes de notificação no workflow:

**Email**:

```javascript
// Node: Send Email
{
  "to": "admin@example.com",
  "subject": "Campanha iniciada: {{$json.results[0].title}}",
  "body": "{{$json.processed}} campanhas foram processadas"
}
```

**Telegram**:

```javascript
// Node: Telegram
{
  "chatId": "seu-chat-id",
  "text": "🚀 Campanha '{{$json.results[0].title}}' iniciada!"
}
```

**Slack**:

```javascript
// Node: Slack
{
  "channel": "#campanhas",
  "text": "Campanha processada: {{$json.results[0].title}}"
}
```

**Discord**:

```javascript
// Node: Discord
{
  "webhookUrl": "sua-webhook-url",
  "content": "✅ {{$json.processed}} campanhas processadas"
}
```

## Endpoints Adicionais para n8n

Vou criar um endpoint novo para listar campanhas agendadas:

```typescript
// GET /api/campaigns/scheduled
// Retorna todas campanhas agendadas para os próximos X minutos
```

## Vantagens do n8n

✅ **Interface Visual**: Configure workflows com drag-and-drop
✅ **Notificações**: Email, Slack, Telegram, Discord, etc.
✅ **Logs Visuais**: Veja execução de cada step
✅ **Retry**: Retry automático em caso de falha
✅ **Conditions**: Lógica condicional complexa
✅ **Webhooks**: Integre com outros sistemas
✅ **Database**: Salve resultados em banco de dados
✅ **Scheduling**: Controle total sobre horários
✅ **Self-hosted**: Rode em seu servidor

## Exemplo de Workflow Completo

```
Schedule (1 min)
  ↓
HTTP Request (Get Scheduled Campaigns)
  ↓
IF (campaigns.count > 0)
  ↓ TRUE
  Split In Batches
    ↓
    For Each Campaign:
      ↓
      HTTP Request (Process Campaign)
        ↓
        Switch (by status)
          ↓ "started"
          Send Telegram ("✅ Iniciada")
          ↓ "failed"
          Send Email ("❌ Erro")
          ↓
        Database (Log resultado)
  ↓ FALSE
  Stop
```

## Troubleshooting

### n8n não está executando

**Solução**: Verifique se o workflow está ativo (toggle no canto superior)

### Timeout nos requests

**Solução**: Aumente timeout no node HTTP Request

```json
{
  "timeout": 30000
}
```

### Muitas execuções simultâneas

**Solução**: Use "Queue Mode" nas configurações do workflow

## Próximos Passos

1. ✅ Instalar n8n
2. ✅ Criar workflow básico
3. ✅ Testar processamento
4. ⏳ Adicionar notificações
5. ⏳ Configurar retry policies
6. ⏳ Monitorar logs

## Recursos

- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io)
- [n8n Workflows](https://n8n.io/workflows)
- [Schedule Trigger Docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
