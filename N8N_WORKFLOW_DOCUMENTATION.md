# N8N Workflow - Campaign Dispatcher v4.3

Documentação completa do fluxo de disparo de campanhas WhatsApp via N8N.

---

## 📊 Visão Geral

O workflow automatiza o envio de mensagens em massa via WhatsApp, processando campanhas agendadas e enviando mensagens para cada destinatário com delays aleatórios para evitar bloqueios.

---

## 🔄 Fluxo Principal

```
┌─────────────────┐
│  A cada 60s     │ (Trigger)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Buscar Campanhas│ GET /api/n8n/scheduled-campaigns
└────────┬────────┘
         ▼
┌─────────────────┐
│ Tem Campanhas?  │ IF count > 0
└────────┬────────┘
    TRUE │         FALSE
         ▼              ▼
┌─────────────────┐  ┌──────────────┐
│Separar Campanhas│  │Sem Campanhas │ (FIM)
└────────┬────────┘  └──────────────┘
         ▼
┌─────────────────┐
│Status→Processing│ PATCH /campaigns/{id}/status
└────────┬────────┘
         ▼
┌─────────────────┐
│ Restaurar Dados │ (Code - recupera dados da campanha)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Tem Recipients? │ IF recipients.length > 0
└────────┬────────┘
    TRUE │         FALSE
         ▼              ▼
┌─────────────────┐  ┌──────────────────┐
│Preparar Recipien│  │Completar (Vazia) │ PATCH status=completed
└────────┬────────┘  └──────────────────┘
         ▼
┌─────────────────┐◄──────────────────────────────────┐
│ Loop Recipients │ (splitInBatches - 1 por vez)      │
└────────┬────────┘                                   │
    loop │         done                               │
         ▼              ▼                             │
┌─────────────────┐  ┌──────────────────┐             │
│   Tem Mídia?    │  │Completar Campaign│             │
└────────┬────────┘  └──────────────────┘             │
    TRUE │    FALSE                                   │
         ▼         ▼                                  │
┌──────────┐  ┌──────────┐                            │
│Enviar    │  │ Enviar   │                            │
│Mídia     │  │ Texto    │                            │
└────┬─────┘  └────┬─────┘                            │
     └──────┬──────┘                                  │
            ▼                                         │
┌─────────────────┐                                   │
│Analisar Resulta.│ (Code - verifica sucesso/falha)   │
└────────┬────────┘                                   │
         ▼                                            │
┌─────────────────┐                                   │
│ Atualizar Item  │ PATCH /campaign-items/{id}/status │
└────────┬────────┘                                   │
         ▼                                            │
┌─────────────────┐                                   │
│Restaurar p/Cont.│ (Code - prepara dados)            │
└────────┬────────┘                                   │
         ▼                                            │
┌─────────────────┐                                   │
│    Enviou?      │ IF sendStatus === 'sent'          │
└────────┬────────┘                                   │
    TRUE │    FALSE                                   │
         ▼         ▼                                  │
┌──────────┐  ┌──────────┐                            │
│+1 Enviado│  │ +1 Falha │                            │
└────┬─────┘  └────┬─────┘                            │
     └──────┬──────┘                                  │
            ▼                                         │
┌─────────────────┐                                   │
│ Calcular Delay  │ (Code - random entre min/max)     │
└────────┬────────┘                                   │
         ▼                                            │
┌─────────────────┐                                   │
│    Aguardar     │ (Wait - delay em ms)              │
└────────┬────────┘                                   │
         ▼                                            │
┌─────────────────┐                                   │
│    Próximo      │ (NoOp) ───────────────────────────┘
└─────────────────┘
```

---

## 📋 Descrição de Cada Nó

### 1. A cada 60 segundos
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Schedule Trigger |
| **Intervalo** | 60 segundos |
| **Função** | Dispara o workflow automaticamente para verificar campanhas agendadas |

---

### 2. Buscar Campanhas
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | GET |
| **URL** | `https://dev.wpp.sistemabrasil.online/api/n8n/scheduled-campaigns` |
| **Headers** | `Authorization: Bearer {TOKEN}` |
| **Função** | Busca campanhas com status `scheduled` prontas para envio |

