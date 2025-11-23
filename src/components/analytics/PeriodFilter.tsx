'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar as CalendarIcon, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

export type PeriodPreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom'

interface PeriodFilterProps {
  onPeriodChange: (period: { start: Date; end: Date; preset: PeriodPreset }) => void
}

export function PeriodFilter({ onPeriodChange }: PeriodFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('last7days')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isOpen, setIsOpen] = useState(false)

  const presets: { value: PeriodPreset; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last7days', label: 'Últimos 7 dias' },
    { value: 'last30days', label: 'Últimos 30 dias' },
    { value: 'thisMonth', label: 'Este mês' },
    { value: 'lastMonth', label: 'Mês passado' },
    { value: 'custom', label: 'Período personalizado' },
  ]

  const getDateRangeFromPreset = (preset: PeriodPreset): { start: Date; end: Date } => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (preset) {
      case 'today':
        return { start: today, end: now }

      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayEnd = new Date(yesterday)
        yesterdayEnd.setHours(23, 59, 59, 999)
        return { start: yesterday, end: yesterdayEnd }

      case 'last7days':
        const last7 = new Date(today)
        last7.setDate(last7.getDate() - 6)
        return { start: last7, end: now }

      case 'last30days':
        const last30 = new Date(today)
        last30.setDate(last30.getDate() - 29)
        return { start: last30, end: now }

      case 'thisMonth':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        return { start: thisMonthStart, end: now }

      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        return { start: lastMonthStart, end: lastMonthEnd }

      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return { start: dateRange.from, end: dateRange.to }
        }
        return { start: last7, end: now }

      default:
        const defaultStart = new Date(today)
        defaultStart.setDate(defaultStart.getDate() - 6)
        return { start: defaultStart, end: now }
    }
  }

  const handlePresetChange = (preset: PeriodPreset) => {
    setSelectedPreset(preset)

    if (preset !== 'custom') {
      const range = getDateRangeFromPreset(preset)
      onPeriodChange({ ...range, preset })
    }
  }

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setDateRange(range)

    if (range?.from && range?.to) {
      onPeriodChange({
        start: range.from,
        end: range.to,
        preset: 'custom',
      })
      setIsOpen(false)
    }
  }

  const getCurrentLabel = () => {
    const preset = presets.find(p => p.value === selectedPreset)

    if (selectedPreset === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
    }

    return preset?.label || 'Selecione um período'
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />

      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {presets.map(preset => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset === 'custom' && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                    {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                )
              ) : (
                <span>Selecione as datas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleCustomDateChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="text-sm text-muted-foreground">
        Período: <span className="font-medium">{getCurrentLabel()}</span>
      </div>
    </div>
  )
}
