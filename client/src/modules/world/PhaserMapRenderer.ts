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
    this.backgroundGroup = this.scene.add.group();
    this.interactiveAreasGroup = this.scene.add.group();
    this.collisionAreasGroup = this.scene.add.group();
    
    // Set depth for proper layering
    this.backgroundGroup.setDepth(0);
    this.interactiveAreasGroup.setDepth(10);
    this.collisionAreasGroup.setDepth(5);
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
    this.backgroundGroup.clear(true, true);
    this.interactiveAreasGroup.clear(true, true);
    this.collisionAreasGroup.clear(true, true);
    
    this.interactiveAreaObjects.clear();
    this.collisionAreaObjects.clear();
  }

  /**
   * Render background elements
   */
  private renderBackground(): void {
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
        this.handleInteractiveAreaClick(area);
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
