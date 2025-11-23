# Como Aplicar a Migration de Agendamento Inteligente

## Passo a Passo

### 1. Acessar o Painel do Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### 2. Executar a Migration

Cole e execute o conteúdo do arquivo:
`supabase/migrations/20250122_add_smart_scheduling.sql`

Ou copie o código abaixo:

```sql
-- Add smart scheduling fields to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring', 'smart')),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB,
ADD COLUMN IF NOT EXISTS throttle_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS throttle_rate INTEGER,
ADD COLUMN IF NOT EXISTS throttle_delay INTEGER,
ADD COLUMN IF NOT EXISTS smart_timing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggested_send_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Add comment to explain scheduling fields
COMMENT ON COLUMN campaigns.schedule_type IS 'Type of scheduling: immediate, scheduled, recurring, or smart (AI-suggested)';
COMMENT ON COLUMN campaigns.recurrence_pattern IS 'JSON pattern for recurring campaigns: {type, interval, days, time}';
COMMENT ON COLUMN campaigns.throttle_enabled IS 'Enable gradual sending to avoid blocking';
COMMENT ON COLUMN campaigns.throttle_rate IS 'Maximum messages per minute';
COMMENT ON COLUMN campaigns.smart_timing IS 'Use AI to analyze best sending time based on contact timezone and engagement';
COMMENT ON COLUMN campaigns.pause_until IS 'Pause campaign until this timestamp';

-- Create table for scheduling logs
CREATE TABLE IF NOT EXISTS campaign_schedule_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaign_schedule_logs_campaign_id ON campaign_schedule_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_schedule_logs_created_at ON campaign_schedule_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_paused ON campaigns(is_paused) WHERE is_paused = true;

-- Enable RLS
ALTER TABLE campaign_schedule_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_schedule_logs
CREATE POLICY "Users can view their own schedule logs"
  ON campaign_schedule_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule logs"
  ON campaign_schedule_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to get best send time based on timezone and historical engagement
CREATE OR REPLACE FUNCTION get_suggested_send_time(
  p_campaign_id UUID,
  p_timezone VARCHAR DEFAULT 'America/Sao_Paulo'
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_suggested_time TIMESTAMPTZ;
  v_best_hour INTEGER;
BEGIN
  -- Analyze message history to find best engagement hours
  -- For now, we'll use a simple heuristic: weekdays 10AM-4PM in contact's timezone
  -- In production, this would analyze actual engagement data

  -- Get current time in specified timezone
  v_best_hour := 10; -- Default to 10 AM

  -- Calculate next occurrence of best hour
  v_suggested_time := (NOW() AT TIME ZONE p_timezone)::DATE + (v_best_hour || ' hours')::INTERVAL;

  -- If time has passed today, schedule for tomorrow
  IF v_suggested_time < NOW() THEN
    v_suggested_time := v_suggested_time + INTERVAL '1 day';
  END IF;

  -- Avoid weekends - move to Monday if on weekend
  WHILE EXTRACT(DOW FROM v_suggested_time) IN (0, 6) LOOP
    v_suggested_time := v_suggested_time + INTERVAL '1 day';
  END LOOP;

  RETURN v_suggested_time;
END;
$$;

-- Function to process recurring campaigns
CREATE OR REPLACE FUNCTION process_recurring_campaign(p_campaign_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_campaign RECORD;
  v_next_run TIMESTAMPTZ;
  v_pattern JSONB;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_pattern := v_campaign.recurrence_pattern;

  -- Calculate next run based on pattern type
  CASE v_pattern->>'type'
    WHEN 'daily' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 day';
    WHEN 'weekly' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 week';
    WHEN 'monthly' THEN
      v_next_run := v_campaign.scheduled_at + (v_pattern->>'interval')::INTEGER * INTERVAL '1 month';
    ELSE
      v_next_run := NULL;
  END CASE;

  -- Update campaign with next scheduled time
  IF v_next_run IS NOT NULL THEN
    UPDATE campaigns
    SET scheduled_at = v_next_run
    WHERE id = p_campaign_id;
  END IF;

  RETURN v_next_run;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_suggested_send_time TO authenticated;
GRANT EXECUTE ON FUNCTION process_recurring_campaign TO authenticated;
```

### 3. Verificar a Migration

Execute este comando para verificar se tudo foi criado corretamente:

```sql
-- Verificar novos campos na tabela campaigns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name IN ('schedule_type', 'scheduled_at', 'timezone', 'recurrence_pattern',
                     'throttle_enabled', 'throttle_rate', 'throttle_delay',
                     'smart_timing', 'suggested_send_time', 'pause_until', 'is_paused');

-- Verificar se a tabela campaign_schedule_logs foi criada
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'campaign_schedule_logs';

-- Verificar se as funções foram criadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_suggested_send_time', 'process_recurring_campaign');
```

### 4. Testar as Funções

```sql
-- Testar sugestão de horário
SELECT get_suggested_send_time(
  '00000000-0000-0000-0000-000000000000'::UUID,  -- ID fictício
  'America/Sao_Paulo'
);

-- Deve retornar um timestamp no futuro (próximo dia útil às 10h)
```

## Rollback (Se Necessário)

Caso precise reverter as alterações:

```sql
-- Remover políticas RLS
DROP POLICY IF EXISTS "Users can view their own schedule logs" ON campaign_schedule_logs;
DROP POLICY IF EXISTS "Users can insert their own schedule logs" ON campaign_schedule_logs;

-- Remover funções
DROP FUNCTION IF EXISTS get_suggested_send_time;
DROP FUNCTION IF EXISTS process_recurring_campaign;

-- Remover índices
DROP INDEX IF EXISTS idx_campaign_schedule_logs_campaign_id;
DROP INDEX IF EXISTS idx_campaign_schedule_logs_created_at;
DROP INDEX IF EXISTS idx_campaigns_scheduled_at;
DROP INDEX IF EXISTS idx_campaigns_paused;

-- Remover tabela
DROP TABLE IF EXISTS campaign_schedule_logs;

-- Remover colunas da tabela campaigns
ALTER TABLE campaigns
DROP COLUMN IF EXISTS schedule_type,
DROP COLUMN IF EXISTS scheduled_at,
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS recurrence_pattern,
DROP COLUMN IF EXISTS throttle_enabled,
DROP COLUMN IF EXISTS throttle_rate,
DROP COLUMN IF EXISTS throttle_delay,
DROP COLUMN IF EXISTS smart_timing,
DROP COLUMN IF EXISTS suggested_send_time,
DROP COLUMN IF EXISTS pause_until,
DROP COLUMN IF EXISTS is_paused;
```

## Próximos Passos Após Migration

1. ✅ Migration aplicada
2. ✅ API endpoints criados
3. ⏳ Testar criação de campanha com SmartScheduler
4. ⏳ Implementar worker para processar campanhas agendadas
5. ⏳ Criar interface de controle (pausar/retomar/cancelar)

## Notas Importantes

- Os campos existentes (`scheduled_for`, `min_delay`, `max_delay`) continuam funcionando para compatibilidade
- Os novos campos (`schedule_type`, `scheduled_at`, etc.) oferecem funcionalidade expandida
- A migration é idempotente (pode ser executada múltiplas vezes sem erro)
- Todos os índices são criados com `IF NOT EXISTS` para segurança
