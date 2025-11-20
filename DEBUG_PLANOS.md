# 🔍 DEBUG: Planos não aparecem na interface

## Problema
Os planos não estão sendo exibidos nas páginas `/plans` (usuário) e `/admin/plans` (admin), apesar de existirem no banco de dados.

## ✅ Checklist de Diagnóstico

### 1. Verificar se os planos existem no banco de dados

Execute o arquivo `TEST_PLANS_RLS.sql` no Supabase Dashboard > SQL Editor para verificar:
- Se os planos existem na tabela
- Se as políticas RLS estão configuradas corretamente
- Se o RLS está habilitado

**Resultado esperado:** 4 planos (Grátis, Bronze, Prata, Ouro)

### 2. Verificar os logs do servidor Next.js

1. Abra o navegador e acesse: `http://localhost:3000/plans`
2. Faça um hard refresh (Ctrl + F5)
3. **IMEDIATAMENTE** após carregar, verifique o terminal onde `npm run dev` está rodando

**O que procurar nos logs:**
```
User plans data: [...]  ← Deve mostrar array de planos ou null
User plans error: ...   ← Deve ser null se não houver erro
User profile: email admin ← Confirma usuário e role
```

4. Faça o mesmo para: `http://localhost:3000/admin/plans`

**O que procurar nos logs:**
```
Plans data: [...]  ← Deve mostrar array de planos
Plans error: ...   ← Deve ser null
```

### 3. O que significam os resultados:

#### ✅ SE `plans data: []` (array vazio)
**Causa:** RLS está bloqueando a query ou planos não existem
**Solução:**
1. Execute `TEST_PLANS_RLS.sql` para verificar RLS
2. Execute `UPDATE_PLANS.sql` para inserir os planos novamente

#### ✅ SE `plans error: { ... }`
**Causa:** Erro na query do Supabase
**Solução:** Leia o erro e verifique:
- As credenciais do Supabase em `.env.local`
- Se a tabela `plans` existe
- Se há problemas de conexão

#### ✅ SE não aparecer NENHUM log
**Causa:** A página não está sendo acessada corretamente ou está em cache
**Solução:**
1. Certifique-se de que o servidor está rodando em `http://localhost:3000`
2. Limpe o cache do navegador (Ctrl + Shift + Delete)
3. Tente em uma aba anônima
4. Verifique se não há erros no console do navegador (F12)

### 4. Verificar o console do navegador

1. Abra o navegador e pressione F12
2. Vá para a aba "Console"
3. Acesse `http://localhost:3000/plans`
4. Procure por erros em vermelho

**Erros comuns:**
- `Failed to fetch` - Problema de conexão com API
- `Unauthorized` - Problema de autenticação
- `RLS Policy` - Problema com Row Level Security

## 🔧 Soluções Rápidas

### Solução 1: Resetar a tabela plans
```sql
-- Execute no Supabase Dashboard > SQL Editor
DROP TABLE IF EXISTS plans CASCADE;
```
Depois execute o arquivo completo: `supabase/migrations/20250120_create_plans_table.sql`

### Solução 2: Forçar recriação da política RLS
```sql
-- Execute no Supabase Dashboard > SQL Editor
DROP POLICY IF EXISTS "Anyone can view active plans" ON plans;

CREATE POLICY "Anyone can view active plans"
    ON plans FOR SELECT
    USING (is_active = TRUE);
```

### Solução 3: Verificar se `is_admin()` function existe
```sql
-- Execute no Supabase Dashboard > SQL Editor
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'is_admin';
```

Se não existir, precisa criar a function primeiro.

### Solução 4: Bypass temporário do RLS (APENAS PARA DEBUG)
```sql
-- ATENÇÃO: Use apenas para debug!
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
```

Depois de confirmar que os planos aparecem, **REATIVE O RLS**:
```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
```

## 📋 Informações Importantes

### Arquivos modificados com debug:
1. `src/app/(dashboard)/plans/page.tsx` - Linhas 37-39 (console.log)
2. `src/app/(dashboard)/admin/plans/page.tsx` - Linhas 36-37 (console.log)
3. `src/components/plans/PlansPage.tsx` - Agora mostra mensagem quando vazio
4. `src/components/admin/PlansManager.tsx` - Agora mostra mensagem quando vazio

### O que você deve ver na UI agora:

#### Se o array estiver vazio:
- Página do usuário: "Nenhum plano disponível no momento. Entre em contato com o suporte."
- Página do admin: "Nenhum plano cadastrado. Clique em 'Novo Plano' para criar o primeiro plano."

#### Se houver planos:
- Grid com 4 cards mostrando os planos Grátis, Bronze, Prata e Ouro

## 🆘 Precisa de Ajuda?

Se após seguir todos os passos ainda não funcionar, forneça:
1. Screenshot da página `/plans`
2. Screenshot da página `/admin/plans`
3. Logs do terminal do servidor (as linhas com `User plans data:` e `Plans data:`)
4. Resultado da query `TEST_PLANS_RLS.sql`
5. Screenshot do console do navegador (F12) mostrando erros
