/**
 * Map Error Handler
 * 
 * Centralized error handling for map loading and synchronization.
 * Provides graceful degradation and offline support.
 */

import { logger } from './logger';

export enum MapErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  OFFLINE = 'OFFLINE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export interface MapError {
  type: MapErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Detect if the application is offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Detect if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    );
  }
  return false;
}

/**
 * Detect if an error is a timeout
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') || error.message.includes('timed out');
  }
  return false;
}

/**
 * Parse and categorize a map error
 */
export function parseMapError(error: unknown): MapError {
  if (isOffline()) {
    return {
      type: MapErrorType.OFFLINE,
      message: 'You are offline. Using cached map data.',
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      suggestedAction: 'Check your internet connection',
    };
  }

  if (isTimeoutError(error)) {
    return {
      type: MapErrorType.TIMEOUT,
      message: 'Map loading timed out. Using cached data.',
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      suggestedAction: 'Try again in a moment',
    };
  }

  if (isNetworkError(error)) {
    return {
      type: MapErrorType.NETWORK_ERROR,
      message: 'Network error loading map. Using cached data.',
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      suggestedAction: 'Check your connection and try again',
    };
  }

  if (error instanceof Error && error.message.includes('validation')) {
    return {
      type: MapErrorType.VALIDATION_ERROR,
      message: 'Map data validation failed. Using default map.',
      originalError: error,
      recoverable: true,
      suggestedAction: 'Contact support if problem persists',
    };
  }

  return {
    type: MapErrorType.UNKNOWN,
    message: 'Unknown error loading map. Using default map.',
    originalError: error instanceof Error ? error : undefined,
    recoverable: true,
    suggestedAction: 'Try refreshing the page',
  };
}

/**
 * Log a map error with appropriate level
 */
export function logMapError(error: MapError, context?: Record<string, unknown>): void {
  const logContext = {
    ...context,
    errorType: error.type,
    recoverable: error.recoverable,
    suggestedAction: error.suggestedAction,
  };

  if (error.recoverable) {
    logger.warn(error.message, logContext);
  } else {
    logger.error(error.message, { ...logContext, originalError: error.originalError });
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: MapError): string {
  switch (error.type) {
    case MapErrorType.OFFLINE:
      return 'You are offline. Using cached map data.';
    case MapErrorType.NETWORK_ERROR:
      return 'Network connection issue. Using cached map data.';
    case MapErrorType.TIMEOUT:
      return 'Map loading took too long. Using cached data.';
    case MapErrorType.VALIDATION_ERROR:
      return 'Map data is corrupted. Using default map.';
    case MapErrorType.CACHE_ERROR:
      return 'Cache error. Using default map.';
    default:
      return 'Error loading map. Using default map.';
  }
}

