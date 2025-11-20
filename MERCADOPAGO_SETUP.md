# Configuração do Mercado Pago

Este guia explica como configurar o sistema de pagamentos com Mercado Pago.

## 📋 Pré-requisitos

1. Conta no Mercado Pago ([https://www.mercadopago.com.br](https://www.mercadopago.com.br))
2. Credenciais de teste ou produção

## 🔑 Obtendo as Credenciais

### Credenciais de Teste (Sandbox)

1. Acesse [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Vá em "Suas integrações" > Selecione ou crie uma aplicação
3. Vá na aba "Credenciais de teste"
4. Copie o **Access Token** (começa com `TEST-`)
5. Copie a **Public Key** (começa com `TEST-`)

### Credenciais de Produção

1. Na mesma área de "Suas integrações"
2. Vá na aba "Credenciais de produção"
3. Copie o **Access Token** (começa com `APP_USR-`)
4. Copie a **Public Key** (começa com `APP_USR-`)

## ⚙️ Configuração no Sistema

1. Acesse o painel administrativo: `http://localhost:3000/admin/settings`
2. Role até a seção "Configurações do Mercado Pago"
3. Preencha:
   - **Access Token**: Cole o token de teste ou produção
   - **Public Key**: Cole a chave pública
   - **Webhook Secret**: Deixe vazio por enquanto (gerado automaticamente)
   - **Modo Sandbox**: Ative para testes, desative em produção
   - **Pagamentos Habilitados**: Ative quando estiver pronto
4. Clique em "Salvar Configurações"

## 🌐 Desenvolvimento Local com URLs Públicas

O Mercado Pago precisa de URLs públicas para:
- Redirecionar o usuário após o pagamento
- Enviar notificações de webhook

### Opção 1: Usar ngrok (Recomendado para desenvolvimento)

1. **Instalar ngrok:**
   - Baixe em: [https://ngrok.com/download](https://ngrok.com/download)
   - Ou com chocolatey: `choco install ngrok`

2. **Executar ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Copiar a URL:**
   - ngrok mostrará uma URL como: `https://xxxx-xxx-xxx-xxx.ngrok.io`
   - Esta é uma URL pública temporária

4. **Configurar no projeto:**
   - Abra o arquivo `.env.local`
   - Descomente e ajuste:
     ```env
     NEXT_PUBLIC_APP_URL=https://xxxx-xxx-xxx-xxx.ngrok.io
     ```
   - Substitua `xxxx-xxx-xxx-xxx` pela URL do ngrok

5. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

### Opção 2: Desenvolvimento sem ngrok (Limitado)

Se não configurar ngrok:
- ✅ A preferência de pagamento será criada
- ✅ Você será redirecionado para o checkout do Mercado Pago
- ❌ Não receberá notificações webhook
- ❌ Não terá páginas de retorno após pagamento

O código está configurado para funcionar sem `back_urls` no modo sandbox.

## 🧪 Testando Pagamentos

### Cartões de Teste

Use estes cartões para testar no sandbox:

| Cartão | Número | CVV | Validade | Resultado |
|--------|--------|-----|----------|-----------|
| **Visa** | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Aprovado |
| **Mastercard** | 5031 7557 3453 0604 | 123 | 11/25 | ✅ Aprovado |
| **Visa** | 4013 5406 8274 6260 | 123 | 11/25 | ❌ Recusado |

**Outros dados para teste:**
- Nome: APRO (aprovação) ou OTHE (recusado)
- CPF: 12345678909
- Email: test@test.com

Mais cartões de teste: [https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)

## 🔗 URLs do Sistema

Com ngrok configurado, o Mercado Pago redirecionará para:

- **Sucesso**: `https://sua-url.ngrok.io/plans/success`
- **Falha**: `https://sua-url.ngrok.io/plans/failure`
- **Pendente**: `https://sua-url.ngrok.io/plans/pending`
- **Webhook**: `https://sua-url.ngrok.io/api/webhooks/mercadopago`

## 🚀 Produção

### 1. Configurar domínio

No `.env.local` (ou variáveis de ambiente do servidor):
```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### 2. Trocar credenciais

No painel admin:
1. Substitua as credenciais de teste pelas de produção
2. Desative "Modo Sandbox"
3. Ative "Pagamentos Habilitados"

### 3. Configurar Webhook no Mercado Pago

1. Acesse [https://www.mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Vá em "Webhooks"
3. Adicione a URL: `https://seu-dominio.com/api/webhooks/mercadopago`
4. Selecione os eventos:
   - `payment.created`
   - `payment.updated`

## 🐛 Troubleshooting

### Erro: "auth_return_invalid, back_url_success must be defined"

**Causa**: `NEXT_PUBLIC_APP_URL` não está configurado ou está usando localhost

**Solução**: Configure ngrok ou uma URL pública válida no `.env.local`

### Erro: "Mercado Pago access token not configured"

**Causa**: Credenciais não foram salvas no sistema

**Solução**: Acesse `/admin/settings` e configure as credenciais

### Pagamento aprovado mas créditos não foram adicionados

**Causa**: Webhook não foi recebido

**Solução**:
1. Verifique se o ngrok está rodando
2. Verifique os logs do servidor
3. Teste o webhook manualmente

### Erro 401 no webhook

**Causa**: Mercado Pago não consegue autenticar a requisição

**Solução**: Implemente validação de assinatura (TODO no código)

## 📊 Fluxo do Pagamento

```
1. Usuário clica em "Fazer Upgrade"
   ↓
2. Sistema cria preferência no Mercado Pago
   ↓
3. Usuário é redirecionado para checkout do MP
   ↓
4. Usuário preenche dados e confirma
   ↓
5. Mercado Pago processa o pagamento
   ↓
6. MP redireciona usuário para success/failure/pending
   ↓
7. MP envia webhook para o sistema
   ↓
8. Sistema atualiza plano e créditos do usuário
```

## 📝 Notas Importantes

- **Sandbox vs Produção**: Nunca use credenciais de teste em produção
- **Segurança**: As credenciais são armazenadas criptografadas no banco
- **Webhook**: É essencial para confirmar pagamentos automaticamente
- **Testes**: Sempre teste todo o fluxo antes de ir para produção
- **Logs**: Monitore os logs para identificar problemas

## 🔐 Segurança

- ✅ Credenciais são armazenadas no banco de dados (Supabase)
- ✅ Apenas admins podem ver/editar configurações
- ✅ Access tokens nunca são enviados para o frontend
- ⚠️ TODO: Implementar validação de assinatura do webhook
- ⚠️ TODO: Implementar rate limiting nas APIs

## 📚 Documentação Oficial

- [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [SDK Node.js](https://www.mercadopago.com.br/developers/pt/docs/sdks-library/server-side/nodejs)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)
