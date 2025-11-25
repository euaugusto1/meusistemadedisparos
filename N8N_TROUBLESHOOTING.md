# N8N Troubleshooting - Retornando HTML ao invés de JSON

## 🔍 Problema Identificado

O node "Fetch Production Campaigns" está retornando HTML da página inicial (`<!DOCTYPE html>`) ao invés de JSON.

**Causa provável**: A requisição está sendo redirecionada para a página de login ou há problema na autenticação.

---

## ✅ Solução: Configuração Correta do Node

### 1. Remover Generic Credential Type

O workflow JSON usa `genericCredentialType` com `httpHeaderAuth`, mas isso pode causar problemas.

**Configuração correta**:

1. Abra o node **"Fetch Production Campaigns"**
2. Em **Authentication**, selecione: **`None`**
3. Em **Send Headers**, marque: **`true`**
4. Em **Header Parameters**, clique em **Add Parameter**:
   - **Name**: `Authorization`
   - **Value**: `Bearer {{$env.N8N_API_KEY}}`

### 2. Verificar se as Variáveis Estão Corretas

No N8N, vá em **Settings → Variables** e confirme:

```
NEXT_PUBLIC_APP_URL = https://dev.wpp.sistemabrasil.online
N8N_API_KEY = [seu-token-aqui]
```

⚠️ **IMPORTANTE**:
- Não use aspas nos valores
- Use o domínio EXATO (sem barra no final)
- O N8N_API_KEY deve ser o MESMO valor do `.env`

### 3. Testar a URL Diretamente

Antes de testar o node, teste a URL direto no navegador ou curl:

```bash
curl -X GET \
  'https://dev.wpp.sistemabrasil.online/api/n8n/scheduled-campaigns' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta esperada**:
```json
{
  "success": true,
  "count": 0,
  "campaigns": [],
  "message": "No campaigns ready to send"
}
```

**Se retornar HTML**: O token está errado ou o endpoint está com problema.

---

## 🔧 Configuração Passo a Passo para TODOS os Nodes

### Nodes que chamam a API do Next.js (5 nodes):

Todos estes nodes precisam da mesma configuração de autenticação:

1. **Fetch Production Campaigns**
2. **Update Status to Processing**
3. **Update Item Status**
4. **Update Campaign Counters**
5. **Complete Campaign**

**Configuração para cada um**:

#### Aba Parameters:
- **Method**: (varia - GET ou PATCH)
- **URL**: (varia por node - use as variáveis do workflow)
- **Authentication**: `None` ⚠️ IMPORTANTE: Não use Generic Credential
- **Send Headers**: `✓` (marcar)
- **Header Parameters**:
  - Clique em **Add Parameter**
  - **Name**: `Authorization`
  - **Value**: `Bearer {{$env.N8N_API_KEY}}`

#### Para nodes com Body (PATCH):
- **Send Body**: `✓` (marcar)
- **Body Content Type**: `JSON`
- **Specify Body**: `Using JSON`
- **JSON**: (varia por node)

---

## 📋 Checklist de Configuração Node por Node

### ✅ Node 1: Schedule Trigger
- ✓ Já configurado corretamente
- Nenhuma alteração necessária

### ✅ Node 2: Fetch Production Campaigns
**URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/scheduled-campaigns`

**Headers**:
```
Authorization: Bearer {{$env.N8N_API_KEY}}
```

**Teste**: Execute e deve retornar JSON (não HTML)

### ✅ Node 3: Has Campaigns?
- ✓ Node condicional - nenhuma alteração necessária

### ✅ Node 4: Split Campaigns
- ✓ Node de loop - nenhuma alteração necessária

### ✅ Node 5: Update Status to Processing
**URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$json.campaignId}}/status`

**Headers**:
```
Authorization: Bearer {{$env.N8N_API_KEY}}
```

**Body**:
```json
{
  "status": "processing"
}
```

### ✅ Node 6: Has Recipients?
- ✓ Node condicional - nenhuma alteração necessária

### ✅ Node 7: Split Recipients
- ✓ Node de loop - nenhuma alteração necessária

### ✅ Node 8: Has Media?
- ✓ Node condicional - nenhuma alteração necessária

### ✅ Node 9: Send Media Message
**URL**: `{{$('Split Campaigns').item.json.instance.apiUrl}}/message/sendMedia/{{$('Split Campaigns').item.json.instance.name}}`

**Headers**:
```
apikey: {{$('Split Campaigns').item.json.instance.apiToken}}
```

⚠️ Este node usa `apikey` (não `Authorization`) porque chama a Evolution API, não a API do Next.js

### ✅ Node 10: Send Text Message
**URL**: `{{$('Split Campaigns').item.json.instance.apiUrl}}/message/sendText/{{$('Split Campaigns').item.json.instance.name}}`

**Headers**:
```
apikey: {{$('Split Campaigns').item.json.instance.apiToken}}
```

### ✅ Node 11: Merge Send Results
- ✓ Node de merge - nenhuma alteração necessária

### ✅ Node 12: Update Item Status
**URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaign-items/{{$('Split Recipients').item.json.id}}/status`

