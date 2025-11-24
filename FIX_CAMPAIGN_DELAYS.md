# 🔧 Corrigir Delays de Campanha

## Problema
As configurações de delay (50-150 segundos) configuradas no painel admin não estão sendo aplicadas. O sistema continua usando os valores padrão (35-250 segundos).

## Diagnóstico

### 1. Verificar Console do Navegador
1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Acesse a página de **Nova Campanha**
4. Procure por estas mensagens:
   - `🔍 Campaign Settings Query Result:` - Mostra o que foi buscado do banco
   - `✅ Setting campaign delays:` - Confirma valores aplicados
   - `⚠️ No campaign settings found` - Indica que não há config no banco

### 2. Testar API Diretamente
1. Vá para **Admin > Configurações**
2. Na seção "Configurações de Campanhas"
3. Clique no botão **"Testar"**
4. Verá um popup com os dados atuais do banco

### 3. Verificar no Supabase
Execute no SQL Editor do Supabase:

```sql
-- Ver configuração atual
SELECT * FROM system_settings WHERE key = 'campaign_delays';
```

## Soluções

### Solução 1: Via Interface Admin (Recomendado)
1. Acesse **Admin > Configurações**
2. Configure os delays:
   - Delay Mínimo: 50 segundos
   - Delay Máximo: 150 segundos
3. Clique em **"Salvar Configurações"**
4. Clique em **"Testar"** para confirmar
5. Recarregue a página de Nova Campanha

### Solução 2: Via SQL (Se Solução 1 não funcionar)
Execute no SQL Editor do Supabase:

```sql
-- Deletar config antiga (se existir)
DELETE FROM system_settings WHERE key = 'campaign_delays';

-- Criar nova config
INSERT INTO system_settings (key, value, description)
VALUES (
  'campaign_delays',
  '{"min_delay_seconds": 50, "max_delay_seconds": 150}'::jsonb,
  'Configurações de delay para envio de campanhas'
);

-- Verificar
SELECT * FROM system_settings WHERE key = 'campaign_delays';
```

### Solução 3: Via API
Use o arquivo `fix-campaign-delays.sql` que foi criado:

```bash
# No Supabase SQL Editor, execute o conteúdo do arquivo:
# fix-campaign-delays.sql
```

## Verificar se Funcionou

### No Console do Navegador
Ao acessar "Nova Campanha", você deve ver:
```
🔍 Campaign Settings Query Result: { data: { value: { min_delay_seconds: 50, max_delay_seconds: 150 } }, error: null }
✅ Setting campaign delays: { min_delay_seconds: 50, max_delay_seconds: 150 }
```

### Na Interface
1. Na seção "Resumo da Campanha"
2. O **Tempo estimado** deve usar média de 100s (50+150/2)
3. Na modal de confirmação
4. Deve mostrar "Delay aleatório: **50 a 150 segundos**"

### Durante o Envio
No console, procure por:
```
Using campaign delay settings: { minDelay: 50, maxDelay: 150 }
```

## Possíveis Problemas

### 1. RLS (Row Level Security)
Se o sistema não consegue salvar/ler, pode ser problema de permissões:

```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'system_settings';

-- Se necessário, criar política para admins
CREATE POLICY "Admins can manage system settings"
ON system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### 2. Cache do Navegador
1. Limpe o cache (Ctrl+Shift+Delete)
2. Ou use modo anônimo (Ctrl+Shift+N)
3. Faça login novamente

### 3. Servidor não reiniciado
O Next.js deve recompilar automaticamente, mas se não funcionar:
1. Pare o servidor (Ctrl+C)
2. Execute `npm run dev` novamente
3. Aguarde a compilação
4. Teste novamente

## Arquivo de Log

Os logs importantes estão em:
- **Frontend**: Console do navegador (F12 > Console)
- **Backend**: Terminal onde `npm run dev` está rodando

Procure por mensagens com estes emojis:
- 🔍 = Buscando configurações
- ✅ = Configuração aplicada com sucesso
- ⚠️ = Aviso (usando defaults)
- ❌ = Erro crítico

## Suporte

Se nada funcionar:
1. Tire screenshot do console
2. Copie as mensagens de erro
3. Execute `SELECT * FROM system_settings;` e envie resultado
4. Verifique se você está logado como admin
