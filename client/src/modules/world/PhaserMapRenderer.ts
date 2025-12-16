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
import { InteractiveArea, ImpassableArea, Asset, MapData } from '../../shared/MapDataContext';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import { logger } from '../../shared/logger';

export interface PhaserMapRendererConfig {
  scene: Phaser.Scene;
  mapData?: MapData | null; // Optional initial map data from Redux
  enablePhysics?: boolean;
  enableInteractions?: boolean;
  debugMode?: boolean;
}

export class PhaserMapRenderer {
  private scene: Phaser.Scene;
  private mapData: MapData | null = null;

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

  // Lifecycle flag to prevent async callbacks from executing after destroy
  private isDestroyed: boolean = false;

  constructor(config: PhaserMapRendererConfig) {
    this.scene = config.scene;
    this.enablePhysics = config.enablePhysics ?? true;
    this.enableInteractions = config.enableInteractions ?? true;
    this.debugMode = config.debugMode ?? false;
    this.mapData = config.mapData ?? null;
    // Defer group initialization until the scene is fully
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
  public getMapData(): MapData | null {
    return this.mapData;
  }

  /**
   * Update map data from external source (Redux)
   * Call this when Redux mapData changes to re-render
   */
  public updateMapData(newMapData: MapData | null): void {
    if (this.isDestroyed) return;
    this.mapData = newMapData;
    if (this.mapData) {
      this.renderMap();
    }
  }

  /**
   * Initialize the renderer and prepare Phaser groups
   * Map data is now provided via constructor or updateMapData() from Redux
   */
  public async initialize(): Promise<void> {
    try {
      logger.debug('[PhaserMapRenderer] initialize START');

      // Ensure Phaser groups are created when the scene
      // systems are ready (preload/create lifecycle). This prevents calls to
      // `this.scene.add` or texture creation when the renderer is not set.
      this.initializeGroups();

      logger.debug('[PhaserMapRenderer] Groups initialized');

      // Render map if data was provided in constructor
      if (this.mapData) {
        logger.debug('[PhaserMapRenderer] mapData available, calling renderMap');
        this.renderMap();
      } else {
        logger.debug('[PhaserMapRenderer] mapData is null - waiting for updateMapData() call');
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

    // Check if we have a background image
    if (this.mapData.backgroundImage) {
      // Guard: ensure scene and texture system are available
      if (!this.isSceneValid() || !this.scene.textures) {
        logger.warn('[PhaserMapRenderer] renderBackground: scene not ready for texture operations');
        this.renderDefaultBackground();
        return;
      }

      try {
        // Create a simple texture key
        const textureKey = `background_${Date.now()}`;

        // Check if it's a data URL or static URL
        const isDataUrl = this.mapData.backgroundImage.startsWith('data:');

        if (isDataUrl) {
          // Create texture from base64 data URL
          this.scene.textures.addBase64(textureKey, this.mapData.backgroundImage);
          setTimeout(() => {
            // Guard: check if destroyed or scene invalid before proceeding
            if (this.isDestroyed || !this.isSceneValid()) {
              return;
            }
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
            // Guard: check if destroyed or scene invalid before proceeding
            if (this.isDestroyed || !this.isSceneValid()) {
              return;
            }
            this.createSimpleBackground(textureKey);
          });
        }

      } catch (error) {
        logger.error('FAILED TO RENDER BACKGROUND IMAGE', error);
        this.renderDefaultBackground();
      }
    } else {
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
    if (!this.mapData) {
      console.error('🖼️ BACKGROUND: Cannot create background - no map data');
      return;
    }

    // Guard: ensure scene.add is available
    if (!this.isSceneValid() || !(this.scene as any).add) {
      logger.warn('[PhaserMapRenderer] createSimpleBackground: scene.add not available');
      return;
    }

    const worldWidth = this.mapData.worldDimensions.width;
    const worldHeight = this.mapData.worldDimensions.height;
    const bgDimensions = this.mapData.backgroundImageDimensions;

    try {
      // Create background image at origin
      const backgroundImage = this.scene.add.image(0, 0, textureKey);
      backgroundImage.setOrigin(0, 0);

      // Calculate aspect ratios
      const imageAspect = backgroundImage.width / backgroundImage.height;
      const worldAspect = worldWidth / worldHeight;

      let scaleX, scaleY, offsetX = 0, offsetY = 0;

      if (imageAspect > worldAspect) {
        // Image is wider than world - fit to height, center horizontally
        scaleY = worldHeight / backgroundImage.height;
        scaleX = scaleY;
        offsetX = (worldWidth - backgroundImage.width * scaleX) / 2;
      } else {
        // Image is taller than world - fit to width, center vertically
        scaleX = worldWidth / backgroundImage.width;
        scaleY = scaleX;
        offsetY = (worldHeight - backgroundImage.height * scaleY) / 2;
      }

      // Apply scaling with centering offset
      backgroundImage.setScale(scaleX, scaleY);
      backgroundImage.setPosition(offsetX, offsetY);

      // Log dimension comparison for debugging scale issues
      logger.debug('[PhaserMapRenderer] Background created with aspect ratio preservation', {
        textureKey,
        textureSize: { width: backgroundImage.width, height: backgroundImage.height },
        worldDimensions: { width: worldWidth, height: worldHeight },
        backgroundImageDimensions: bgDimensions,
        imageAspect,
        worldAspect,
        appliedScale: { scaleX, scaleY },
        centerOffset: { offsetX, offsetY },
        dimensionsMatch: bgDimensions
          ? (bgDimensions.width === worldWidth && bgDimensions.height === worldHeight)
          : 'no bgDimensions stored'
      });

      // Set depth behind other elements
      backgroundImage.setDepth(-1000);

      // Add to background group (with safety check)
      if (this.backgroundGroup?.scene) {
        this.backgroundGroup.add(backgroundImage);
      }

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
    // Guard: ensure scene and texture system are available
    if (!this.isSceneValid() || !this.scene.textures) {
      logger.warn('[PhaserMapRenderer] addAsset: scene not ready', { assetId: asset.id });
      return;
    }

    try {
      // Create unique texture key for this asset
      const textureKey = `asset_${asset.id}_${Date.now()}`;

      // Check if it's a data URL (base64)
      if (asset.imageData && asset.imageData.startsWith('data:')) {
        // Create texture from base64 data URL
        this.scene.textures.addBase64(textureKey, asset.imageData);

        // Wait for texture to be ready, then create the image
        setTimeout(() => {
          // Guard: check if destroyed or scene invalid before proceeding
          if (this.isDestroyed || !this.isSceneValid()) {
            return;
          }
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
    // Guard: ensure scene.add is available
    if (!this.isSceneValid() || !(this.scene as any).add) {
      logger.warn('[PhaserMapRenderer] createAssetImage: scene.add not available', { assetId: asset.id });
      return;
    }

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

      // Add to assets group and track (with safety check)
      if (this.assetsGroup?.scene) {
        this.assetsGroup.add(image);
      }
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
    const colorValue = Phaser.Display.Color.HexStringToColor(areaColor).color;

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

    let shapeObject: Phaser.GameObjects.Shape | Phaser.GameObjects.Graphics;

    // Check if this is a polygon shape
    if (area.shapeType === 'polygon' && area.points && area.points.length > 2) {
      // Create polygon using Graphics object
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(colorValue, fillAlpha);
      if (this.debugMode) {
        graphics.lineStyle(2, colorValue, 1);
      }

      graphics.beginPath();
      graphics.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        graphics.lineTo(area.points[i].x, area.points[i].y);
      }
      graphics.closePath();
      graphics.fillPath();
      if (this.debugMode) {
        graphics.strokePath();
      }

      shapeObject = graphics;
    } else {
      // Create rectangle (default behavior)
      const rect = (this.scene as any).add.rectangle(
        area.x + area.width / 2,
        area.y + area.height / 2,
        area.width,
        area.height,
        colorValue,
        fillAlpha
      );

      // Add border (visible only in debug mode)
      if (this.debugMode) {
        rect.setStrokeStyle(2, colorValue);
      }

      shapeObject = rect;
    }

    // Add text label (visible only in debug mode)
    const textX = area.shapeType === 'polygon' && area.points?.length
      ? area.points.reduce((sum, p) => sum + p.x, 0) / area.points.length
      : area.x + area.width / 2;
    const textY = area.shapeType === 'polygon' && area.points?.length
      ? area.points.reduce((sum, p) => sum + p.y, 0) / area.points.length
      : area.y + area.height / 2;

    const text = this.scene.add.text(textX, textY, area.name, {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      fontFamily: 'Arial, sans-serif'
    });
    text.setOrigin(0.5, 0.5);
    text.setAlpha(this.debugMode ? 1 : 0);

    // Create container for grouping
    const container = this.scene.add.container(0, 0, [shapeObject, text]);

    // Add metadata
    (container as any).mapElementId = area.id;
    (container as any).mapElementType = 'interactive';
    (container as any).mapElementData = area;

    // Enable interactions if configured (always interactive, even when invisible)
    if (this.enableInteractions) {
      // For polygons, create an invisible rectangle hit area for interaction
      const hitRect = (this.scene as any).add.rectangle(
        area.x + area.width / 2,
        area.y + area.height / 2,
        area.width,
        area.height,
        0x000000,
        0
      );
      hitRect.setInteractive();
      hitRect.on('pointerdown', () => {
        if (!shouldBlockBackgroundInteractions()) {
          this.handleInteractiveAreaClick(area);
        }
      });
      hitRect.on('pointerover', () => {
        if (this.debugMode && shapeObject instanceof Phaser.GameObjects.Shape) {
          shapeObject.setAlpha(1);
        }
        this.scene.input.setDefaultCursor('pointer');
      });
      hitRect.on('pointerout', () => {
        if (this.debugMode && shapeObject instanceof Phaser.GameObjects.Shape) {
          shapeObject.setAlpha(0.7);
        }
        this.scene.input.setDefaultCursor('default');
      });
      container.add(hitRect);
    }

    // Add physics if enabled
    if (this.enablePhysics && this.scene.physics && shapeObject instanceof Phaser.GameObjects.Shape) {
      this.scene.physics.add.existing(shapeObject, true);
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
    if (area.type === 'polygon' && area.points && area.points.length > 0) {
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
      if (!container || !container.list) return;

      const area = (container as any).mapElementData;
      const shapeObject = container.list[0]; // Rectangle or Graphics
      const text = container.list[1]; // Text label

      if (shapeObject) {
        // Check if it's a Graphics object (polygon) or Rectangle
        if (area?.shapeType === 'polygon' && shapeObject.clear) {
          // Graphics object - redraw with new alpha
          shapeObject.clear();
          const colorValue = area.color
            ? Phaser.Display.Color.HexStringToColor(area.color).color
            : 0x00ff00;
          const fillAlpha = enabled ? 0.7 : 0;

          shapeObject.fillStyle(colorValue, fillAlpha);
          if (enabled) {
            shapeObject.lineStyle(2, colorValue, 1);
          }

          if (area.points && area.points.length > 0) {
            shapeObject.beginPath();
            shapeObject.moveTo(area.points[0].x, area.points[0].y);
            for (let i = 1; i < area.points.length; i++) {
              shapeObject.lineTo(area.points[i].x, area.points[i].y);
            }
            shapeObject.closePath();
            shapeObject.fillPath();
            if (enabled) {
              shapeObject.strokePath();
            }
          }
        } else if (typeof shapeObject.setAlpha === 'function') {
          // Rectangle object
          shapeObject.setAlpha(enabled ? 0.7 : 0);

          if (typeof shapeObject.setStrokeStyle === 'function') {
            if (enabled && area?.color) {
              shapeObject.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(area.color).color);
            } else if (!enabled) {
              shapeObject.setStrokeStyle(0);
            }
          }
        }
      }

      if (text && typeof text.setAlpha === 'function') {
        text.setAlpha(enabled ? 1.0 : 0);
      }
    });

    // Update collision areas visibility (legacy impassableAreas)
    this.collisionAreaObjects.forEach((obj: any) => {
      if (!obj) return;

      const area = obj.mapElementData;

      // Check if it's a polygon (Graphics object) or rectangle
      if (area && area.type === 'polygon' && obj.clear) {
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
      } else if (typeof obj.setAlpha === 'function') {
        // It's a Rectangle object
        const fillAlpha = enabled ? 1.0 : 0;
        const strokeAlpha = enabled ? 1.0 : 0;

        obj.setAlpha(fillAlpha);
        if (typeof obj.setStrokeStyle === 'function') {
          obj.setStrokeStyle(2, 0xff0000, strokeAlpha);
        }
      }
    });
  }

  /**
   * Check if renderer is in a valid state for operations
   */
  private isSceneValid(): boolean {
    return !this.isDestroyed &&
           !!this.scene &&
           !!(this.scene as any).sys?.game?.renderer;
  }

  /**
   * Cleanup resources (Enhanced with texture cache management)
   */
  public destroy(): void {
    // Mark as destroyed FIRST to prevent async callbacks from executing
    this.isDestroyed = true;

    // Remove event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];

    // Clean up texture cache with safety checks
    try {
      this.textureCache.forEach((entry) => {
        if (this.scene?.textures?.exists?.(entry.key)) {
          this.scene.textures.remove(entry.key);
        }
      });
    } catch (error) {
      logger.warn('[PhaserMapRenderer] Error cleaning texture cache during destroy', error);
    }
    this.textureCache.clear();

    // Clear groups with safety checks
    try {
      if (this.backgroundGroup?.scene) {
        this.backgroundGroup.destroy(true);
      }
      if (this.assetsGroup?.scene) {
        this.assetsGroup.destroy(true);
      }
      if (this.interactiveAreasGroup?.scene) {
        this.interactiveAreasGroup.destroy(true);
      }
      if (this.collisionAreasGroup?.scene) {
        this.collisionAreasGroup.destroy(true);
      }
    } catch (error) {
      logger.warn('[PhaserMapRenderer] Error destroying groups during cleanup', error);
    }

    // Clear tracking maps
    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();
    this.assetObjects.clear();
  }
}
