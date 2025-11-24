# 🚀 Guia de Configuração N8N - Sem Variáveis de Ambiente

Como o plano atual do n8n não tem acesso a variáveis de ambiente, vamos configurar os valores diretamente no workflow.

## 📋 Pré-requisitos

Antes de começar, tenha em mãos:

1. **URL da sua aplicação Next.js**
   - Exemplo: `https://meusistemadedisparos.com`
   - Ou para desenvolvimento: `http://localhost:3000`

2. **N8N_API_KEY** (do seu .env.local)
   - A mesma chave que está no arquivo `.env.local`
   - Exemplo: `minha-chave-secreta-123`

3. **EVOLUTION_API_URL**
   - Exemplo: `https://dev.n8n.sistemabrasil.online`

---

## 🔧 Passo 1: Importar o Workflow

1. Acesse seu painel n8n
2. Clique em **"Workflows"** no menu lateral
3. Clique em **"Import from File"**
4. Selecione: `workflows/evolution-api-campaign-dispatcher.json`
5. Clique em **"Import"**

---

## ✏️ Passo 2: Configurar URLs Manualmente

Após importar, você precisa editar **CADA NODE** que faz requisição HTTP e substituir os valores:

### 🔹 Node 1: "Fetch Test Campaigns"

1. Clique no node "Fetch Test Campaigns"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/test-campaigns`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/test-campaigns`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

### 🔹 Node 2: "Fetch Recipients"

1. Clique no node "Fetch Recipients"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$json.id}}/items`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/campaigns/{{$json.id}}/items`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

### 🔹 Node 3: "Update Status to Processing"

1. Clique no node "Update Status to Processing"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/status`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/status`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

### 🔹 Node 4: "Send Message via Evolution API"

1. Clique no node "Send Message via Evolution API"
2. No campo **URL**, substitua:
   - **De**: `={{$env.EVOLUTION_API_URL}}/message/sendText/{{$('Split Campaigns').item.json.instance.instance_key}}`
   - **Para**: `https://dev.n8n.sistemabrasil.online/message/sendText/{{$('Split Campaigns').item.json.instance.instance_key}}`
3. **Não mexa no header apikey** - ele usa o token da instância dinamicamente

### 🔹 Node 5: "Update Item Status"

1. Clique no node "Update Item Status"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaign-items/{{$('Split Recipients').item.json.id}}/status`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/campaign-items/{{$('Split Recipients').item.json.id}}/status`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

### 🔹 Node 6: "Update Campaign Counters"

1. Clique no node "Update Campaign Counters"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/counters`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/counters`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

### 🔹 Node 7: "Complete Campaign"

1. Clique no node "Complete Campaign"
2. No campo **URL**, substitua:
   - **De**: `={{$env.NEXT_PUBLIC_APP_URL}}/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/complete`
   - **Para**: `https://SUA-URL-AQUI.com/api/n8n/campaigns/{{$('Split Campaigns').item.json.id}}/complete`
3. Em **Headers → Authorization**, substitua:
   - **De**: `=Bearer {{$env.N8N_API_KEY}}`
   - **Para**: `Bearer SUA-CHAVE-API-AQUI`

---

## ✅ Passo 3: Salvar e Ativar

1. Clique em **"Save"** no canto superior direito
2. Clique no botão **"Active"** para ativar o workflow
3. O workflow começará a executar a cada 30 segundos

---

## 📝 Resumo dos Valores a Substituir

```bash
# URL da sua aplicação (substitua em TODOS os nodes, exceto "Send Message via Evolution API")
https://SUA-URL-AQUI.com

# N8N API Key (substitua em TODOS os headers Authorization, exceto "Send Message via Evolution API")
Bearer SUA-CHAVE-API-AQUI

# Evolution API URL (substitua APENAS no node "Send Message via Evolution API")
https://dev.n8n.sistemabrasil.online
```

---

## 🎯 Checklist Final

Antes de ativar, verifique:

- [ ] Todas as URLs apontam para sua aplicação correta
- [ ] Todos os headers Authorization têm a mesma N8N_API_KEY
- [ ] O node "Send Message via Evolution API" aponta para Evolution API URL correta
- [ ] Workflow está salvo
- [ ] Workflow está ativo (botão verde)

---

## 🧪 Testar o Workflow

1. Crie uma campanha de teste no seu dashboard
2. Aguarde até 30 segundos
3. No n8n, vá em **"Executions"** para ver os logs
4. Verifique se a campanha foi processada

---

## 🔍 Troubleshooting

### Erro: "Não autorizado" (401)

**Problema**: N8N_API_KEY incorreta

**Solução**:
1. Verifique a chave no arquivo `.env.local`
2. Atualize em TODOS os headers Authorization dos nodes
3. Certifique-se de incluir `Bearer` antes da chave

### Erro: "Instância não encontrada"

**Problema**: URL da aplicação incorreta

**Solução**:
1. Verifique se a URL está correta (com https://)
2. Certifique-se de que a aplicação está online
3. Teste manualmente: `curl https://sua-url.com/api/n8n/test-campaigns -H "Authorization: Bearer SUA-CHAVE"`

### Erro: "Evolution API timeout"

**Problema**: Evolution API URL incorreta ou offline

**Solução**:
1. Verifique se `https://dev.n8n.sistemabrasil.online` está acessível
2. Teste: `curl https://dev.n8n.sistemabrasil.online/instance/connectionState/INSTANCE_KEY -H "apikey: TOKEN"`

---

## 💡 Dica Pro

Para facilitar futuras atualizações, mantenha um arquivo de texto com seus valores:

```text
MINHA_URL=https://meusistemadedisparos.com
MINHA_API_KEY=minha-chave-secreta-123
EVOLUTION_URL=https://dev.n8n.sistemabrasil.online
```

Assim você pode copiar e colar rapidamente ao criar novos workflows!

---

## 📚 Referências

- [N8N Documentation](https://docs.n8n.io/)
- [Evolution API Docs](https://doc.evolution-api.com/)
- Arquivo principal: `N8N_EVOLUTION_WORKFLOW.md`

---

**Qualquer dúvida, consulte a documentação completa ou entre em contato com o suporte técnico!**
