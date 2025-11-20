# Instruções para Aplicar Migration - Favoritar Listas

Para adicionar a funcionalidade de favoritar listas de contatos, você precisa aplicar a migration no banco de dados Supabase.

## Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Cole o seguinte SQL e execute:

```sql
-- Add is_favorite column to contacts_lists table
ALTER TABLE contacts_lists
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster queries on favorite lists
CREATE INDEX idx_contacts_lists_favorite ON contacts_lists(user_id, is_favorite) WHERE is_favorite = TRUE;
```

## Opção 2: Via Supabase CLI (se tiver instalado)

1. Execute o comando:
```bash
supabase db push
```

Isso aplicará automaticamente todas as migrations pendentes na pasta `supabase/migrations/`.

## Verificação

Após aplicar a migration, você pode verificar se funcionou executando:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contacts_lists'
ORDER BY ordinal_position;
```

Você deve ver a coluna `is_favorite` listada.

## Funcionalidades Implementadas

1. **Botão de Favoritar**: Cada lista de contatos agora tem um ícone de estrela que permite marcar/desmarcar como favorita
2. **Auto-seleção**: Quando você abre a página de Disparo, a lista favorita é automaticamente selecionada
3. **Visual**: Listas favoritas exibem uma estrela amarela preenchida

## Arquivos Modificados

- `src/types/index.ts` - Adicionado campo `is_favorite` na interface `ContactsList`
- `src/components/lists/ContactsListManager.tsx` - Adicionado botão de favoritar e função `handleToggleFavorite`
- `src/components/campaigns/CampaignDispatcher.tsx` - Adicionado `useEffect` para auto-selecionar lista favorita
- `supabase/schema.sql` - Atualizado schema com campo `is_favorite` e índice
- `supabase/migrations/20250120_add_favorite_to_contacts_lists.sql` - Migration criada
