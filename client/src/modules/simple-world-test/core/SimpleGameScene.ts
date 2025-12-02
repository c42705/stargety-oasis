/**
 * Simple Game Scene
 * 
 * Core Phaser scene for the simplified world module.
 * Handles player creation, controller initialization, and update coordination.
 */

import Phaser from 'phaser';
import { SimpleCameraController } from './SimpleCameraController';
import { SimplePlayerController } from './SimplePlayerController';

interface SimpleGameSceneConfig {
  playerId: string;
  worldBounds: { width: number; height: number };
  playerSpeed: number;
  onPlayerMoved?: (playerId: string, x: number, y: number) => void;
}

export class SimpleGameScene extends Phaser.Scene {
  private config: SimpleGameSceneConfig;
  private player!: Phaser.GameObjects.Sprite;
  private cameraController!: SimpleCameraController;
  private playerController!: SimplePlayerController;

  constructor(config: SimpleGameSceneConfig) {
    super({ key: 'SimpleGameScene' });
    this.config = config;
  }

  preload(): void {

    // Load background image
    this.load.image('world-background', 'https://i.pinimg.com/736x/37/f6/34/37f63434299b0dc23afe3d486877f646.jpg');

    // Create a simple colored rectangle as fallback sprite
    this.load.image('player-fallback', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');

    // Try to load Terra Branford sprite (if available)
    this.load.image('terra-branford', '/assets/sprites/terra-branford.png');

    // Handle load errors gracefully
    this.load.on('loaderror', (file: any) => {
      console.warn('⚠️ Failed to load asset:', file.key);
    });
  }

  create(): void {
    
    // Set camera background to transparent
    this.cameras.main.setBackgroundColor('transparent');
    
    // Create image background for world limits reference
    this.createImageBackground();
    
    // Create player sprite
    this.createPlayer();
    
    // Initialize controllers
    this.initializeControllers();
    
  }

  /**
   * Create image background for world limits reference
   */
  private createImageBackground(): void {
    const { width, height } = this.config.worldBounds;

    // Create background image sprite
    const backgroundImage = this.add.image(0, 0, 'world-background');

    // Position at top-left corner
    backgroundImage.setOrigin(0, 0);

    // Scale to fit the world bounds
    const scaleX = width / backgroundImage.width;
    const scaleY = height / backgroundImage.height;
    backgroundImage.setScale(scaleX, scaleY);

    // Set depth to be behind everything else
    backgroundImage.setDepth(-1000);

    // Create overlay graphics for world limits reference
    const overlay = this.add.graphics();

    // Add border to show world limits clearly
    overlay.lineStyle(2, 0x4a90e2, 0.8);
    overlay.strokeRect(0, 0, width, height);

    // Add corner markers
    const markerSize = 20;
    overlay.fillStyle(0x4a90e2, 0.6);
    // Top-left
    overlay.fillRect(0, 0, markerSize, markerSize);
    // Top-right
    overlay.fillRect(width - markerSize, 0, markerSize, markerSize);
    // Bottom-left
    overlay.fillRect(0, height - markerSize, markerSize, markerSize);
    // Bottom-right
    overlay.fillRect(width - markerSize, height - markerSize, markerSize, markerSize);

    // Set overlay depth to be above background but below everything else
    overlay.setDepth(-999);

  }

  /**
   * Create player sprite
   */
  private createPlayer(): void {
    const { width, height } = this.config.worldBounds;
    const initialX = width / 2;
    const initialY = height / 2;

    // Determine which texture to use
    let textureKey = 'player-fallback';
    if (this.textures.exists('terra-branford')) {
      textureKey = 'terra-branford';
    } else {
    }

    // Create player sprite
    this.player = this.add.sprite(initialX, initialY, textureKey);
    this.player.setDisplaySize(64, 64);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDepth(10);

    // If using fallback, make it a colored rectangle
    if (textureKey === 'player-fallback') {
      this.player.setTint(0x4a90e2); // Blue color
    }

  }

  /**
   * Initialize controllers using Phaser's native camera methods
   */
  private initializeControllers(): void {
    const { width, height } = this.config.worldBounds;

    // Set camera world bounds using Phaser's native method
    this.cameras.main.setBounds(0, 0, width, height);

    // Start following player using Phaser's native method
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Set initial zoom
    this.cameras.main.setZoom(1);

    // Initialize camera controller with simplified configuration
    this.cameraController = new SimpleCameraController(
      this.cameras.main,
      {
        minZoom: 0.3,
        maxZoom: 3.1,
        zoomDuration: 400,
        worldBounds: this.config.worldBounds
      }
    );

    // Initialize player controller
    this.playerController = new SimplePlayerController(
      this,
      this.player,
      {
        speed: this.config.playerSpeed,
        worldBounds: this.config.worldBounds
      }
    );

    // Set camera target for controller reference (zoom operations)
    this.cameraController.setTarget(this.player);

  }

  update(_time: number, delta: number): void {
    // Update player controller for movement and input handling
    if (this.playerController) {
      const newPosition = this.playerController.update(delta);

      // Notify parent component of player movement
      if (newPosition && this.config.onPlayerMoved) {
        this.config.onPlayerMoved(this.config.playerId, newPosition.x, newPosition.y);
      }
    }

    // Camera controller update is minimal since Phaser handles following natively
    // Only needed for zoom state management
    this.cameraController?.update(delta);
  }

  /**
   * Get camera controller for external access
   */
  getCameraController(): SimpleCameraController {
    return this.cameraController;
  }

  /**
   * Set player position (for external control)
   */
  setPlayerPosition(x: number, y: number): void {
    if (this.player && this.playerController) {
      this.playerController.setPosition(x, y);

      // Notify parent component
      if (this.config.onPlayerMoved) {
        this.config.onPlayerMoved(this.config.playerId, x, y);
      }
    }
  }

  /**
   * Update world bounds (for external control)
   */
  updateWorldBounds(width: number, height: number): void {
    this.config.worldBounds = { width, height };

    // Update camera bounds using Phaser's native method
    this.cameras.main.setBounds(0, 0, width, height);

    // Update controllers
    this.cameraController?.updateWorldBounds(width, height);
    this.playerController?.updateWorldBounds(width, height);

  }
}
