# Sistema de Agendamento Inteligente

## Visão Geral

O sistema de agendamento inteligente permite controle total sobre quando e como as campanhas de WhatsApp são enviadas, incluindo:

- Agendamento por timezone
- Envio gradual (throttling) para evitar bloqueio
- Sugestão de melhor horário por IA
- Recorrência (diário, semanal, mensal)
- Pausa/retomar campanhas

## Funcionalidades

### 1. Tipos de Agendamento

#### Imediato
- Envio assim que a campanha for iniciada
- Sem configuração adicional necessária
- Ideal para mensagens urgentes

#### Agendado
- Escolha data e hora específica
- Suporte a múltiplos fusos horários
- Validação para não permitir datas passadas

#### Recorrente
- **Diário**: Repetir a cada X dia(s)
- **Semanal**: Escolher dias da semana específicos
- **Mensal**: Repetir a cada X mês(es)
- Configuração de horário específico
- Intervalo personalizável

#### Inteligente (IA)
- Análise automática do melhor horário
- Baseado em:
  - Fuso horário dos contatos
  - Histórico de engajamento
  - Padrões de resposta
- Evita finais de semana automaticamente
- Sugestão de horários comerciais (10h-16h)

### 2. Envio Gradual (Throttling)

Proteção contra bloqueios do WhatsApp:

**Configurações**:
- **Taxa de Envio**: 1-120 mensagens/minuto
  - Recomendado: 30-60 msg/min
- **Intervalo**: 1-10 segundos entre mensagens
  - Recomendado: 1-3 segundos

**Benefícios**:
- Reduz chance de bloqueio
- Distribui carga no servidor
- Simula comportamento humano
- Melhor deliverability

### 3. Fusos Horários

Suporte a múltiplos timezones:
- América/São Paulo (GMT-3)
- América/Nova York (GMT-5)
- América/Los Angeles (GMT-8)
- Europa/Londres (GMT+0)
- Europa/Paris (GMT+1)
- Ásia/Tóquio (GMT+9)

**Vantagem**: Envie no horário local do destinatário

### 4. Controles de Campanha

#### Pausar
```typescript
// Pausar campanha
UPDATE campaigns
SET is_paused = true,
    pause_until = NOW() + INTERVAL '1 hour'
WHERE id = campaign_id;
```

#### Retomar
```typescript
// Retomar campanha
UPDATE campaigns
SET is_paused = false,
    pause_until = NULL
WHERE id = campaign_id;
```

#### Cancelar
```typescript
// Cancelar campanha
UPDATE campaigns
SET status = 'cancelled'
WHERE id = campaign_id;
```

## Estrutura de Banco de Dados

### Novos Campos em `campaigns`:

```sql
schedule_type VARCHAR(50)          -- 'immediate', 'scheduled', 'recurring', 'smart'
scheduled_at TIMESTAMPTZ           -- Data/hora do agendamento
timezone VARCHAR(100)              -- Fuso horário (ex: 'America/Sao_Paulo')
recurrence_pattern JSONB           -- Padrão de recorrência
throttle_enabled BOOLEAN           -- Habilitar throttling
throttle_rate INTEGER              -- Mensagens por minuto
throttle_delay INTEGER             -- Delay em segundos
smart_timing BOOLEAN               -- Usar IA para sugerir horário
suggested_send_time TIMESTAMPTZ    -- Horário sugerido pela IA
pause_until TIMESTAMPTZ            -- Pausar até esta data
is_paused BOOLEAN                  -- Campanha está pausada
```

### Tabela `campaign_schedule_logs`:

