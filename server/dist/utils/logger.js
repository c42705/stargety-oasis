"use strict";
/**
 * Simple logger utility following best practices
 * Uses log levels: DEBUG, INFO, WARN, ERROR, FATAL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const LOG_LEVEL_NAMES = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL',
};
// Get log level from environment
function getLogLevel() {
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
function formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const formattedArgs = args.length > 0
        ? args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
        : '';
    return `[${timestamp}] ${levelName}: ${message} ${formattedArgs}`.trim();
}
function shouldLog(level) {
    return level >= currentLevel;
}
exports.logger = {
    debug(message, ...args) {
        if (shouldLog(LogLevel.DEBUG)) {
            console.debug(formatMessage(LogLevel.DEBUG, message, ...args));
        }
    },
    info(message, ...args) {
        if (shouldLog(LogLevel.INFO)) {
            console.info(formatMessage(LogLevel.INFO, message, ...args));
        }
    },
    warn(message, ...args) {
        if (shouldLog(LogLevel.WARN)) {
            console.warn(formatMessage(LogLevel.WARN, message, ...args));
        }
    },
    error(message, ...args) {
        if (shouldLog(LogLevel.ERROR)) {
            console.error(formatMessage(LogLevel.ERROR, message, ...args));
        }
    },
    fatal(message, ...args) {
        if (shouldLog(LogLevel.FATAL)) {
            console.error(formatMessage(LogLevel.FATAL, message, ...args));
        }
    },
};
exports.default = exports.logger;