**Resposta esperada:**
```json
{
  "success": true,
  "count": 1,
  "campaigns": [
    {
      "campaignId": "uuid",
      "title": "Nome da Campanha",
      "message": "Texto da mensagem",
      "instance": {
        "name": "instancia",
        "apiUrl": "https://api.url",
        "apiToken": "token"
      },
      "recipients": [
        { "id": "uuid", "phoneNumber": "5511999999999" }
      ],
      "media": null,
      "throttling": { "minDelay": 1000, "maxDelay": 3000 }
    }
  ]
}
```

---

### 3. Tem Campanhas?
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | IF |
| **Condição** | `{{ $json.count }} > 0` |
| **TRUE** | Continua para Separar Campanhas |
| **FALSE** | Vai para Sem Campanhas (fim) |

---

### 4. Sem Campanhas
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | NoOp |
| **Função** | Fim do fluxo - nenhuma ação necessária |

---

### 5. Separar Campanhas
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Split Out |
| **Campo** | `campaigns` |
| **Função** | Transforma array de campanhas em items individuais |

---

### 6. Status → Processing
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `https://dev.wpp.sistemabrasil.online/api/n8n/campaigns/{{ $json.campaignId }}/status` |
| **Body** | `{ "status": "processing" }` |
| **Função** | Marca campanha como "em andamento" para evitar reprocessamento |

---

### 7. Restaurar Dados
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Recupera dados originais da campanha após HTTP Request |

```javascript
const campaigns = $('Separar Campanhas').all();
const campaign = campaigns[$itemIndex]?.json;
return [{ json: campaign }];
```

---

### 8. Tem Recipients?
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | IF |
| **Condição** | `{{ $json.recipients?.length || 0 }} > 0` |
| **TRUE** | Continua para Preparar Recipients |
| **FALSE** | Vai para Completar (Vazia) |

---

### 9. Completar (Vazia)
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `/api/n8n/campaigns/{{ $json.campaignId }}/status` |
| **Body** | `{ "status": "completed" }` |
| **Função** | Finaliza campanha sem recipients |

---

### 10. Preparar Recipients
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Transforma lista de recipients em items para o loop |

**Saída (para cada recipient):**
```json
{
  "campaignId": "uuid",
  "recipientId": "uuid",
  "phoneNumber": "5511999999999",
  "campaignMessage": "Texto",
  "instanceName": "instancia",
  "apiUrl": "https://api.url",
  "apiToken": "token",
  "media": null,
  "minDelay": 1000,
  "maxDelay": 3000,
  "index": 1,
  "total": 10
}
```

---

### 11. Loop Recipients
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Split In Batches |
| **Batch Size** | 1 |
| **Saída loop** | Processa item atual → Tem Mídia? |
| **Saída done** | Todos processados → Completar Campanha |

---

### 12. Tem Mídia?
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | IF |
| **Condição** | `{{ $json.media?.base64 }}` não vazio |
| **TRUE** | Enviar Mídia |
| **FALSE** | Enviar Texto |

---

### 13. Enviar Mídia
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | POST |
| **URL** | `{{ $json.apiUrl }}/message/sendMedia/{{ $json.instanceName }}` |
| **Headers** | `apikey: {{ $json.apiToken }}` |
| **Timeout** | 60000ms |

**Body:**
```json
{
  "number": "{{ $json.phoneNumber }}",
  "mediatype": "image",
  "mimetype": "{{ $json.media.mimeType }}",
  "caption": "{{ $json.campaignMessage }}",
  "media": "{{ $json.media.base64 }}",
  "fileName": "{{ $json.media.fileName }}"
}
```

---

### 14. Enviar Texto
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | POST |
| **URL** | `{{ $json.apiUrl }}/message/sendText/{{ $json.instanceName }}` |
| **Headers** | `apikey: {{ $json.apiToken }}` |
| **Timeout** | 60000ms |

**Body:**
```json
{
  "number": "{{ $json.phoneNumber }}",
  "text": "{{ $json.campaignMessage }}"
}
```

