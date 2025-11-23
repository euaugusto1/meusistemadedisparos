'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Zap,
  Repeat,
  Play,
  Pause,
  Sparkles,
  Globe,
  Gauge,
  Info
} from 'lucide-react'
import type { ScheduleType, RecurrencePattern, RecurrenceType } from '@/types'

interface SmartSchedulerProps {
  scheduleType: ScheduleType
  scheduledAt: string | null
  timezone: string
  recurrencePattern: RecurrencePattern | null
  throttleEnabled: boolean
  throttleRate: number | null
  throttleDelay: number | null
  smartTiming: boolean
  suggestedSendTime: string | null
  onChange: (data: Partial<ScheduleData>) => void
}

export interface ScheduleData {
  schedule_type: ScheduleType
  scheduled_at: string | null
  timezone: string
  recurrence_pattern: RecurrencePattern | null
  throttle_enabled: boolean
  throttle_rate: number | null
  throttle_delay: number | null
  smart_timing: boolean
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
]

const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

export function SmartScheduler({
  scheduleType,
  scheduledAt,
  timezone,
  recurrencePattern,
  throttleEnabled,
  throttleRate,
  throttleDelay,
  smartTiming,
  suggestedSendTime,
  onChange,
}: SmartSchedulerProps) {
  const [localScheduleType, setLocalScheduleType] = useState<ScheduleType>(scheduleType)
  const [localDateTime, setLocalDateTime] = useState(scheduledAt || '')
  const [localTimezone, setLocalTimezone] = useState(timezone || 'America/Sao_Paulo')
  const [localThrottleEnabled, setLocalThrottleEnabled] = useState(throttleEnabled)
  const [localThrottleRate, setLocalThrottleRate] = useState(throttleRate || 60)
  const [localThrottleDelay, setLocalThrottleDelay] = useState(throttleDelay || 1)
  const [localSmartTiming, setLocalSmartTiming] = useState(smartTiming)

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    recurrencePattern?.type || 'daily'
  )
  const [recurrenceInterval, setRecurrenceInterval] = useState(recurrencePattern?.interval || 1)
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(recurrencePattern?.days || [])
  const [recurrenceTime, setRecurrenceTime] = useState(recurrencePattern?.time || '10:00')

  // Update parent when local state changes
  useEffect(() => {
    const data: Partial<ScheduleData> = {
      schedule_type: localScheduleType,
      timezone: localTimezone,
      throttle_enabled: localThrottleEnabled,
      throttle_rate: localThrottleEnabled ? localThrottleRate : null,
      throttle_delay: localThrottleEnabled ? localThrottleDelay : null,
      smart_timing: localSmartTiming,
    }

    if (localScheduleType === 'scheduled' || localScheduleType === 'smart') {
      data.scheduled_at = localDateTime || null
    }

    if (localScheduleType === 'recurring') {
      data.recurrence_pattern = {
        type: recurrenceType,
        interval: recurrenceInterval,
        days: recurrenceDays.length > 0 ? recurrenceDays : undefined,
        time: recurrenceTime,
      }
    }

    onChange(data)
  }, [
    localScheduleType,
    localDateTime,
    localTimezone,
    localThrottleEnabled,
    localThrottleRate,
    localThrottleDelay,
    localSmartTiming,
    recurrenceType,
    recurrenceInterval,
    recurrenceDays,
    recurrenceTime,
    onChange,
  ])

  const toggleDayOfWeek = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleRequestSuggestion = async () => {
    // In production, this would call an API to analyze best time
    // For now, suggest 10 AM next business day
    const now = new Date()
    let suggested = new Date(now)
    suggested.setDate(suggested.getDate() + 1)
    suggested.setHours(10, 0, 0, 0)

    // Skip weekends
    while (suggested.getDay() === 0 || suggested.getDay() === 6) {
      suggested.setDate(suggested.getDate() + 1)
    }

    setLocalDateTime(suggested.toISOString().slice(0, 16))
    setLocalSmartTiming(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamento Inteligente
        </CardTitle>
        <CardDescription>
          Configure quando e como sua campanha será enviada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule Type Tabs */}
        <Tabs value={localScheduleType} onValueChange={(v) => setLocalScheduleType(v as ScheduleType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="immediate" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Imediato
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Agendado
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-xs">
              <Repeat className="h-3 w-3 mr-1" />
              Recorrente
            </TabsTrigger>
            <TabsTrigger value="smart" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Inteligente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="immediate" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Envio Imediato</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  A campanha será iniciada assim que você clicar em "Iniciar Campanha".
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled-datetime">Data e Hora</Label>
                <Input
                  id="scheduled-datetime"
                  type="datetime-local"
                  value={localDateTime}
                  onChange={(e) => setLocalDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select value={localTimezone} onValueChange={setLocalTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          {tz.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recurring" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Tipo de Recorrência</Label>
                <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrence-interval">
                  Repetir a cada {recurrenceInterval} {
                    recurrenceType === 'daily' ? 'dia(s)' :
                    recurrenceType === 'weekly' ? 'semana(s)' : 'mês(es)'
                  }
                </Label>
                <Input
                  id="recurrence-interval"
                  type="number"
                  min="1"
                  max="30"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                />
              </div>

              {recurrenceType === 'weekly' && (
                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={recurrenceDays.includes(day.value) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className="w-12"
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recurrence-time">Horário do Envio</Label>
                <Input
                  id="recurrence-time"
                  type="time"
                  value={recurrenceTime}
                  onChange={(e) => setRecurrenceTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone-recurring">Fuso Horário</Label>
                <Select value={localTimezone} onValueChange={setLocalTimezone}>
                  <SelectTrigger id="timezone-recurring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          {tz.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="smart" className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-purple-900 dark:text-purple-100">Agendamento Inteligente por IA</p>
                <p className="text-purple-700 dark:text-purple-300 mt-1">
                  Nossa IA analisa o melhor horário para envio baseado no fuso horário dos contatos e histórico de engajamento.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleRequestSuggestion}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerir Melhor Horário
            </Button>

            {suggestedSendTime || localSmartTiming && localDateTime && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-green-200 dark:bg-green-800">
                    Sugerido
                  </Badge>
                </div>
                <p className="text-sm text-green-900 dark:text-green-100">
                  {new Date(localDateTime || suggestedSendTime!).toLocaleString('pt-BR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            )}

            <div className="grid gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="smart-datetime">Confirmar Data e Hora</Label>
                <Input
                  id="smart-datetime"
                  type="datetime-local"
                  value={localDateTime}
                  onChange={(e) => setLocalDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone-smart">Fuso Horário</Label>
                <Select value={localTimezone} onValueChange={setLocalTimezone}>
                  <SelectTrigger id="timezone-smart">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          {tz.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Throttling Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                <Label htmlFor="throttle-toggle" className="cursor-pointer">
                  Envio Gradual (Throttling)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Evite bloqueios enviando mensagens gradualmente
              </p>
            </div>
            <Switch
              id="throttle-toggle"
              checked={localThrottleEnabled}
              onCheckedChange={setLocalThrottleEnabled}
            />
          </div>

          {localThrottleEnabled && (
            <div className="grid gap-4 pl-6">
              <div className="space-y-2">
                <Label htmlFor="throttle-rate">
                  Máximo de mensagens por minuto: {localThrottleRate}
                </Label>
                <Input
                  id="throttle-rate"
                  type="range"
                  min="1"
                  max="120"
                  value={localThrottleRate}
                  onChange={(e) => setLocalThrottleRate(parseInt(e.target.value))}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Limite recomendado: 30-60 mensagens/min
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="throttle-delay">
                  Intervalo entre mensagens: {localThrottleDelay}s
                </Label>
                <Input
                  id="throttle-delay"
                  type="range"
                  min="1"
                  max="10"
                  value={localThrottleDelay}
                  onChange={(e) => setLocalThrottleDelay(parseInt(e.target.value))}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Delay recomendado: 1-3 segundos
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
