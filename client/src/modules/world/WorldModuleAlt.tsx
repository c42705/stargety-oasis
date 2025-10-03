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

  constructor(config: { backgroundImageUrl: string; worldWidth: number; worldHeight: number }) {
    super({ key: 'ExampleScene' });
    this.backgroundImageUrl = config.backgroundImageUrl;
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
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
    this.mapRenderer = new PhaserMapRenderer({
      scene: this,
      enablePhysics: false,
      enableInteractions: true,
      debugMode: false
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
  }

  playAction(action: 'jump' | 'attack') {
    if (this.currentAnim === action || this.isPerformingAction) return;
    this.cody.play(action);
    this.currentAnim = action;
    this.currentText.setText('Anim: ' + action);
    this.isPerformingAction = true;
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
}

// Main React wrapper: Handles layout, state, and Phaser integration.
export const WorldModuleAlt: React.FC<WorldModuleAltProps> = ({ playerId, className = '' }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  // State for zoom/camera controls UI
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);

  // State for map config (async load)
  const [mapReady, setMapReady] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ backgroundImageUrl: string; worldWidth: number; worldHeight: number }>({
    backgroundImageUrl: '',
    worldWidth: 800,
    worldHeight: 600,
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

  // Phaser game instantiation, teardown, and state polling
  useEffect(() => {
    if (!mapReady || !gameRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameRef.current,
      backgroundColor: 'black',
      scene: new ExampleScene(mapConfig),
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
  }, [mapReady, mapConfig, syncCameraState]);

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