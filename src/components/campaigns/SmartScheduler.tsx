'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Clock,
  Zap,
  Repeat,
  Sparkles,
  Globe,
  Gauge,
  Info,
  CheckCircle2,
  AlertCircle,
  Timer,
  Send,
  CalendarClock,
  CalendarDays,
  Settings2,
  Shield,
  TrendingUp,
  Users
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
  { value: 'America/Sao_Paulo', label: 'Brasília', offset: 'GMT-3' },
  { value: 'America/Manaus', label: 'Manaus', offset: 'GMT-4' },
  { value: 'America/Fortaleza', label: 'Fernando de Noronha', offset: 'GMT-2' },
  { value: 'America/New_York', label: 'Nova York', offset: 'GMT-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'GMT-8' },
  { value: 'Europe/London', label: 'Londres', offset: 'GMT+0' },
  { value: 'Europe/Lisbon', label: 'Lisboa', offset: 'GMT+0' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'GMT+1' },
  { value: 'Asia/Tokyo', label: 'Tóquio', offset: 'GMT+9' },
]

const RECURRENCE_TYPES: { value: RecurrenceType; label: string; description: string }[] = [
  { value: 'daily', label: 'Diário', description: 'Repete todos os dias' },
  { value: 'weekly', label: 'Semanal', description: 'Repete toda semana' },
  { value: 'monthly', label: 'Mensal', description: 'Repete todo mês' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'D', fullLabel: 'Domingo' },
  { value: 1, label: 'S', fullLabel: 'Segunda' },
  { value: 2, label: 'T', fullLabel: 'Terça' },
  { value: 3, label: 'Q', fullLabel: 'Quarta' },
  { value: 4, label: 'Q', fullLabel: 'Quinta' },
  { value: 5, label: 'S', fullLabel: 'Sexta' },
  { value: 6, label: 'S', fullLabel: 'Sábado' },
]

const THROTTLE_PRESETS = [
  { label: 'Conservador', rate: 20, delay: 3, description: 'Mais seguro, evita bloqueios', icon: Shield },
  { label: 'Balanceado', rate: 40, delay: 2, description: 'Recomendado para a maioria', icon: TrendingUp },
  { label: 'Agressivo', rate: 60, delay: 1, description: 'Mais rápido, maior risco', icon: Zap },
]

