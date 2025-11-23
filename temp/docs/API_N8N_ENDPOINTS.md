# 🚀 Endpoints para Integração n8n

## 📌 Resumo

Criei 2 endpoints completos para o n8n processar e enviar campanhas WhatsApp com TODAS as informações necessárias.

---

## 1️⃣ Obter Campanhas Prontas para Envio

### Endpoint
```
GET /api/n8n/scheduled-campaigns
```

### O que retorna?
✅ **Mensagem completa** da campanha
✅ **Lista de destinatários** (números de telefone)
✅ **Instância WhatsApp** (nome, número, token, API URL)
✅ **Mídia em Base64** (se tiver imagem/vídeo/áudio)
✅ **Configurações de throttling** (delay entre mensagens)
✅ **Botões** (se tiver)
✅ **Links** (se tiver)

### Response Example
```json
{
  "success": true,
  "count": 1,
  "campaigns": [
    {
      "campaignId": "uuid",
      "title": "Black Friday",
      "message": "Olá! Aproveite...",

      "instance": {
        "phoneNumber": "5511999999999",
        "apiToken": "seu-token",
        "apiUrl": "https://api.uazapi.com"
      },

      "recipients": [
        {
          "id": "recip-uuid-1",
          "phoneNumber": "5511988888888"
        }
      ],

      "media": {
        "fileName": "promo.jpg",
        "mimeType": "image/jpeg",
        "base64": "iVBORw0KGgoAAAA..."
      },

      "throttling": {
        "messagesPerMinute": 60,
        "delayBetweenMessages": 2
      }
    }
  ]
}
```

---

## 2️⃣ Atualizar Status de Mensagem

### Endpoint
```
POST /api/n8n/update-message-status
```

### Para que serve?
Atualiza o status de cada mensagem individual após o n8n enviar:
- ✅ Marcar como **enviada** (sent)
- ❌ Marcar como **falhada** (failed)

### Request - Mensagem Enviada
```json
{
  "campaignItemId": "recip-uuid-1",
  "status": "sent",
  "sentAt": "2025-01-22T10:01:23Z"
}
```

### Request - Mensagem Falhada
```json
{
  "campaignItemId": "recip-uuid-2",
  "status": "failed",
  "errorMessage": "Número inválido"
}
```

### Response
```json
{
  "success": true,
  "message": "Message marked as sent"
}
```

---

## 🎯 Como o n8n Usa?

### Fluxo Completo:

```
1. Schedule Trigger (a cada 1 minuto)
   ↓
2. GET /api/n8n/scheduled-campaigns
   ↓
3. Para cada campanha retornada:
   ↓
4. Para cada destinatário:
   ↓
5. Enviar mensagem WhatsApp usando:
   - instance.apiUrl
   - instance.apiToken
   - recipient.phoneNumber
   - message
   - media.base64 (se existir)
   ↓
6. Se sucesso:
   POST /api/n8n/update-message-status
   { status: "sent" }
   ↓
7. Se erro:
   POST /api/n8n/update-message-status
   { status: "failed", errorMessage: "..." }
```

---

## 📊 O que Acontece Automaticamente?

Quando você usa esses endpoints, o sistema:

1. ✅ Atualiza os contadores da campanha (enviadas/falhadas)
2. ✅ Muda o status da campanha para "processing" → "completed"
3. ✅ Marca cada destinatário individualmente
4. ✅ Registra data/hora de envio
5. ✅ Salva mensagens de erro (se houver)

---

## 🔐 Autenticação

Os endpoints usam a autenticação padrão do Supabase (cookie de sessão).

Para proteger ainda mais, você pode adicionar uma API Key:

**No .env.local:**
```env
N8N_API_KEY=sua-chave-secreta-aqui
```

**No n8n:**
```
Header: Authorization
Value: Bearer sua-chave-secreta-aqui
```

---

## 📝 Exemplos Práticos

### Exemplo 1: Campanha com Imagem
```json
{
  "message": "Veja nossa promoção!",
  "media": {
    "base64": "iVBORw0KGgoAAAA...",
    "fileName": "banner.jpg",
    "mimeType": "image/jpeg"
  }
}
```

### Exemplo 2: Campanha com Botão
```json
{
  "message": "Acesse nosso site",
  "buttons": [
    {
      "type": "url",
      "text": "Acessar",
      "url": "https://exemplo.com"
    }
  ]
}
```

### Exemplo 3: Campanha Simples (só texto)
```json
{
  "message": "Olá! Como vai?",
  "media": null,
  "buttons": null
}
```

---

## 🐛 Troubleshooting

### ❌ Erro: "Unauthorized"
**Causa**: Não está autenticado
**Solução**: Certifique-se de passar o cookie de sessão do Supabase

### ❌ Erro: "No campaigns found"
**Causa**: Nenhuma campanha pronta para envio
**Solução**:
1. Verifique se a campanha está com `status = 'scheduled'`
2. Verifique se `scheduled_at` já passou
3. Verifique se `is_paused = false`

### ❌ Erro: "Media base64 too large"
**Causa**: Imagem muito grande
**Solução**: Reduza o tamanho da imagem antes de fazer upload

---

## 📚 Arquivos de Documentação

- **N8N_COMPLETE_WORKFLOW.md** - Workflow completo com todos os nodes
- **EXAMPLE_API_RESPONSE.json** - Exemplo completo de resposta da API
- **N8N_INTEGRATION.md** - Documentação original

---

## ✅ Checklist de Implementação

- [x] Endpoint para buscar campanhas prontas
- [x] Endpoint para atualizar status de mensagens
- [x] Retornar mídia em Base64
- [x] Retornar instância e token WhatsApp
- [x] Retornar lista completa de destinatários
- [x] Suporte a throttling
- [x] Suporte a botões
- [x] Atualização automática de contadores
- [x] Documentação completa
- [x] Exemplo de resposta da API

---

**🎉 Pronto! Agora o n8n tem TODAS as informações necessárias para enviar campanhas WhatsApp automaticamente!**
