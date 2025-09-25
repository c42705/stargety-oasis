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
 */

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
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
} as const;

export const DIMENSION_PRESETS = {
  small: { width: 800, height: 600 },
  medium: { width: 1200, height: 800 },
  large: { width: 1600, height: 1200 },
  xlarge: { width: 2400, height: 1600 },
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
    this.loadFromStorage();
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
      skipPersistence = false,
    } = options;

    // Prevent circular updates
    if (this.isUpdating) {
      console.warn('🔄 WorldDimensionsManager: Circular update prevented');
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
      console.error('❌ WorldDimensionsManager: Invalid dimensions', {
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

      console.log('✅ WorldDimensionsManager: Dimensions updated', {
        source,
        previous: previousState.worldDimensions,
        new: newDimensions,
        effective: this.state.effectiveDimensions,
        scaled: validation.scaled,
      });

      // Persist to storage
      if (!skipPersistence) {
        this.saveToStorage();
      }

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

    if (!options.skipPersistence) {
      this.saveToStorage();
    }

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
        console.error('❌ WorldDimensionsManager: Subscriber error', error);
      }
    });
  }

  private saveToStorage(): void {
    try {
      const storageData = {
        worldDimensions: this.state.worldDimensions,
        backgroundImageDimensions: this.state.backgroundImageDimensions,
        lastUpdated: this.state.lastUpdated.toISOString(),
      };
      localStorage.setItem('worldDimensions', JSON.stringify(storageData));
    } catch (error) {
      console.warn('⚠️ WorldDimensionsManager: Failed to save to storage', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('worldDimensions');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.worldDimensions) {
          const validation = this.validateDimensions(data.worldDimensions);
          if (validation.isValid) {
            this.state.worldDimensions = validation.dimensions;
            this.state.effectiveDimensions = this.calculateEffectiveDimensions(
              validation.dimensions,
              data.backgroundImageDimensions
            );
            this.state.canvasDimensions = validation.dimensions;
            this.state.backgroundImageDimensions = data.backgroundImageDimensions;
            this.state.lastUpdated = new Date(data.lastUpdated || Date.now());
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ WorldDimensionsManager: Failed to load from storage', error);
    }
  }
}

// Export singleton instance
export const worldDimensionsManager = WorldDimensionsManager.getInstance();
