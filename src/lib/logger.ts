/**
 * Sistema de Logging Centralizado
 * Fornece logging estruturado com níveis e contexto
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  userId?: string
  requestId?: string
  method?: string
  path?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry

    if (this.isDevelopment) {
      // Formato colorido para desenvolvimento
      const colors = {
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
        fatal: '\x1b[35m',
      }
      const reset = '\x1b[0m'
      const color = colors[level]

      let output = `${color}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`

      if (context) {
        output += `\n  Context: ${JSON.stringify(context, null, 2)}`
      }

      if (error) {
        output += `\n  Error: ${error.name}: ${error.message}`
        if (error.stack) {
          output += `\n  Stack: ${error.stack}`
        }
      }

      return output
    }

    // Formato JSON para produção (fácil de parsear)
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    const formattedLog = this.formatLog(entry)

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog)
        break
      case LogLevel.INFO:
        console.info(formattedLog)
        break
      case LogLevel.WARN:
        console.warn(formattedLog)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedLog)
        break
    }

    // Em produção, enviar para serviço de logging externo
    if (!this.isDevelopment && level === LogLevel.ERROR || level === LogLevel.FATAL) {
      this.sendToExternalService(entry)
    }
  }

  private sendToExternalService(entry: LogEntry) {
    // TODO: Integrar com Sentry, LogRocket, ou outro serviço
    // Exemplo:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   Sentry.captureException(entry.error)
    // }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error)
  }

  fatal(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.FATAL, message, context, error)
  }

  // Helper para logging de requests HTTP
  request(method: string, path: string, context?: LogContext) {
    this.info(`HTTP ${method} ${path}`, {
      ...context,
      method,
      path,
    })
  }

  // Helper para logging de database queries
  database(query: string, duration?: number, context?: LogContext) {
    this.debug(`Database query: ${query}`, {
      ...context,
      duration,
    })
  }

  // Helper para logging de eventos de negócio
  event(event: string, context?: LogContext) {
    this.info(`Event: ${event}`, context)
  }
}

// Singleton
export const logger = new Logger()

// Helper para criar contexto de request
export function createRequestContext(request: Request): LogContext {
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    userAgent: request.headers.get('user-agent') || undefined,
  }
}
