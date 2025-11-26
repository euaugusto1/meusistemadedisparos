'use client'

import { useCallback } from 'react'
import type { LogAction, LogLevel, LogDetails } from '@/lib/system-logger'

export function useSystemLog() {
  const log = useCallback(async (
    action: LogAction,
    level: LogLevel = 'info',
    details?: LogDetails
  ): Promise<void> => {
    try {
      await fetch('/api/system-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, level, details }),
      })
    } catch (error) {
      console.error('Failed to send system log:', error)
    }
  }, [])

  const info = useCallback((action: LogAction, details?: LogDetails) => {
    return log(action, 'info', details)
  }, [log])

  const success = useCallback((action: LogAction, details?: LogDetails) => {
    return log(action, 'success', details)
  }, [log])

  const warning = useCallback((action: LogAction, details?: LogDetails) => {
    return log(action, 'warning', details)
  }, [log])

  const error = useCallback((action: LogAction, details?: LogDetails) => {
    return log(action, 'error', details)
  }, [log])

  return { log, info, success, warning, error }
}

// Função standalone para uso em componentes que não usam hooks
export async function sendSystemLog(
  action: LogAction,
  level: LogLevel = 'info',
  details?: LogDetails
): Promise<void> {
  try {
    await fetch('/api/system-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, level, details }),
    })
  } catch (error) {
    console.error('Failed to send system log:', error)
  }
}
