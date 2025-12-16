/**
 * WorldDimensionsManager - Centralized dimension management system
 *
 * This class provides a single source of truth for all world dimension operations,
 * eliminating the complex event-driven architecture and circular dependencies.
 *
 * Key Features:
 * - Single state store for all dimension-related data
 * - Direct synchronous updates without event loops
 * - Subscription system for React components
 * - Comprehensive validation and error handling
 * - Performance optimized with minimal re-renders
 *
 * REFACTORED (2025-12-11): Removed localStorage persistence.
 * REFACTORED (2025-12-15): Removed SharedMapSystem dependency.
 * Dimensions are now persisted as part of map data in PostgreSQL via Redux mapSlice.
 * This manager is a runtime cache that gets synced from Redux store.
 */
import { logger } from './logger';


// Types
export interface Dimensions {
  width: number;
  height: number;
}

export interface WorldDimensionsState {
  worldDimensions: Dimensions;
  effectiveDimensions: Dimensions;
  canvasDimensions: Dimensions;
  backgroundImageDimensions?: Dimensions;
  lastUpdated: Date;
  source: 'world' | 'editor' | 'background' | 'system' | 'migration';
}

export interface DimensionValidationResult {
  isValid: boolean;
  dimensions: Dimensions;
  errors: string[];
  warnings: string[];
  scaled: boolean;
}

export interface DimensionUpdateOptions {
  source?: 'world' | 'editor' | 'background' | 'system' | 'migration';
  validateOnly?: boolean;
  syncBackground?: boolean;
  skipPersistence?: boolean;
}

// Constants
export const DIMENSION_LIMITS = {
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  MAX_WIDTH: 8000,
  MAX_HEIGHT: 4000,
  DEFAULT_WIDTH: 1920, // Standard HD resolution
  DEFAULT_HEIGHT: 1080, // Standard HD resolution
} as const;

export const DIMENSION_PRESETS = {
  small: { width: 1280, height: 720 }, // HD
  medium: { width: 1920, height: 1080 }, // Full HD
  large: { width: 2560, height: 1440 }, // 2K
  xlarge: { width: 3840, height: 2160 }, // 4K
} as const;

// Subscription callback type
export type DimensionSubscriptionCallback = (state: WorldDimensionsState) => void;

/**
 * WorldDimensionsManager - Core dimension management system
 */
export class WorldDimensionsManager {
  private static instance: WorldDimensionsManager;
  private state: WorldDimensionsState;
  private subscribers: Set<DimensionSubscriptionCallback> = new Set();
  private isUpdating = false; // Prevent circular updates

  private constructor() {
    this.state = this.createDefaultState();
    // Note: No longer loading from localStorage
    // Dimensions are synced from Redux store via useMapStore
  }

  public static getInstance(): WorldDimensionsManager {
    if (!WorldDimensionsManager.instance) {
      WorldDimensionsManager.instance = new WorldDimensionsManager();
    }
    return WorldDimensionsManager.instance;
  }

  /**
   * Get current state (immutable copy)
   */
  public getState(): Readonly<WorldDimensionsState> {
    return { ...this.state };
  }

  /**
   * Get current world dimensions
   */
  public getWorldDimensions(): Dimensions {
    return { ...this.state.worldDimensions };
  }

  /**
   * Get effective dimensions (prioritizes background image dimensions)
   */
  public getEffectiveDimensions(): Dimensions {
    return { ...this.state.effectiveDimensions };
  }

  /**
   * Get canvas dimensions (for editor use)
   */
  public getCanvasDimensions(): Dimensions {
    return { ...this.state.canvasDimensions };
  }

  /**
   * Validate dimensions against limits and constraints
   */
  public validateDimensions(dimensions: Dimensions): DimensionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validatedDimensions = { ...dimensions };
    let scaled = false;

    // Check for positive numbers
    if (dimensions.width <= 0 || dimensions.height <= 0) {
      errors.push('Dimensions must be positive numbers');
    }

