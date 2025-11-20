# 🔑 Como Obter Credenciais do Mercado Pago

## Passo 1: Acessar o Painel de Desenvolvedores

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Faça login com sua conta Mercado Pago
3. Se não tiver uma aplicação, clique em **"Criar aplicação"**

## Passo 2: Ativar Modo de Teste

No topo da página, você verá um toggle entre **Produção** e **Teste**.

**⚠️ IMPORTANTE:** Certifique-se de estar em **MODO DE TESTE** (toggle azul)

## Passo 3: Copiar Credenciais de Teste

Na seção **"Credenciais de teste"**, você verá:

### Access Token
```
TEST-1234567890123456-112233-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-123456789
```
- Começa com `TEST-`
- É uma string longa de caracteres

### Public Key
```
TEST-a1b2c3d4-1234-5678-90ab-cdef12345678
```
- Também começa com `TEST-`
- É uma string mais curta

## Passo 4: Configurar no Sistema

1. **Acesse:** http://localhost:3000/admin/settings
2. **Na seção "Configurações de Pagamento - Mercado Pago":**
   - Cole o **Access Token** no campo "Access Token"
   - Cole a **Public Key** no campo "Public Key"
   - Deixe o **Webhook Secret** vazio por enquanto (geraremos depois)
   - **Ative:** "Habilitar Mercado Pago"
   - **Ative:** "Modo Sandbox" (para usar credenciais de teste)
3. **Clique em:** "Salvar Configurações"

## Passo 5: Verificar se Salvou

1. **Recarregue a página** (F5)
2. Verifique se os dados aparecem preenchidos
3. Se aparecerem, as configurações foram salvas com sucesso!

## 🧪 Testando o Fluxo de Pagamento

### 1. Acessar Planos
- Vá em: http://localhost:3000/plans
- Escolha um plano (ex: Bronze)
- Clique em "Fazer Upgrade"
- Clique em "Confirmar Pagamento"

### 2. Você será redirecionado para o Mercado Pago
- Use os **cartões de teste** do Mercado Pago
- Não use cartões reais!

### 3. Cartões de Teste

#### ✅ Pagamento Aprovado
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** APRO
- **CPF:** Qualquer válido (ex: 123.456.789-09)

#### ❌ Pagamento Recusado
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** OXXO
- **CPF:** Qualquer válido

#### ⏳ Pagamento Pendente
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** 11/25
- **Nome:** CONT
- **CPF:** Qualquer válido

## ❗ Problemas Comuns

### Erro: "Payment settings not configured"
**Causa:** As credenciais não foram salvas no banco de dados
**Solução:** Execute o SQL `FIX_SYSTEM_SETTINGS_SELECT_RLS.sql`

### Erro: "Failed to create payment preference"
**Causas possíveis:**
1. **Access Token inválido** - Verifique se copiou corretamente
2. **Credenciais expiradas** - Gere novas credenciais no painel
3. **Modo errado** - Certifique-se que está em modo TESTE

**Solução:**
1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Gere novas credenciais de teste
3. Cole no sistema e salve novamente

### Erro: "Invalid access token"
**Causa:** O Access Token está incorreto ou expirou
**Solução:** Copie novamente do painel do Mercado Pago

## 📚 Documentação Oficial

- **Credenciais:** https://www.mercadopago.com.br/developers/pt/docs/credentials
- **Cartões de Teste:** https://www.mercadopago.com.br/developers/pt/docs/testing/test-cards
- **API Reference:** https://www.mercadopago.com.br/developers/pt/reference

## 🔄 Quando Usar Modo Produção

**⚠️ ATENÇÃO:** Só ative o modo produção quando:
1. Tiver testado completamente o fluxo
2. Tiver uma conta Mercado Pago verificada
3. Tiver copiado as credenciais de **PRODUÇÃO** (não começam com TEST-)
4. Estiver pronto para receber pagamentos reais

**Para ativar produção:**
1. Copie as credenciais de **PRODUÇÃO** do painel
2. Cole no admin/settings
3. **DESATIVE** "Modo Sandbox"
4. Salve as configurações
