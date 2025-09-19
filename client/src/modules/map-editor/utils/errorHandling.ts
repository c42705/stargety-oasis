/**
 * Centralized Error Handling for Map Editor
 * 
 * Provides consistent error handling, logging, and user feedback
 * across all map editor components and operations.
 */

export interface EditorError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  operation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorContext {
  operation: string;
  component: string;
  zoom?: number;
  objectCount?: number;
  canvasSize?: { width: number; height: number };
  userAction?: string;
}

export class MapEditorError extends Error {
  public readonly code: string;
  public readonly severity: EditorError['severity'];
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    severity: EditorError['severity'] = 'medium',
    context: Partial<ErrorContext> = {}
  ) {
    super(message);
    this.name = 'MapEditorError';
    this.code = code;
    this.severity = severity;
    this.context = {
      operation: 'unknown',
      component: 'unknown',
      ...context
    };
    this.timestamp = new Date();
  }
}

/**
 * Error codes for different types of map editor errors
 */
export const ERROR_CODES = {
  // Canvas errors
  CANVAS_INIT_FAILED: 'CANVAS_INIT_FAILED',
  CANVAS_RENDER_FAILED: 'CANVAS_RENDER_FAILED',
  CANVAS_DISPOSE_FAILED: 'CANVAS_DISPOSE_FAILED',
  
  // Zoom errors
  ZOOM_INVALID_LEVEL: 'ZOOM_INVALID_LEVEL',
  ZOOM_OPERATION_FAILED: 'ZOOM_OPERATION_FAILED',
  ZOOM_TO_OBJECT_FAILED: 'ZOOM_TO_OBJECT_FAILED',
  
  // Object errors
  OBJECT_CREATION_FAILED: 'OBJECT_CREATION_FAILED',
  OBJECT_MODIFICATION_FAILED: 'OBJECT_MODIFICATION_FAILED',
  OBJECT_DELETION_FAILED: 'OBJECT_DELETION_FAILED',
  OBJECT_SELECTION_FAILED: 'OBJECT_SELECTION_FAILED',
  
  // Performance errors
  PERFORMANCE_DEGRADATION: 'PERFORMANCE_DEGRADATION',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  
  // Data errors
  DATA_SAVE_FAILED: 'DATA_SAVE_FAILED',
  DATA_LOAD_FAILED: 'DATA_LOAD_FAILED',
  DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
  
  // Grid errors
  GRID_RENDER_FAILED: 'GRID_RENDER_FAILED',
  GRID_PATTERN_LOAD_FAILED: 'GRID_PATTERN_LOAD_FAILED',
  
  // Background errors
  BACKGROUND_LOAD_FAILED: 'BACKGROUND_LOAD_FAILED',
  BACKGROUND_DIMENSION_MISMATCH: 'BACKGROUND_DIMENSION_MISMATCH'
} as const;

/**
 * Centralized error logger
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: EditorError[] = [];
  private maxErrors = 100; // Keep last 100 errors

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: MapEditorError | Error, context?: Partial<ErrorContext>): void {
    const editorError: EditorError = error instanceof MapEditorError 
      ? {
          code: error.code,
          message: error.message,
          details: error.context,
          timestamp: error.timestamp,
          operation: error.context.operation,
          severity: error.severity
        }
      : {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          details: { stack: error.stack, context },
          timestamp: new Date(),
          operation: context?.operation || 'unknown',
          severity: 'medium'
        };

    // Add to error log
    this.errors.push(editorError);
    
    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Console logging with appropriate level
    this.logToConsole(editorError);

    // TODO: Send to external error tracking service in production
    // this.sendToErrorService(editorError);
  }

  private logToConsole(error: EditorError): void {
    const prefix = `🚨 MAP EDITOR ERROR [${error.code}]`;
    const message = `${prefix}: ${error.message}`;
    
    switch (error.severity) {
      case 'critical':
        console.error(message, error.details);
        break;
      case 'high':
        console.error(message, error.details);
        break;
      case 'medium':
        console.warn(message, error.details);
        break;
      case 'low':
        console.log(message, error.details);
        break;
    }
  }

  getErrors(severity?: EditorError['severity']): EditorError[] {
    if (severity) {
      return this.errors.filter(error => error.severity === severity);
    }
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorStats(): { total: number; bySeverity: Record<string, number> } {
    const bySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.errors.length,
      bySeverity
    };
  }
}

/**
 * Utility functions for error handling
 */

/**
 * Safe execution wrapper that catches and logs errors
 */
export const safeExecute = async <T>(
  operation: () => Promise<T> | T,
  context: ErrorContext,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    const logger = ErrorLogger.getInstance();
    logger.log(error as Error, context);
    return fallback;
  }
};

/**
 * Create error handler for specific operations
 */
export const createErrorHandler = (
  defaultContext: Partial<ErrorContext>
) => {
  return (error: Error, additionalContext?: Partial<ErrorContext>) => {
    const logger = ErrorLogger.getInstance();
    const fullContext = { ...defaultContext, ...additionalContext };
    logger.log(error, fullContext);
  };
};

/**
 * Validate zoom level and throw appropriate error if invalid
 */
export const validateZoomLevel = (zoom: number, operation: string): void => {
  if (isNaN(zoom) || zoom <= 0) {
    throw new MapEditorError(
      ERROR_CODES.ZOOM_INVALID_LEVEL,
      `Invalid zoom level: ${zoom}`,
      'high',
      { operation, zoom }
    );
  }
};

/**
 * Validate canvas state and throw appropriate error if invalid
 */
export const validateCanvasState = (canvas: any, operation: string): void => {
  if (!canvas) {
    throw new MapEditorError(
      ERROR_CODES.CANVAS_INIT_FAILED,
      'Canvas is not initialized',
      'critical',
      { operation }
    );
  }
};

/**
 * Create performance warning for slow operations
 */
export const createPerformanceWarning = (
  operation: string,
  duration: number,
  threshold: number = 100
): void => {
  if (duration > threshold) {
    const logger = ErrorLogger.getInstance();
    logger.log(
      new MapEditorError(
        ERROR_CODES.PERFORMANCE_DEGRADATION,
        `Slow operation detected: ${operation} took ${duration}ms`,
        'medium',
        { operation, userAction: 'performance_warning' }
      )
    );
  }
};

/**
 * Measure execution time and log performance warnings
 */
export const measurePerformance = async <T>(
  operation: () => Promise<T> | T,
  operationName: string,
  threshold: number = 100
): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    createPerformanceWarning(operationName, duration, threshold);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    const logger = ErrorLogger.getInstance();
    logger.log(error as Error, { 
      operation: operationName, 
      component: 'performance_monitor',
      userAction: `failed_after_${duration}ms`
    });
    throw error;
  }
};
