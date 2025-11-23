# Integração de Pagamentos - Mercado Pago

Este documento descreve a implementação completa da integração com Mercado Pago para processamento de pagamentos de planos no sistema.

## Visão Geral

O sistema permite que usuários escolham planos pagos e realizem o pagamento através do Mercado Pago. Após a confirmação do pagamento, o plano do usuário é atualizado automaticamente e os créditos são adicionados à conta.

## Arquitetura

### 1. Fluxo de Pagamento

```
Usuário seleciona plano
    ↓
Confirma pagamento no dialog
    ↓
API cria preference no Mercado Pago
    ↓
Usuário é redirecionado para checkout
    ↓
Mercado Pago processa pagamento
    ↓
Webhook recebe notificação
    ↓
Sistema atualiza plano e créditos
    ↓
Usuário é redirecionado de volta
```

### 2. Componentes Implementados

#### Backend

**Serviços:**
- `src/services/mercadopago.ts` - Serviço de integração com API do Mercado Pago
  - `getMercadoPagoClient()` - Cria cliente autenticado
  - `createPaymentPreference()` - Cria preferência de pagamento
  - `getPayment()` - Obtém detalhes de um pagamento
  - `validateWebhookSignature()` - Valida assinatura do webhook
  - `processPaymentNotification()` - Processa notificação de pagamento

**API Routes:**
- `src/app/api/payments/create-preference/route.ts` - Cria preferência de pagamento
- `src/app/api/webhooks/mercadopago/route.ts` - Recebe notificações do Mercado Pago

#### Frontend

**Páginas:**
- `src/app/(dashboard)/plans/page.tsx` - Página de visualização de planos
- `src/app/(dashboard)/plans/success/page.tsx` - Página de sucesso
- `src/app/(dashboard)/plans/pending/page.tsx` - Página de pagamento pendente
- `src/app/(dashboard)/plans/failure/page.tsx` - Página de falha
- `src/app/(dashboard)/admin/settings/page.tsx` - Configurações de pagamento (admin)

**Componentes:**
- `src/components/plans/PlansPage.tsx` - Componente de seleção de planos
- `src/components/admin/SystemSettings.tsx` - Configuração Mercado Pago

#### Database

**Tabelas:**
- `plans` - Armazena os planos disponíveis
- `system_settings` - Armazena configurações do Mercado Pago
- `payment_transactions` - Registra todas as transações (audit trail)

## Configuração

### 1. Aplicar Migrations

Execute as migrations no Supabase Dashboard > SQL Editor:

```sql
-- 1. Criar tabela de planos
-- Arquivo: supabase/migrations/20250120_create_plans_table.sql

-- 2. Criar tabela de configurações
-- Arquivo: supabase/migrations/20250120_create_settings_table.sql

-- 3. Criar tabela de transações
-- Arquivo: supabase/migrations/20250120_create_payment_transactions.sql
```

### 2. Configurar Mercado Pago (Admin)

1. Acesse `/admin/settings`
2. Localize a seção "Configurações de Pagamento - Mercado Pago"
3. Preencha os campos:
   - **Access Token**: Sua chave de acesso do Mercado Pago
   - **Public Key**: Sua chave pública
   - **Webhook Secret**: Secret para validar webhooks (opcional)
   - **Habilitar Mercado Pago**: Toggle para ativar/desativar
   - **Modo Sandbox**: Toggle para usar ambiente de teste
4. Clique em "Salvar Configurações"

### 3. Obter Credenciais do Mercado Pago

#### Modo Sandbox (Testes)
1. Acesse https://www.mercadopago.com.br/developers/panel
2. Vá em "Suas integrações" > "Credenciais de teste"
3. Copie o **Access Token** e **Public Key** de teste

#### Modo Produção
1. Acesse https://www.mercadopago.com.br/developers/panel
2. Vá em "Suas integrações" > "Credenciais de produção"
3. Copie o **Access Token** e **Public Key** de produção

### 4. Configurar Webhook no Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers/panel/webhooks
2. Clique em "Adicionar webhook"
3. Configure:
   - **URL**: `https://seu-dominio.com/api/webhooks/mercadopago`
   - **Eventos**: Selecione "Pagamentos"
4. Salve a configuração

### 5. Variáveis de Ambiente