**Headers**:
```
Authorization: Bearer {{$env.N8N_API_KEY}}
```

**Body**:
```json
{
  "status": "{{$json.error ? 'failed' : 'sent'}}",
  "error_message": "{{$json.error || null}}",
  "response_data": {{$json}}
}
```

### ✅ Node 13: Update Campaign Counters
**URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$('Split Campaigns').item.json.campaignId}}/counters`

**Headers**:
```
Authorization: Bearer {{$env.N8N_API_KEY}}
```

**Body**:
```json
{
  "increment_sent": {{$('Merge Send Results').item.json.error ? 0 : 1}},
  "increment_failed": {{$('Merge Send Results').item.json.error ? 1 : 0}}
}
```

### ✅ Node 14: Random Delay
- ✓ Node de wait - nenhuma alteração necessária

### ✅ Node 15: Complete Campaign
**URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$('Split Campaigns').item.json.campaignId}}/complete`

**Headers**:
```
Authorization: Bearer {{$env.N8N_API_KEY}}
```

### ✅ Node 16: No Campaigns
- ✓ No-op node - nenhuma alteração necessária

### ✅ Node 17: No Recipients
- ✓ No-op node - nenhuma alteração necessária

---

## 🧪 Como Testar Cada Node

### Teste 1: Fetch Production Campaigns

1. Clique no node
2. Clique em **"Execute Node"**
3. Veja o resultado na aba **OUTPUT**

**✅ Sucesso**: Retorna JSON
```json
{
  "success": true,
  "count": 0,
  "campaigns": []
}
```

**❌ Erro**: Retorna HTML
```html
<!DOCTYPE html>...
```

**Se retornar HTML**:
- ✅ Verifique se `N8N_API_KEY` está configurada
- ✅ Verifique se o valor é o mesmo do `.env`
- ✅ Certifique-se que está usando `Authentication: None` (não Generic Credential)
- ✅ Verifique se o header é `Authorization` (com maiúscula no A)

---

## 🔍 Debug Avançado

### 1. Verificar Token no .env do Next.js

```bash
# Na pasta do projeto Next.js
grep N8N_API_KEY .env
```

Copie o valor EXATAMENTE como está (sem aspas)

### 2. Testar Endpoint Diretamente

```bash
curl -v -X GET \
  'https://dev.wpp.sistemabrasil.online/api/n8n/scheduled-campaigns' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Sucesso**: Status 200, retorna JSON
**Erro 401**: Token incorreto
**Erro 500**: Problema no servidor
**Retorna HTML**: Redirecionamento (token errado ou endpoint não encontrado)

### 3. Verificar Logs do Next.js

No terminal onde o Next.js está rodando, você verá:

**Token correto**:
```
[API] GET /api/n8n/scheduled-campaigns - 200
```

**Token incorreto**:
```
[API] GET /api/n8n/scheduled-campaigns - 401
```

---

## 📝 Workflow JSON Atualizado (Apenas Authentication)

Se quiser reimportar, aqui está a configuração correta do node "Fetch Production Campaigns":

```json
{
  "parameters": {
    "method": "GET",
    "url": "={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/scheduled-campaigns",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Authorization",
          "value": "=Bearer {{$env.N8N_API_KEY}}"
        }
      ]
    },
    "options": {}
  },
  "name": "Fetch Production Campaigns",
  "type": "n8n-nodes-base.httpRequest"
}
```

**Diferença**: `"authentication": "none"` ao invés de `"genericCredentialType"`

---

## ⚡ Solução Rápida

1. **Delete o workflow atual** no N8N
2. **Edite o arquivo** `workflows/evolution-api-production-dispatcher.json`
3. **Substitua** todas as ocorrências de:
   ```json
   "authentication": "genericCredentialType",
   "genericAuthType": "httpHeaderAuth",
   ```

   Por:
   ```json
   "authentication": "none",
   ```

4. **Reimporte** o workflow
5. **Configure as variáveis** (NEXT_PUBLIC_APP_URL e N8N_API_KEY)
6. **Teste** o node "Fetch Production Campaigns"

---

## 🎯 Resumo do Problema

**O que está acontecendo**:
- N8N está fazendo a requisição sem o header de autenticação correto
- O Next.js redireciona para a página inicial (HTML)
- Por isso você vê `<!DOCTYPE html>` ao invés de JSON

**Solução**:
- Usar `authentication: "none"` e configurar header manualmente
- Garantir que `N8N_API_KEY` está correta
- Testar o endpoint direto antes de usar no workflow

---

**Última atualização**: 2025-01-27
