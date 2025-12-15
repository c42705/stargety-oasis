/**
 * WorldModuleAlt.tsx
 *
 * Clean, minimal Phaser + React integration for a viewport-filling world module.
 * - Uses Phaser.Scale.RESIZE to always fill the map area within the splitter panel.
 * - Camera and zoom controls are robust, simple, and always visible in the map area.
 * - Layout and code are stripped of legacy hacks, global CSS, and unused state.
 * - Well-commented for clarity and easy extension by other developers.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Phaser from 'phaser';
import WorldZoomControls from './WorldZoomControls';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { useEventBus } from '../../shared/EventBusContext';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';

// Animation frame mapping for the 3x7 sprite sheet
const ANIMATION_FRAMES = {
  idle: [0, 1, 2],
  left: [3, 4, 5],
  right: [6, 7, 8],
  up: [9, 10, 11],
  down: [12, 13, 14],
  jump: [15, 16, 17],
  attack: [18, 19, 20],
};

// Camera/zoom constants for clear configuration
const DEFAULT_ZOOM = 2;
const ZOOM_STEP = 0.25;
const MAX_ZOOM = 2.5;
const MIN_ZOOM = 0.25;

interface WorldModuleAltProps {
  playerId: string;
  className?: string;
  showMapAreas?: boolean;
}

// Main Phaser scene: Handles sprite, movement, animation, and camera logic.
class ExampleScene extends Phaser.Scene {
  public static instance: ExampleScene | null = null;
  public cody!: Phaser.GameObjects.Sprite;
  public cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  public spaceKey!: Phaser.Input.Keyboard.Key;
  public xKey!: Phaser.Input.Keyboard.Key;
  public currentAnim: string = 'idle';
  public currentText!: Phaser.GameObjects.Text;
  public backgroundImageUrl: string = '';
  public worldWidth: number;
  public worldHeight: number;
  public isPerformingAction: boolean = false;
  private isSettingDefaultZoom = false;
  private mapRenderer!: PhaserMapRenderer;
  private showMapAreas: boolean;
  private eventBus: any; // EventBus for cross-component communication
  private previousArea: string | null = null; // Track previous area for entry/exit detection

  constructor(config: { backgroundImageUrl: string; worldWidth: number; worldHeight: number; showMapAreas?: boolean; eventBus?: any }) {
    super({ key: 'ExampleScene' });
    this.backgroundImageUrl = config.backgroundImageUrl;
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.showMapAreas = config.showMapAreas ?? false;
    this.eventBus = config.eventBus;
  }

  preload() {
    if (this.backgroundImageUrl) {
      this.load.image('mapbg', this.backgroundImageUrl);
    }
    this.load.spritesheet('cody', 'assets/test frame.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    ExampleScene.instance = this;

    // Initialize map renderer to load collision areas and interactive areas
    // debugMode controls visibility of map areas (impassable polygons and interactive zones)
    this.mapRenderer = new PhaserMapRenderer({
      scene: this,
      enablePhysics: false,
      enableInteractions: true,
      debugMode: this.showMapAreas
    });

    // Initialize and render map (includes background, collision areas, interactive areas)
    this.mapRenderer.initialize().then(() => {
      console.log('✅ [WorldModuleAlt] Map renderer initialized successfully');
    }).catch(error => {
      console.error('❌ [WorldModuleAlt] Failed to initialize map renderer:', error);
    });

    // Define animations for each movement/action
    Object.entries(ANIMATION_FRAMES).forEach(([key, frames]) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('cody', { frames }),
        frameRate: key === 'idle' ? 6 : 8,
        repeat:
          key === 'idle' ||
          key === 'left' ||
          key === 'right' ||
          key === 'up' ||
          key === 'down'
            ? -1
            : 0,
      });
    });

    // Center character, scale up for visibility
    this.cody = this.add.sprite(this.worldWidth / 2, this.worldHeight / 2, 'cody', 0);
    this.cody.setDisplaySize(64, 64);
    this.cody.setOrigin(0.5, 0.5);
    this.cody.setDepth(10);

    this.cody.play('idle');
    this.currentAnim = 'idle';
    this.currentText = this.add.text(48, 40, 'Anim: idle', { color: '#00ff00', fontSize: '18px' }).setDepth(100);

    // Setup keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // Camera setup for viewport-filling
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.cody, true, 0.1, 0.1);
    this.setDefaultZoomAndCenter();

    // After jump/attack, revert to idle
    this.cody.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.isPerformingAction) {
        this.cody.play('idle');
        this.currentAnim = 'idle';
        this.currentText.setText('Anim: idle');
        this.isPerformingAction = false;
      }
    });

    // Adjust zoom on resize to maintain minimum zoom/fill
    this.scale.on('resize', () => {
      this.fitMapToViewport();
    });
  }

  update() {
    // Handle jump/attack actions via keyboard, block movement during action
    if (!this.isPerformingAction) {
      if (this.spaceKey.isDown) {
        this.playAction('jump');
        return;
      }
      if (this.xKey.isDown) {
        this.playAction('attack');
        return;
      }
    }

    // Movement: arrow keys trigger correct animation
    if (!this.isPerformingAction) {
      const speed = 250;
      let moved = false;
      let direction: string = 'idle';

      // Store previous position for collision detection
      const prevX = this.cody.x;
      const prevY = this.cody.y;

      if (this.cursors.left.isDown) {
        this.cody.x -= speed * this.game.loop.delta / 1000;
        direction = 'left';
        moved = true;
        this.cody.setFlipX(false);
      } else if (this.cursors.right.isDown) {
        this.cody.x += speed * this.game.loop.delta / 1000;
        direction = 'right';
        moved = true;
        this.cody.setFlipX(false);
      }

      if (this.cursors.up.isDown) {
        this.cody.y -= speed * this.game.loop.delta / 1000;
        direction = 'up';
        moved = true;
      } else if (this.cursors.down.isDown) {
        this.cody.y += speed * this.game.loop.delta / 1000;
        direction = 'down';
        moved = true;
      }

      // Check collision after movement
      if (moved) {
        const playerSize = 64; // Match the display size
        if (this.checkCollisionWithImpassableAreas(this.cody.x, this.cody.y, playerSize)) {
          // Collision detected, revert to previous position
          this.cody.x = prevX;
          this.cody.y = prevY;
        }
      }

      if (moved) {
        if (this.currentAnim !== direction) {
          this.cody.play(direction);
          this.currentAnim = direction;
          this.currentText.setText('Anim: ' + direction);
        }
      } else {
        if (this.currentAnim !== 'idle') {
          this.cody.play('idle');
          this.currentAnim = 'idle';
          this.currentText.setText('Anim: idle');
        }
      }
    }

    // Check for collision with interactive areas (for Jitsi auto-join/leave)
    this.checkAreaCollisions();
  }

  playAction(action: 'jump' | 'attack') {
    if (this.currentAnim === action || this.isPerformingAction) return;
    this.cody.play(action);
    this.currentAnim = action;
    this.currentText.setText('Anim: ' + action);
    this.isPerformingAction = true;
  }

  // Update map areas visibility (for admin debug toggle)
  setMapAreasVisibility(visible: boolean) {
    this.showMapAreas = visible;
    if (this.mapRenderer) {
      this.mapRenderer.setDebugMode(visible);
    }
  }

  // Camera/zoom logic for viewport-filling config
  calculateMinZoom(): number {
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const zoomForHeight = gameSize.height / this.worldHeight;
    return Math.max(zoomForHeight, MIN_ZOOM);
  }

  get minZoom(): number {
    return this.calculateMinZoom();
  }

  zoomIn() {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    if (currentZoom >= MAX_ZOOM) return;
    camera.setZoom(newZoom);
    this.enableCameraFollowAndCenter();
  }

  zoomOut() {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const dynamicMinZoom = this.minZoom;
    const newZoom = Math.max(currentZoom - ZOOM_STEP, dynamicMinZoom);
    if (currentZoom <= dynamicMinZoom) return;
    camera.setZoom(newZoom);
    this.enableCameraFollowAndCenter();
  }

  resetZoom() {
    this.setDefaultZoomAndCenter();
    this.enableCameraFollowAndCenter();
  }

  setDefaultZoomAndCenter() {
    if (this.isSettingDefaultZoom) return;
    this.isSettingDefaultZoom = true;
    const camera = this.cameras.main;
    camera.setZoom(DEFAULT_ZOOM);
    camera.centerOn(this.cody.x, this.cody.y);
    setTimeout(() => {
      this.isSettingDefaultZoom = false;
      this.enableCameraFollowAndCenter();
    }, 400);
  }

  enableCameraFollow() {
    this.cameras.main.startFollow(this.cody, true, 0.1, 0.1);
  }
  disableCameraFollow() {
    this.cameras.main.stopFollow();
  }
  isCameraFollowing() {
    return (this.cameras.main as any)._follow !== null;
  }

  enableCameraFollowAndCenter() {
    this.enableCameraFollow();
    this.cameras.main.centerOn(this.cody.x, this.cody.y);
  }

  fitMapToViewport() {
    const camera = this.cameras.main;
    const dynamicMinZoom = this.minZoom;
    if (camera.zoom < dynamicMinZoom) {
      camera.setZoom(dynamicMinZoom);
    }
    camera.centerOn(this.cody.x, this.cody.y);
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if player bounding box collides with a polygon
   */
  private checkPolygonCollision(
    polygon: { x: number; y: number }[],
    playerLeft: number,
    playerRight: number,
    playerTop: number,
    playerBottom: number
  ): boolean {
    // Check if any corner of the player bounding box is inside the polygon
    const corners = [
      { x: playerLeft, y: playerTop },
      { x: playerRight, y: playerTop },
      { x: playerLeft, y: playerBottom },
      { x: playerRight, y: playerBottom }
    ];

    for (const corner of corners) {
      if (this.isPointInPolygon(corner, polygon)) {
        return true;
      }
    }

    // Also check if player center is inside polygon
    const centerX = (playerLeft + playerRight) / 2;
    const centerY = (playerTop + playerBottom) / 2;
    if (this.isPointInPolygon({ x: centerX, y: centerY }, polygon)) {
      return true;
    }

    return false;
  }

  /**
   * Check if player position would collide with any impassable areas
   */
  private checkCollisionWithImpassableAreas(x: number, y: number, playerSize: number): boolean {
    const mapData = this.mapRenderer?.getMapData();
    if (!mapData || !mapData.impassableAreas) {
      return false; // No collision data available
    }

    // Player bounding box (centered on player position)
    const playerLeft = x - playerSize / 2;
    const playerRight = x + playerSize / 2;
    const playerTop = y - playerSize / 2;
    const playerBottom = y + playerSize / 2;

    // 🔍 DEBUG: Log collision check occasionally
    if (Math.random() < 0.05) { // Log 5% of checks
      console.log('🔍 [Collision] Checking impassable areas:', {
        totalAreas: mapData.impassableAreas.length,
        polygonAreas: mapData.impassableAreas.filter(a => a.type === 'polygon').length,
        playerPos: { x, y },
        playerBounds: { left: playerLeft, right: playerRight, top: playerTop, bottom: playerBottom }
      });
    }

    // Check collision with each impassable area
    for (const area of mapData.impassableAreas) {
      // Check if this is a polygon type
      if (area.type === 'polygon' && area.points && area.points.length > 0) {
        // First: Quick AABB check using bounding box
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        if (playerLeft < areaRight &&
            playerRight > areaLeft &&
            playerTop < areaBottom &&
            playerBottom > areaTop) {
          // Bounding boxes overlap, now do precise polygon collision check
          if (this.checkPolygonCollision(area.points, playerLeft, playerRight, playerTop, playerBottom)) {
            console.log('🚫 [Collision] POLYGON collision detected!', {
              areaId: area.id,
              areaName: area.name,
              playerPos: { x, y }
            });
            return true;
          }
        }
      } else {
        // Regular rectangular collision (default behavior)
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        // Check for overlap using AABB collision detection
        if (playerLeft < areaRight &&
            playerRight > areaLeft &&
            playerTop < areaBottom &&
            playerBottom > areaTop) {
          // Collision detected
          console.log('🚫 [Collision] RECTANGLE collision detected!', {
            areaId: area.id,
            areaName: area.name,
            playerPos: { x, y }
          });
          return true;
        }
      }
    }

    return false; // No collision
  }

  /**
   * Check for collision with interactive areas and emit events for Jitsi auto-join/leave
   */
  private checkAreaCollisions() {
    // Only check collisions if player exists
    if (!this.cody) {
      return;
    }

    const mapData = this.mapRenderer?.getMapData();
    if (!mapData || !mapData.interactiveAreas) {
      console.log('🔍 [AreaCollision] No map data or interactive areas found');
      return; // No areas to check
    }

    const areas = mapData.interactiveAreas;
    console.log('🔍 [AreaCollision] Found', areas.length, 'interactive areas:', areas.map(a => ({
      id: a.id,
      name: a.name,
      actionType: a.actionType,
      hasConfig: !!a.actionConfig
    })));
    const playerSize = 64; // Match the display size
    const playerLeft = this.cody.x - playerSize / 2;
    const playerRight = this.cody.x + playerSize / 2;
    const playerTop = this.cody.y - playerSize / 2;
    const playerBottom = this.cody.y + playerSize / 2;

    let currentlyInArea: string | null = null;

    // Check if player is in any interactive area
    areas.forEach(area => {
      const areaLeft = area.x;
      const areaRight = area.x + area.width;
      const areaTop = area.y;
      const areaBottom = area.y + area.height;

      // Check for overlap using AABB collision detection
      if (playerLeft < areaRight &&
          playerRight > areaLeft &&
          playerTop < areaBottom &&
          playerBottom > areaTop) {
        currentlyInArea = area.id;
      }
    });

    // Detect area changes and emit events for Jitsi auto-join/leave
    if (currentlyInArea !== this.previousArea) {
      console.log('🔄 Area change detected:', {
        previousArea: this.previousArea,
        currentlyInArea: currentlyInArea,
        totalAreas: areas.length,
        areas: areas.map(a => ({ id: a.id, name: a.name, actionType: a.actionType }))
      });

      // Exited previous area
      if (this.previousArea && !shouldBlockBackgroundInteractions()) {
        const previousAreaData = areas.find(a => a.id === this.previousArea);
        if (previousAreaData && this.eventBus) {
          console.log('🚪 Area exited:', previousAreaData.name, 'actionType:', previousAreaData.actionType);
          this.eventBus.publish('area-exited', {
            areaId: previousAreaData.id,
            areaName: previousAreaData.name
          });
        }
      }

      // Entered new area
      if (currentlyInArea && !shouldBlockBackgroundInteractions()) {
        const currentAreaData = areas.find(a => a.id === currentlyInArea);
        if (currentAreaData && this.eventBus) {
          console.log('🚪 Area entered:', currentAreaData.name, 'actionType:', currentAreaData.actionType);
          this.eventBus.publish('area-entered', {
            areaId: currentAreaData.id,
            areaName: currentAreaData.name,
            roomId: currentAreaData.id // Use area ID as default room ID
          });
        }
      }

      this.previousArea = currentlyInArea;
    }
  }
}