Adicione no arquivo `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

## Uso

### Para Usuários

1. Acesse `/plans`
2. Visualize os planos disponíveis
3. Clique em "Fazer Upgrade" ou "Selecionar Plano"
4. Confirme o pagamento no dialog
5. Será redirecionado para o checkout do Mercado Pago
6. Complete o pagamento
7. Após confirmação, será redirecionado de volta com sucesso
8. O plano e créditos são atualizados automaticamente

### Para Admins

#### Gerenciar Planos
1. Acesse `/admin/plans`
2. Crie, edite ou delete planos
3. Configure preços, créditos, duração e recursos

#### Configurar Pagamento
1. Acesse `/admin/settings`
2. Configure as credenciais do Mercado Pago
3. Ative/desative o processamento de pagamentos
4. Alterne entre sandbox e produção

## Estrutura de Dados

### Plan
```typescript
{
  id: string
  name: string
  description: string | null
  tier: 'free' | 'bronze' | 'silver' | 'gold'
  price: number
  credits: number
  duration_days: number
  features: string[]
  is_active: boolean
  sort_order: number
}
```

### MercadoPagoSettings
```typescript
{
  access_token: string
  public_key: string
  webhook_secret: string
  is_enabled: boolean
  use_sandbox: boolean
}
```

### PaymentTransaction
```typescript
{
  id: string
  user_id: string
  plan_tier: string
  amount: number
  credits_added: number
  payment_method: 'mercadopago'
  payment_id: string | null
  status: 'pending' | 'approved' | 'rejected' | 'refunded'
  payment_data: Record<string, any>
}
```

## Segurança

### Row Level Security (RLS)

- **plans**: Leitura pública para planos ativos, admin-only para edição
- **system_settings**: Admin-only para todas as operações
- **payment_transactions**: Usuários veem apenas suas transações, admins veem todas

### Validações

1. **Autenticação**: Todas as rotas verificam autenticação do usuário
2. **Configuração**: Verifica se Mercado Pago está habilitado antes de processar
3. **Webhook**: Valida assinatura das notificações (TODO: implementar HMAC)
4. **Planos**: Verifica se plano está ativo antes de criar pagamento

## Testes

### Testar Fluxo de Pagamento (Sandbox)

1. Configure credenciais de teste no admin
2. Ative o modo sandbox
3. Selecione um plano
4. Use cartões de teste do Mercado Pago:
   - **Aprovado**: 5031 4332 1540 6351 | CVV: 123 | Validade: 11/25
   - **Recusado**: 5031 7557 3453 0604 | CVV: 123 | Validade: 11/25

Lista completa: https://www.mercadopago.com.br/developers/pt/docs/sdks-library/client-side/mp-checkout-bricks/default-rendering#bookmark_cart%C3%B5es_de_teste

### Testar Webhook Localmente

Use o Mercado Pago Simulator ou ngrok para expor sua aplicação:

```bash
ngrok http 3000
```

Então configure o webhook URL no Mercado Pago com a URL do ngrok.

## Troubleshooting

### Pagamento não atualiza plano

1. Verifique logs do webhook em `/api/webhooks/mercadopago`
2. Confirme que o webhook está configurado corretamente no Mercado Pago
3. Verifique se a URL está acessível publicamente
4. Veja logs da tabela `payment_transactions` para detalhes

### Erro ao criar preferência

1. Verifique se as credenciais estão corretas
2. Confirme que o Mercado Pago está habilitado
3. Verifique se o plano existe e está ativo
4. Veja logs do servidor para detalhes

### Webhook não é chamado

1. Verifique se a URL está correta no painel do Mercado Pago
2. Confirme que a URL é HTTPS (obrigatório em produção)
3. Teste manualmente com curl ou Postman
4. Verifique logs do Mercado Pago Webhooks

## Próximos Passos

### Melhorias Sugeridas

1. **Assinatura HMAC**: Implementar validação completa de assinatura do webhook
2. **Retry Logic**: Implementar retry em caso de falha no webhook
3. **Admin Dashboard**: Visualizar transações e histórico de pagamentos
4. **Emails**: Enviar emails de confirmação após pagamento
5. **Cupons**: Sistema de cupons de desconto
6. **Renovação Automática**: Implementar assinaturas recorrentes
7. **Refund**: Implementar sistema de reembolso pelo admin
8. **Relatórios**: Dashboard de métricas de pagamento

## Suporte

Para problemas ou dúvidas:
- Documentação Mercado Pago: https://www.mercadopago.com.br/developers/pt
- Status API: https://status.mercadopago.com/
- Suporte: https://www.mercadopago.com.br/developers/pt/support

## Changelog

### v1.0.0 (2025-01-20)
- ✅ Implementação inicial
- ✅ Criação de preferências de pagamento
- ✅ Webhook para notificações
- ✅ Atualização automática de planos
- ✅ Admin configuração
- ✅ Páginas de sucesso/falha
- ✅ Modo sandbox
- ✅ Audit trail (payment_transactions)
