/**
 * Phaser.js Map Renderer for WorldModule
 * 
 * This class handles rendering map data from the shared map system in Phaser.js,
 * providing real-time synchronization between the Map Editor and the game world.
 * 
 * TODO: Future Enhancements
 * - Add physics integration for collision detection
 * - Implement dynamic lighting and shadow effects
 * - Add particle effects for interactive areas
 * - Implement level-of-detail (LOD) rendering for large maps
 * - Add support for animated map elements and transitions
 */

import Phaser from 'phaser';
import { SharedMapSystem, SharedMapData } from '../../shared/SharedMapSystem';
import { InteractiveArea, ImpassableArea, Asset } from '../../shared/MapDataContext';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import { logger } from '../../shared/logger';

export interface PhaserMapRendererConfig {
  scene: Phaser.Scene;
  enablePhysics?: boolean;
  enableInteractions?: boolean;
  debugMode?: boolean;
}

export class PhaserMapRenderer {
  private scene: Phaser.Scene;
  private sharedMapSystem: SharedMapSystem;
  private mapData: SharedMapData | null = null;

  // Phaser groups for different map elements
  private interactiveAreasGroup!: Phaser.GameObjects.Group;
  private collisionAreasGroup!: Phaser.GameObjects.Group;
  private backgroundGroup!: Phaser.GameObjects.Group;
  private assetsGroup!: Phaser.GameObjects.Group;

  // Configuration
  private enablePhysics: boolean;
  private enableInteractions: boolean;
  private debugMode: boolean;

  // Map element tracking
  private interactiveAreaObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private collisionAreaObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private assetObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();

  // Event listeners
  private eventListeners: (() => void)[] = [];

  // Simplified texture management (no caching)
  private textureCache: Map<string, { key: string; timestamp: number; size: number }> = new Map();

  constructor(config: PhaserMapRendererConfig) {
    this.scene = config.scene;
    this.enablePhysics = config.enablePhysics ?? true;
    this.enableInteractions = config.enableInteractions ?? true;
    this.debugMode = config.debugMode ?? false;
    
    this.sharedMapSystem = SharedMapSystem.getInstance();
    // Defer group and event listener initialization until the scene is fully
    // initialized to avoid cases where `scene.add` / renderer systems are not
    // yet available and cause `null`-access errors in Phaser internals.
  }

  /**
   * Initialize Phaser groups for organizing map elements
   */
  private initializeGroups(): void {
    try {
      // Log scene/system readiness for debugging renderer issues
      logger.debug('[PhaserMapRenderer] initializeGroups called', {
        hasScene: !!this.scene,
        hasSceneAdd: !!(this.scene && (this.scene as any).add),
        hasTextures: !!(this.scene && (this.scene as any).textures),
        hasSys: !!(this.scene && (this.scene as any).sys),
        hasRenderer: !!(this.scene && (this.scene as any).sys && (this.scene as any).sys.game && (this.scene as any).sys.game.renderer)
      });

      this.backgroundGroup = this.scene.add.group();
      this.assetsGroup = this.scene.add.group();
      this.interactiveAreasGroup = this.scene.add.group();
      this.collisionAreasGroup = this.scene.add.group();

      // Set depth for proper layering
      // Background at 0, Assets at 2 (above background, below areas), collision at 5, interactive at 10
      this.backgroundGroup.setDepth(0);
      this.assetsGroup.setDepth(2);
      this.interactiveAreasGroup.setDepth(10);
      this.collisionAreasGroup.setDepth(5);

      // Removed: Non-critical groups initialized log.
    } catch (error) {
      logger.error('Failed to initialize PhaserMapRenderer groups', {
        error: error instanceof Error ? error.message : error,
        scenePresent: !!this.scene
      });
    }
  }

  /**
   * Get current map data for collision detection
   */
  public getMapData(): SharedMapData | null {
    return this.mapData;
  }

