# Workflow Completo n8n para Envio de Campanhas WhatsApp

## 🎯 Visão Geral

Este workflow permite que o n8n processe campanhas agendadas e envie mensagens WhatsApp automaticamente, com todas as informações necessárias:

- ✅ Mensagem completa
- ✅ Lista de destinatários
- ✅ Instância e token WhatsApp
- ✅ Mídia em Base64
- ✅ Controle de throttling
- ✅ Atualização de status

## 📋 Endpoints Disponíveis

### 1. Obter Campanhas Prontas para Envio

**Endpoint**: `GET /api/n8n/scheduled-campaigns`

**Descrição**: Retorna todas as campanhas agendadas que estão prontas para envio, com TODAS as informações necessárias.

**Response Example**:
```json
{
  "success": true,
  "count": 1,
  "campaigns": [
    {
      "campaignId": "uuid-da-campanha",
      "title": "Black Friday 2025",
      "message": "Olá! Aproveite nossa promoção...",
      "status": "scheduled",
      "scheduledAt": "2025-01-22T10:00:00Z",
      "timezone": "America/Sao_Paulo",

      "instance": {
        "id": "instance-uuid",
        "name": "WhatsApp Principal",
        "phoneNumber": "5511999999999",
        "apiToken": "seu-token-aqui",
        "apiUrl": "https://api.uazapi.com",
        "status": "connected"
      },

      "recipients": [
        {
          "id": "recipient-uuid-1",
          "phoneNumber": "5511988888888",
          "status": "pending"
        },
        {
          "id": "recipient-uuid-2",
          "phoneNumber": "5511977777777",
          "status": "pending"
        }
      ],
      "totalRecipients": 2,

      "media": {
        "fileName": "promocao.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 245678,
        "base64": "iVBORw0KGgoAAAANSUhEUgAA..."
      },

      "linkUrl": "https://exemplo.com/promocao",
      "buttonType": "url",
      "buttons": [
        {
          "type": "url",
          "text": "Ver Promoção",
          "url": "https://exemplo.com/promocao"
        }
      ],

      "throttling": {
        "enabled": true,
        "messagesPerMinute": 60,
        "delayBetweenMessages": 2,
        "minDelay": 1000,
        "maxDelay": 3000
      }
    }
  ],
  "timestamp": "2025-01-22T10:00:05.123Z"
}
```

### 2. Atualizar Status de Mensagem

**Endpoint**: `POST /api/n8n/update-message-status`

**Descrição**: Atualiza o status de uma mensagem individual (enviada ou falhou).

**Request Body**:
```json
{
  "campaignItemId": "recipient-uuid-1",
  "status": "sent",
  "sentAt": "2025-01-22T10:01:23Z"
}
```

**Para mensagens com erro**:
```json
{
  "campaignItemId": "recipient-uuid-2",
  "status": "failed",
  "errorMessage": "Número inválido"
}
```

**Response**:
```json
{
  "success": true,
  "item": {
    "id": "recipient-uuid-1",
    "status": "sent",
    "sent_at": "2025-01-22T10:01:23Z"
  },
  "message": "Message marked as sent"
}
```

## 🔧 Workflow n8n Completo

### Arquitetura do Workflow

```
Schedule Trigger (1 min)
  ↓
GET /api/n8n/scheduled-campaigns
  ↓
IF campaigns.count > 0?
  ↓ YES
  Loop Each Campaign
    ↓
    Update Campaign Status → "processing"
    ↓
    Loop Each Recipient
      ↓
      Send WhatsApp Message
      ├─ WITH Media (Base64) se existir
      ├─ WITH Buttons se existir
      └─ Throttling delay
        ↓
        IF success?
        ├─ YES → POST /api/n8n/update-message-status (sent)
        └─ NO → POST /api/n8n/update-message-status (failed)
    ↓
    Mark Campaign Complete
  ↓
  Send Notification (opcional)
```

