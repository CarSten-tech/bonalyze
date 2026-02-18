import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { captureException } from '@/lib/monitoring'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private static instance: Logger
  private context: LogContext = {}

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  private formatMessage(level: LogLevel, message: string, meta?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      environment:
        process.env.SENTRY_ENVIRONMENT ||
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        'unknown',
      release:
        process.env.SENTRY_RELEASE ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        null,
      ...this.context,
      ...meta,
    }
    
    // In development, pretty print
    if (process.env.NODE_ENV === 'development') {
      return logEntry
    }
    
    // In production, return JSON string for log collectors
    return JSON.stringify(logEntry)
  }

  public info(message: string, meta?: LogContext) {
    const entry = this.formatMessage('info', message, meta)
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, meta || '')
    } else {
      console.info(entry)
    }
  }

  public warn(message: string, meta?: LogContext) {
    const entry = this.formatMessage('warn', message, meta)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, meta || '')
    } else {
      console.warn(entry)
    }
  }

  public error(message: string, error?: unknown, meta?: LogContext) {
    const errorObj = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : { message: String(error) }

    const entry = this.formatMessage('error', message, { ...meta, error: errorObj })

    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, error, meta || '')
    } else {
      console.error(entry)
    }

    void captureException(error ?? new Error(message), {
      context: {
        message,
        ...this.context,
        ...meta,
      },
      tags: {
        level: 'error',
      },
    })
  }

  public debug(message: string, meta?: LogContext) {
    if (process.env.NODE_ENV === 'production') return
    console.debug(`[DEBUG] ${message}`, meta || '')
  }
}

export const logger = Logger.getInstance()