  /**
   * Set up event listeners for map data changes
   */
  private setupEventListeners(): void {
    const handleMapChanged = (data: any) => {
      this.mapData = data.mapData;
      this.renderMap();
    };

    const handleMapLoaded = (data: any) => {
      this.mapData = data.mapData;
      this.renderMap();
    };

    const handleElementAdded = (data: any) => {
      if (data.type === 'interactive') {
        this.addInteractiveArea(data.element);
      } else if (data.type === 'collision') {
        this.addCollisionArea(data.element);
      }
    };

    const handleElementUpdated = (data: any) => {
      if (data.type === 'interactive') {
        this.updateInteractiveArea(data.element);
      } else if (data.type === 'collision') {
        this.updateCollisionArea(data.element);
      }
    };

    const handleElementRemoved = (data: any) => {
      if (data.type === 'interactive') {
        this.removeInteractiveArea(data.element.id);
      } else if (data.type === 'collision') {
        this.removeCollisionArea(data.element.id);
      }
    };

    // Subscribe to events
    this.sharedMapSystem.on('map:changed', handleMapChanged);
    this.sharedMapSystem.on('map:loaded', handleMapLoaded);
    this.sharedMapSystem.on('map:element:added', handleElementAdded);
    this.sharedMapSystem.on('map:element:updated', handleElementUpdated);
    this.sharedMapSystem.on('map:element:removed', handleElementRemoved);

    // Store cleanup functions
    this.eventListeners.push(
      () => this.sharedMapSystem.off('map:changed', handleMapChanged),
      () => this.sharedMapSystem.off('map:loaded', handleMapLoaded),
      () => this.sharedMapSystem.off('map:element:added', handleElementAdded),
      () => this.sharedMapSystem.off('map:element:updated', handleElementUpdated),
      () => this.sharedMapSystem.off('map:element:removed', handleElementRemoved)
    );
  }

  /**
   * Initialize the renderer and load map data
   */
  public async initialize(): Promise<void> {
    try {
      logger.debug('[PhaserMapRenderer] initialize START');

      // Ensure Phaser groups and event listeners are created when the scene
      // systems are ready (preload/create lifecycle). This prevents calls to
      // `this.scene.add` or texture creation when the renderer is not set.
      this.initializeGroups();
      this.setupEventListeners();

      logger.debug('[PhaserMapRenderer] SharedMapSystem.initialize() about to be awaited');
      await this.sharedMapSystem.initialize();
      logger.debug('[PhaserMapRenderer] SharedMapSystem.initialize() completed');
      this.mapData = this.sharedMapSystem.getMapData();
      if (this.mapData) {
        logger.debug('[PhaserMapRenderer] mapData available, calling renderMap');
        this.renderMap();
      } else {
        logger.debug('[PhaserMapRenderer] mapData is null after SharedMapSystem.initialize');
      }
    } catch (error) {
      console.error('Failed to initialize PhaserMapRenderer:', error);
      logger.error('[PhaserMapRenderer] initialize failed', {
        error: error instanceof Error ? error.message : error,
        hasScene: !!this.scene,
        hasRenderer: !!(this.scene && (this.scene as any).sys && (this.scene as any).sys.game && (this.scene as any).sys.game.renderer)
      });
    }
  }

  /**
   * Render the complete map
   */
  public renderMap(): void {
    if (!this.mapData) return;

    this.clearMap();
    this.renderBackground();
    this.renderAssets();
    this.renderInteractiveAreas();
    this.renderCollisionAreas();

    if (this.debugMode) {
      this.renderDebugInfo();
    }
  }

  /**
   * Clear all map elements
   */
  private clearMap(): void {
    // Safety checks to prevent errors if groups are not initialized or have been destroyed
    if (this.backgroundGroup && this.backgroundGroup.scene) {
      this.backgroundGroup.clear(true, true);
    }
    if (this.assetsGroup && this.assetsGroup.scene) {
      this.assetsGroup.clear(true, true);
    }
    if (this.interactiveAreasGroup && this.interactiveAreasGroup.scene) {
      this.interactiveAreasGroup.clear(true, true);
    }
    if (this.collisionAreasGroup && this.collisionAreasGroup.scene) {
      this.collisionAreasGroup.clear(true, true);
    }

    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();
    this.assetObjects.clear();
  }





