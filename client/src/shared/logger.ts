export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVEL_ORDER: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLevel(): LogLevel {
  const env = process.env.NODE_ENV;
  const configured = (process.env.REACT_APP_LOG_LEVEL || process.env.LOG_LEVEL || '').toLowerCase();
  if (configured && ['debug', 'info', 'warn', 'error', 'silent'].includes(configured)) {
    return configured as LogLevel;
  }
  // Defaults by environment
  if (env === 'production') return 'info'; // debug disabled in prod
  if (env === 'test') return 'warn'; // suppress info/debug in tests
  return 'debug'; // development
}

let currentLevel: LogLevel = resolveLevel();

export const setLogLevel = (level: LogLevel) => {
  currentLevel = level;
};

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  if (currentLevel === 'silent') return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[(currentLevel as Exclude<LogLevel, 'silent'>) || 'debug'];
}

function format(message: string, meta?: unknown) {
  // Structured logging: keep concise, avoid sensitive data
  const payload = { ts: new Date().toISOString(), message, ...(meta ? { meta } : {}) };
  return payload;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug('[debug]', format(message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info('[info]', format(message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn('[warn]', format(message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error('[error]', format(message, meta));
    }
  },
};