---

### 15. Analisar Resultado
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Verifica sucesso/falha do envio |

**Lógica:**
- **Sucesso:** Response tem `key`, `messageId` ou `id`
- **Falha:** Response tem `error` ou `statusCode >= 400`

**Saída:**
```json
{
  "sendStatus": "sent" | "failed",
  "sendError": "mensagem de erro" | null
}
```

---

### 16. Atualizar Item
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `https://dev.wpp.sistemabrasil.online/api/n8n/campaign-items/{{ $json.recipientId }}/status` |
| **Função** | Atualiza status do recipient no banco |

**Body:**
```json
{
  "status": "{{ $json.sendStatus }}",
  "error_message": "{{ $json.sendError }}"
}
```

---

### 17. Restaurar para Contador
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Prepara dados para incrementar contadores |

---

### 18. Enviou?
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | IF |
| **Condição** | `{{ $json.sendStatus }} === 'sent'` |
| **TRUE** | +1 Enviado |
| **FALSE** | +1 Falha |

---

### 19. +1 Enviado
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `/api/n8n/campaigns/{{ $json.campaignId }}/counters` |
| **Body** | `{ "increment_sent": 1 }` |
| **Função** | Incrementa `sent_count` da campanha |

---

### 20. +1 Falha
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `/api/n8n/campaigns/{{ $json.campaignId }}/counters` |
| **Body** | `{ "increment_failed": 1 }` |
| **Função** | Incrementa `failed_count` da campanha |

---

### 21. Calcular Delay
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Gera delay aleatório entre minDelay e maxDelay |

```javascript
const minDelay = $json.minDelay || 1000;
const maxDelay = $json.maxDelay || 3000;
const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
return [{ json: { delay } }];
```

---

### 22. Aguardar
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Wait |
| **Tempo** | `{{ $json.delay }}` milliseconds |
| **Função** | Pausa entre envios para evitar bloqueio |

---

### 23. Próximo
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | NoOp |
| **Função** | Retorna ao Loop Recipients para próximo item |

---

### 24. Completar Campanha
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | HTTP Request |
| **Método** | PATCH |
| **URL** | `/api/n8n/campaigns/{{ campaignId }}/status` |
| **Body** | `{ "status": "completed" }` |
| **Função** | Finaliza campanha após processar todos recipients |

---

### 25. Log Fim
| Propriedade | Valor |
|-------------|-------|
| **Tipo** | Code (JavaScript) |
| **Função** | Log de confirmação |

---

## 🔗 APIs Utilizadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/n8n/scheduled-campaigns` | GET | Busca campanhas prontas |
| `/api/n8n/campaigns/{id}/status` | PATCH | Atualiza status da campanha |
| `/api/n8n/campaign-items/{id}/status` | PATCH | Atualiza status do recipient |
| `/api/n8n/campaigns/{id}/counters` | PATCH | Incrementa contadores |
| `{apiUrl}/message/sendText/{instance}` | POST | Envia texto (Evolution API) |
| `{apiUrl}/message/sendMedia/{instance}` | POST | Envia mídia (Evolution API) |

---

## ⚙️ Configurações

### Variáveis Hardcoded
- **APP_URL:** `https://dev.wpp.sistemabrasil.online`
- **N8N_API_KEY:** Token JWT para autenticação

### Throttling Padrão
- **minDelay:** 1000ms (1 segundo)
- **maxDelay:** 3000ms (3 segundos)
- **Intervalo do Trigger:** 60 segundos

---

## 🚨 Tratamento de Erros

1. **Erro no envio:** Marca item como `failed` e continua
2. **Campanha sem recipients:** Marca como `completed`
3. **Erro de API:** `onError: continueRegularOutput` - não interrompe o fluxo

---

## 📁 Arquivos

- **Workflow:** `workflows/evolution-api-campaign-dispatcher.json`
- **Documentação:** `N8N_WORKFLOW_DOCUMENTATION.md`
- **Guia de Configuração:** `N8N_CONFIGURATION_GUIDE.md`

---

**Versão:** 4.3.0
**Última atualização:** 2025-11-25