// Main React wrapper: Handles layout, state, and Phaser integration.
export const WorldModuleAlt: React.FC<WorldModuleAltProps> = ({ playerId, className = '', showMapAreas = false }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const eventBus = useEventBus(); // Get EventBus for cross-component communication

  // State for zoom/camera controls UI
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);

  // State for map config (async load)
  const [mapReady, setMapReady] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ backgroundImageUrl: string; worldWidth: number; worldHeight: number; showMapAreas: boolean }>({
    backgroundImageUrl: '',
    worldWidth: 800,
    worldHeight: 600,
    showMapAreas: showMapAreas,
  });

  // Sync camera state for UI controls
  const syncCameraState = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene && scene.cameras && scene.cameras.main) {
      const cam = scene.cameras.main;
      setCanZoomIn(cam.zoom < MAX_ZOOM);
      setCanZoomOut(cam.zoom > scene.minZoom);
      setIsCameraFollowing(scene.isCameraFollowing());
    }
  }, []);

  // Load map data on mount
  useEffect(() => {
    let mounted = true;
    SharedMapSystem.getInstance()
      .initialize()
      .then(() => {
        if (!mounted) return;
        const mapData = SharedMapSystem.getInstance().getMapData();
        if (mapData && mapData.backgroundImage && mapData.worldDimensions) {
          setMapConfig({
            backgroundImageUrl: mapData.backgroundImage,
            worldWidth: mapData.worldDimensions.width,
            worldHeight: mapData.worldDimensions.height,
            showMapAreas: false,
          });
        }
        setMapReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Zoom/camera controls handlers
  const handleZoomIn = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene) {
      scene.zoomIn();
      syncCameraState();
    }
  }, [syncCameraState]);

  const handleZoomOut = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene) {
      scene.zoomOut();
      syncCameraState();
    }
  }, [syncCameraState]);

  const handleResetZoom = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene) {
      scene.resetZoom();
      syncCameraState();
    }
  }, [syncCameraState]);

  const handleToggleCameraFollow = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene) {
      if (scene.isCameraFollowing()) {
        scene.disableCameraFollow();
      } else {
        scene.enableCameraFollow();
      }
      syncCameraState();
    }
  }, [syncCameraState]);

  // Update map areas visibility when showMapAreas prop changes
  useEffect(() => {
    const scene = ExampleScene.instance;
    if (scene) {
      scene.setMapAreasVisibility(showMapAreas);
    }
  }, [showMapAreas]);

  // Phaser game instantiation, teardown, and state polling
  useEffect(() => {
    if (!mapReady || !gameRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameRef.current,
      backgroundColor: 'black',
      scene: new ExampleScene({ ...mapConfig, eventBus }), // Pass eventBus to scene
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
    };

    phaserGameRef.current = new Phaser.Game(config);

    const poll = setInterval(syncCameraState, 200);

    return () => {
      clearInterval(poll);
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      ExampleScene.instance = null;
    };
  }, [mapReady, mapConfig, syncCameraState, eventBus]);

  // Layout: world-module > world-container > game-canvas + controls (controls are absolutely positioned in map panel)
  return (
    <div
      className={`world-module ${className}`}
      style={{
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        className="world-container"
        style={{
          height: '100%',
          width: '100%',
          position: 'relative',
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
      >
        <div
          ref={gameRef}
          className="game-canvas"
          style={{
            height: '100%',
            width: '100%',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            display: 'block',
            position: 'relative',
          }}
        />
        <WorldZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onToggleCameraFollow={handleToggleCameraFollow}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          isCameraFollowing={isCameraFollowing}
          className="world-zoom-controls-fixed"
        />
      </div>
    </div>
  );
};