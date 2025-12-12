/**
 * Simple Game Scene
 *
 * Core Phaser scene for the simplified world module.
 * Handles player creation, controller initialization, and update coordination.
 */

import Phaser from 'phaser';
import { SimpleCameraController } from './SimpleCameraController';
import { SimplePlayerController } from './SimplePlayerController';
import { PlayerManager } from '../../world/PlayerManager';

interface SimpleGameSceneConfig {
  playerId: string;
  worldBounds: { width: number; height: number };
  playerSpeed: number;
  onPlayerMoved?: (playerId: string, x: number, y: number) => void;
}

export class SimpleGameScene extends Phaser.Scene {
  private config: SimpleGameSceneConfig;
  private playerManager!: PlayerManager;
  private cameraController!: SimpleCameraController;
  private playerController!: SimplePlayerController;
  private dummySprite!: Phaser.GameObjects.Sprite;

  constructor(config: SimpleGameSceneConfig) {
    super({ key: 'SimpleGameScene' });
    this.config = config;
  }

  preload(): void {
    // Load background image
    this.load.image('world-background', 'https://i.pinimg.com/736x/37/f6/34/37f63434299b0dc23afe3d486877f646.jpg');

    // Load a fallback texture for the dummy sprite
    this.load.image('player-fallback', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create(): void {
    // Set camera background to transparent
    this.cameras.main.setBackgroundColor('transparent');

    // Create image background for world limits reference
    this.createImageBackground();

    // Create player using PlayerManager
    this.createPlayer();

    // Initialize controllers
    this.initializeControllers();
  }

  private createImageBackground(): void {
    const { width, height } = this.config.worldBounds;
    const backgroundImage = this.add.image(0, 0, 'world-background');
    backgroundImage.setOrigin(0, 0);
    const scaleX = width / backgroundImage.width;
    const scaleY = height / backgroundImage.height;
    backgroundImage.setScale(scaleX, scaleY);
    backgroundImage.setDepth(-1000);

    const overlay = this.add.graphics();
    overlay.lineStyle(2, 0x4a90e2, 0.8);
    overlay.strokeRect(0, 0, width, height);
    overlay.setDepth(-999);
  }

  private createPlayer(): void {
    const { width, height } = this.config.worldBounds;
    const initialX = width / 2;
    const initialY = height / 2;

    this.playerManager = new PlayerManager(this, new Phaser.Events.EventEmitter(), this.config.playerId);
    this.playerManager.initialize(initialX, initialY);
  }

  private initializeControllers(): void {
    const { width, height } = this.config.worldBounds;

    // Create a dummy sprite for the player controller to manipulate
    this.dummySprite = this.add.sprite(this.playerManager.getPosition().x, this.playerManager.getPosition().y, 'player-fallback');
    this.dummySprite.setVisible(false);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.playerManager.getPlayerContainer(), true, 0.1, 0.1);
    this.cameras.main.setZoom(1);

    this.cameraController = new SimpleCameraController(this.cameras.main, {
      minZoom: 0.3,
      maxZoom: 3.1,
      zoomDuration: 400,
      worldBounds: this.config.worldBounds
    });

    this.playerController = new SimplePlayerController(this, this.dummySprite, {
      speed: this.config.playerSpeed,
      worldBounds: this.config.worldBounds
    });

    this.cameraController.setTarget(this.playerManager.getPlayerContainer());
  }

  update(_time: number, delta: number): void {
    if (this.playerController) {
      const newPosition = this.playerController.update(delta);
      if (newPosition) {
        this.playerManager.setPosition(newPosition.x, newPosition.y);
        const direction = this.playerController.getMovementState().direction as 'up' | 'down' | 'left' | 'right' | 'idle';
        this.playerManager.playAnimation(direction);

        if (this.config.onPlayerMoved) {
          this.config.onPlayerMoved(this.config.playerId, newPosition.x, newPosition.y);
        }
      } else {
        this.playerManager.playAnimation('idle');
      }
    }

    this.cameraController?.update(delta);
  }

  getCameraController(): SimpleCameraController {
    return this.cameraController;
  }

  setPlayerPosition(x: number, y: number): void {
    if (this.playerController) {
      this.playerController.setPosition(x, y);
      this.playerManager.setPosition(x,y);

      if (this.config.onPlayerMoved) {
        this.config.onPlayerMoved(this.config.playerId, x, y);
      }
    }
  }

  updateWorldBounds(width: number, height: number): void {
    this.config.worldBounds = { width, height };
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameraController?.updateWorldBounds(width, height);
    this.playerController?.updateWorldBounds(width, height);
  }
}