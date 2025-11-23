# Instâncias de Teste - Sistema UAZAPI

## 📋 Visão Geral

O sistema agora suporta instâncias de teste gratuitas para permitir que usuários testem a plataforma sem custo. Essas instâncias usam o servidor de teste da UAZAPI e têm duração limitada de **1 hora**.

## ⚙️ Configuração

### Credenciais do Servidor de Teste
- **URL:** `https://free.uazapi.com`
- **Admin Token:** `ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t`

### Banco de Dados

Nova migration adicionada: `20250122_add_test_instance_fields.sql`

**Novos campos em `whatsapp_instances`:**
- `is_test` (BOOLEAN) - Indica se é uma instância de teste
- `expires_at` (TIMESTAMPTZ) - Data/hora de expiração
- `server_url` (TEXT) - URL do servidor UAZAPI (produção ou teste)

## 🎨 Interface do Usuário

### Visual Indicators

1. **Card de Criação de Instância de Teste**
   - Aparece no topo da página de instâncias
   - Fundo gradiente laranja/amarelo
   - Aviso claro: "será apagada em 1 hora"
   - Botão "Criar Instância de Teste"

2. **Badge "TESTE"**
   - Canto superior direito do card da instância
   - Cor laranja para destaque
   - Ícone de tubo de ensaio (TestTube2)

3. **Timer de Expiração**
   - Exibe tempo restante (ex: "45min restantes" ou "0h 30min restantes")
   - Atualiza automaticamente a cada 30 segundos
   - Fundo laranja para destacar urgência

4. **Borda Especial**
   - Instâncias de teste têm borda laranja
   - Diferencia visualmente de instâncias de produção

## 🔌 API Endpoints

### POST `/api/instances/test`
Cria uma nova instância de teste

**Validações:**
- Usuário autenticado
- Máximo de 1 instância de teste ativa por usuário
- Retorna erro se já existe instância de teste não expirada

**Fluxo:**
1. Verifica instância de teste existente
2. Cria instância no servidor UAZAPI
3. Salva no banco com `is_test=true` e `expires_at` (1 hora)
4. Retorna instância criada

**Response Success:**
```json
{
  "success": true,
  "instance": { /* WhatsAppInstance */ },
  "message": "Instância de teste criada com sucesso! Válida por 1 hora."
}
```

**Response Error (já existe):**
```json
{
  "error": "Você já possui uma instância de teste ativa. Expira em 30 minutos."
}
```

### DELETE `/api/instances/test`
Remove instâncias de teste expiradas

**Fluxo:**
1. Busca instâncias de teste expiradas do usuário
2. Tenta deletar do servidor UAZAPI (ignora erros)
3. Deleta do banco de dados
4. Retorna número de instâncias removidas

## ⏱️ Auto-cleanup

### Frontend (ClientInstances.tsx)
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Atualiza timer visualmente
    setInstances(prev => [...prev])

    // Remove instâncias expiradas localmente
    const expiredIds = instances
      .filter(i => i.is_test && expired(i.expires_at))
      .map(i => i.id)

    if (expiredIds.length > 0) {
      setInstances(prev => prev.filter(i => !expiredIds.includes(i.id)))
      fetch('/api/instances/test', { method: 'DELETE' })
    }
  }, 30000) // 30 segundos
}, [instances])
```

### Backend (SQL)
```sql
-- Função para limpar instâncias expiradas
CREATE FUNCTION cleanup_expired_test_instances()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_instances
  WHERE is_test = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Uso:** Pode ser chamado via cron job ou manualmente

## 📊 Limitações

1. **Duração:** 1 hora exata após criação
2. **Quantidade:** 1 instância de teste ativa por usuário
3. **Servidor:** Servidor gratuito da UAZAPI (pode ter limitações)
4. **Persistência:** Dados são perdidos após expiração
5. **Performance:** Pode ser mais lento que servidores de produção

## 🚀 Fluxo de Uso

1. **Usuário acessa página "Minhas Instâncias"**
2. **Clica em "Criar Instância de Teste"**
3. **Sistema cria instância no servidor UAZAPI**
4. **Instância aparece com:**
   - Badge "TESTE" laranja
   - Timer mostrando tempo restante
   - Borda laranja
5. **Usuário conecta WhatsApp normalmente (QR Code)**
6. **Usa a instância para testes**
7. **Após 1 hora:**
   - Timer mostra "Expirada"
   - Frontend remove automaticamente
   - Backend limpa via API

## 🎯 Benefícios

- ✅ Permite teste sem compromisso
- ✅ Sem custo para usuário ou plataforma
- ✅ Feedback visual claro sobre limitação temporal
- ✅ Auto-cleanup automático
- ✅ Integração perfeita com sistema existente
- ✅ Mesmas funcionalidades de instâncias de produção

## 🔒 Segurança

- Token do admin server é server-side only
- RLS do Supabase garante que usuário só vê suas instâncias
- Validação de uma instância de teste por usuário
- Admin client usado para bypass de RLS quando necessário

## 📝 Notas Técnicas

- Servidor de teste pode ter rate limits diferentes
- QR Code funciona normalmente
- Webhooks podem ter delay maior
- Recomendado apenas para testes, não para produção
- Instâncias de teste não consomem créditos do usuário