  /**
   * Render background elements (simplified)
   */
  private renderBackground(): void {
    if (!this.mapData) {
      console.warn('🖼️ BACKGROUND: Cannot render - no map data available');
      return;
    }

    // Removed: Non-critical rendering background log.

    // Check if we have a background image
    if (this.mapData.backgroundImage) {
      // Removed: Non-critical rendering background image log.

      try {
        // Create a simple texture key
        const textureKey = `background_${Date.now()}`;

        // Check if it's a data URL or static URL
        const isDataUrl = this.mapData.backgroundImage.startsWith('data:');

        if (isDataUrl) {
          // Create texture from base64 data URL
          this.scene.textures.addBase64(textureKey, this.mapData.backgroundImage);
          setTimeout(() => {
            if (this.scene.textures.exists(textureKey)) {
              this.createSimpleBackground(textureKey);
            } else {
              this.renderDefaultBackground();
            }
          }, 100);
        } else {
          // Load from static URL
          this.scene.load.image(textureKey, this.mapData.backgroundImage);
          this.scene.load.start();
          this.scene.load.once('filecomplete-image-' + textureKey, () => {
            this.createSimpleBackground(textureKey);
          });
        }

      } catch (error) {
        logger.error('FAILED TO RENDER BACKGROUND IMAGE', error);
        this.renderDefaultBackground();
      }
    } else {
      // Removed: Non-critical no background image log.
      this.renderDefaultBackground();
    }
  }

  /**
   * Render default background when no image is provided
   */
  private renderDefaultBackground(): void {
    if (!this.mapData) return;

    // Guard: ensure scene.add is available
    if (!this.scene || !(this.scene as any).add) {
      logger.error('[PhaserMapRenderer] renderDefaultBackground: scene.add is not available', {
        hasScene: !!this.scene,
        hasSceneAdd: !!(this.scene && (this.scene as any).add),
        rendererPresent: !!(this.scene && (this.scene as any).sys && (this.scene as any).sys.game && (this.scene as any).sys.game.renderer)
      });
      return;
    }

    // Create a simple background
    const background = (this.scene as any).add.rectangle(
      this.mapData.worldDimensions.width / 2,
      this.mapData.worldDimensions.height / 2,
      this.mapData.worldDimensions.width,
      this.mapData.worldDimensions.height,
      0x2c3e50,
      0.1
    );

    if (this.backgroundGroup && this.backgroundGroup.add) {
      this.backgroundGroup.add(background);
    } else {
      logger.warn('[PhaserMapRenderer] renderDefaultBackground: backgroundGroup missing (will not add to group)', {
        backgroundGroupPresent: !!this.backgroundGroup
      });
    }
  }

  /**
   * Create background image with simple scaling (simplified approach)
   */
  private createSimpleBackground(textureKey: string): void {
    // Removed: Non-critical background creation log.

    if (!this.mapData) {
      console.error('🖼️ BACKGROUND: Cannot create background - no map data');
      return;
    }

    const worldWidth = this.mapData.worldDimensions.width;
    const worldHeight = this.mapData.worldDimensions.height;

    try {
      // Create background image at origin
      const backgroundImage = this.scene.add.image(0, 0, textureKey);
      backgroundImage.setOrigin(0, 0);

      // Scale to fit world dimensions
      const scaleX = worldWidth / backgroundImage.width;
      const scaleY = worldHeight / backgroundImage.height;
      backgroundImage.setScale(scaleX, scaleY);

      // Set depth behind other elements
      backgroundImage.setDepth(-1000);

      // Add to background group
      this.backgroundGroup.add(backgroundImage);

      // Removed: Non-critical background image created log.

    } catch (error) {
      logger.error('Error in createSimpleBackground', error);
      this.renderDefaultBackground();
    }
  }

  /**
   * Render all assets (images placed on the map)
   */
  private renderAssets(): void {
    if (!this.mapData || !this.mapData.assets) return;

    logger.debug('Rendering assets', { count: this.mapData.assets.length });

    this.mapData.assets.forEach(asset => {
      this.addAsset(asset);
    });
  }

  /**
   * Add a single asset to the scene
   */
  private addAsset(asset: Asset): void {
    try {
      // Create unique texture key for this asset
      const textureKey = `asset_${asset.id}_${Date.now()}`;

      // Check if it's a data URL (base64)
      if (asset.imageData && asset.imageData.startsWith('data:')) {
        // Create texture from base64 data URL
        this.scene.textures.addBase64(textureKey, asset.imageData);

        // Wait for texture to be ready, then create the image
        setTimeout(() => {
          if (this.scene.textures.exists(textureKey)) {
            this.createAssetImage(asset, textureKey);
          } else {
            logger.warn('Asset texture not ready', { assetId: asset.id });
          }
        }, 50);
      } else {
        logger.warn('Asset has no valid image data', { assetId: asset.id });
      }
    } catch (error) {
      logger.error('Failed to add asset', { assetId: asset.id, error });
    }
  }

