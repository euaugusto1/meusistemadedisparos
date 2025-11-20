# 🔗 Configurar Webhook Mercado Pago em Localhost

## Passo 1: Instalar ngrok

### Windows:
1. Baixe: https://ngrok.com/download
2. Extraia o arquivo `ngrok.exe`
3. Coloque em uma pasta (ex: `C:\ngrok\`)
4. Adicione ao PATH do sistema (opcional)

### Ou via Chocolatey:
```bash
choco install ngrok
```

## Passo 2: Criar Conta no ngrok (Gratuito)

1. Acesse: https://dashboard.ngrok.com/signup
2. Crie uma conta gratuita
3. Copie seu auth token em: https://dashboard.ngrok.com/get-started/your-authtoken

## Passo 3: Configurar Auth Token

```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

## Passo 4: Expor Localhost

**No terminal, execute:**
```bash
ngrok http 3001
```

**Você verá:**
```
Session Status                online
Account                       seu@email.com
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3001
```

**⚠️ IMPORTANTE:** Mantenha esse terminal aberto! Se fechar, o túnel é encerrado.

## Passo 5: Configurar Webhook no Mercado Pago

### 5.1 Acesse o Painel do Mercado Pago:
- **Produção:** https://www.mercadopago.com.br/developers/panel
- **Sandbox (Teste):** https://www.mercadopago.com.br/developers/panel (mesmo painel, escolha "Test" no topo)

### 5.2 Configure o Webhook:

1. No menu lateral, clique em **"Webhooks"** ou **"Notificações"**
2. Clique em **"Configurar notificações"**
3. Em **"URL de produção"** ou **"URL de teste"**, cole:
   ```
   https://abc123.ngrok-free.app/api/webhooks/mercadopago
   ```
   (substitua `abc123` pela URL que o ngrok gerou)

4. Selecione os eventos:
   - ✅ **payment** - Notificações de pagamento
   - ✅ **merchant_order** - Pedidos (opcional)

5. Clique em **"Salvar"**

### 5.3 Testar o Webhook:

O Mercado Pago envia uma requisição de teste automaticamente. Você deve ver no terminal do ngrok:

```
POST /api/webhooks/mercadopago  200 OK
```

## Passo 6: Testar Fluxo Completo

1. **Inicie o servidor Next.js:**
   ```bash
   npm run dev
   ```
   (Deve estar rodando em `http://localhost:3001`)

2. **Inicie o ngrok em OUTRO terminal:**
   ```bash
   ngrok http 3001
   ```

3. **Acesse sua aplicação via ngrok:**
   - Abra: `https://abc123.ngrok-free.app/plans`
   - Selecione um plano
   - Clique em "Fazer Upgrade"

4. **Faça um pagamento de teste:**
   - Use os cartões de teste do Mercado Pago
   - Após aprovar o pagamento, o webhook será chamado

5. **Verifique os logs:**
   - Terminal do Next.js: logs do webhook
   - Terminal do ngrok: requisições HTTP

## 📊 Monitorar Requisições no ngrok

Acesse: `http://127.0.0.1:4040`

Você verá:
- Todas as requisições HTTP
- Headers
- Body
- Resposta do seu servidor

Perfeito para debugar o webhook!

## 🎯 Cartões de Teste do Mercado Pago

### Cartão Aprovado:
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** APRO
- **CPF:** Qualquer válido

### Cartão Recusado:
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** OXXO
- **CPF:** Qualquer válido

### Cartão Pendente:
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** CONT
- **CPF:** Qualquer válido

## ⚠️ Importante

### Limitações do ngrok Gratuito:
- ✅ Ilimitado tempo de uso
- ✅ HTTPS incluído
- ❌ URL muda a cada reinicialização (precisa reconfigurar webhook)
- ❌ 1 túnel por vez

### Para URL fixa:
- Use ngrok pago: https://ngrok.com/pricing
- Ou use Cloudflare Tunnel (gratuito com domínio próprio)

## 🔄 Alternativa: Usar Modo Teste Sem Webhook

Você pode testar o fluxo completo SEM configurar webhook:

1. Faça o pagamento de teste no Mercado Pago
2. Anote o `payment_id` da URL de retorno
3. Chame manualmente a API de processamento:

```bash
curl -X POST http://localhost:3001/api/webhooks/mercadopago \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.created",
    "data": {
      "id": "123456789"
    }
  }'
```

Isso simula o webhook do Mercado Pago!

## 📝 Checklist Final

- [ ] ngrok instalado e configurado
- [ ] Auth token configurado
- [ ] Túnel ngrok rodando (`ngrok http 3001`)
- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] Webhook configurado no painel do Mercado Pago
- [ ] Credenciais de teste configuradas no admin
- [ ] Teste de pagamento realizado
- [ ] Webhook recebido e processado

## 🆘 Troubleshooting

### Webhook não chega:
1. Verifique se o ngrok está rodando
2. Verifique se a URL está correta no Mercado Pago
3. Teste manualmente: `curl https://abc123.ngrok-free.app/api/webhooks/mercadopago`

### Erro 404:
- A rota está em `/api/webhooks/mercadopago`
- Certifique-se que o arquivo existe em `src/app/api/webhooks/mercadopago/route.ts`

### Erro 500:
- Verifique os logs do Next.js
- Verifique se as credenciais do Mercado Pago estão corretas
- Verifique se a tabela `payment_transactions` existe
