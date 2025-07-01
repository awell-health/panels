export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  metadata?: Record<string, unknown>
  userId?: string
  sessionId?: string
  operationType?: string
  component?: string
  action?: string
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface LoggerConfig {
  maxQueueSize: number
  flushInterval: number
  batchSize: number
  retryAttempts: number
  retryDelay: number
}

class FrontendLogger {
  private queue: LogEntry[] = []
  private sessionId: string
  private userId?: string
  private config: LoggerConfig
  private flushTimer?: NodeJS.Timeout
  private isOnline = true

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      maxQueueSize: 100,
      flushInterval: 5000, // 5 seconds
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    }

    this.sessionId = this.generateSessionId()
    this.setupFlushTimer()
    this.setupOnlineDetection()

    // Flush logs before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true)
      })
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setupFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  private setupOnlineDetection(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flush() // Flush queued logs when back online
      })

      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    mergeObject?: Record<string, unknown>,
    error?: Error,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      metadata: mergeObject,
      userId: this.userId,
      sessionId: this.sessionId,
      operationType: mergeObject?.operationType as string,
      component: mergeObject?.component as string,
      action: mergeObject?.action as string,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }
  }

  private addToQueue(entry: LogEntry): void {
    this.queue.push(entry)

    // Prevent queue from growing too large
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue = this.queue.slice(-this.config.maxQueueSize)
    }

    // Flush immediately for errors or if queue is full
    if (entry.level === 'error' || this.queue.length >= this.config.batchSize) {
      this.flush()
    }
  }

  debug(mergeObject: Record<string, unknown>, message: string): void {
    const entry = this.createLogEntry('debug', message, mergeObject)
    this.addToQueue(entry)
  }

  info(mergeObject: Record<string, unknown>, message: string): void {
    const entry = this.createLogEntry('info', message, mergeObject)
    this.addToQueue(entry)
  }

  warn(mergeObject: Record<string, unknown>, message: string): void {
    const entry = this.createLogEntry('warn', message, mergeObject)
    this.addToQueue(entry)
  }

  error(
    mergeObject: Record<string, unknown>,
    message: string,
    error?: Error,
  ): void {
    const entry = this.createLogEntry('error', message, mergeObject, error)
    this.addToQueue(entry)
  }

  async flush(immediate = false): Promise<void> {
    if (this.queue.length === 0) return

    // Don't flush if offline unless immediate (page unload)
    if (!this.isOnline && !immediate) return

    const logsToFlush = [...this.queue]
    this.queue = []

    try {
      // Dynamic import to avoid SSR issues
      const { sendLogs } = await import('@/app/actions/logging')
      await sendLogs(logsToFlush)
    } catch (error) {
      // Re-queue failed logs if not immediate flush
      if (!immediate) {
        this.queue.unshift(...logsToFlush)
      }

      // Fallback to console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send logs:', error)
        console.log('Failed logs:', logsToFlush)
      }
    }
  }

  // Clean up resources
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush(true)
  }
}

// Singleton instance
let loggerInstance: FrontendLogger | null = null

export const getLogger = (): FrontendLogger => {
  if (!loggerInstance) {
    loggerInstance = new FrontendLogger()
  }
  return loggerInstance
}

// Convenience functions
export const logger = {
  debug: (mergeObject: Record<string, unknown>, message: string) =>
    getLogger().debug(mergeObject, message),
  info: (mergeObject: Record<string, unknown>, message: string) =>
    getLogger().info(mergeObject, message),
  warn: (mergeObject: Record<string, unknown>, message: string) =>
    getLogger().warn(mergeObject, message),
  error: (
    mergeObject: Record<string, unknown>,
    message: string,
    error?: Error,
  ) => getLogger().error(mergeObject, message, error),
  setUserId: (userId: string) => getLogger().setUserId(userId),
  flush: () => getLogger().flush(),
}
