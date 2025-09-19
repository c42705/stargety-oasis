/**
 * Enhanced Logging System for Map Editor
 * 
 * Provides structured logging with different levels, contexts, and
 * performance monitoring for debugging and production monitoring.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance';

export interface LogContext {
  component: string;
  operation?: string;
  zoom?: number;
  objectCount?: number;
  canvasSize?: { width: number; height: number };
  userAction?: string;
  timestamp?: Date;
  sessionId?: string;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  timestamp: Date;
  data?: any;
}

export interface PerformanceLog {
  operation: string;
  duration: number;
  context: LogContext;
  timestamp: Date;
}

/**
 * Enhanced logger with context awareness and performance monitoring
 */
export class MapEditorLogger {
  private static instance: MapEditorLogger;
  private logs: LogEntry[] = [];
  private performanceLogs: PerformanceLog[] = [];
  private maxLogs = 500;
  private maxPerformanceLogs = 100;
  private sessionId: string;
  private logLevel: LogLevel = 'info';

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): MapEditorLogger {
    if (!MapEditorLogger.instance) {
      MapEditorLogger.instance = new MapEditorLogger();
    }
    return MapEditorLogger.instance;
  }

  private generateSessionId(): string {
    return `editor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'performance'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private addLog(level: LogLevel, message: string, context: Partial<LogContext>, data?: any): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      level,
      message,
      context: {
        component: 'unknown',
        timestamp: new Date(),
        sessionId: this.sessionId,
        ...context
      },
      timestamp: new Date(),
      data
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with emoji prefixes for better visibility
    this.outputToConsole(logEntry);
  }

  private outputToConsole(entry: LogEntry): void {
    const emoji = this.getEmojiForLevel(entry.level);
    const prefix = `${emoji} [${entry.context.component}]`;
    const contextStr = this.formatContext(entry.context);
    const message = `${prefix} ${entry.message} ${contextStr}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data);
        break;
      case 'info':
        console.info(message, entry.data);
        break;
      case 'warn':
        console.warn(message, entry.data);
        break;
      case 'error':
        console.error(message, entry.data);
        break;
      case 'performance':
        console.log(`⚡ ${message}`, entry.data);
        break;
    }
  }

  private getEmojiForLevel(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '🚨';
      case 'performance': return '⚡';
      default: return '📝';
    }
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    
    if (context.operation) parts.push(`op:${context.operation}`);
    if (context.zoom) parts.push(`zoom:${Math.round(context.zoom * 100)}%`);
    if (context.objectCount) parts.push(`objects:${context.objectCount}`);
    if (context.userAction) parts.push(`action:${context.userAction}`);
    
    return parts.length > 0 ? `(${parts.join(', ')})` : '';
  }

  // Public logging methods
  debug(message: string, context: Partial<LogContext> = {}, data?: any): void {
    this.addLog('debug', message, context, data);
  }

  info(message: string, context: Partial<LogContext> = {}, data?: any): void {
    this.addLog('info', message, context, data);
  }

  warn(message: string, context: Partial<LogContext> = {}, data?: any): void {
    this.addLog('warn', message, context, data);
  }

  error(message: string, context: Partial<LogContext> = {}, data?: any): void {
    this.addLog('error', message, context, data);
  }

  performance(operation: string, duration: number, context: Partial<LogContext> = {}): void {
    const perfLog: PerformanceLog = {
      operation,
      duration,
      context: { component: 'performance', ...context },
      timestamp: new Date()
    };

    this.performanceLogs.push(perfLog);

    // Keep only the last maxPerformanceLogs entries
    if (this.performanceLogs.length > this.maxPerformanceLogs) {
      this.performanceLogs = this.performanceLogs.slice(-this.maxPerformanceLogs);
    }

    // Log performance with appropriate level based on duration
    const level = duration > 100 ? 'warn' : 'performance';
    this.addLog(level, `${operation} completed in ${duration.toFixed(2)}ms`, context, { duration });
  }

  // Utility methods
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  getPerformanceLogs(): PerformanceLog[] {
    return [...this.performanceLogs];
  }

  clearLogs(): void {
    this.logs = [];
    this.performanceLogs = [];
  }

  getLogStats(): { total: number; byLevel: Record<string, number>; avgPerformance: number } {
    const byLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgPerformance = this.performanceLogs.length > 0
      ? this.performanceLogs.reduce((sum, log) => sum + log.duration, 0) / this.performanceLogs.length
      : 0;

    return {
      total: this.logs.length,
      byLevel,
      avgPerformance
    };
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      logs: this.logs,
      performanceLogs: this.performanceLogs,
      stats: this.getLogStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

/**
 * Performance measurement decorator
 */
export const measurePerformance = (operationName: string, context: Partial<LogContext> = {}) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = MapEditorLogger.getInstance();
      const startTime = performance.now();

      try {
        const result = await method.apply(this, args);
        const duration = performance.now() - startTime;
        logger.performance(operationName, duration, context);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        logger.error(`${operationName} failed after ${duration.toFixed(2)}ms`, context, error);
        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * Create a logger instance for a specific component
 */
export const createComponentLogger = (componentName: string) => {
  const logger = MapEditorLogger.getInstance();

  return {
    debug: (message: string, context: Partial<LogContext> = {}, data?: any) =>
      logger.debug(message, { component: componentName, ...context }, data),
    
    info: (message: string, context: Partial<LogContext> = {}, data?: any) =>
      logger.info(message, { component: componentName, ...context }, data),
    
    warn: (message: string, context: Partial<LogContext> = {}, data?: any) =>
      logger.warn(message, { component: componentName, ...context }, data),
    
    error: (message: string, context: Partial<LogContext> = {}, data?: any) =>
      logger.error(message, { component: componentName, ...context }, data),
    
    performance: (operation: string, duration: number, context: Partial<LogContext> = {}) =>
      logger.performance(operation, duration, { component: componentName, ...context })
  };
};

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context: Partial<LogContext>;
  private logger: MapEditorLogger;

  constructor(operation: string, context: Partial<LogContext> = {}) {
    this.operation = operation;
    this.context = context;
    this.logger = MapEditorLogger.getInstance();
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    this.logger.performance(this.operation, duration, this.context);
    return duration;
  }

  endWithResult<T>(result: T): T {
    this.end();
    return result;
  }
}

// Global logger instance
export const logger = MapEditorLogger.getInstance();
