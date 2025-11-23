# 🚀 Integração n8n - Envio de Campanhas WhatsApp

## Endpoints Disponíveis

### 1. Buscar Campanhas Agendadas
```
GET /api/n8n/scheduled-campaigns
```
Retorna todas as campanhas prontas para envio com:
- Mensagem completa
- Lista de destinatários (telefones)
- Token e URL da API WhatsApp
- Mídia em Base64 (se houver)
- Configurações de throttling

### 2. Atualizar Status de Mensagem
```
POST /api/n8n/update-message-status
```
Marca mensagens como enviadas ou falhadas.

**Body:**
```json
{
  "campaignItemId": "uuid",
  "status": "sent" | "failed",
  "sentAt": "2025-01-22T10:00:00Z",
  "errorMessage": "erro (opcional)"
}
```

## 📁 Documentação Completa

Para documentação detalhada, exemplos de workflow e troubleshooting, consulte:
- `temp/docs/N8N_COMPLETE_WORKFLOW.md` - Workflow completo
- `temp/docs/API_N8N_ENDPOINTS.md` - Detalhes dos endpoints
- `temp/docs/EXAMPLE_API_RESPONSE.json` - Exemplo de resposta

## ⚠️ Importante

Antes de usar o agendamento, aplique a migration do banco de dados:
```sql
-- Execute em: Supabase Dashboard > SQL Editor
-- Arquivo: supabase/migrations/20250122_add_smart_scheduling.sql
```
