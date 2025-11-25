# Guia de Configuração N8N - Campaign Dispatcher v2.0

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
| `/api/n8n/campaigns/:id/complete` | PATCH | Finaliza campanha |

---

**Última atualização**: 2025-11-25
**Versão do Workflow**: 2.0
**Compatível com**: N8N v1.x, Evolution API v2.x