```sql
CREATE TABLE campaign_schedule_logs (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  user_id UUID,
  action VARCHAR(50),              -- 'scheduled', 'paused', 'resumed', 'cancelled', 'sent'
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

## Padrão de Recorrência (JSON)

### Diária
```json
{
  "type": "daily",
  "interval": 2,
  "time": "10:00"
}
```
*Envia a cada 2 dias às 10:00*

### Semanal
```json
{
  "type": "weekly",
  "interval": 1,
  "days": [1, 3, 5],
  "time": "14:30"
}
```
*Envia toda segunda, quarta e sexta às 14:30*

### Mensal
```json
{
  "type": "monthly",
  "interval": 1,
  "days": [1, 15],
  "time": "09:00"
}
```
*Envia dia 1 e 15 de cada mês às 09:00*

## Funções SQL

### get_suggested_send_time()

Analisa e sugere melhor horário para envio:

```sql
SELECT get_suggested_send_time(
  campaign_id := '123e4567-e89b-12d3-a456-426614174000',
  p_timezone := 'America/Sao_Paulo'
);
```

**Retorna**: TIMESTAMPTZ com horário sugerido

**Lógica**:
1. Analisa histórico de mensagens
2. Identifica padrões de engajamento
3. Evita finais de semana
4. Prefere horário comercial (10h-16h)
5. Respeita timezone do contato

### process_recurring_campaign()

Processa próxima execução de campanha recorrente:

```sql
SELECT process_recurring_campaign('campaign_id');
```

**Retorna**: TIMESTAMPTZ da próxima execução

**Ação**: Atualiza `scheduled_at` da campanha

## Uso do Componente

### Importação

```typescript
import { SmartScheduler, type ScheduleData } from '@/components/campaigns/SmartScheduler'
```

### Exemplo

```tsx
function CampaignForm() {
  const [scheduleData, setScheduleData] = useState<Partial<ScheduleData>>({
    schedule_type: 'immediate',
    timezone: 'America/Sao_Paulo',
    throttle_enabled: true,
    throttle_rate: 60,
    throttle_delay: 2,
    smart_timing: false,
  })

  const handleScheduleChange = (data: Partial<ScheduleData>) => {
    setScheduleData(prev => ({ ...prev, ...data }))
  }

  return (
    <SmartScheduler
      scheduleType={scheduleData.schedule_type!}
      scheduledAt={scheduleData.scheduled_at}
      timezone={scheduleData.timezone!}
      recurrencePattern={scheduleData.recurrence_pattern}
      throttleEnabled={scheduleData.throttle_enabled!}
      throttleRate={scheduleData.throttle_rate}
      throttleDelay={scheduleData.throttle_delay}
      smartTiming={scheduleData.smart_timing!}
      suggestedSendTime={null}
      onChange={handleScheduleChange}
    />
  )
}
```

## API Endpoints (A Implementar)

### POST /api/campaigns/:id/pause
Pausa uma campanha em execução

### POST /api/campaigns/:id/resume
Retoma uma campanha pausada

### POST /api/campaigns/:id/cancel
Cancela uma campanha

### GET /api/campaigns/:id/suggest-time
Obtém sugestão de melhor horário da IA

## Boas Práticas

### Throttling
- Use sempre que enviar para mais de 100 contatos
- Taxa recomendada: 30-60 msg/min
- Delay recomendado: 1-3 segundos

### Agendamento
- Evite horários de madrugada
- Respeite fuso horário do destinatário
- Use smart timing para campanhas importantes

### Recorrência
- Limite intervalos razoáveis (não envie diariamente para promoções)
- Permita usuários optarem por sair (opt-out)
- Monitore taxa de bloqueio

## Roadmap

### Fase 1 (Implementado)
- ✅ Estrutura de banco de dados
- ✅ Tipos TypeScript
- ✅ Componente SmartScheduler
- ✅ Interface visual completa

### Fase 2 (Próximos Passos)
- ⏳ API endpoints de controle
- ⏳ Integração com sistema de envio
- ⏳ Logs de agendamento
- ⏳ Worker para processar campanhas agendadas

### Fase 3 (Futuro)
- 🔮 IA real para análise de engajamento
- 🔮 A/B testing de horários
- 🔮 Relatórios de performance por horário
- 🔮 Sugestões personalizadas por segmento
- 🔮 Integração com calendário do usuário

## Notas Técnicas

- Timezones usando formato IANA (ex: America/Sao_Paulo)
- Timestamps sempre em UTC no banco
- Conversão de timezone no frontend
- Throttling implementado com delays assíncronos
- Recorrência processada via cron job ou worker