const SCHEDULE_TYPES = [
  {
    value: 'immediate' as ScheduleType,
    label: 'Imediato',
    icon: Zap,
    description: 'Iniciar agora',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    hoverColor: 'hover:border-green-500/50'
  },
  {
    value: 'scheduled' as ScheduleType,
    label: 'Agendado',
    icon: CalendarClock,
    description: 'Data específica',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hoverColor: 'hover:border-blue-500/50'
  },
  {
    value: 'recurring' as ScheduleType,
    label: 'Recorrente',
    icon: Repeat,
    description: 'Repetir automaticamente',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hoverColor: 'hover:border-purple-500/50'
  },
  {
    value: 'smart' as ScheduleType,
    label: 'Inteligente',
    icon: Sparkles,
    description: 'IA sugere horário',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    hoverColor: 'hover:border-amber-500/50'
  },
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
  const [localThrottleRate, setLocalThrottleRate] = useState(throttleRate || 40)
  const [localThrottleDelay, setLocalThrottleDelay] = useState(throttleDelay || 2)
  const [localSmartTiming, setLocalSmartTiming] = useState(smartTiming)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1) // Balanceado by default

  // Separate date and time states for better UX
  const [localDate, setLocalDate] = useState(() => {
    if (scheduledAt) {
      return scheduledAt.split('T')[0] || ''
    }
    return ''
  })
  const [localTime, setLocalTime] = useState(() => {
    if (scheduledAt) {
      const timePart = scheduledAt.split('T')[1]
      return timePart ? timePart.slice(0, 5) : '10:00'
    }
    return '10:00'
  })

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    recurrencePattern?.type || 'daily'
  )
  const [recurrenceInterval, setRecurrenceInterval] = useState(recurrencePattern?.interval || 1)
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(recurrencePattern?.days || [1, 2, 3, 4, 5])
  const [recurrenceTime, setRecurrenceTime] = useState(recurrencePattern?.time || '10:00')

  // Combine date and time into localDateTime when either changes
  // Store as ISO string with the timezone offset
  useEffect(() => {
    if (localDate && localTime) {
      // Create a date string that will be interpreted correctly
      // We store the local time as-is since the timezone is stored separately
      setLocalDateTime(`${localDate}T${localTime}:00`)
    } else if (localDate) {
      setLocalDateTime(`${localDate}T10:00:00`)
    } else {
      setLocalDateTime('')
    }
  }, [localDate, localTime])

  // Memoize the onChange callback to prevent infinite loops
  const memoizedOnChange = useCallback(onChange, [])

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
      // Calculate first scheduled_at for recurring campaigns
      const now = new Date()
      const [hours, minutes] = recurrenceTime.split(':').map(Number)
      let nextRun = new Date()
      nextRun.setHours(hours, minutes, 0, 0)

      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }

      data.scheduled_at = nextRun.toISOString()
      data.recurrence_pattern = {
        type: recurrenceType,
        interval: recurrenceInterval,
        days: recurrenceDays.length > 0 ? recurrenceDays : undefined,
        time: recurrenceTime,
      }
    }

    memoizedOnChange(data)
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
    memoizedOnChange,
  ])

  const toggleDayOfWeek = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handlePresetSelect = (index: number) => {
    const preset = THROTTLE_PRESETS[index]
    setSelectedPreset(index)
    setLocalThrottleRate(preset.rate)
    setLocalThrottleDelay(preset.delay)
  }

  const handleRequestSuggestion = async () => {
    const now = new Date()
    let suggested = new Date(now)
    suggested.setDate(suggested.getDate() + 1)
    suggested.setHours(10, 0, 0, 0)

    while (suggested.getDay() === 0 || suggested.getDay() === 6) {
      suggested.setDate(suggested.getDate() + 1)
    }

    // Set separate date and time states
    const dateStr = suggested.toISOString().split('T')[0]
    const timeStr = '10:00'
    setLocalDate(dateStr)
    setLocalTime(timeStr)
    setLocalSmartTiming(true)
  }

  const getScheduleSummary = useMemo(() => {
    const summary: { label: string; value: string; icon: React.ElementType }[] = []

    const typeInfo = SCHEDULE_TYPES.find(t => t.value === localScheduleType)
    if (typeInfo) {
      summary.push({ label: 'Modo', value: typeInfo.label, icon: typeInfo.icon })
    }

    if (localScheduleType === 'scheduled' || localScheduleType === 'smart') {
      if (localDateTime) {
        const date = new Date(localDateTime)
        summary.push({
          label: 'Data',
          value: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
          icon: Calendar
        })
        summary.push({
          label: 'Horário',
          value: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          icon: Clock
        })
      }
    }

    if (localScheduleType === 'recurring') {
      const recType = RECURRENCE_TYPES.find(r => r.value === recurrenceType)
      summary.push({
        label: 'Frequência',
        value: `${recType?.label} (a cada ${recurrenceInterval})`,
        icon: Repeat
      })
      summary.push({
        label: 'Horário',
        value: recurrenceTime,
        icon: Clock
      })
      if (recurrenceType === 'weekly' && recurrenceDays.length > 0) {
        const days = recurrenceDays.map(d => DAYS_OF_WEEK[d].fullLabel.slice(0, 3)).join(', ')
        summary.push({ label: 'Dias', value: days, icon: CalendarDays })
      }
    }

    const tz = TIMEZONES.find(t => t.value === localTimezone)
    summary.push({
      label: 'Fuso',
      value: `${tz?.label || localTimezone} (${tz?.offset || ''})`,
      icon: Globe
    })

    if (localThrottleEnabled) {
      summary.push({
        label: 'Throttling',
        value: `${localThrottleRate} msg/min`,
        icon: Gauge
      })
    }

    return summary
  }, [localScheduleType, localDateTime, localTimezone, localThrottleEnabled, localThrottleRate, recurrenceType, recurrenceInterval, recurrenceDays, recurrenceTime])

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Agendamento da Campanha</CardTitle>
            <CardDescription>
              Configure quando e como sua campanha será enviada
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Schedule Type Selection - Cards */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Tipo de Envio</Label>
          <div className="grid grid-cols-2 gap-3">
            {SCHEDULE_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = localScheduleType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setLocalScheduleType(type.value)}
                  className={cn(
                    "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
                    isSelected
                      ? `${type.bgColor} ${type.borderColor} shadow-md`
                      : `bg-card border-border/50 ${type.hoverColor} hover:bg-accent/50`
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className={cn("h-4 w-4", type.color)} />
                    </div>
                  )}
                  <div className={cn(
                    "p-2.5 rounded-lg mb-2 transition-colors",
                    isSelected ? type.bgColor : "bg-muted"
                  )}>
                    <Icon className={cn("h-5 w-5", isSelected ? type.color : "text-muted-foreground")} />
                  </div>
                  <span className={cn(
                    "font-semibold text-sm",
                    isSelected ? type.color : "text-foreground"
                  )}>
                    {type.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Content based on schedule type */}
        <div className="space-y-4">
          {/* Immediate */}
          {localScheduleType === 'immediate' && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Send className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Envio Imediato</p>
                <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">
                  A campanha será processada pelo N8N assim que você iniciar. O fluxo de automação verifica novas campanhas a cada minuto.
                </p>
              </div>
            </div>
          )}

          {/* Scheduled */}
          {localScheduleType === 'scheduled' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Data
                  </Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={localDate}
                    onChange={(e) => setLocalDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-11 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horário
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={localTime}
                    onChange={(e) => setLocalTime(e.target.value)}
                    className="h-11 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Fuso Horário
                  </Label>
                  <Select value={localTimezone} onValueChange={setLocalTimezone}>
                    <SelectTrigger id="timezone" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{tz.label}</span>
                            <span className="text-xs text-muted-foreground">{tz.offset}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {localDate && localTime && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Agendado para {(() => {
                      const [year, month, day] = localDate.split('-')
                      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
                      const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                      return `${weekdays[date.getDay()]}, ${parseInt(day)} de ${months[parseInt(month) - 1]} às ${localTime}`
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Recurring */}
          {localScheduleType === 'recurring' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  Tipo de Recorrência
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {RECURRENCE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setRecurrenceType(type.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-center",
                        recurrenceType === type.value
                          ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                          : "border-border/50 hover:border-purple-500/30 hover:bg-accent/50"
                      )}
                    >
                      <span className="font-medium text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interval" className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    Repetir a cada
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      max="30"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      className="w-20 h-11"
                    />
                    <span className="text-sm text-muted-foreground">
                      {recurrenceType === 'daily' && 'dia(s)'}
                      {recurrenceType === 'weekly' && 'semana(s)'}
                      {recurrenceType === 'monthly' && 'mês(es)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horário de Envio
                  </Label>
                  <Input
                    id="recurrence-time"
                    type="time"
                    value={recurrenceTime}
                    onChange={(e) => setRecurrenceTime(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {recurrenceType === 'weekly' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Dias da Semana
                  </Label>
                  <div className="flex gap-1.5">
                    {DAYS_OF_WEEK.map((day, index) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(day.value)}
                        title={day.fullLabel}
                        className={cn(
                          "w-10 h-10 rounded-full font-medium text-sm transition-all",
                          recurrenceDays.includes(day.value)
                            ? "bg-purple-500 text-white shadow-md"
                            : "bg-muted hover:bg-purple-500/20 text-muted-foreground"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  {recurrenceDays.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Selecione pelo menos um dia
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="timezone-recurring" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Fuso Horário
                </Label>
                <Select value={localTimezone} onValueChange={setLocalTimezone}>
                  <SelectTrigger id="timezone-recurring" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{tz.label}</span>
                          <span className="text-xs text-muted-foreground">{tz.offset}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Smart */}
          {localScheduleType === 'smart' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">Agendamento Inteligente com IA</p>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                    Nossa IA analisa o melhor horário para envio baseado no fuso horário dos contatos e histórico de engajamento.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleRequestSuggestion}
                className="w-full h-12 border-dashed border-2 hover:border-amber-500/50 hover:bg-amber-500/5"
              >
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                Sugerir Melhor Horário
              </Button>

              {(suggestedSendTime || (localSmartTiming && localDateTime)) && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Sugerido pela IA
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                    {new Date(localDateTime || suggestedSendTime!).toLocaleString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smart-date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Data
                  </Label>
                  <Input
                    id="smart-date"
                    type="date"
                    value={localDate}
                    onChange={(e) => setLocalDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-11 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smart-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Horário
                  </Label>
                  <Input
                    id="smart-time"
                    type="time"
                    value={localTime}
                    onChange={(e) => setLocalTime(e.target.value)}
                    className="h-11 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone-smart" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Fuso Horário
                  </Label>
                  <Select value={localTimezone} onValueChange={setLocalTimezone}>
                    <SelectTrigger id="timezone-smart" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{tz.label}</span>
                            <span className="text-xs text-muted-foreground">{tz.offset}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Throttling Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="throttle-toggle" className="cursor-pointer font-medium">
                  Controle de Velocidade
                </Label>
                <p className="text-xs text-muted-foreground">
                  Proteja sua conta limitando envios por minuto
                </p>
              </div>
            </div>
            <Switch
              id="throttle-toggle"
              checked={localThrottleEnabled}
              onCheckedChange={setLocalThrottleEnabled}
            />
          </div>

          {localThrottleEnabled && (
            <div className="space-y-4 pl-2 border-l-2 border-muted ml-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Configuração Rápida
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {THROTTLE_PRESETS.map((preset, index) => {
                    const Icon = preset.icon
                    const isSelected = selectedPreset === index
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handlePresetSelect(index)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          isSelected
                            ? "bg-primary/10 border-primary/30"
                            : "border-border/50 hover:border-primary/30 hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <span className={cn("font-medium text-sm", isSelected && "text-primary")}>
                            {preset.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{preset.rate} msg/min</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom controls */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Mensagens por minuto</Label>
                    <Badge variant="secondary" className="font-mono">
                      {localThrottleRate}/min
                    </Badge>
                  </div>
                  <Input
                    type="range"
                    min="10"
                    max="100"
                    value={localThrottleRate}
                    onChange={(e) => {
                      setLocalThrottleRate(parseInt(e.target.value))
                      setSelectedPreset(null)
                    }}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10 (lento)</span>
                    <span>100 (rápido)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Intervalo entre mensagens</Label>
                    <Badge variant="secondary" className="font-mono">
                      {localThrottleDelay}s
                    </Badge>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={localThrottleDelay}
                    onChange={(e) => {
                      setLocalThrottleDelay(parseInt(e.target.value))
                      setSelectedPreset(null)
                    }}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1s</span>
                    <span>10s</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {localScheduleType !== 'immediate' && (
          <>
            <Separator />
            <div className="p-4 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-xl border border-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Resumo do Agendamento</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {getScheduleSummary.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-medium text-sm truncate">{item.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
