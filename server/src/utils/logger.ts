/**
 * Simple logger utility following best practices
 * Uses log levels: DEBUG, INFO, WARN, ERROR, FATAL
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// Get log level from environment
function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'FATAL': return LogLevel.FATAL;
    default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }
}

const currentLevel = getLogLevel();

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  const formattedArgs = args.length > 0 
    ? args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    : '';
  return `[${timestamp}] ${levelName}: ${message} ${formattedArgs}`.trim();
}

function shouldLog(level: LogLevel): boolean {
  return level >= currentLevel;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(formatMessage(LogLevel.DEBUG, message, ...args));
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(formatMessage(LogLevel.INFO, message, ...args));
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(formatMessage(LogLevel.WARN, message, ...args));
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(formatMessage(LogLevel.ERROR, message, ...args));
    }
  },

  fatal(message: string, ...args: unknown[]): void {
    if (shouldLog(LogLevel.FATAL)) {
      console.error(formatMessage(LogLevel.FATAL, message, ...args));
    }
  },
};

export default logger;

