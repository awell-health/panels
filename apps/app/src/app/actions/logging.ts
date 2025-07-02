'use server'

import pino from 'pino'
import type { LogEntry } from '@/lib/logger'
import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config'

// Create pino logger instance
const logger = pino(createGcpLoggingPinoConfig())

interface PinoLog {
  level: number
  time: number
  msg: string
  userId?: string
  sessionId?: string
  operationType?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
  err?: {
    type: string
    message: string
    stack?: string
  }
}

// Map our log levels to pino levels
const LOG_LEVEL_MAP = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
} as const

/**
 * Converts frontend log entries to pino format
 */
function formatLogForPino(entry: LogEntry): PinoLog {
  const pinoLog: PinoLog = {
    level: LOG_LEVEL_MAP[entry.level],
    time: entry.timestamp,
    msg: entry.message,
    userId: entry.userId,
    sessionId: entry.sessionId,
    operationType: entry.operationType,
    component: entry.component,
    action: entry.action,
    metadata: entry.metadata,
  }

  if (entry.error) {
    pinoLog.err = {
      type: entry.error.name,
      message: entry.error.message,
      stack: entry.error.stack,
    }
  }

  // Remove undefined values to keep logs clean
  return Object.fromEntries(
    Object.entries(pinoLog).filter(([, value]) => value !== undefined),
  ) as PinoLog
}

/**
 * Send logs to backend service
 */
async function forwardLogsToBackend(logs: PinoLog[]): Promise<void> {
  // Use pino logger to emit structured logs
  for (const log of logs) {
    const { level, msg, ...rest } = log
    const pinoLevel =
      Object.entries(LOG_LEVEL_MAP).find(
        ([, value]) => value === log.level,
      )?.[0] || 'info'

    // Use pino logger with appropriate level
    switch (pinoLevel) {
      case 'debug':
        logger.debug(rest, msg)
        break
      case 'info':
        logger.info(rest, msg)
        break
      case 'warn':
        logger.warn(rest, msg)
        break
      case 'error':
        logger.error(rest, msg)
        break
      default:
        logger.info(rest, msg)
    }
  }
}

/**
 * Server action to receive and process frontend logs
 */
export async function sendLogs(
  logs: LogEntry[],
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!logs || logs.length === 0) {
      return { success: true, message: 'No logs to process' }
    }

    // Validate log entries
    const validLogs = logs.filter((log) => {
      if (!log.message || typeof log.message !== 'string') {
        console.warn('Invalid log entry: missing or invalid message', log)
        return false
      }
      if (!log.level || !LOG_LEVEL_MAP[log.level]) {
        console.warn('Invalid log entry: missing or invalid level', log)
        return false
      }
      if (!log.timestamp || typeof log.timestamp !== 'number') {
        console.warn('Invalid log entry: missing or invalid timestamp', log)
        return false
      }
      return true
    })

    if (validLogs.length === 0) {
      return { success: false, message: 'No valid logs to process' }
    }

    // Convert to pino format
    const pinoLogs = validLogs.map(formatLogForPino)

    // Forward to backend
    await forwardLogsToBackend(pinoLogs)

    return {
      success: true,
      message: `Successfully processed ${validLogs.length} log entries`,
    }
  } catch (error) {
    console.error('Error processing frontend logs:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Utility function to send a single log entry immediately
 * Useful for critical errors that need immediate attention
 */
export async function sendLogImmediate(
  log: LogEntry,
): Promise<{ success: boolean; message?: string }> {
  return sendLogs([log])
}
