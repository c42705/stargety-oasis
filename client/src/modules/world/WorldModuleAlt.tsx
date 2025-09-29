import React, { useRef, useEffect, useState, useCallback } from 'react';
import Phaser from 'phaser';
import WorldZoomControls from './WorldZoomControls';
import { SharedMapSystem } from '../../shared/SharedMapSystem';

// Animation frame mapping for our 3x7 sprite:
const ANIMATION_FRAMES = {
  idle: [0, 1, 2],
  left: [3, 4, 5],
  right: [6, 7, 8],
  up: [9, 10, 11],
  down: [12, 13, 14],
  jump: [15, 16, 17],
  attack: [18, 19, 20],
};

interface WorldModuleAltProps {
  playerId: string;
  className?: string;
}

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
  public isPerformingAction: boolean = false; // Track if jump/attack is active

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

    if (this.backgroundImageUrl) {
      const bg = this.add.image(0, 0, 'mapbg');
      bg.setOrigin(0, 0);
      bg.setDisplaySize(this.worldWidth, this.worldHeight);
      bg.setDepth(-1000);
    }

    // Animations: movement and idle repeat forever, jump/attack play once
    Object.entries(ANIMATION_FRAMES).forEach(([key, frames]) => {
      let repeat = 0;
      if (
        key === 'idle' ||
        key === 'left' ||
        key === 'right' ||
        key === 'up' ||
        key === 'down'
      ) {
        repeat = -1;
      }
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('cody', { frames }),
        frameRate: key === 'idle' ? 6 : 8,
        repeat,
      });
    });

    this.cody = this.add.sprite(this.worldWidth / 2, this.worldHeight / 2, 'cody', 0);
    this.cody.setDisplaySize(64, 64);
    this.cody.setOrigin(0.5, 0.5);
    this.cody.setDepth(10);

    this.cody.play('idle');
    this.currentAnim = 'idle';
    this.currentText = this.add.text(48, 40, 'Anim: idle', { color: '#00ff00', fontSize: '18px' }).setDepth(100);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.cody, true, 0.1, 0.1);

    // Listen for jump/attack animation complete to revert to idle
    this.cody.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.isPerformingAction) {
        this.cody.play('idle');
        this.currentAnim = 'idle';
        this.currentText.setText('Anim: idle');
        this.isPerformingAction = false;
      }
    });
  }

  update() {
    // Handle jump/attack via isDown (prevents missed events)
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

    // Only do movement animation if not doing jump/attack
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

  zoomIn() {
    const cam = this.cameras.main;
    cam.zoom = Math.min(cam.zoom + 0.25, 2);
  }
  zoomOut() {
    const cam = this.cameras.main;
    cam.zoom = Math.max(cam.zoom - 0.25, 0.5);
  }
  resetZoom() {
    const cam = this.cameras.main;
    cam.zoom = 1;
    cam.centerOn(this.cody.x, this.cody.y);
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
}

export const WorldModuleAlt: React.FC<WorldModuleAltProps> = ({ playerId, className = '' }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);

  const [mapReady, setMapReady] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ backgroundImageUrl: string; worldWidth: number; worldHeight: number }>({
    backgroundImageUrl: '',
    worldWidth: 800,
    worldHeight: 600,
  });

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

  const syncCameraState = useCallback(() => {
    const scene = ExampleScene.instance;
    if (scene && scene.cameras && scene.cameras.main) {
      const cam = scene.cameras.main;
      setCanZoomIn(cam.zoom < 2);
      setCanZoomOut(cam.zoom > 0.5);
      setIsCameraFollowing(scene.isCameraFollowing());
    }
  }, []);

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

  useEffect(() => {
    if (!mapReady || !gameRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: mapConfig.worldWidth,
      height: mapConfig.worldHeight,
      parent: gameRef.current,
      backgroundColor: 'black',
      scene: new ExampleScene(mapConfig),
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: mapConfig.worldWidth,
        height: mapConfig.worldHeight,
      },
    };

    phaserGameRef.current = new Phaser.Game(config);

    const poll = setInterval(syncCameraState, 300);

    return () => {
      clearInterval(poll);
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      ExampleScene.instance = null;
    };
  }, [mapReady, mapConfig, syncCameraState]);

  return (
    <div className={`world-module-alt ${className}`} style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div ref={gameRef} style={{ height: '100%', width: '100%' }} />
      <WorldZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleCameraFollow={handleToggleCameraFollow}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isCameraFollowing={isCameraFollowing}
      />
    </div>
  );
};