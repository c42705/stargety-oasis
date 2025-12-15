import Phaser from 'phaser';
import { worldDimensionsManager, WorldDimensionsState } from '../../shared/WorldDimensionsManager';
import { logger } from '../../shared/logger';

/**
 * WorldBoundsManager - Manages world dimensions and bounds
 *
 * Responsibilities:
 * - World bounds updates
 * - Background image dimension handling
 * - Map dimension listeners
 * - Scale manager synchronization
 * - Dimension calculations
 *
 * REFACTORED (2025-12-15): Removed SharedMapSystem dependency.
 * Now uses WorldDimensionsManager as the single source of truth.
 */
export class WorldBoundsManager {
  private scene: Phaser.Scene;
  public worldBounds = { width: 7603, height: 3679 }; // Default dimensions

  // Dimension change callback
  private onDimensionsChanged?: () => void;

  constructor(scene: Phaser.Scene, onDimensionsChanged?: () => void) {
    this.scene = scene;
    this.onDimensionsChanged = onDimensionsChanged;
  }

  /**
   * Initialize world bounds from map data
   */
  public initialize(): void {
    this.updateWorldBoundsFromMapData();
    this.setupMapDimensionListeners();
    this.setupScaleManagerSync();
  }

  /**
   * AUTHORITATIVE world bounds update method
   * All other world bounds updates should delegate to this method
   */
  public updateWorldBounds(width: number, height: number, source: string): void {
    const oldBounds = { ...this.worldBounds };
    const newBounds = { width, height };

    this.worldBounds = newBounds;

    // Update camera bounds to match the new world bounds exactly
    this.scene.cameras.main.setBounds(0, 0, width, height);

    logger.debug('World bounds updated', {
      source,
      oldBounds,
      newBounds,
      changed: oldBounds.width !== newBounds.width || oldBounds.height !== newBounds.height
    });

    // Synchronize camera dimensions after bounds update
    this.synchronizeCameraDimensions();

    // Notify callback if dimensions changed
    if (this.onDimensionsChanged && 
        (oldBounds.width !== newBounds.width || oldBounds.height !== newBounds.height)) {
      this.onDimensionsChanged();
    }
  }

  /**
   * Update world bounds from background image dimensions
   * CRITICAL FIX: Cap world bounds to reasonable dimensions
   */
  public updateWorldBoundsFromBackgroundImage(imageWidth: number, imageHeight: number): void {
    // Cap world bounds to reasonable maximums
    const MAX_WORLD_WIDTH = 10000;
    const MAX_WORLD_HEIGHT = 10000;

    const cappedWidth = Math.min(imageWidth, MAX_WORLD_WIDTH);
    const cappedHeight = Math.min(imageHeight, MAX_WORLD_HEIGHT);

    if (imageWidth > MAX_WORLD_WIDTH || imageHeight > MAX_WORLD_HEIGHT) {
      logger.warn('Background image dimensions exceed maximum, capping to reasonable values', {
        original: { width: imageWidth, height: imageHeight },
        capped: { width: cappedWidth, height: cappedHeight }
      });
    }

    this.updateWorldBounds(cappedWidth, cappedHeight, 'background-image');
  }

  /**
   * Update world bounds from map data stored in localStorage
   */
  public updateWorldBoundsFromMapData(): void {
    try {
      // Get dimensions from WorldDimensionsManager (authoritative source)
      const state = worldDimensionsManager.getState();
      const dimensions = state.effectiveDimensions;

      logger.debug('Updating world bounds from WorldDimensionsManager', {
        dimensions,
        source: state.source
      });

      this.updateWorldBounds(
        dimensions.width,
        dimensions.height,
        `WorldDimensionsManager-${state.source}`
      );
    } catch (error) {
      logger.error('Failed to get dimensions from WorldDimensionsManager', error);
      // No fallback - WorldDimensionsManager is the single source of truth
    }
  }

  /**
   * Set up direct subscription to WorldDimensionsManager
   */
  private setupMapDimensionListeners(): void {
    // Subscribe directly to WorldDimensionsManager for dimension changes
    const unsubscribe = worldDimensionsManager.subscribe((state: WorldDimensionsState) => {
      // Check if dimensions actually changed to prevent unnecessary updates
      const currentBounds = this.worldBounds;
      const newDimensions = state.effectiveDimensions;

      if (currentBounds.width !== newDimensions.width ||
          currentBounds.height !== newDimensions.height) {

        logger.debug('Dimension change received from WorldDimensionsManager', {
          oldDimensions: currentBounds,
          newDimensions,
          source: state.source
        });

        // Update world bounds directly with effective dimensions
        this.updateWorldBounds(
          newDimensions.width,
          newDimensions.height,
          `WorldDimensionsManager-${state.source}`
        );
      }
    });

    // Store unsubscribe function for cleanup
    this.scene.events.once('destroy', () => {
      logger.debug('Cleaning up WorldDimensionsManager subscription');
      unsubscribe();
    });
  }

  /**
   * Set up scale manager synchronization to fix dimension mismatch issues
   * CRITICAL FIX: Ensures camera dimensions stay synchronized with scale manager
   */
  private setupScaleManagerSync(): void {
    // Listen for scale manager resize events
    this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      logger.debug('Scale manager resize event triggered', {
        gameSize: { width: gameSize.width, height: gameSize.height }
      });

      // Synchronize camera dimensions with game size
      this.synchronizeCameraDimensions();
    });

    // Initial synchronization
    this.scene.time.delayedCall(100, () => {
      this.synchronizeCameraDimensions();
    });
  }

  /**
   * Synchronize camera dimensions with scale manager game size
   * This fixes the dimension mismatch that causes boundary alignment issues
   */
  public synchronizeCameraDimensions(): void {
    const camera = this.scene.cameras.main;
    const scale = this.scene.scale;
    const gameSize = scale.gameSize;

    // Force camera to match game size exactly
    if (camera.width !== gameSize.width || camera.height !== gameSize.height) {
      // Update camera viewport size to match scale manager game size
      camera.setSize(gameSize.width, gameSize.height);

      logger.debug('Camera dimensions synchronized', {
        before: { width: camera.width, height: camera.height },
        after: { width: gameSize.width, height: gameSize.height }
      });
    }
  }

  /**
   * Get current world bounds
   */
  public getWorldBounds(): { width: number; height: number } {
    return { ...this.worldBounds };
  }

  /**
   * Calculate dynamic minimum zoom based on map and viewport dimensions
   * Minimum zoom is when either map width or height equals viewport
   */
  public calculateMinZoom(staticMinZoom: number = 0.25): number {
    const scale = this.scene.scale;
    const gameSize = scale.gameSize;

    // Calculate zoom levels where map dimensions equal viewport dimensions
    const zoomForWidth = gameSize.width / this.worldBounds.width;
    const zoomForHeight = gameSize.height / this.worldBounds.height;

    // Use the larger of the two to ensure the entire map fits
    const calculatedMinZoom = Math.max(zoomForWidth, zoomForHeight);

    // Ensure we don't go below a reasonable minimum (prevent extreme zoom out)
    const finalMinZoom = Math.max(calculatedMinZoom, staticMinZoom);

    return finalMinZoom;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Cleanup is handled by event listeners
  }
}