### Nodes do Workflow

#### Node 1: Schedule Trigger
```json
{
  "name": "Every 1 Minute",
  "type": "n8n-nodes-base.scheduleTrigger",
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
}
```

#### Node 2: Get Scheduled Campaigns
```json
{
  "name": "Get Campaigns Ready to Send",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://seu-dominio.vercel.app/api/n8n/scheduled-campaigns",
    "method": "GET",
    "authentication": "headerAuth",
    "headerAuth": {
      "name": "Authorization",
      "value": "Bearer {{$credentials.apiKey}}"
    },
    "responseFormat": "json"
  }
}
```

#### Node 3: Check If Campaigns Exist
```json
{
  "name": "Has Campaigns?",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "number": [
        {
          "value1": "={{$json.count}}",
          "operation": "larger",
          "value2": 0
        }
      ]
    }
  }
}
```

#### Node 4: Split Campaigns
```json
{
  "name": "Loop Each Campaign",
  "type": "n8n-nodes-base.splitInBatches",
  "parameters": {
    "batchSize": 1,
    "options": {}
  }
}
```

#### Node 5: Split Recipients
```json
{
  "name": "Loop Each Recipient",
  "type": "n8n-nodes-base.splitInBatches",
  "parameters": {
    "batchSize": 1,
    "options": {}
  }
}
```

#### Node 6: Send WhatsApp Message
```javascript
// Node: Function - Prepare WhatsApp Request
const campaign = $input.item.json;
const recipient = campaign.recipients[0]; // Current recipient from loop

// Build message payload
const payload = {
  phone: recipient.phoneNumber,
  message: campaign.message
};

// Add media if exists
if (campaign.media && campaign.media.base64) {
  payload.media = {
    base64: campaign.media.base64,
    filename: campaign.media.fileName,
    mimetype: campaign.media.mimeType
  };
}

// Add buttons if exists
if (campaign.buttons && campaign.buttons.length > 0) {
  payload.buttons = campaign.buttons;
}

return {
  json: {
    payload,
    recipientId: recipient.id,
    campaignId: campaign.campaignId,
    apiUrl: campaign.instance.apiUrl,
    apiToken: campaign.instance.apiToken,
    throttleDelay: campaign.throttling.delayBetweenMessages * 1000
  }
};
```

#### Node 7: HTTP Request - Send Message
```json
{
  "name": "Send WhatsApp Message",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "={{$json.apiUrl}}/send-message",
    "method": "POST",
    "authentication": "headerAuth",
    "headerAuth": {
      "name": "Authorization",
      "value": "Bearer {{$json.apiToken}}"
    },
    "bodyParameters": {
      "parameters": [
        {
          "name": "phone",
          "value": "={{$json.payload.phone}}"
        },
        {
          "name": "message",
          "value": "={{$json.payload.message}}"
        },
        {
          "name": "media",
          "value": "={{$json.payload.media}}"
        }
      ]
    },
    "responseFormat": "json",
    "options": {
      "timeout": 30000
    }
  }
}
```

#### Node 8: Throttling Delay
```json
{
  "name": "Wait Between Messages",
  "type": "n8n-nodes-base.wait",
  "parameters": {
    "amount": "={{$json.throttleDelay}}",
    "unit": "ms"
  }
}
```

#### Node 9: Update Success Status
```json
{
  "name": "Mark as Sent",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://seu-dominio.vercel.app/api/n8n/update-message-status",
    "method": "POST",
    "bodyParameters": {
      "parameters": [
        {
          "name": "campaignItemId",
          "value": "={{$json.recipientId}}"
        },
        {
          "name": "status",
          "value": "sent"
        },
        {
          "name": "sentAt",
          "value": "={{new Date().toISOString()}}"
        }
      ]
    },
    "responseFormat": "json"
  }
}
```

