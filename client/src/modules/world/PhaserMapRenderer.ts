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
import { InteractiveArea, ImpassableArea } from '../../shared/MapDataContext';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';

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
  
  // Configuration
  private enablePhysics: boolean;
  private enableInteractions: boolean;
  private debugMode: boolean;
  
  // Map element tracking
  private interactiveAreaObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private collisionAreaObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();
  
  // Event listeners
  private eventListeners: (() => void)[] = [];

  constructor(config: PhaserMapRendererConfig) {
    this.scene = config.scene;
    this.enablePhysics = config.enablePhysics ?? true;
    this.enableInteractions = config.enableInteractions ?? true;
    this.debugMode = config.debugMode ?? false;
    
    this.sharedMapSystem = SharedMapSystem.getInstance();
    
    this.initializeGroups();
    this.setupEventListeners();
  }

  /**
   * Initialize Phaser groups for organizing map elements
   */
  private initializeGroups(): void {
    try {
      this.backgroundGroup = this.scene.add.group();
      this.interactiveAreasGroup = this.scene.add.group();
      this.collisionAreasGroup = this.scene.add.group();

      // Set depth for proper layering
      this.backgroundGroup.setDepth(0);
      this.interactiveAreasGroup.setDepth(10);
      this.collisionAreasGroup.setDepth(5);

      console.log('PhaserMapRenderer groups initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PhaserMapRenderer groups:', error);
    }
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
      await this.sharedMapSystem.initialize();
      this.mapData = this.sharedMapSystem.getMapData();
      if (this.mapData) {
        this.renderMap();
      }
    } catch (error) {
      console.error('Failed to initialize PhaserMapRenderer:', error);
    }
  }

  /**
   * Render the complete map
   */
  public renderMap(): void {
    if (!this.mapData) return;

    this.clearMap();
    this.renderBackground();
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
    // Safety checks to prevent errors if groups are not initialized
    if (this.backgroundGroup) {
      this.backgroundGroup.clear(true, true);
    }
    if (this.interactiveAreasGroup) {
      this.interactiveAreasGroup.clear(true, true);
    }
    if (this.collisionAreasGroup) {
      this.collisionAreasGroup.clear(true, true);
    }

    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();
  }

  /**
   * Render background elements
   */
  private renderBackground(): void {
    if (!this.mapData) {
      console.warn('🖼️ BACKGROUND: Cannot render - no map data available');
      return;
    }

    console.log('🖼️ RENDERING BACKGROUND:', {
      hasBackgroundImage: !!this.mapData.backgroundImage,
      backgroundImageLength: this.mapData.backgroundImage?.length || 0,
      backgroundImagePreview: this.mapData.backgroundImage ? this.mapData.backgroundImage.substring(0, 50) + '...' : 'none',
      worldDimensions: this.mapData.worldDimensions,
      backgroundImageDimensions: this.mapData.backgroundImageDimensions
    });

    // Check if we have a background image
    if (this.mapData.backgroundImage) {
      console.log('🖼️ RENDERING BACKGROUND IMAGE');

      try {
        // Create a unique texture key for this background image
        const textureKey = `background_${Date.now()}`;

        console.log('🖼️ BACKGROUND: Creating texture with key:', textureKey);

        // Check if texture already exists and destroy it
        if (this.scene.textures.exists(textureKey)) {
          console.log('🖼️ BACKGROUND: Removing existing texture:', textureKey);
          this.scene.textures.remove(textureKey);
        }

        // Check if it's a data URL or static URL
        const isDataUrl = this.mapData.backgroundImage.startsWith('data:');

        console.log('🖼️ BACKGROUND: Image type detection:', {
          isDataUrl,
          imageLength: this.mapData.backgroundImage.length,
          imageStart: this.mapData.backgroundImage.substring(0, 30)
        });

        if (isDataUrl) {
          console.log('🖼️ BACKGROUND: Adding base64 texture to Phaser');
          // Create texture from base64 data URL
          this.scene.textures.addBase64(textureKey, this.mapData.backgroundImage);

          // Check if texture was added successfully
          setTimeout(() => {
            const textureExists = this.scene.textures.exists(textureKey);
            console.log('🖼️ BACKGROUND: Base64 texture creation result:', {
              textureKey,
              exists: textureExists,
              textureManager: !!this.scene.textures
            });

            if (textureExists) {
              console.log('🖼️ BACKGROUND TEXTURE LOADED (base64):', textureKey);
              this.createCoverModeBackground(textureKey);
            } else {
              console.error('❌ BACKGROUND: Base64 texture creation failed');
              this.renderDefaultBackground();
            }
          }, 100);
        } else {
          console.log('🖼️ BACKGROUND: Loading external URL texture');
          // Load from static URL
          this.scene.load.image(textureKey, this.mapData.backgroundImage);
          this.scene.load.start();

          // Wait for texture to load, then create the image
          const textureLoadHandler = (key: string) => {
            if (key === textureKey) {
              console.log('🖼️ BACKGROUND TEXTURE LOADED (external):', key);
              this.createCoverModeBackground(textureKey);
            }
          };

          this.scene.load.once('filecomplete-image-' + textureKey, textureLoadHandler);
        }

      } catch (error) {
        console.error('❌ FAILED TO RENDER BACKGROUND IMAGE:', error);

        // Fallback to default background
        this.renderDefaultBackground();
      }
    } else {
      console.log('🖼️ NO BACKGROUND IMAGE, RENDERING DEFAULT');
      this.renderDefaultBackground();
    }
  }

  /**
   * Render default background when no image is provided
   */
  private renderDefaultBackground(): void {
    if (!this.mapData) return;

    // Create a simple background
    const background = this.scene.add.rectangle(
      this.mapData.worldDimensions.width / 2,
      this.mapData.worldDimensions.height / 2,
      this.mapData.worldDimensions.width,
      this.mapData.worldDimensions.height,
      0x2c3e50,
      0.1
    );

    this.backgroundGroup.add(background);
  }

  /**
   * Create background image with 1:1 pixel mapping (no scaling)
   * This ensures the background displays at its native resolution
   */
  private createCoverModeBackground(textureKey: string): void {
    console.log('🖼️ BACKGROUND: createCoverModeBackground called with textureKey:', textureKey);

    if (!this.mapData) {
      console.error('🖼️ BACKGROUND: Cannot create background - no map data');
      return;
    }

    const worldWidth = this.mapData.worldDimensions.width;
    const worldHeight = this.mapData.worldDimensions.height;

    console.log('🖼️ BACKGROUND: World dimensions:', { worldWidth, worldHeight });

    try {
      // Get the original image dimensions
      const texture = this.scene.textures.get(textureKey);

      if (!texture) {
        console.error('🖼️ BACKGROUND: Texture not found:', textureKey);
        this.renderDefaultBackground();
        return;
      }

      console.log('🖼️ BACKGROUND: Texture retrieved successfully:', {
        textureKey,
        hasSource: !!texture.source,
        sourceLength: texture.source?.length || 0
      });

      if (!texture.source || texture.source.length === 0) {
        console.error('🖼️ BACKGROUND: Texture has no source data');
        this.renderDefaultBackground();
        return;
      }

      const imageWidth = texture.source[0].width;
      const imageHeight = texture.source[0].height;

      console.log('🖼️ BACKGROUND: Image dimensions from texture:', { imageWidth, imageHeight });

      if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) {
        console.error('🖼️ BACKGROUND: Invalid image dimensions:', { imageWidth, imageHeight });
        this.renderDefaultBackground();
        return;
      }

      // CRITICAL FIX: Use 1:1 pixel mapping instead of cover mode scaling
      // This matches how the map editor displays the background image
      const backgroundImage = this.scene.add.image(
        0, // Position at origin
        0, // Position at origin
        textureKey
      );

      console.log('🖼️ BACKGROUND: Image object created:', {
        position: { x: 0, y: 0 },
        textureKey,
        imageExists: !!backgroundImage,
        nativeImageSize: { width: imageWidth, height: imageHeight }
      });

      // Set origin to top-left for consistent positioning
      backgroundImage.setOrigin(0, 0);

      // Use 1:1 scale (no scaling) for pixel-perfect display
      backgroundImage.setScale(1, 1);

      // Set depth to ensure it's behind other elements
      backgroundImage.setDepth(-1000);

      // Add to background group
      this.backgroundGroup.add(backgroundImage);

      console.log('🖼️ BACKGROUND IMAGE CREATED SUCCESSFULLY (1:1 PIXEL MAPPING):', {
        world: { width: worldWidth, height: worldHeight },
        image: { width: imageWidth, height: imageHeight },
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
        origin: { x: 0, y: 0 },
        depth: backgroundImage.depth,
        visible: backgroundImage.visible,
        alpha: backgroundImage.alpha,
        pixelPerfect: true
      });

      // Update the scene's world bounds to match the background image dimensions
      // This ensures the camera and world size match the actual image size
      if (this.scene.cameras && this.scene.cameras.main) {
        console.log('🌍 BACKGROUND: Updating camera bounds to match image dimensions');
        this.scene.cameras.main.setBounds(0, 0, imageWidth, imageHeight);

        // Update the game scene's world bounds if it has the method
        if ((this.scene as any).updateWorldBoundsFromBackgroundImage) {
          (this.scene as any).updateWorldBoundsFromBackgroundImage(imageWidth, imageHeight);
        }
      }

    } catch (error) {
      console.error('❌ BACKGROUND: Error in createCoverModeBackground:', error);
      this.renderDefaultBackground();
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

    // Create visual representation
    const rect = this.scene.add.rectangle(
      area.x + area.width / 2,
      area.y + area.height / 2,
      area.width,
      area.height,
      Phaser.Display.Color.HexStringToColor(area.color).color,
      0.7
    );

    // Add border
    rect.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(area.color).color);

    // Add text label
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

    // Create container for grouping
    const container = this.scene.add.container(0, 0, [rect, text]);
    
    // Add metadata
    (container as any).mapElementId = area.id;
    (container as any).mapElementType = 'interactive';
    (container as any).mapElementData = area;

    // Enable interactions if configured
    if (this.enableInteractions) {
      rect.setInteractive();
      rect.on('pointerdown', () => {
        // Don't handle area clicks if modals are blocking background interactions
        if (!shouldBlockBackgroundInteractions()) {
          this.handleInteractiveAreaClick(area);
        }
      });
      
      rect.on('pointerover', () => {
        rect.setAlpha(1);
        this.scene.input.setDefaultCursor('pointer');
      });
      
      rect.on('pointerout', () => {
        rect.setAlpha(0.7);
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

    // Create visual representation (semi-transparent red)
    const rect = this.scene.add.rectangle(
      area.x + area.width / 2,
      area.y + area.height / 2,
      area.width,
      area.height,
      0xff0000,
      this.debugMode ? 0.3 : 0.1
    );

    rect.setStrokeStyle(2, 0xff0000, this.debugMode ? 0.8 : 0.3);

    // Add metadata
    (rect as any).mapElementId = area.id;
    (rect as any).mapElementType = 'collision';
    (rect as any).mapElementData = area;

    // Add physics if enabled
    if (this.enablePhysics && this.scene.physics) {
      this.scene.physics.add.existing(rect, true); // true = static body
    }

    this.collisionAreasGroup.add(rect);
    this.collisionAreaObjects.set(area.id, rect);
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
    console.log(`Interactive area clicked: ${area.name}`);
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(): void {
    if (!this.mapData) return;

    // Add debug text
    const debugText = this.scene.add.text(10, 10, 
      `Map Version: ${this.mapData.version}\n` +
      `Interactive Areas: ${this.mapData.interactiveAreas.length}\n` +
      `Collision Areas: ${this.mapData.impassableAreas.length}\n` +
      `Last Modified: ${this.mapData.lastModified.toLocaleTimeString()}`,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 }
      }
    );
    
    debugText.setDepth(1000);
    this.backgroundGroup.add(debugText);
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
   * Set debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.renderMap();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Remove event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];

    // Clear groups
    this.backgroundGroup.destroy(true);
    this.interactiveAreasGroup.destroy(true);
    this.collisionAreasGroup.destroy(true);

    // Clear tracking maps
    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();
  }
}