  /**
   * Create the Phaser image for an asset
   */
  private createAssetImage(asset: Asset, textureKey: string): void {
    try {
      // Create the image at the asset's position
      const image = this.scene.add.image(asset.x, asset.y, textureKey);

      // Set origin to top-left to match editor behavior
      image.setOrigin(0, 0);

      // Apply scale to match the asset's dimensions
      const texture = this.scene.textures.get(textureKey);
      const frame = texture.get();
      if (frame && frame.width > 0 && frame.height > 0) {
        const scaleX = asset.width / frame.width;
        const scaleY = asset.height / frame.height;
        image.setScale(scaleX * (asset.scaleX || 1), scaleY * (asset.scaleY || 1));
      }

      // Apply rotation if specified
      if (asset.rotation) {
        image.setRotation(Phaser.Math.DegToRad(asset.rotation));
      }

      // Set depth to be above background but below interactive/collision areas
      image.setDepth(2);

      // Add to assets group and track
      this.assetsGroup.add(image);
      this.assetObjects.set(asset.id, image);

      logger.debug('Asset image created', {
        assetId: asset.id,
        position: { x: asset.x, y: asset.y },
        size: { width: asset.width, height: asset.height }
      });
    } catch (error) {
      logger.error('Failed to create asset image', { assetId: asset.id, error });
    }
  }

  /**
   * Render all interactive areas
   */
  private renderInteractiveAreas(): void {
    if (!this.mapData) return;

    this.mapData.interactiveAreas.forEach(area => {
      this.addInteractiveArea(area);
    });
  }

  /**
   * Render all collision areas
   */
  private renderCollisionAreas(): void {
    if (!this.mapData) return;

    // 🔍 DEBUG: Log all collision areas being rendered
    console.log('🎨 [WorldMap] Rendering collision areas:', {
      totalAreas: this.mapData.impassableAreas.length,
      areas: this.mapData.impassableAreas.map(area => ({
        id: area.id,
        name: area.name,
        type: area.type,
        hasPoints: !!area.points,
        pointsCount: area.points?.length || 0,
        boundingBox: { x: area.x, y: area.y, width: area.width, height: area.height }
      }))
    });

    this.mapData.impassableAreas.forEach(area => {
      this.addCollisionArea(area);
    });
  }

  /**
   * Add an interactive area to the scene
   */
  private addInteractiveArea(area: InteractiveArea): void {
    // Remove existing object if it exists
    this.removeInteractiveArea(area.id);

    // Create visual representation with visibility based on debug mode
    const fillAlpha = this.debugMode ? 0.7 : 0;
    const areaColor = area.color || '#00ff00';
    // Guard: ensure scene.add is available before creating GameObjects
    if (!this.scene || !(this.scene as any).add) {
      logger.error('[PhaserMapRenderer] addInteractiveArea: scene.add is not available', {
        areaId: area.id,
        hasScene: !!this.scene,
        hasSceneAdd: !!(this.scene && (this.scene as any).add),
        rendererPresent: !!(this.scene && (this.scene as any).sys && (this.scene as any).sys.game && (this.scene as any).sys.game.renderer)
      });
      return;
    }

    const rect = (this.scene as any).add.rectangle(
      area.x + area.width / 2,
      area.y + area.height / 2,
      area.width,
      area.height,
      Phaser.Display.Color.HexStringToColor(areaColor).color,
      fillAlpha
    );

    // Add border (visible only in debug mode)
    if (this.debugMode) {
      rect.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(areaColor).color);
    }

    // Add text label (visible only in debug mode)
    const text = this.scene.add.text(
      area.x + area.width / 2,
      area.y + area.height / 2,
      area.name,
      {
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
        fontFamily: 'Arial, sans-serif'
      }
    );
    text.setOrigin(0.5, 0.5);
    text.setAlpha(this.debugMode ? 1 : 0);

    // Create container for grouping
    const container = this.scene.add.container(0, 0, [rect, text]);

    // Add metadata
    (container as any).mapElementId = area.id;
    (container as any).mapElementType = 'interactive';
    (container as any).mapElementData = area;