    // Check minimum limits
    if (dimensions.width < DIMENSION_LIMITS.MIN_WIDTH) {
      errors.push(`Width must be at least ${DIMENSION_LIMITS.MIN_WIDTH}px`);
    }
    if (dimensions.height < DIMENSION_LIMITS.MIN_HEIGHT) {
      errors.push(`Height must be at least ${DIMENSION_LIMITS.MIN_HEIGHT}px`);
    }

    // Check maximum limits and scale if needed
    if (dimensions.width > DIMENSION_LIMITS.MAX_WIDTH || dimensions.height > DIMENSION_LIMITS.MAX_HEIGHT) {
      const scaleX = DIMENSION_LIMITS.MAX_WIDTH / dimensions.width;
      const scaleY = DIMENSION_LIMITS.MAX_HEIGHT / dimensions.height;
      const scale = Math.min(scaleX, scaleY);

      if (scale < 1) {
        validatedDimensions = {
          width: Math.floor(dimensions.width * scale),
          height: Math.floor(dimensions.height * scale),
        };
        scaled = true;
        warnings.push(`Dimensions scaled down to fit within limits (${DIMENSION_LIMITS.MAX_WIDTH}×${DIMENSION_LIMITS.MAX_HEIGHT})`);
      }
    }

    return {
      isValid: errors.length === 0,
      dimensions: validatedDimensions,
      errors,
      warnings,
      scaled,
    };
  }

  /**
   * Validate if background dimensions match world dimensions
   */
  public validateBackgroundDimensions(
    worldDimensions: Dimensions,
    backgroundDimensions: Dimensions,
    tolerance: number = 0.1 // 10% tolerance
  ): { isValid: boolean; warnings: string[]; aspectRatioMatch: boolean } {
    const warnings: string[] = [];
    let aspectRatioMatch = true;

    // Check if both dimensions exist
    if (!worldDimensions || !backgroundDimensions) {
      return {
        isValid: false,
        warnings: ['Missing dimension data'],
        aspectRatioMatch: false
      };
    }

    // Calculate aspect ratios
    const worldAspect = worldDimensions.width / worldDimensions.height;
    const backgroundAspect = backgroundDimensions.width / backgroundDimensions.height;

    // Check aspect ratio match with tolerance
    const aspectRatioDiff = Math.abs(worldAspect - backgroundAspect);
    if (aspectRatioDiff > tolerance) {
      aspectRatioMatch = false;
      warnings.push(
        `Aspect ratio mismatch: world (${worldAspect.toFixed(3)}) vs background (${backgroundAspect.toFixed(3)})`
      );
    }

    // Check if dimensions are close enough (within tolerance)
    const widthDiff = Math.abs(worldDimensions.width - backgroundDimensions.width) / worldDimensions.width;
    const heightDiff = Math.abs(worldDimensions.height - backgroundDimensions.height) / worldDimensions.height;

    if (widthDiff > tolerance || heightDiff > tolerance) {
      warnings.push(
        `Dimension mismatch: world (${worldDimensions.width}×${worldDimensions.height}) vs background (${backgroundDimensions.width}×${backgroundDimensions.height})`
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      aspectRatioMatch
    };
  }

  /**
   * Update world dimensions with validation and synchronization
   */
  public updateDimensions(
    dimensions: Dimensions,
    options: DimensionUpdateOptions = {}
  ): DimensionValidationResult {
    const {
      source = 'system',
      validateOnly = false,
      syncBackground = true,
      // skipPersistence is no longer used - dimensions persist via Redux mapSlice
    } = options;

    // Prevent circular updates
    if (this.isUpdating) {
      logger.warn('WorldDimensionsManager: Circular update prevented');
      return {
        isValid: false,
        dimensions,
        errors: ['Circular update prevented'],
        warnings: [],
        scaled: false,
      };
    }

    // Validate dimensions
    const validation = this.validateDimensions(dimensions);

    if (!validation.isValid) {
      logger.error('WorldDimensionsManager: Invalid dimensions', {
        dimensions,
        errors: validation.errors,
      });
      return validation;
    }

    // If validation only, return early
    if (validateOnly) {
      return validation;
    }

    // Set updating flag
    this.isUpdating = true;

    try {
      const previousState = { ...this.state };
      const newDimensions = validation.dimensions;

      // Update state
      this.state = {
        ...this.state,
        worldDimensions: newDimensions,
        effectiveDimensions: this.calculateEffectiveDimensions(newDimensions, this.state.backgroundImageDimensions),
        canvasDimensions: newDimensions, // Canvas follows world dimensions
        lastUpdated: new Date(),
        source,
      };

      // Sync background dimensions if requested
      if (syncBackground) {
        this.state.backgroundImageDimensions = newDimensions;
      }

      logger.info('WorldDimensionsManager: Dimensions updated', {
        source,
        previous: previousState.worldDimensions,
        new: newDimensions,
        effective: this.state.effectiveDimensions,
        scaled: validation.scaled,
      });

      // Note: No longer persisting to localStorage
      // Dimensions are persisted as part of map data in PostgreSQL via Redux mapSlice

      // Notify subscribers
      this.notifySubscribers();

      return validation;
    } finally {
      // Clear updating flag
      this.isUpdating = false;
    }
  }

  /**
   * Update background image dimensions
   */
  public updateBackgroundDimensions(dimensions: Dimensions, options: DimensionUpdateOptions = {}): DimensionValidationResult {
    const validation = this.validateDimensions(dimensions);

    if (!validation.isValid) {
      return validation;
    }

    this.state = {
      ...this.state,
      backgroundImageDimensions: validation.dimensions,
      effectiveDimensions: this.calculateEffectiveDimensions(this.state.worldDimensions, validation.dimensions),
      lastUpdated: new Date(),
      source: options.source || 'background',
    };

    // Note: No longer persisting to localStorage
    // Dimensions are persisted as part of map data in PostgreSQL via Redux mapSlice

    this.notifySubscribers();
    return validation;
  }

  /**
   * Subscribe to dimension changes
   */
  public subscribe(callback: DimensionSubscriptionCallback): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get dimension presets
   */
  public static getPresets(): Record<string, Dimensions> {
    return { ...DIMENSION_PRESETS };
  }

  /**
   * Get dimension limits
   */
  public static getLimits(): typeof DIMENSION_LIMITS {
    return { ...DIMENSION_LIMITS };
  }

  /**
   * Reset to default dimensions
   */
  public resetToDefault(): DimensionValidationResult {
    return this.updateDimensions({
      width: DIMENSION_LIMITS.DEFAULT_WIDTH,
      height: DIMENSION_LIMITS.DEFAULT_HEIGHT,
    }, { source: 'system' });
  }

  /**
   * Get dimension warnings for the current state
   */
  public getDimensionWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.state.backgroundImageDimensions) {
      warnings.push('No background image dimensions set');
      return warnings;
    }

    const validation = this.validateBackgroundDimensions(
      this.state.worldDimensions,
      this.state.backgroundImageDimensions
    );

    warnings.push(...validation.warnings);

    return warnings;
  }

  /**
   * Check if dimension warnings exist
   */
  public hasDimensionWarnings(): boolean {
    return this.getDimensionWarnings().length > 0;
  }

  // Private methods

  private createDefaultState(): WorldDimensionsState {
    const defaultDimensions = {
      width: DIMENSION_LIMITS.DEFAULT_WIDTH,
      height: DIMENSION_LIMITS.DEFAULT_HEIGHT,
    };

    return {
      worldDimensions: defaultDimensions,
      effectiveDimensions: defaultDimensions,
      canvasDimensions: defaultDimensions,
      lastUpdated: new Date(),
      source: 'system',
    };
  }

  private calculateEffectiveDimensions(
    worldDimensions: Dimensions,
    backgroundDimensions?: Dimensions
  ): Dimensions {
    // Priority: backgroundImageDimensions > worldDimensions
    return backgroundDimensions ? { ...backgroundDimensions } : { ...worldDimensions };
  }

  private notifySubscribers(): void {
    const state = this.getState();
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        logger.error('WorldDimensionsManager: Subscriber error', error as Error);
      }
    });
  }

  // Note: localStorage methods removed (2025-12-11)
  // Dimensions are now persisted as part of map data in PostgreSQL via Redux mapSlice.
  // This manager is a runtime cache that gets synced from useMapStore.
}

// Export singleton instance
export const worldDimensionsManager = WorldDimensionsManager.getInstance();