#### Node 10: Update Failed Status (Error Path)
```json
{
  "name": "Mark as Failed",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://seu-dominio.vercel.app/api/n8n/update-message-status",
    "method": "POST",
    "bodyParameters": {
      "parameters": [
        {
          "name": "campaignItemId",
          "value": "={{$json.recipientId}}"
        },
        {
          "name": "status",
          "value": "failed"
        },
        {
          "name": "errorMessage",
          "value": "={{$json.error}}"
        }
      ]
    },
    "responseFormat": "json"
  }
}
```

## 🚀 Setup Rápido

### 1. Importar Workflow JSON

Copie e importe este workflow completo no n8n:

```json
{
  "name": "WhatsApp Campaign Sender",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"field": "minutes", "minutesInterval": 1}]
        }
      },
      "name": "Every 1 Minute",
      "type": "n8n-nodes-base.scheduleTrigger",
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://seu-dominio.vercel.app/api/n8n/scheduled-campaigns",
        "method": "GET",
        "responseFormat": "json"
      },
      "name": "Get Campaigns",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.count}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      },
      "name": "Has Campaigns?",
      "type": "n8n-nodes-base.if",
      "position": [650, 300]
    }
  ],
  "connections": {
    "Every 1 Minute": {"main": [[{"node": "Get Campaigns"}]]},
    "Get Campaigns": {"main": [[{"node": "Has Campaigns?"}]]}
  }
}
```

### 2. Configurar Autenticação (Opcional mas Recomendado)

Para proteger os endpoints, adicione no `.env.local`:

```env
N8N_API_KEY=sua-chave-secreta-aqui
```

E atualize os endpoints para verificar:

```typescript
// No route.ts
const apiKey = request.headers.get('authorization')
if (apiKey !== `Bearer ${process.env.N8N_API_KEY}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 3. Testar o Workflow

1. Crie uma campanha agendada no sistema
2. Defina o horário de envio para daqui a 2 minutos
3. Ative o workflow no n8n
4. Aguarde o n8n processar

## 📊 Monitoramento

### Logs no n8n

O n8n mostrará visualmente:
- ✅ Quantas campanhas foram processadas
- ✅ Quantas mensagens foram enviadas
- ✅ Quantas falharam
- ✅ Tempo de execução

### Dashboard do Sistema

Acesse `Campanhas > Agendadas` para ver:
- Status em tempo real
- Contador de enviadas/falhadas
- Opções de pausar/cancelar

## 🔔 Notificações (Opcional)

Adicione nodes de notificação após o processamento:

### Telegram
```javascript
{
  "chatId": "seu-chat-id",
  "text": `✅ Campanha "${campaignTitle}" concluída!\n📤 ${sentCount} enviadas\n❌ ${failedCount} falhas`
}
```

### Email
```javascript
{
  "to": "admin@example.com",
  "subject": `Campanha ${campaignTitle} Concluída`,
  "text": `${sentCount} mensagens enviadas com sucesso!`
}
```

### Discord
```javascript
{
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "content": `🚀 Campanha **${campaignTitle}** enviada!\n✅ ${sentCount} sucesso | ❌ ${failedCount} falhas`
}
```

## 🛠️ Troubleshooting

### Problema: "Unauthorized"
**Solução**: Verifique se está autenticado no Supabase (cookie de sessão)

### Problema: "No campaigns found"
**Solução**: Verifique se a campanha está agendada para horário passado e status = 'scheduled'

### Problema: "Media base64 muito grande"
**Solução**: Reduza o tamanho das imagens antes do upload

### Problema: Mensagens enviando muito rápido
**Solução**: Aumente o `throttleDelay` nas configurações da campanha

## 📚 Recursos

- [n8n Documentation](https://docs.n8n.io)
- [UAZAPI Docs](https://docs.uazapi.com)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Pronto!** Agora o n8n tem acesso a TODAS as informações necessárias para enviar campanhas WhatsApp automaticamente! 🎉