    // Enable interactions if configured (always interactive, even when invisible)
    if (this.enableInteractions) {
      rect.setInteractive();
      rect.on('pointerdown', () => {
        // Don't handle area clicks if modals are blocking background interactions
        if (!shouldBlockBackgroundInteractions()) {
          this.handleInteractiveAreaClick(area);
        }
      });

      rect.on('pointerover', () => {
        if (this.debugMode) {
          rect.setAlpha(1);
        }
        this.scene.input.setDefaultCursor('pointer');
      });

      rect.on('pointerout', () => {
        if (this.debugMode) {
          rect.setAlpha(0.7);
        }
        this.scene.input.setDefaultCursor('default');
      });
    }

    // Add physics if enabled
    if (this.enablePhysics && this.scene.physics) {
      this.scene.physics.add.existing(rect, true); // true = static body
    }

    this.interactiveAreasGroup.add(container);
    this.interactiveAreaObjects.set(area.id, container);
  }

  /**
   * Update an interactive area
   */
  private updateInteractiveArea(area: InteractiveArea): void {
    this.addInteractiveArea(area); // Re-create for simplicity
  }

  /**
   * Remove an interactive area
   */
  private removeInteractiveArea(id: string): void {
    const object = this.interactiveAreaObjects.get(id);
    if (object) {
      object.destroy();
      this.interactiveAreaObjects.delete(id);
    }
  }

  /**
   * Add a collision area to the scene
   */
  private addCollisionArea(area: ImpassableArea): void {
    // Remove existing object if it exists
    this.removeCollisionArea(area.id);

    let visualObject: Phaser.GameObjects.GameObject;

    // Check if this is a polygon type
    if (area.type === 'impassable-polygon' && area.points && area.points.length > 0) {
      // 🔍 DEBUG: Log polygon rendering
      console.log('🎨 [WorldMap] Rendering POLYGON collision area:', {
        id: area.id,
        name: area.name,
        type: area.type,
        pointsCount: area.points.length,
        points: area.points,
        boundingBox: { x: area.x, y: area.y, width: area.width, height: area.height },
        debugMode: this.debugMode
      });

      // Create polygon graphics with visibility based on debug mode
      const graphics = this.scene.add.graphics();

      // Set alpha based on debug mode (invisible by default, visible in debug mode)
      const fillAlpha = this.debugMode ? 0.3 : 0;
      const strokeAlpha = this.debugMode ? 0.6 : 0;

      graphics.fillStyle(0xff0000, fillAlpha);
      graphics.lineStyle(4, 0xff0000, strokeAlpha);

      // Begin path and draw polygon
      graphics.beginPath();
      graphics.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        graphics.lineTo(area.points[i].x, area.points[i].y);
      }
      graphics.closePath();

      // Fill and stroke the polygon
      graphics.fillPath();
      graphics.strokePath();

      // 🔧 FIX: Set depth to ensure polygon is visible above background
      // Background is at depth -1000, so depth 100 ensures visibility
      graphics.setDepth(100);

      // Add metadata
      (graphics as any).mapElementId = area.id;
      (graphics as any).mapElementType = 'collision';
      (graphics as any).mapElementData = area;

      visualObject = graphics;

      console.log('✅ [WorldMap] Polygon graphics created and added to scene', {
        id: area.id,
        depth: graphics.depth,
        firstPoint: area.points[0],
        visible: graphics.visible,
        alpha: graphics.alpha,
        debugMode: this.debugMode
      });
    } else {
      // Create rectangular visual representation with visibility based on debug mode
      const fillAlpha = this.debugMode ? 0.3 : 0;
      const rect = this.scene.add.rectangle(
        area.x + area.width / 2,
        area.y + area.height / 2,
        area.width,
        area.height,
        0xff0000,
        fillAlpha
      );

      // Set stroke style based on debug mode (invisible by default)
      const strokeAlpha = this.debugMode ? 0.8 : 0;
      rect.setStrokeStyle(2, 0xff0000, strokeAlpha);

      // Set depth to ensure rectangle is visible above background
      rect.setDepth(100);

      // Add metadata
      (rect as any).mapElementId = area.id;
      (rect as any).mapElementType = 'collision';
      (rect as any).mapElementData = area;

      // Add physics if enabled
      if (this.enablePhysics && this.scene.physics) {
        this.scene.physics.add.existing(rect, true); // true = static body
      }

      visualObject = rect;
    }

    this.collisionAreasGroup.add(visualObject);
    this.collisionAreaObjects.set(area.id, visualObject);
  }

  /**
   * Update a collision area
   */
  private updateCollisionArea(area: ImpassableArea): void {
    this.addCollisionArea(area); // Re-create for simplicity
  }

  /**
   * Remove a collision area
   */
  private removeCollisionArea(id: string): void {
    const object = this.collisionAreaObjects.get(id);
    if (object) {
      object.destroy();
      this.collisionAreaObjects.delete(id);
    }
  }

  /**
   * Handle interactive area click
   */
  private handleInteractiveAreaClick(area: InteractiveArea): void {
    // Emit event for other systems to handle
    this.scene.events.emit('interactiveAreaClicked', area);
    
    // TODO: Integrate with video calling system
    // Removed: Non-critical interactive area clicked log.
  }

  /**
   * Render debug information (disabled for cleaner UI)
   */
  private renderDebugInfo(): void {
    // Debug information rendering disabled for cleaner UI
    return;
  }

  /**
   * Get collision bodies for physics integration
   */
  public getCollisionBodies(): Phaser.GameObjects.GameObject[] {
    return Array.from(this.collisionAreaObjects.values());
  }

  /**
   * Get interactive area objects
   */
  public getInteractiveAreas(): Phaser.GameObjects.GameObject[] {
    return Array.from(this.interactiveAreaObjects.values());
  }

  /**
   * Set debug mode - updates visibility of map areas without re-rendering
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;

    // Update interactive areas visibility
    this.interactiveAreaObjects.forEach((container: any) => {
      if (container && container.list) {
        const rect = container.list[0]; // Rectangle
        const text = container.list[1]; // Text label

        if (rect) {
          // Update rectangle fill alpha
          rect.setAlpha(enabled ? 1.0 : 0);

          // Update stroke (border)
          if (enabled) {
            const area = (container as any).mapElementData;
            if (area && area.color) {
              rect.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(area.color).color);
            }
          } else {
            rect.setStrokeStyle(0); // Remove stroke when not in debug mode
          }
        }

        if (text) {
          // Update text visibility
          text.setAlpha(enabled ? 1.0 : 0);
        }
      }
    });

    // Update collision areas visibility
    this.collisionAreaObjects.forEach((obj: any) => {
      if (!obj) return;

      const area = obj.mapElementData;

      // Check if it's a polygon (Graphics object) or rectangle
      if (area && area.type === 'impassable-polygon' && obj.clear) {
        // It's a Graphics object (polygon) - redraw with new alpha
        obj.clear();

        const fillAlpha = enabled ? 1.0 : 0;
        const strokeAlpha = enabled ? 1.0 : 0;

        obj.fillStyle(0xff0000, fillAlpha);
        obj.lineStyle(4, 0xff0000, strokeAlpha);

        if (area.points && area.points.length > 0) {
          obj.beginPath();
          obj.moveTo(area.points[0].x, area.points[0].y);
          for (let i = 1; i < area.points.length; i++) {
            obj.lineTo(area.points[i].x, area.points[i].y);
          }
          obj.closePath();
          obj.fillPath();
          obj.strokePath();
        }
      } else if (obj.setAlpha && obj.setStrokeStyle) {
        // It's a Rectangle object
        const fillAlpha = enabled ? 1.0 : 0;
        const strokeAlpha = enabled ? 1.0 : 0;

        obj.setAlpha(fillAlpha);
        obj.setStrokeStyle(2, 0xff0000, strokeAlpha);
      }
    });
  }

  /**
   * Cleanup resources (Enhanced with texture cache management)
   */
  public destroy(): void {
    // Remove event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];

    // Clean up texture cache (simplified)
    // Removed: Non-critical destroying texture cache log.

    // Remove all cached textures
    this.textureCache.forEach((entry) => {
      if (this.scene.textures.exists(entry.key)) {
        this.scene.textures.remove(entry.key);
      }
    });

    this.textureCache.clear();

    // Clear groups
    this.backgroundGroup.destroy(true);
    this.assetsGroup.destroy(true);
    this.interactiveAreasGroup.destroy(true);
    this.collisionAreasGroup.destroy(true);

    // Clear tracking maps
    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();

    // Removed: Non-critical cleanup complete log.
  }
}
