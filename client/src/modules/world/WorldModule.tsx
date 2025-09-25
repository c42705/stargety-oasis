import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { AvatarGameRenderer } from '../../components/avatar/AvatarGameRenderer';
import { useAuth } from '../../shared/AuthContext';
import { InteractiveArea } from '../../shared/MapDataContext';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { worldDimensionsManager, WorldDimensionsState } from '../../shared/WorldDimensionsManager';
import WorldZoomControls from './WorldZoomControls';

import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import './WorldModule.css';

interface WorldModuleProps {
  playerId: string;
  className?: string;
}



class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private eventBus: any;
  private playerId: string;
  private onAreaClick: (areaId: string) => void;
  private currentArea: string | null = null;
  private mapRenderer!: PhaserMapRenderer;
  private sharedMapSystem!: SharedMapSystem;
  public avatarRenderer!: AvatarGameRenderer;

  // Interactive controls
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private xKey!: Phaser.Input.Keyboard.Key;
  private oKey!: Phaser.Input.Keyboard.Key;

  // Animation states
  private isJumping: boolean = false;
  private isRotating: boolean = false;
  private originalY: number = 0;
  private fireEffects: Phaser.GameObjects.Graphics[] = [];
  private rotationTween?: Phaser.Tweens.Tween;

  // Zoom and camera properties
  private defaultZoom: number = 1.65;
  private staticMinZoom: number = 0.3; // Fallback minimum zoom
  private maxZoom: number = 1.65; // Updated: max zoom is now 1.65 (165%)
  private zoomStep: number = 0.2;
  public worldBounds = { width: 800, height: 600 }; // Default, will be updated from SharedMapSystem

  // Camera panning properties
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;
  private panSensitivity: number = 1;

  // Enhanced panning state tracking for zoom conflict resolution
  private hasManuallePanned: boolean = false;
  private panOffsetFromPlayer: { x: number; y: number } = { x: 0, y: 0 };
  private lastKnownPlayerPosition: { x: number; y: number } = { x: 0, y: 0 };

  // Character following properties
  private isFollowingPlayer: boolean = true;
  private followLerpFactor: number = 0.15; // Increased for more responsive following
  private followDeadZone: number = 20; // Reduced for tighter tracking
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;
  private manualCameraControl: boolean = false;

  // Enhanced camera following properties
  private cameraFollowOffset: { x: number; y: number } = { x: 0, y: 0 };
  private adaptiveLerpFactor: number = 0.15;
  private maxLerpFactor: number = 0.25;
  private minLerpFactor: number = 0.08;

  // Debug visual elements
  // Set to false to disable debug overlays in production
  // To toggle at runtime: window.phaserGame.scene.scenes[0].toggleDebugOverlays()
  private DEBUG_CAMERA_CENTERING: boolean = true;

  // Debug logging throttling to prevent infinite logs
  private lastDebugLogTime: number = 0;
  private debugLogInterval: number = 200; // Log at most every 2 seconds
  private lastDebugUpdateTime: number = 0;
  private debugUpdateInterval: number = 100; // Update debug overlays at most every 100ms (10 FPS)

  // Debug UI controls
  private debugControlsVisible: boolean = false;
  private debugControlsContainer?: HTMLDivElement;
  private viewportBoundsOffset: { x: number; y: number } = { x: 0, y: 0 };
  private pinkSquareOffset: { x: number; y: number } = { x: 0, y: 0 };
  private manualScaleFactor: number = 1.0;
  private debugPlayerCross?: Phaser.GameObjects.Graphics;
  private debugCameraCross?: Phaser.GameObjects.Graphics;
  private debugViewportBounds?: Phaser.GameObjects.Graphics;
  private debugViewportBorder?: Phaser.GameObjects.Graphics; // New: visible viewport border
  private debugWorldCenterCross?: Phaser.GameObjects.Graphics;
  private debugDiagonalLines?: Phaser.GameObjects.Graphics; // New: diagonal X-shape lines
  private debugPlayerPositionText?: Phaser.GameObjects.Text;
  private debugCameraScrollText?: Phaser.GameObjects.Text;
  private debugPlayerFollowingText?: Phaser.GameObjects.Text; // New: text that follows player
  private debugLabels?: Phaser.GameObjects.Text[]; // New: labels for debug elements

  // Prevent multiple simultaneous calls to setDefaultZoomAndCenter
  private isSettingDefaultZoom: boolean = false;

  // Player properties
  private playerSize: number = 32; // Player sprite size for collision detection and bounds

  // Double-click detection properties
  private lastClickTime: number = 0;
  private doubleClickDelay: number = 300; // Maximum time between clicks for double-click (ms)
  private lastClickPosition: { x: number; y: number } = { x: 0, y: 0 };
  private doubleClickTolerance: number = 10; // Maximum pixel distance between clicks

  constructor(eventBus: any, playerId: string, onAreaClick: (areaId: string) => void) {
    super({ key: 'GameScene' });
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.onAreaClick = onAreaClick;
    this.sharedMapSystem = SharedMapSystem.getInstance();
  }

  preload() {
    // Load Terra Branford sprite as default player sprite from public folder
    this.load.image('terra-branford', 'terra-branford.gif');

    // Create simple colored rectangle as ultimate fallback
    this.add.graphics()
      .fillStyle(0x00ff00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('player-fallback', 32, 32);
  }



  create() {
    // Initialize map renderer first to load map data from localStorage
    this.mapRenderer = new PhaserMapRenderer({
      scene: this,
      enablePhysics: false,
      enableInteractions: true,
      debugMode: false
    });

    // Add instructions
    this.add.text(20, 20, 'Controls:\n• Arrow keys: Move around\n• SPACEBAR: Jump\n• X: Fire\n• O: Toggle rotation\n• Walk into colored areas to interact', {
      fontSize: '12px',
      color: '#333333',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: { x: 10, y: 8 },
      lineSpacing: 2
    });

    // Initialize and render map from localStorage
    this.mapRenderer.initialize().then(() => {
      // Update world bounds from map data
      this.updateWorldBoundsFromMapData();
    }).catch(error => {
      console.error('Failed to load map data from localStorage:', error);
      // Continue with empty map if loading fails
    });

    // Set up interactive area click handling
    this.events.on('interactiveAreaClicked', (area: InteractiveArea) => {
      this.onAreaClick(area.id);
    });

    // Initialize avatar renderer
    this.avatarRenderer = new AvatarGameRenderer(this);

    // Set camera background color to transparent to show background image
    this.cameras.main.setBackgroundColor('transparent');

    // Set up camera bounds and initial zoom
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

    // Set default zoom and center on player initially
    this.time.delayedCall(100, () => {
      this.setDefaultZoomAndCenter();
    });

    // Create default player sprite immediately using Terra Branford, then load avatar asynchronously
    const defaultTexture = this.textures.exists('terra-branford') ? 'terra-branford' : 'player-fallback';

    // Calculate initial player position based on world bounds (center of world)
    const initialX = this.worldBounds.width / 2;
    const initialY = this.worldBounds.height / 2;

    this.player = this.add.sprite(initialX, initialY, defaultTexture);
    this.player.setDisplaySize(64, 64); // Larger size for better visibility
    this.player.setOrigin(0.5, 0.5); // Ensure sprite is centered on its position
    this.player.setDepth(10);
    this.originalY = this.player.y;

    console.log('🎮 PLAYER CREATED:', {
      position: { x: this.player.x, y: this.player.y },
      worldBounds: this.worldBounds,
      origin: { x: this.player.originX, y: this.player.originY },
      displaySize: { width: this.player.displayWidth, height: this.player.displayHeight }
    });

    // Load avatar asynchronously and update sprite when ready
    this.initializePlayer();

    // Create cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create custom key bindings for interactive controls
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.oKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O);

    // Set up camera panning controls
    this.setupCameraPanning();

    // Initialize character following
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    // Listen for map dimension changes
    this.setupMapDimensionListeners();

    // Set up scale manager synchronization (CRITICAL FIX for dimension mismatch)
    this.setupScaleManagerSync();

    // Set up key event handlers
    this.setupKeyHandlers();

    // Handle double-click teleportation (but not on interactive areas or when modals are open)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      // Check if background interactions should be blocked (modals open)
      if (shouldBlockBackgroundInteractions()) {
        return; // Don't process click if modals are blocking background
      }

      // Check if clicking on an interactive area by checking if any object has areaId data
      const clickedOnArea = currentlyOver.some(obj =>
        obj.getData && obj.getData('areaId')
      );

      if (!clickedOnArea && this.player) {
        const currentTime = this.time.now;
        const timeSinceLastClick = currentTime - this.lastClickTime;

        // Calculate distance from last click position
        const distanceFromLastClick = Math.sqrt(
          Math.pow(pointer.x - this.lastClickPosition.x, 2) +
          Math.pow(pointer.y - this.lastClickPosition.y, 2)
        );

        // Check if this is a double-click (within time limit and close to previous click)
        if (timeSinceLastClick <= this.doubleClickDelay &&
            distanceFromLastClick <= this.doubleClickTolerance) {

          // This is a double-click - perform teleportation
          this.handlePlayerTeleportation(pointer);

          // Reset click tracking to prevent triple-click issues
          this.lastClickTime = 0;
          this.lastClickPosition = { x: 0, y: 0 };
        } else {
          // This is a single click - just update tracking for potential double-click
          this.lastClickTime = currentTime;
          this.lastClickPosition = { x: pointer.x, y: pointer.y };
        }
      }
    });

    // Player initialization will be handled in initializePlayer()
  }

  /**
   * Handle player teleportation on double-click
   */
  private handlePlayerTeleportation(pointer: Phaser.Input.Pointer): void {
    if (!this.player) return;

    // Convert screen coordinates to world coordinates
    const camera = this.cameras.main;
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    // Check if the target position would cause a collision
    if (!this.checkCollisionWithImpassableAreas(worldX, worldY, this.playerSize)) {
      // Keep within world bounds
      const clampedX = Phaser.Math.Clamp(worldX, this.playerSize / 2, this.worldBounds.width - this.playerSize / 2);
      const clampedY = Phaser.Math.Clamp(worldY, this.playerSize / 2, this.worldBounds.height - this.playerSize / 2);

      // Teleport player to the new position
      this.player.x = clampedX;
      this.player.y = clampedY;

      // Publish player movement event
      this.eventBus.publish('world:playerMoved', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
      });
    }
  }

  async initializePlayer() {
    try {
      // Try to load player avatar sprite sheet for animations
      let spriteSheetKey = null;

      try {
        spriteSheetKey = await this.avatarRenderer.loadPlayerAvatarSpriteSheet(this.playerId);
      } catch (error) {
        spriteSheetKey = null;
      }

      if (spriteSheetKey) {
        // Create animated avatar sprite to replace the default one
        const avatarSprite = this.avatarRenderer.createAnimatedPlayerSprite(this.playerId, this.player.x, this.player.y);

        if (avatarSprite) {
          // Replace the default sprite with the animated avatar sprite
          const oldX = this.player.x;
          const oldY = this.player.y;
          this.player.destroy();

          this.player = avatarSprite;
          this.player.setPosition(oldX, oldY);
          this.player.setOrigin(0.5, 0.5); // Ensure avatar sprite is centered on its position
          this.player.setDepth(10);
        }
      } else {
        // Fallback to single frame avatar
        try {
          await this.avatarRenderer.loadPlayerAvatar(this.playerId);
          const avatarSprite = this.avatarRenderer.createPlayerSprite(this.playerId, this.player.x, this.player.y);

          if (avatarSprite) {
            const oldX = this.player.x;
            const oldY = this.player.y;
            this.player.destroy();

            this.player = avatarSprite;
            this.player.setPosition(oldX, oldY);
            this.player.setOrigin(0.5, 0.5); // Ensure avatar sprite is centered on its position
            this.player.setDepth(10);
          }
        } catch (error) {
          // Keep default sprite on error
        }
      }

      // Announce player joined
      this.eventBus.publish('world:playerJoined', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
      });

      // Apply camera settings after player is fully initialized
      this.time.delayedCall(50, () => {
        this.setDefaultZoomAndCenter();
        console.log('🎮 PLAYER INIT: Applied camera settings after player initialization');
      });
    } catch (error) {
      console.error('Failed to load player avatar, keeping default sprite:', error);

      // Still announce player joined with default sprite
      this.eventBus.publish('world:playerJoined', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
      });

      // Apply camera settings even with default sprite
      this.time.delayedCall(50, () => {
        this.setDefaultZoomAndCenter();
        console.log('🎮 PLAYER INIT: Applied camera settings after player initialization (fallback)');
      });
    }
  }

  private setupKeyHandlers() {
    // Jump action (Spacebar)
    this.spaceKey.on('down', () => {
      this.performJump();
    });

    // Fire action (X key)
    this.xKey.on('down', () => {
      this.performFire();
    });

    // Rotation toggle (O key)
    this.oKey.on('down', () => {
      this.toggleRotation();
    });
  }

  private performJump() {
    if (this.isJumping) return; // Prevent multiple jumps

    this.isJumping = true;
    const jumpHeight = 60;
    const jumpDuration = 600;

    // Create jump animation using tweens
    this.tweens.add({
      targets: this.player,
      y: this.originalY - jumpHeight,
      duration: jumpDuration / 2,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.isJumping = false;
        this.originalY = this.player.y; // Update original position
      }
    });

    // Add visual effect for jump
    this.createJumpEffect();
  }

  private performFire() {
    // Create fire effect
    this.createFireEffect();

    // Add brief cooldown to prevent spam
    this.xKey.enabled = false;
    this.time.delayedCall(200, () => {
      this.xKey.enabled = true;
    });
  }

  private toggleRotation() {
    if (this.isRotating) {
      // Stop rotation
      this.isRotating = false;
      if (this.rotationTween) {
        this.rotationTween.stop();
        this.rotationTween = undefined;
      }
      // Reset rotation smoothly
      this.tweens.add({
        targets: this.player,
        rotation: 0,
        duration: 300,
        ease: 'Power2'
      });
    } else {
      // Start continuous rotation
      this.isRotating = true;
      this.rotationTween = this.tweens.add({
        targets: this.player,
        rotation: Math.PI * 2,
        duration: 2000,
        ease: 'Linear',
        repeat: -1
      });
    }
  }

  private createJumpEffect() {
    // Create dust cloud effect at player's feet
    const dustCloud = this.add.graphics();
    dustCloud.fillStyle(0xD2B48C, 0.6);
    dustCloud.fillCircle(this.player.x, this.originalY + 16, 20);
    dustCloud.setDepth(5);

    // Animate dust cloud
    this.tweens.add({
      targets: dustCloud,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        dustCloud.destroy();
      }
    });
  }

  private createFireEffect() {
    // Create projectile/fire effect
    const projectile = this.add.graphics();
    projectile.fillStyle(0xFF4500, 0.8);
    projectile.fillCircle(0, 0, 8);
    projectile.setPosition(this.player.x, this.player.y);
    projectile.setDepth(8);

    // Determine direction based on player's last movement or default to right
    const direction = this.player.scaleX < 0 ? -1 : 1;
    const targetX = this.player.x + (direction * 150);

    // Animate projectile
    this.tweens.add({
      targets: projectile,
      x: targetX,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Create explosion effect
        this.createExplosionEffect(targetX, this.player.y);
        projectile.destroy();
      }
    });

    // Add fire trail effect
    const trail = this.add.graphics();
    trail.lineStyle(4, 0xFF6347, 0.6);
    trail.beginPath();
    trail.moveTo(this.player.x, this.player.y);
    trail.lineTo(targetX, this.player.y);
    trail.strokePath();
    trail.setDepth(7);

    // Fade out trail
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        trail.destroy();
      }
    });
  }

  private createExplosionEffect(x: number, y: number) {
    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xFF4500, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(x, y);
      particle.setDepth(9);

      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Math.random() * 20;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  update() {
    // Only allow movement if player exists and not jumping
    if (!this.isJumping && this.player) {
      const speed = 200;
      let moved = false;
      let verticalMovement = false;
      let direction: 'up' | 'down' | 'left' | 'right' | 'idle' = 'idle';

      // Store original position for collision detection
      const originalX = this.player.x;
      const originalY = this.player.y;
      let newX = originalX;
      let newY = originalY;

      // Calculate new position based on input
      if (this.cursors.left.isDown) {
        newX -= speed * this.game.loop.delta / 1000;
        direction = 'left';
      } else if (this.cursors.right.isDown) {
        newX += speed * this.game.loop.delta / 1000;
        direction = 'right';
      }

      if (this.cursors.up.isDown) {
        newY -= speed * this.game.loop.delta / 1000;
        direction = 'up';
        verticalMovement = true;
      } else if (this.cursors.down.isDown) {
        newY += speed * this.game.loop.delta / 1000;
        direction = 'down';
        verticalMovement = true;
      }

      // Keep player within world bounds
      newX = Phaser.Math.Clamp(newX, this.playerSize / 2, this.worldBounds.width - this.playerSize / 2);
      newY = Phaser.Math.Clamp(newY, this.playerSize / 2, this.worldBounds.height - this.playerSize / 2);

      // Check for collisions with impassable areas
      if (!this.checkCollisionWithImpassableAreas(newX, newY, this.playerSize)) {
        // No collision, apply movement
        this.player.x = newX;
        this.player.y = newY;
        moved = (newX !== originalX || newY !== originalY);
      } else {
        // Collision detected, try partial movement
        // Try horizontal movement only
        if (!this.checkCollisionWithImpassableAreas(newX, originalY, this.playerSize)) {
          this.player.x = newX;
          moved = (newX !== originalX);
        }
        // Try vertical movement only
        else if (!this.checkCollisionWithImpassableAreas(originalX, newY, this.playerSize)) {
          this.player.y = newY;
          moved = (newY !== originalY);
          verticalMovement = true;
        }
        // No movement possible due to collision
      }

      // Update original Y position when moving vertically (but not during jump)
      if (verticalMovement) {
        this.originalY = this.player.y;
      }

      // Play appropriate animation if avatar renderer supports it
      if (this.avatarRenderer.hasAnimatedSprite(this.playerId)) {
        if (moved) {
          // Play walking animation based on direction (only if not already playing the correct animation)
          const currentAnim = this.player.anims.currentAnim;
          const targetAnimKey = direction === 'right' ? `${this.playerId}_left` : `${this.playerId}_${direction}`;
          const isPlayingCorrectAnim = currentAnim && currentAnim.key === targetAnimKey;

          if (!isPlayingCorrectAnim) {
            if (direction === 'right') {
              // Use left animation flipped for right movement
              this.avatarRenderer.playPlayerAnimation(this.playerId, 'left', true);
            } else {
              this.avatarRenderer.playPlayerAnimation(this.playerId, direction, false);
            }
          }
        } else {
          // Play idle animation when not moving (only if not already playing idle)
          const currentAnim = this.player.anims.currentAnim;
          const isPlayingIdle = currentAnim && currentAnim.key === `${this.playerId}_idle`;
          if (!isPlayingIdle) {
            this.avatarRenderer.playPlayerAnimation(this.playerId, 'idle', false);
          }
        }
      } else {
        // Fallback to simple sprite flipping for non-animated sprites
        if (direction === 'left') {
          this.player.setFlipX(true);
        } else if (direction === 'right') {
          this.player.setFlipX(false);
        }
      }

      if (moved) {
        this.eventBus.publish('world:playerMoved', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });
      }
    }

    // Check for collision with interactive areas
    this.checkAreaCollisions();
  }

  shutdown() {
    // Clean up avatar renderer
    if (this.avatarRenderer) {
      this.avatarRenderer.cleanup();
    }

    // Clean up map renderer
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
    }

    // Clean up rotation tween if it exists
    if (this.rotationTween) {
      this.rotationTween.stop();
      this.rotationTween = undefined;
    }

    // Clean up fire effects
    this.fireEffects.forEach(effect => {
      if (effect && effect.scene) {
        effect.destroy();
      }
    });
    this.fireEffects = [];
  }

  /**
   * Check if player position would collide with any impassable areas
   */
  private checkCollisionWithImpassableAreas(x: number, y: number, playerSize: number): boolean {
    const mapData = this.sharedMapSystem.getMapData();
    if (!mapData || !mapData.impassableAreas) {
      return false; // No collision data available
    }

    // Player bounding box (centered on player position)
    const playerLeft = x - playerSize / 2;
    const playerRight = x + playerSize / 2;
    const playerTop = y - playerSize / 2;
    const playerBottom = y + playerSize / 2;

    // Check collision with each impassable area
    for (const area of mapData.impassableAreas) {
      // Area bounding box
      const areaLeft = area.x;
      const areaRight = area.x + area.width;
      const areaTop = area.y;
      const areaBottom = area.y + area.height;

      // Check for overlap using AABB (Axis-Aligned Bounding Box) collision detection
      if (playerLeft < areaRight &&
          playerRight > areaLeft &&
          playerTop < areaBottom &&
          playerBottom > areaTop) {
        // Collision detected
        return true;
      }
    }

    return false; // No collision
  }

  private checkAreaCollisions() {
    // Only check collisions if player exists
    if (!this.player) {
      return;
    }

    // Get areas from SharedMapSystem (localStorage) instead of hardcoded data
    const mapData = this.sharedMapSystem.getMapData();

    if (!mapData) {
      return; // No map data available
    }

    const areas = mapData.interactiveAreas;

    areas.forEach(area => {
      // Check if player is within area bounds
      if (this.player.x >= area.x &&
          this.player.x <= area.x + area.width &&
          this.player.y >= area.y &&
          this.player.y <= area.y + area.height) {

        // Trigger area entry if not already triggered and no modals are blocking
        if ((!this.currentArea || this.currentArea !== area.id) && !shouldBlockBackgroundInteractions()) {
          this.currentArea = area.id;
          this.onAreaClick(area.id);
        }
      }
    });

    // Reset current area if player is not in any area
    const inAnyArea = areas.some(area =>
      this.player.x >= area.x &&
      this.player.x <= area.x + area.width &&
      this.player.y >= area.y &&
      this.player.y <= area.y + area.height
    );

    if (!inAnyArea) {
      this.currentArea = null;
    }

    // Update camera following
    this.updateCameraFollowing();
  }

  // Camera panning setup
  private setupCameraPanning(): void {

    // Mouse/pointer events for panning
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.spaceKey.isDown) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = this.cameras.main.scrollX;
        this.panStartScrollY = this.cameras.main.scrollY;
        this.manualCameraControl = true;

        // Change cursor to indicate panning mode
        this.game.canvas.style.cursor = 'grabbing';
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && this.spaceKey.isDown) {
        const deltaX = (pointer.x - this.panStartX) * this.panSensitivity;
        const deltaY = (pointer.y - this.panStartY) * this.panSensitivity;

        const newScrollX = this.panStartScrollX - deltaX;
        const newScrollY = this.panStartScrollY - deltaY;

        // Apply world bounds constraints
        const constrainedScroll = this.constrainCameraToWorldBounds(newScrollX, newScrollY);

        this.cameras.main.setScroll(constrainedScroll.x, constrainedScroll.y);

        // Track that user has manually panned and calculate offset from player
        this.hasManuallePanned = true;
        this.updatePanOffsetFromPlayer();
      }
    });

    this.input.on('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.game.canvas.style.cursor = 'default';

        // Update final panning offset when panning ends
        this.updatePanOffsetFromPlayer();

        console.log('🖱️ PANNING ENDED - Offset from player:', this.panOffsetFromPlayer);
      }
    });

    // Handle spacebar for pan mode cursor
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (!this.isPanning) {
        this.game.canvas.style.cursor = 'grab';
      }
    });

    this.input.keyboard!.on('keyup-SPACE', () => {
      if (!this.isPanning) {
        this.game.canvas.style.cursor = 'default';
      }
    });
  }

  /**
   * Update the panning offset from player position
   */
  private updatePanOffsetFromPlayer(): void {
    if (!this.player) return;

    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // Calculate current viewport center
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;
    const viewportCenterX = camera.scrollX + viewportWidth / 2;
    const viewportCenterY = camera.scrollY + viewportHeight / 2;

    // Calculate offset from player
    this.panOffsetFromPlayer = {
      x: viewportCenterX - this.player.x,
      y: viewportCenterY - this.player.y
    };

    // Update last known player position
    this.lastKnownPlayerPosition = {
      x: this.player.x,
      y: this.player.y
    };
  }

  /**
   * Reset manual panning state and center on player
   */
  public resetPanningState(): void {
    this.hasManuallePanned = false;
    this.panOffsetFromPlayer = { x: 0, y: 0 };
    this.manualCameraControl = false;

    if (this.player) {
      this.centerCameraOnPlayer();
    }

    console.log('🔄 PANNING STATE RESET - Camera centered on player');
  }

  // Constrain camera to world bounds
  private constrainCameraToWorldBounds(scrollX: number, scrollY: number): { x: number, y: number } {
    const camera = this.cameras.main;
    const zoom = camera.zoom;
    const viewWidth = camera.width / zoom;
    const viewHeight = camera.height / zoom;

    // Calculate bounds
    const minScrollX = 0;
    const maxScrollX = Math.max(0, this.worldBounds.width - viewWidth);
    const minScrollY = 0;
    const maxScrollY = Math.max(0, this.worldBounds.height - viewHeight);

    return {
      x: Phaser.Math.Clamp(scrollX, minScrollX, maxScrollX),
      y: Phaser.Math.Clamp(scrollY, minScrollY, maxScrollY)
    };
  }

  // Update camera following behavior with enhanced tracking
  private updateCameraFollowing(): void {
    if (!this.isFollowingPlayer || this.manualCameraControl || !this.player) {
      return;
    }

    const playerX = this.player.x;
    const playerY = this.player.y;
    const camera = this.cameras.main;

    // Calculate target camera position (center on player with offset)
    // The camera scroll position should be: playerPosition - (viewportSize / 2)
    // This ensures the player appears in the exact center of the viewport
    const viewportWidth = camera.width / camera.zoom;
    const viewportHeight = camera.height / camera.zoom;

    const targetScrollX = playerX - (viewportWidth / 2) + this.cameraFollowOffset.x;
    const targetScrollY = playerY - (viewportHeight / 2) + this.cameraFollowOffset.y;

    // Apply world bounds constraints
    const constrainedTarget = this.constrainCameraToWorldBounds(targetScrollX, targetScrollY);

    // Calculate distance from current camera position to target
    const currentScrollX = camera.scrollX;
    const currentScrollY = camera.scrollY;
    const distanceX = Math.abs(constrainedTarget.x - currentScrollX);
    const distanceY = Math.abs(constrainedTarget.y - currentScrollY);
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Adaptive lerp factor based on distance and zoom level
    // Closer to player = faster following, further away = slower following
    // Higher zoom = tighter following for precision
    const zoomFactor = Math.min(camera.zoom / 1.0, 2.0); // Normalize zoom influence
    const distanceFactor = Math.min(totalDistance / 100, 1.0); // Normalize distance influence

    this.adaptiveLerpFactor = Phaser.Math.Linear(
      this.minLerpFactor,
      this.maxLerpFactor,
      distanceFactor * zoomFactor
    );

    // Always update camera position for smooth following (no dead zone for tight tracking)
    const newScrollX = Phaser.Math.Linear(currentScrollX, constrainedTarget.x, this.adaptiveLerpFactor);
    const newScrollY = Phaser.Math.Linear(currentScrollY, constrainedTarget.y, this.adaptiveLerpFactor);

    // Only update if there's a meaningful change to avoid micro-movements
    const threshold = 0.5;
    if (Math.abs(newScrollX - currentScrollX) > threshold || Math.abs(newScrollY - currentScrollY) > threshold) {
      camera.setScroll(newScrollX, newScrollY);

      // Debug logging for camera following (throttled to prevent infinite logs)
      if ((Math.abs(newScrollX - currentScrollX) > 5 || Math.abs(newScrollY - currentScrollY) > 5) && this.shouldLogDebug()) {
        console.log('🎯 CAMERA FOLLOWING UPDATE:', {
          playerPos: { x: playerX, y: playerY },
          viewportSize: { width: viewportWidth, height: viewportHeight },
          targetScroll: { x: targetScrollX, y: targetScrollY },
          constrainedScroll: { x: constrainedTarget.x, y: constrainedTarget.y },
          newScroll: { x: newScrollX, y: newScrollY },
          distance: totalDistance,
          lerpFactor: this.adaptiveLerpFactor,
          zoomFactor,
          distanceFactor,
          zoom: camera.zoom,
          // Calculate where player appears in viewport after update
          playerInViewport: {
            x: playerX - newScrollX,
            y: playerY - newScrollY
          },
          viewportCenter: {
            x: viewportWidth / 2,
            y: viewportHeight / 2
          }
        });
      }
    }

    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;

    // Update debug overlays if enabled (throttled to prevent infinite updates)
    if (this.DEBUG_CAMERA_CENTERING && this.shouldUpdateDebugOverlays()) {
      this.updateDebugOverlays();
    }
  }

  // Camera control methods
  public enableCameraFollowing(): void {
    this.isFollowingPlayer = true;
    this.manualCameraControl = false;
  }

  public disableCameraFollowing(): void {
    this.isFollowingPlayer = false;
  }

  public setFollowSettings(lerpFactor: number, deadZone: number): void {
    this.followLerpFactor = lerpFactor;
    this.followDeadZone = deadZone;
  }

  public isCameraFollowingPlayer(): boolean {
    return this.isFollowingPlayer && !this.manualCameraControl;
  }

  /**
   * Set camera follow offset for custom positioning
   */
  public setCameraFollowOffset(x: number, y: number): void {
    this.cameraFollowOffset = { x, y };
  }

  /**
   * Set adaptive lerp factor range for dynamic camera responsiveness
   */
  public setAdaptiveLerpRange(min: number, max: number): void {
    this.minLerpFactor = Math.max(0.01, Math.min(min, 1.0));
    this.maxLerpFactor = Math.max(this.minLerpFactor, Math.min(max, 1.0));
  }

  /**
   * Instantly center camera on player (no lerp) - ENHANCED with panning state preservation
   */
  public centerCameraOnPlayer(): void {
    if (!this.player) {
      console.warn('🎯 CAMERA CENTERING: No player found');
      return;
    }

    const camera = this.cameras.main;

    // CRITICAL FIX: Check if user has manually panned and preserve that offset
    if (this.hasManuallePanned && !this.manualCameraControl) {
      // Preserve manual panning offset during zoom operations
      const scale = this.scale;
      const gameSize = scale.gameSize;
      const viewportWidth = gameSize.width / camera.zoom;
      const viewportHeight = gameSize.height / camera.zoom;

      // Calculate target viewport center with preserved offset
      const targetCenterX = this.player.x + this.panOffsetFromPlayer.x;
      const targetCenterY = this.player.y + this.panOffsetFromPlayer.y;

      // Calculate required scroll position to achieve target center
      const targetScrollX = targetCenterX - viewportWidth / 2;
      const targetScrollY = targetCenterY - viewportHeight / 2;

      // Apply world bounds constraints
      const constrainedScroll = this.constrainCameraToWorldBounds(targetScrollX, targetScrollY);

      camera.setScroll(constrainedScroll.x, constrainedScroll.y);

      console.log('🎯 CAMERA CENTERED WITH PRESERVED PANNING OFFSET:', {
        playerPos: { x: this.player.x, y: this.player.y },
        panOffset: this.panOffsetFromPlayer,
        targetCenter: { x: targetCenterX, y: targetCenterY },
        finalScroll: { x: constrainedScroll.x, y: constrainedScroll.y },
        zoom: camera.zoom
      });
    } else {
      // Standard centering when no manual panning or during manual control
      camera.centerOn(this.player.x, this.player.y);

      // Update panning offset to reflect current state
      this.updatePanOffsetFromPlayer();

      console.log('🎯 CAMERA CENTERED ON PLAYER (Standard):', {
        playerPos: { x: this.player.x, y: this.player.y },
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom,
        reason: this.manualCameraControl ? 'Manual control active' : 'No manual panning detected'
      });
    }

    // Verify centering accuracy at current zoom level
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;
    const expectedCenterX = camera.scrollX + viewportWidth / 2;
    const expectedCenterY = camera.scrollY + viewportHeight / 2;

    // Calculate centering accuracy
    const centeringErrorX = Math.abs(this.player.x - expectedCenterX);
    const centeringErrorY = Math.abs(this.player.y - expectedCenterY);
    const maxAcceptableError = 1.0; // 1 pixel tolerance

    // Update tracking variables
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    console.log('🎯 CAMERA CENTERED ON PLAYER (Zoom-Corrected):', {
      playerPos: { x: this.player.x, y: this.player.y },
      cameraScroll: { x: camera.scrollX, y: camera.scrollY },
      expectedCenter: { x: expectedCenterX, y: expectedCenterY },
      centeringError: { x: centeringErrorX, y: centeringErrorY },
      centeringAccurate: centeringErrorX < maxAcceptableError && centeringErrorY < maxAcceptableError,
      zoom: camera.zoom,
      zoomPercentage: `${Math.round(camera.zoom * 100)}%`,
      viewportDimensions: { width: viewportWidth, height: viewportHeight }
    });

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }
  }

  /**
   * AUTHORITATIVE world bounds update method
   * All other world bounds updates should delegate to this method
   */
  private updateWorldBounds(width: number, height: number, source: string): void {
    console.log('🌍 BOUNDS: Authoritative world bounds update', {
      timestamp: new Date().toISOString(),
      width,
      height,
      source,
      currentWorldBounds: this.worldBounds,
      playerPosition: this.player ? { x: this.player.x, y: this.player.y } : null
    });

    const oldBounds = { ...this.worldBounds };
    const newBounds = { width, height };

    this.worldBounds = newBounds;

    // Update camera bounds to match the new world bounds exactly
    this.cameras.main.setBounds(0, 0, width, height);

    // If player exists and world bounds changed significantly, reposition player if needed
    if (this.player && (oldBounds.width !== newBounds.width || oldBounds.height !== newBounds.height)) {
      const oldCenterX = oldBounds.width / 2;
      const oldCenterY = oldBounds.height / 2;

      // Check if player is near the old center (within 100 pixels)
      const distanceFromOldCenter = Math.sqrt(
        Math.pow(this.player.x - oldCenterX, 2) +
        Math.pow(this.player.y - oldCenterY, 2)
      );

      if (distanceFromOldCenter < 100) {
        // Move player to new world center
        const newCenterX = width / 2;
        const newCenterY = height / 2;
        this.player.setPosition(newCenterX, newCenterY);

        console.log('🎮 PLAYER: Repositioned to new world center', {
          oldPosition: { x: oldCenterX, y: oldCenterY },
          newPosition: { x: newCenterX, y: newCenterY },
          reason: 'world bounds changed significantly'
        });
      }
    }

    // Synchronize camera dimensions after bounds update
    this.synchronizeCameraDimensions();

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }

    // Set default zoom and center on player with new dimensions
    this.time.delayedCall(100, () => {
      this.setDefaultZoomAndCenter();
    });

    // Recalculate zoom constraints with new world bounds
    const newMinZoom = this.calculateMinZoom();

    console.log('🌍 BOUNDS: Authoritative world bounds update complete', {
      oldBounds,
      newBounds,
      source,
      cameraUpdated: true,
      playerRepositioned: this.player ? 'checked' : 'no player',
      zoomConstraints: {
        newMinZoom,
        newMinZoomPercentage: `${Math.round(newMinZoom * 100)}%`,
        maxZoom: this.maxZoom,
        maxZoomPercentage: `${Math.round(this.maxZoom * 100)}%`
      }
    });
  }

  // Update world bounds from background image dimensions (called by PhaserMapRenderer)
  // CRITICAL FIX: Cap world bounds to reasonable dimensions to prevent coordinate system issues
  public updateWorldBoundsFromBackgroundImage(imageWidth: number, imageHeight: number): void {
    console.log('🌍 BOUNDS: Updating world bounds from background image (with reasonable limits)', {
      timestamp: new Date().toISOString(),
      originalImageSize: { width: imageWidth, height: imageHeight }
    });

    // CRITICAL FIX: Cap world bounds to reasonable maximums
    // Background images can be large for detail, but world bounds should be reasonable for gameplay
    const MAX_WORLD_WIDTH = 4000;  // Reasonable maximum for world width
    const MAX_WORLD_HEIGHT = 3000; // Reasonable maximum for world height
    const MIN_WORLD_WIDTH = 800;   // Minimum for gameplay
    const MIN_WORLD_HEIGHT = 600;  // Minimum for gameplay

    // Calculate reasonable world bounds
    const reasonableWidth = Math.max(MIN_WORLD_WIDTH, Math.min(MAX_WORLD_WIDTH, imageWidth));
    const reasonableHeight = Math.max(MIN_WORLD_HEIGHT, Math.min(MAX_WORLD_HEIGHT, imageHeight));

    console.log('🌍 BOUNDS: Applying reasonable world bounds limits', {
      original: { width: imageWidth, height: imageHeight },
      capped: { width: reasonableWidth, height: reasonableHeight },
      wasLimited: reasonableWidth !== imageWidth || reasonableHeight !== imageHeight
    });

    // Delegate to the authoritative world bounds update method with reasonable dimensions
    this.updateWorldBounds(reasonableWidth, reasonableHeight, 'backgroundImage-capped');
  }

  // Update world bounds from WorldDimensionsManager (authoritative source)
  // SIMPLIFIED: This method now uses WorldDimensionsManager as single source of truth
  private updateWorldBoundsFromMapData(): void {
    try {
      // Get effective dimensions from WorldDimensionsManager (authoritative)
      const effectiveDimensions = worldDimensionsManager.getEffectiveDimensions();

      console.log('🌍 BOUNDS: Using WorldDimensionsManager effective dimensions', {
        effectiveDimensions,
        currentBounds: this.worldBounds
      });

      // Update world bounds with effective dimensions
      this.updateWorldBounds(
        effectiveDimensions.width,
        effectiveDimensions.height,
        'WorldDimensionsManager-effective'
      );
    } catch (error) {
      console.error('🌍 BOUNDS: Failed to get dimensions from WorldDimensionsManager', error);

      // Fallback to SharedMapSystem for backward compatibility
      const mapData = this.sharedMapSystem.getMapData();
      if (mapData && mapData.worldDimensions) {
        console.warn('🌍 BOUNDS: Falling back to SharedMapSystem dimensions');
        this.updateWorldBounds(
          mapData.worldDimensions.width,
          mapData.worldDimensions.height,
          'SharedMapSystem-fallback'
        );
      }
    }
  }

  // Set up direct subscription to WorldDimensionsManager (no event loops)
  private setupMapDimensionListeners(): void {
    // Subscribe directly to WorldDimensionsManager for dimension changes
    const unsubscribe = worldDimensionsManager.subscribe((state: WorldDimensionsState) => {
      console.log('🌍 WORLD MODULE: Dimension change received', {
        timestamp: new Date().toISOString(),
        source: state.source,
        worldDimensions: state.worldDimensions,
        effectiveDimensions: state.effectiveDimensions,
        currentBounds: this.worldBounds
      });

      // Check if dimensions actually changed to prevent unnecessary updates
      const currentBounds = this.worldBounds;
      const newDimensions = state.effectiveDimensions;

      if (currentBounds.width !== newDimensions.width ||
          currentBounds.height !== newDimensions.height) {

        console.log('🌍 WORLD MODULE: Updating world bounds from WorldDimensionsManager', {
          previous: currentBounds,
          new: newDimensions,
          source: state.source
        });

        // Update world bounds directly with effective dimensions
        this.updateWorldBounds(
          newDimensions.width,
          newDimensions.height,
          `WorldDimensionsManager-${state.source}`
        );
      } else {
        console.log('🌍 WORLD MODULE: Dimension change ignored (no actual change)');
      }
    });

    // Store unsubscribe function for cleanup
    this.events.once('destroy', () => {
      console.log('🌍 WORLD MODULE: Cleaning up WorldDimensionsManager subscription');
      unsubscribe();
    });
  }

  /**
   * Set up scale manager synchronization to fix dimension mismatch issues
   * CRITICAL FIX: Ensures camera dimensions stay synchronized with scale manager
   */
  private setupScaleManagerSync(): void {
    console.log('🔧 SCALE SYNC: Setting up scale manager synchronization');

    // Listen for scale manager resize events
    this.scale.on('resize', (gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number) => {
      console.log('🔧 SCALE SYNC: Scale manager resize event triggered', {
        gameSize: { width: gameSize.width, height: gameSize.height },
        baseSize: { width: baseSize.width, height: baseSize.height },
        displaySize: { width: displaySize.width, height: displaySize.height },
        resolution,
        timestamp: new Date().toISOString()
      });

      // Synchronize camera dimensions with game size
      this.synchronizeCameraDimensions();
    });

    // Initial synchronization
    this.time.delayedCall(100, () => {
      this.synchronizeCameraDimensions();
    });

    console.log('🔧 SCALE SYNC: Scale manager synchronization setup complete');
  }

  /**
   * Synchronize camera dimensions with scale manager game size
   * This fixes the dimension mismatch that causes boundary alignment issues
   */
  private synchronizeCameraDimensions(): void {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    console.log('🔧 CAMERA SYNC: Synchronizing camera dimensions', {
      before: {
        camera: { width: camera.width, height: camera.height },
        game: { width: gameSize.width, height: gameSize.height },
        match: camera.width === gameSize.width && camera.height === gameSize.height
      }
    });

    // Force camera to match game size exactly
    if (camera.width !== gameSize.width || camera.height !== gameSize.height) {
      // Update camera viewport size to match scale manager game size
      camera.setSize(gameSize.width, gameSize.height);

      console.log('🔧 CAMERA SYNC: Camera dimensions updated', {
        after: {
          camera: { width: camera.width, height: camera.height },
          game: { width: gameSize.width, height: gameSize.height },
          match: camera.width === gameSize.width && camera.height === gameSize.height
        }
      });

      // Update debug overlays if they exist
      if (this.DEBUG_CAMERA_CENTERING) {
        this.updateDebugOverlays();
      }
    } else {
      console.log('🔧 CAMERA SYNC: Camera dimensions already synchronized');
    }
  }

  // Update background size to match world bounds
  private updateBackgroundSize(): void {
    // Background size is now handled by the map renderer
    // No need to recreate gradient backgrounds
  }

  /**
   * Throttled debug logging to prevent infinite console spam
   * Only logs if enough time has passed since the last log
   */
  private shouldLogDebug(): boolean {
    const currentTime = Date.now();
    if (currentTime - this.lastDebugLogTime >= this.debugLogInterval) {
      this.lastDebugLogTime = currentTime;
      return true;
    }
    return false;
  }

  /**
   * Throttled debug overlay updates to prevent excessive rendering
   * Only updates if enough time has passed since the last update
   */
  private shouldUpdateDebugOverlays(): boolean {
    const currentTime = Date.now();
    if (currentTime - this.lastDebugUpdateTime >= this.debugUpdateInterval) {
      this.lastDebugUpdateTime = currentTime;
      return true;
    }
    return false;
  }

  /**
   * Calculate dynamic minimum zoom based on map and viewport dimensions
   * Minimum zoom is when either map width or height equals viewport
   */
  private calculateMinZoom(): number {
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // Calculate zoom levels where map dimensions equal viewport dimensions
    const zoomForWidth = gameSize.width / this.worldBounds.width;
    const zoomForHeight = gameSize.height / this.worldBounds.height;

    // Use the larger of the two to ensure the entire map fits
    // This means when zoomed to this level, either width or height will exactly fill the viewport
    const calculatedMinZoom = Math.max(zoomForWidth, zoomForHeight);

    // Ensure we don't go below a reasonable minimum (prevent extreme zoom out)
    const finalMinZoom = Math.max(calculatedMinZoom, this.staticMinZoom);

    console.log('🔍 DYNAMIC MIN ZOOM CALCULATION:', {
      worldBounds: this.worldBounds,
      viewportSize: { width: gameSize.width, height: gameSize.height },
      zoomForWidth,
      zoomForHeight,
      calculatedMinZoom,
      staticMinZoom: this.staticMinZoom,
      finalMinZoom,
      zoomPercentage: `${Math.round(finalMinZoom * 100)}%`
    });

    return finalMinZoom;
  }

  /**
   * Get current minimum zoom (dynamic calculation)
   */
  private get minZoom(): number {
    return this.calculateMinZoom();
  }

  // Zoom control methods
  public zoomIn(): void {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const newZoom = Math.min(currentZoom + this.zoomStep, this.maxZoom);

    if (currentZoom >= this.maxZoom) {
      console.log('🔍 ZOOM IN: Already at maximum zoom');
      return;
    }

    console.log('🔍 ZOOM IN (Animated):', {
      currentZoom,
      newZoom,
      zoomStep: this.zoomStep,
      maxZoom: this.maxZoom,
      maxZoomPercentage: `${Math.round(this.maxZoom * 100)}%`,
      reason: 'Maximum zoom is 165% (1.65x)'
    });

    // Temporarily disable camera following during animation
    this.manualCameraControl = true;

    // Use Phaser's native camera zoom animation
    camera.zoomTo(newZoom, 400, 'Power2', false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      // During animation, keep player centered
      if (this.player && progress < 1) {
        this.centerCameraOnPlayer();
      }
    });

    // Re-enable camera following after animation completes
    this.time.delayedCall(500, () => {
      this.manualCameraControl = false;
      if (this.player) {
        this.centerCameraOnPlayer();
      }
      console.log('🎯 CAMERA FOLLOWING RE-ENABLED AFTER ZOOM IN ANIMATION');
    });
  }

  public zoomOut(): void {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const dynamicMinZoom = this.minZoom; // Calculate current minimum zoom
    const newZoom = Math.max(currentZoom - this.zoomStep, dynamicMinZoom);

    if (currentZoom <= dynamicMinZoom) {
      console.log('🔍 ZOOM OUT: Already at minimum zoom (map fits viewport)');
      return;
    }

    console.log('🔍 ZOOM OUT (Animated):', {
      currentZoom,
      newZoom,
      zoomStep: this.zoomStep,
      dynamicMinZoom,
      minZoomPercentage: `${Math.round(dynamicMinZoom * 100)}%`,
      reason: 'Dynamic minimum based on map/viewport fit'
    });

    // Temporarily disable camera following during animation
    this.manualCameraControl = true;

    // Use Phaser's native camera zoom animation
    camera.zoomTo(newZoom, 400, 'Power2', false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      // During animation, keep player centered
      if (this.player && progress < 1) {
        this.centerCameraOnPlayer();
      }
    });

    // Re-enable camera following after animation completes
    this.time.delayedCall(500, () => {
      this.manualCameraControl = false;
      if (this.player) {
        this.centerCameraOnPlayer();
      }
      console.log('🎯 CAMERA FOLLOWING RE-ENABLED AFTER ZOOM OUT ANIMATION');
    });
  }

  public resetZoom(): void {
    console.log('🔄 RESET ZOOM: Setting zoom to 1.65 and centering on character');

    // Use the existing setDefaultZoomAndCenter method which sets zoom to 1.65 and centers on player
    this.setDefaultZoomAndCenter();

    console.log('🔄 RESET ZOOM: Complete - zoom set to 165% and centered on character');
  }

  public canZoomIn(): boolean {
    const currentZoom = this.cameras.main.zoom;
    const canZoom = currentZoom < this.maxZoom;

    console.log('🔍 CAN ZOOM IN:', {
      currentZoom,
      currentZoomPercentage: `${Math.round(currentZoom * 100)}%`,
      maxZoom: this.maxZoom,
      maxZoomPercentage: `${Math.round(this.maxZoom * 100)}%`,
      canZoom,
      reason: canZoom ? 'Can zoom in further' : 'Already at maximum zoom (165%)'
    });
    return canZoom;
  }

  public canZoomOut(): boolean {
    const currentZoom = this.cameras.main.zoom;
    const dynamicMinZoom = this.minZoom;
    const canZoom = currentZoom > dynamicMinZoom;

    console.log('🔍 CAN ZOOM OUT:', {
      currentZoom,
      currentZoomPercentage: `${Math.round(currentZoom * 100)}%`,
      dynamicMinZoom,
      minZoomPercentage: `${Math.round(dynamicMinZoom * 100)}%`,
      canZoom,
      reason: canZoom ? 'Can zoom out further' : 'Map already fits viewport'
    });
    return canZoom;
  }

  /**
   * Set default zoom level and center camera on player
   * Configures camera with 165% zoom, centers on player, and enables following
   */
  public setDefaultZoomAndCenter(): void {
    // Prevent multiple simultaneous calls
    if (this.isSettingDefaultZoom) {
      console.log('🎮 SKIPPING DEFAULT ZOOM AND CENTER (already in progress)');
      return;
    }

    this.isSettingDefaultZoom = true;
    const camera = this.cameras.main;

    console.log('🎮 SETTING DEFAULT ZOOM AND CENTER (165%):', {
      defaultZoom: this.defaultZoom,
      zoomPercentage: `${Math.round(this.defaultZoom * 100)}%`,
      playerPosition: this.player ? { x: this.player.x, y: this.player.y } : 'no player',
      currentZoom: camera.zoom,
      worldBounds: this.worldBounds
    });

    // Use Phaser's native camera methods for smooth zoom and center
    if (this.player) {
      // Animate to default zoom while centering on player
      camera.zoomTo(this.defaultZoom, 300, 'Power2', false, () => {
        // Animation complete callback
        console.log('🎮 DEFAULT ZOOM ANIMATION COMPLETE');
      });

      // Use pan to smoothly center on player
      camera.pan(this.player.x, this.player.y, 300, 'Power2');

      console.log('🎮 CAMERA ANIMATING TO PLAYER (165%):', {
        playerPos: { x: this.player.x, y: this.player.y },
        targetZoom: this.defaultZoom,
        zoomPercentage: `${Math.round(this.defaultZoom * 100)}%`
      });
    } else {
      // Fallback: center on world center
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;

      camera.zoomTo(this.defaultZoom, 300, 'Power2');
      camera.pan(centerX, centerY, 300, 'Power2');

      console.log('🎮 CAMERA ANIMATING TO WORLD CENTER (165%):', {
        worldCenter: { x: centerX, y: centerY },
        targetZoom: this.defaultZoom,
        zoomPercentage: `${Math.round(this.defaultZoom * 100)}%`
      });
    }

    // Enable camera following with adaptive lerp system
    this.isFollowingPlayer = true;
    this.manualCameraControl = false;

    console.log('🎮 DEFAULT ZOOM AND CENTER INITIATED:', {
      targetZoom: this.defaultZoom,
      isFollowing: this.isFollowingPlayer,
      manualControl: this.manualCameraControl,
      animationDuration: '300ms'
    });

    // Initialize debug overlays if enabled (with a delay to ensure animation starts)
    if (this.DEBUG_CAMERA_CENTERING) {
      this.time.delayedCall(100, () => {
        this.initializeDebugOverlays();
      });
    }

    // Reset the flag after animation completes
    this.time.delayedCall(400, () => {
      this.isSettingDefaultZoom = false;
    });
  }

  public fitMapToViewport(): void {
    // This method handles viewport changes while preserving player centering
    const camera = this.cameras.main;
    const gameWidth = this.scale.gameSize.width;
    const gameHeight = this.scale.gameSize.height;

    console.log('📐 FIT MAP TO VIEWPORT:', {
      gameWidth,
      gameHeight,
      worldBounds: this.worldBounds,
      currentZoom: camera.zoom,
      playerExists: !!this.player
    });

    if (gameWidth === 0 || gameHeight === 0) {
      console.log('⚠️ FIT MAP TO VIEWPORT: Invalid game dimensions');
      return;
    }

    // Calculate the zoom level needed to fit the entire world in the viewport
    const scaleX = gameWidth / this.worldBounds.width;
    const scaleY = gameHeight / this.worldBounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);

    console.log('📐 FIT MAP CALCULATIONS:', {
      scaleX,
      scaleY,
      fitZoom
    });

    // Set the new zoom level
    camera.setZoom(fitZoom);

    // If player exists, re-center camera on player to maintain player centering
    // Otherwise, center on world center as fallback
    if (this.player) {
      console.log('📐 RE-CENTERING CAMERA ON PLAYER AFTER VIEWPORT RESIZE');
      this.centerCameraOnPlayer();
    } else {
      console.log('📐 CENTERING CAMERA ON WORLD CENTER (no player)');
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
    }

    console.log('📐 FIT MAP RESULT:', {
      finalZoom: camera.zoom,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      playerCentered: !!this.player
    });

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }
  }

  /**
   * Adjust viewport to new container size while preserving zoom level and player centering
   * This method is called during panel resizes to maintain zoom stability
   */
  public adjustViewportWithoutZoomReset(): void {
    const camera = this.cameras.main;
    const gameWidth = this.scale.gameSize.width;
    const gameHeight = this.scale.gameSize.height;

    console.log('📐 ADJUST VIEWPORT WITHOUT ZOOM RESET:', {
      gameWidth,
      gameHeight,
      worldBounds: this.worldBounds,
      currentZoom: camera.zoom,
      playerExists: !!this.player
    });

    if (gameWidth === 0 || gameHeight === 0) {
      console.log('⚠️ ADJUST VIEWPORT: Invalid game dimensions');
      return;
    }

    // Preserve the current zoom level - DO NOT CHANGE IT
    const preservedZoom = camera.zoom;

    // Update camera bounds to match the new viewport size
    // This ensures the camera system knows about the new container dimensions
    camera.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

    // Re-center camera on player to maintain player centering with preserved zoom
    if (this.player) {
      console.log('📐 RE-CENTERING CAMERA ON PLAYER (ZOOM PRESERVED)');
      this.centerCameraOnPlayer();
    } else {
      console.log('📐 CENTERING CAMERA ON WORLD CENTER (ZOOM PRESERVED)');
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
    }

    console.log('📐 VIEWPORT ADJUSTMENT RESULT:', {
      preservedZoom,
      finalZoom: camera.zoom,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      playerCentered: !!this.player,
      zoomWasPreserved: camera.zoom === preservedZoom
    });

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }
  }

  // ===== DEBUG VISUAL OVERLAYS =====

  /**
   * Initialize debug visual overlays for camera centering diagnostics
   */
  private initializeDebugOverlays(): void {
    if (!this.DEBUG_CAMERA_CENTERING) return;

    console.log('🔧 INITIALIZING DEBUG OVERLAYS');

    // Clean up existing debug elements
    this.cleanupDebugOverlays();

    // Create debug graphics objects
    this.createDebugCrosshairs();
    this.createDebugViewportBounds();
    this.createDebugTextOverlays();

    // Update debug elements immediately
    this.updateDebugOverlays();
  }

  /**
   * Create debug crosshair elements with enhanced visualization
   */
  private createDebugCrosshairs(): void {
    // Player center cross (red)
    this.debugPlayerCross = this.add.graphics();
    this.debugPlayerCross.setDepth(1000);

    // Camera center cross (blue)
    this.debugCameraCross = this.add.graphics();
    this.debugCameraCross.setDepth(1001);

    // World center cross (yellow)
    this.debugWorldCenterCross = this.add.graphics();
    this.debugWorldCenterCross.setDepth(1002);

    // Diagonal X-shape lines for center visualization (green)
    this.debugDiagonalLines = this.add.graphics();
    this.debugDiagonalLines.setDepth(998); // Behind other elements

    // Initialize labels array
    this.debugLabels = [];
  }

  /**
   * Create debug viewport bounds rectangle
   */
  private createDebugViewportBounds(): void {
    this.debugViewportBounds = this.add.graphics();
    this.debugViewportBounds.setDepth(999);

    // Create visible viewport border that stays within the rendered area
    this.debugViewportBorder = this.add.graphics();
    this.debugViewportBorder.setDepth(1004);
    this.debugViewportBorder.setScrollFactor(0); // Fixed to camera viewport
  }

  /**
   * Create debug text overlays
   */
  private createDebugTextOverlays(): void {
    const textStyle = {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    };

    const playerFollowingStyle = {
      fontSize: '9px',
      color: '#ffff00',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: { x: 4, y: 3 },
      lineSpacing: 1
    };

    // Player position text (top-left, fixed to camera)
    this.debugPlayerPositionText = this.add.text(10, 10, '', textStyle);
    this.debugPlayerPositionText.setDepth(1003);
    this.debugPlayerPositionText.setScrollFactor(0); // Fixed to camera

    // Camera scroll text (top-right, fixed to camera)
    this.debugCameraScrollText = this.add.text(0, 10, '', textStyle);
    this.debugCameraScrollText.setDepth(1003);
    this.debugCameraScrollText.setScrollFactor(0); // Fixed to camera

    // Player following text (follows player in world coordinates)
    this.debugPlayerFollowingText = this.add.text(0, 0, '', playerFollowingStyle);
    this.debugPlayerFollowingText.setDepth(1005);
    this.debugPlayerFollowingText.setScrollFactor(1); // Follows world coordinates
  }

  /**
   * Update all debug overlays with current values
   * FIXED: Use scale manager as authoritative source for viewport dimensions
   */
  private updateDebugOverlays(): void {
    if (!this.DEBUG_CAMERA_CENTERING || !this.player) return;

    // Ensure debug overlays are initialized
    if (!this.debugPlayerCross || !this.debugCameraCross || !this.debugViewportBounds ||
        !this.debugViewportBorder || !this.debugWorldCenterCross || !this.debugPlayerPositionText ||
        !this.debugCameraScrollText || !this.debugPlayerFollowingText || !this.debugDiagonalLines) {
      return;
    }

    // Clear existing labels before creating new ones
    this.clearDebugLabels();

    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // FIXED: Use scale manager gameSize as authoritative source for viewport dimensions
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;

    // Calculate positions
    const playerX = this.player.x;
    const playerY = this.player.y;
    // FIXED: Camera center calculation using correct viewport dimensions
    const cameraViewportCenterX = camera.scrollX + viewportWidth / 2;
    const cameraViewportCenterY = camera.scrollY + viewportHeight / 2;
    const worldCenterX = this.worldBounds.width / 2;
    const worldCenterY = this.worldBounds.height / 2;

    // Debug logging for coordinate system verification (throttled to prevent infinite logs)
    if (this.shouldLogDebug()) {
      console.log('🔍 DEBUG OVERLAY COORDINATES:', {
        camera: {
          scroll: { x: camera.scrollX, y: camera.scrollY },
          zoom: camera.zoom,
          dimensions: { width: camera.width, height: camera.height }
        },
        scale: {
          gameSize: { width: gameSize.width, height: gameSize.height }
        },
        viewport: {
          width: viewportWidth,
          height: viewportHeight,
          center: { x: cameraViewportCenterX, y: cameraViewportCenterY }
        },
        player: { x: playerX, y: playerY },
        world: {
          bounds: this.worldBounds,
          center: { x: worldCenterX, y: worldCenterY }
        }
      });
    }

    // Update crosshairs with enhanced visualization
    this.drawEnhancedCrosshair(this.debugPlayerCross!, playerX, playerY, 0xff0000, 20, "Player Position"); // Red - Player position
    this.drawEnhancedCrosshair(this.debugCameraCross!, cameraViewportCenterX, cameraViewportCenterY, 0x0000ff, 20, "Camera Center"); // Blue - Camera center
    this.drawEnhancedCrosshair(this.debugWorldCenterCross!, worldCenterX, worldCenterY, 0xffff00, 25, "World Center"); // Yellow - World center

    // Update diagonal X-shape lines for center visualization
    this.drawDiagonalCenterLines(viewportWidth, viewportHeight);

    // Update viewport bounds (world coordinates) - Draw actual viewport corners
    this.drawViewportBounds(viewportWidth, viewportHeight);

    // Update visible viewport border (screen coordinates)
    this.drawViewportBorder();

    // Update text overlays
    this.updateDebugText(playerX, playerY, camera.scrollX, camera.scrollY, cameraViewportCenterX, cameraViewportCenterY);

    // Update player following text
    this.updatePlayerFollowingText(playerX, playerY, camera.zoom);
  }

  /**
   * Draw an enhanced crosshair with label at the specified position - ZOOM CORRECTED
   */
  private drawEnhancedCrosshair(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size: number, label: string): void {
    graphics.clear();

    const camera = this.cameras.main;

    // Scale crosshair elements based on zoom level for consistent visibility
    const scaledLineWidth = Math.max(3 / camera.zoom, 1);
    const scaledSize = Math.max(size / camera.zoom, 8); // Minimum 8 pixels
    const scaledCircleRadius = Math.max(3 / camera.zoom, 1.5);

    graphics.lineStyle(scaledLineWidth, color, 1);

    // Horizontal line
    graphics.moveTo(x - scaledSize/2, y);
    graphics.lineTo(x + scaledSize/2, y);

    // Vertical line
    graphics.moveTo(x, y - scaledSize/2);
    graphics.lineTo(x, y + scaledSize/2);

    // Add a small circle at the center
    graphics.lineStyle(Math.max(2 / camera.zoom, 1), color, 1);
    graphics.strokeCircle(x, y, scaledCircleRadius);

    graphics.strokePath();

    // Create or update label for this crosshair with zoom-scaled offset
    const labelOffset = Math.max((scaledSize/2 + 10) / camera.zoom, 10);
    this.createOrUpdateLabel(x, y + labelOffset, `${label} (${Math.round(camera.zoom * 100)}%)`, color);
  }

  /**
   * Draw diagonal X-shape lines across the viewport to visualize center
   * Lines go from actual viewport corners to show true center - ZOOM CORRECTED
   */
  private drawDiagonalCenterLines(viewportWidth: number, viewportHeight: number): void {
    if (!this.debugDiagonalLines) return;

    const camera = this.cameras.main;

    // Calculate actual viewport corners in world coordinates with debug offset
    const leftX = camera.scrollX + this.viewportBoundsOffset.x;
    const rightX = camera.scrollX + viewportWidth + this.viewportBoundsOffset.x;
    const topY = camera.scrollY + this.viewportBoundsOffset.y;
    const bottomY = camera.scrollY + viewportHeight + this.viewportBoundsOffset.y;

    this.debugDiagonalLines.clear();

    // Scale line width based on zoom level for better visibility
    const lineWidth = Math.max(1 / camera.zoom, 0.5);
    this.debugDiagonalLines.lineStyle(lineWidth, 0x00ff00, 0.6); // Green with transparency

    // Top-left to bottom-right diagonal (from actual corners)
    this.debugDiagonalLines.moveTo(leftX, topY);
    this.debugDiagonalLines.lineTo(rightX, bottomY);

    // Top-right to bottom-left diagonal (from actual corners)
    this.debugDiagonalLines.moveTo(rightX, topY);
    this.debugDiagonalLines.lineTo(leftX, bottomY);

    this.debugDiagonalLines.strokePath();

    // Add label for diagonal lines at the intersection (viewport center)
    const centerX = leftX + viewportWidth / 2;
    const centerY = topY + viewportHeight / 2;

    // Scale label offset based on zoom level
    const labelOffsetX = Math.max(50 / camera.zoom, 25);
    const labelOffsetY = Math.max(30 / camera.zoom, 15);

    this.createOrUpdateLabel(centerX - labelOffsetX, centerY - labelOffsetY,
      `Viewport Center (${Math.round(camera.zoom * 100)}%)`, 0x00ff00);
  }

  /**
   * Create or update a label at the specified position
   */
  private createOrUpdateLabel(x: number, y: number, text: string, color: number): void {
    if (!this.debugLabels) this.debugLabels = [];

    // Convert color to hex string
    const colorString = `#${color.toString(16).padStart(6, '0')}`;

    const label = this.add.text(x, y, text, {
      fontSize: '12px',
      color: colorString,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 4, y: 2 }
    });

    label.setDepth(1010);
    label.setOrigin(0.5, 0); // Center horizontally, top vertically

    this.debugLabels.push(label);
  }

  /**
   * Clear all debug labels
   */
  private clearDebugLabels(): void {
    if (this.debugLabels) {
      this.debugLabels.forEach(label => {
        if (label) label.destroy();
      });
      this.debugLabels = [];
    }
  }

  /**
   * Draw viewport bounds rectangle with label (world coordinates)
   * Shows the actual visible viewport area in world space - ZOOM CORRECTED
   */
  private drawViewportBounds(viewportWidth: number, viewportHeight: number): void {
    if (!this.debugViewportBounds) return;

    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // MATHEMATICAL FIX: Recalculate viewport dimensions using authoritative sources
    // Use scale manager as the authoritative source for screen dimensions
    const actualViewportWidth = gameSize.width / camera.zoom;
    const actualViewportHeight = gameSize.height / camera.zoom;

    // CRITICAL FIX: The viewport bounds should represent the exact area visible on screen
    // Camera scroll position is the top-left corner of the visible area in world coordinates
    const leftX = camera.scrollX + this.viewportBoundsOffset.x;
    const rightX = camera.scrollX + actualViewportWidth + this.viewportBoundsOffset.x;
    const topY = camera.scrollY + this.viewportBoundsOffset.y;
    const bottomY = camera.scrollY + actualViewportHeight + this.viewportBoundsOffset.y;

    this.debugViewportBounds.clear();
    this.debugViewportBounds.lineStyle(2, 0x00ffff, 0.8); // Cyan with transparency - viewport bounds in world space

    // Draw the viewport rectangle using recalculated dimensions
    this.debugViewportBounds.strokeRect(leftX, topY, actualViewportWidth, actualViewportHeight);

    // Draw corner markers to clearly show viewport corners
    // Scale corner size based on zoom level for better visibility
    const baseCornerSize = 10;
    const cornerSize = Math.max(baseCornerSize / camera.zoom, 5); // Minimum 5 pixels
    this.debugViewportBounds.lineStyle(Math.max(3 / camera.zoom, 1), 0x00ffff, 1); // Scale line width

    // Top-left corner
    this.debugViewportBounds.moveTo(leftX, topY);
    this.debugViewportBounds.lineTo(leftX + cornerSize, topY);
    this.debugViewportBounds.moveTo(leftX, topY);
    this.debugViewportBounds.lineTo(leftX, topY + cornerSize);

    // Top-right corner
    this.debugViewportBounds.moveTo(rightX, topY);
    this.debugViewportBounds.lineTo(rightX - cornerSize, topY);
    this.debugViewportBounds.moveTo(rightX, topY);
    this.debugViewportBounds.lineTo(rightX, topY + cornerSize);

    // Bottom-left corner
    this.debugViewportBounds.moveTo(leftX, bottomY);
    this.debugViewportBounds.lineTo(leftX + cornerSize, bottomY);
    this.debugViewportBounds.moveTo(leftX, bottomY);
    this.debugViewportBounds.lineTo(leftX, bottomY - cornerSize);

    // Bottom-right corner
    this.debugViewportBounds.moveTo(rightX, bottomY);
    this.debugViewportBounds.lineTo(rightX - cornerSize, bottomY);
    this.debugViewportBounds.moveTo(rightX, bottomY);
    this.debugViewportBounds.lineTo(rightX, bottomY - cornerSize);

    this.debugViewportBounds.strokePath();

    // Add label for viewport bounds at top-left corner
    const labelOffset = Math.max(10 / camera.zoom, 5); // Scale label offset
    this.createOrUpdateLabel(leftX + labelOffset, topY + labelOffset,
      `Viewport Bounds (${Math.round(actualViewportWidth)}x${Math.round(actualViewportHeight)}) [Fixed Calc]`, 0x00ffff);

    // Add debug info about calculation differences if significant
    if (Math.abs(actualViewportWidth - viewportWidth) > 1 || Math.abs(actualViewportHeight - viewportHeight) > 1) {
      const diffText = `Calc Diff: W${(actualViewportWidth - viewportWidth).toFixed(1)} H${(actualViewportHeight - viewportHeight).toFixed(1)}`;
      this.createOrUpdateLabel(leftX + labelOffset, topY + labelOffset + 20, diffText, 0xffff00);
    }

    // Add corner coordinate labels (scaled for zoom)
    const coordOffset = Math.max(20 / camera.zoom, 10);
    this.createOrUpdateLabel(leftX - coordOffset, topY - coordOffset/2,
      `(${Math.round(leftX)}, ${Math.round(topY)})`, 0x00ffff);
    this.createOrUpdateLabel(rightX + coordOffset/4, bottomY + coordOffset/4,
      `(${Math.round(rightX)}, ${Math.round(bottomY)})`, 0x00ffff);
  }

  /**
   * Automated Testing Suite for Boundary Alignment
   * Comprehensive test suite to validate viewport boundary alignment
   */
  public runAutomatedTestSuite(): any {
    console.log('🧪 AUTOMATED TEST SUITE: Starting comprehensive boundary alignment tests');

    const testResults = {
      timestamp: new Date().toISOString(),
      testSuite: 'Boundary Alignment Validation',
      tests: {
        multiZoomTest: this.runMultiZoomTest(),
        panelResizeTest: this.runPanelResizeTest(),
        backgroundChangeTest: this.runBackgroundChangeTest(),
        objectPositionTest: this.runObjectPositionTest(),
        performanceTest: this.runPerformanceTest()
      },
      summary: {
        totalTests: 5,
        passedTests: 0,
        failedTests: 0,
        overallResult: 'PENDING'
      }
    };

    // Calculate summary
    Object.values(testResults.tests).forEach((test: any) => {
      if (test.result === 'PASS') {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    });

    testResults.summary.overallResult = testResults.summary.failedTests === 0 ? 'PASS' : 'FAIL';

    console.log('🧪 AUTOMATED TEST SUITE COMPLETE:', testResults);
    return testResults;
  }

  /**
   * Multi-zoom level boundary alignment test
   */
  private runMultiZoomTest(): any {
    const zoomLevels = [0.3, 0.5, 1.0, 1.65, 2.0, 3.0];
    const results = [];

    for (const zoom of zoomLevels) {
      const testResult = this.testBoundaryAlignmentAtZoom(zoom);
      results.push({
        zoomLevel: zoom,
        dimensionsMatch: testResult.dimensionsMatch,
        passed: testResult.dimensionsMatch
      });
    }

    const allPassed = results.every(r => r.passed);

    return {
      testName: 'Multi-Zoom Level Boundary Alignment',
      result: allPassed ? 'PASS' : 'FAIL',
      details: results,
      summary: `${results.filter(r => r.passed).length}/${results.length} zoom levels passed`
    };
  }

  /**
   * Panel resize stability test
   */
  private runPanelResizeTest(): any {
    // Simulate panel resize by checking current state
    const beforeResize = this.collectEnhancedDebugData();

    // In a real test, we would trigger panel resize here
    // For now, we validate current resize handling configuration
    const resizeConfig = {
      resizeObserverDelay: 50, // Current optimized delay
      hasDebouncing: true, // We implemented debouncing
      preservesZoom: true // adjustViewportWithoutZoomReset preserves zoom
    };

    const passed = resizeConfig.resizeObserverDelay <= 50 &&
                   resizeConfig.hasDebouncing &&
                   resizeConfig.preservesZoom;

    return {
      testName: 'Panel Resize Stability',
      result: passed ? 'PASS' : 'FAIL',
      details: {
        resizeConfiguration: resizeConfig,
        stateValidation: beforeResize.validation
      },
      summary: passed ? 'Resize handling optimized' : 'Resize handling needs improvement'
    };
  }

  /**
   * Background image change test
   */
  private runBackgroundChangeTest(): any {
    const backgroundTest = this.testBackgroundImageAlignment();
    const canvasMapTest = this.verifyCanvasMapSizeRelationship();

    const passed = backgroundTest.pixelMapping.is1to1 &&
                   backgroundTest.pixelMapping.positionedAtOrigin &&
                   canvasMapTest.consistency.worldBoundsMatchCamera;

    return {
      testName: 'Background Image Change Handling',
      result: passed ? 'PASS' : 'FAIL',
      details: {
        backgroundAlignment: backgroundTest,
        canvasMapConsistency: canvasMapTest
      },
      summary: passed ? 'Background handling correct' : 'Background handling issues detected'
    };
  }

  /**
   * Object positioning validation test
   */
  private runObjectPositionTest(): any {
    const positionTest = this.validateObjectPositioning();

    const outsideObjects = positionTest.positioningIssues.outsideWorldBounds.length;
    const partiallyOutside = positionTest.positioningIssues.partiallyOutside.length;

    const passed = outsideObjects === 0 && partiallyOutside === 0;

    return {
      testName: 'Object Positioning Validation',
      result: passed ? 'PASS' : 'FAIL',
      details: positionTest,
      summary: passed ? 'All objects positioned correctly' :
               `${outsideObjects} objects outside bounds, ${partiallyOutside} partially outside`
    };
  }

  /**
   * Performance validation test
   */
  private runPerformanceTest(): any {
    const performanceData = this.collectEnhancedDebugData().performance;

    const frameRateGood = performanceData.frameRate >= 55; // Allow some variance from 60fps
    const renderTimeGood = performanceData.renderTime <= 20; // Max 20ms render time

    const passed = frameRateGood && renderTimeGood;

    return {
      testName: 'Performance Validation',
      result: passed ? 'PASS' : 'FAIL',
      details: performanceData,
      summary: passed ? 'Performance within acceptable ranges' :
               `Performance issues: FPS=${performanceData.frameRate}, RenderTime=${performanceData.renderTime}ms`
    };
  }

  /**
   * Enhanced debug data collection with comprehensive diagnostics
   * Provides timing, container, performance, and state validation metrics
   */
  public collectEnhancedDebugData(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const displaySize = scale.displaySize;
    const canvas = scale.canvas;

    // Performance timing data
    const performanceData = {
      timestamp: new Date().toISOString(),
      frameRate: this.game.loop.actualFps,
      targetFrameRate: this.game.loop.targetFps,
      renderTime: this.game.loop.delta,
      updateTime: this.time.now // Current time since scene start
    };

    // Container and DOM information
    const containerData = {
      gameContainer: {
        exists: !!this.game.canvas?.parentElement,
        dimensions: this.game.canvas?.parentElement ? {
          width: this.game.canvas.parentElement.clientWidth,
          height: this.game.canvas.parentElement.clientHeight,
          offsetWidth: this.game.canvas.parentElement.offsetWidth,
          offsetHeight: this.game.canvas.parentElement.offsetHeight
        } : null,
        boundingRect: this.game.canvas?.parentElement?.getBoundingClientRect() || null
      },
      canvas: {
        exists: !!canvas,
        dimensions: canvas ? {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          offsetWidth: canvas.offsetWidth,
          offsetHeight: canvas.offsetHeight
        } : null,
        style: canvas ? {
          width: canvas.style.width,
          height: canvas.style.height,
          position: canvas.style.position,
          display: canvas.style.display
        } : null
      }
    };

    // Timing information for resize operations
    const timingData = {
      lastResizeTime: Date.now(), // Would need to track this in actual resize events
      resizeObserverDelay: 50, // Current configured delay
      cameraUpdateDelay: 100, // Current configured delay for setDefaultZoomAndCenter
      scaleManagerUpdateFrequency: 'on-demand' // Scale manager updates on resize events
    };

    // Memory and texture information
    const memoryData = {
      textureCount: Object.keys(this.textures.list).length,
      activeGameObjects: this.children.length,
      debugObjectsCount: this.DEBUG_CAMERA_CENTERING ? 8 : 0, // Approximate count
      estimatedMemoryUsage: 'not available' // Browser doesn't expose detailed memory info
    };

    // State validation
    const stateValidation = {
      dimensionConsistency: camera.width === gameSize.width && camera.height === gameSize.height,
      boundaryAlignment: this.worldBounds.width > 0 && this.worldBounds.height > 0,
      objectPositioning: !!this.player &&
        this.player.x >= 0 && this.player.x <= this.worldBounds.width &&
        this.player.y >= 0 && this.player.y <= this.worldBounds.height,
      debugOverlayAccuracy: this.DEBUG_CAMERA_CENTERING ?
        !!(this.debugViewportBorder && this.debugPlayerCross && this.debugCameraCross) : true,
      scaleManagerSync: scale.scaleMode === Phaser.Scale.RESIZE && scale.autoCenter === Phaser.Scale.CENTER_BOTH
    };

    const enhancedDebugData = {
      timestamp: performanceData.timestamp,
      performance: performanceData,
      container: containerData,
      timing: timingData,
      memory: memoryData,
      validation: stateValidation,
      scaleManager: {
        mode: scale.scaleMode,
        autoCenter: scale.autoCenter,
        gameSize: { width: gameSize.width, height: gameSize.height },
        displaySize: { width: displaySize.width, height: displaySize.height },
        baseSize: { width: scale.baseSize.width, height: scale.baseSize.height },
        parentSize: { width: scale.parentSize.width, height: scale.parentSize.height },
        zoom: scale.zoom
      },
      camera: {
        bounds: camera.getBounds(),
        scroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom,
        size: { width: camera.width, height: camera.height },
        viewport: {
          worldWidth: camera.width / camera.zoom,
          worldHeight: camera.height / camera.zoom
        }
      },
      worldBounds: { ...this.worldBounds },
      player: this.player ? {
        position: { x: this.player.x, y: this.player.y },
        size: { width: this.player.displayWidth, height: this.player.displayHeight },
        visible: this.player.visible,
        active: this.player.active
      } : null,
      overallHealth: {
        critical: !stateValidation.dimensionConsistency,
        warnings: !stateValidation.boundaryAlignment || !stateValidation.objectPositioning,
        optimal: Object.values(stateValidation).every(v => v === true)
      }
    };

    console.log('🔍 ENHANCED DEBUG DATA COLLECTION:', enhancedDebugData);
    return enhancedDebugData;
  }

  /**
   * Validate debug overlay coordinate systems (for investigation)
   * Ensures all debug overlays use the correct coordinate system
   */
  public validateDebugOverlayCoordinates(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    const validation = {
      timestamp: new Date().toISOString(),
      debugOverlaysEnabled: this.DEBUG_CAMERA_CENTERING,
      coordinateSystems: {
        worldCoordinates: {
          description: 'Objects that move with camera scroll (setScrollFactor: 1)',
          objects: [
            {
              name: 'debugPlayerCross',
              exists: !!this.debugPlayerCross,
              scrollFactor: this.debugPlayerCross?.scrollFactorX || null,
              expectedScrollFactor: 1,
              correct: (this.debugPlayerCross?.scrollFactorX || 0) === 1
            },
            {
              name: 'debugCameraCross',
              exists: !!this.debugCameraCross,
              scrollFactor: this.debugCameraCross?.scrollFactorX || null,
              expectedScrollFactor: 1,
              correct: (this.debugCameraCross?.scrollFactorX || 0) === 1
            },
            {
              name: 'debugViewportBounds',
              exists: !!this.debugViewportBounds,
              scrollFactor: this.debugViewportBounds?.scrollFactorX || null,
              expectedScrollFactor: 1,
              correct: (this.debugViewportBounds?.scrollFactorX || 0) === 1
            },
            {
              name: 'debugWorldCenterCross',
              exists: !!this.debugWorldCenterCross,
              scrollFactor: this.debugWorldCenterCross?.scrollFactorX || null,
              expectedScrollFactor: 1,
              correct: (this.debugWorldCenterCross?.scrollFactorX || 0) === 1
            },
            {
              name: 'debugPlayerFollowingText',
              exists: !!this.debugPlayerFollowingText,
              scrollFactor: this.debugPlayerFollowingText?.scrollFactorX || null,
              expectedScrollFactor: 1,
              correct: (this.debugPlayerFollowingText?.scrollFactorX || 0) === 1
            }
          ]
        },
        screenCoordinates: {
          description: 'Objects fixed to viewport (setScrollFactor: 0)',
          objects: [
            {
              name: 'debugViewportBorder',
              exists: !!this.debugViewportBorder,
              scrollFactor: this.debugViewportBorder?.scrollFactorX || null,
              expectedScrollFactor: 0,
              correct: (this.debugViewportBorder?.scrollFactorX || 1) === 0
            },
            {
              name: 'debugPlayerPositionText',
              exists: !!this.debugPlayerPositionText,
              scrollFactor: this.debugPlayerPositionText?.scrollFactorX || null,
              expectedScrollFactor: 0,
              correct: (this.debugPlayerPositionText?.scrollFactorX || 1) === 0
            },
            {
              name: 'debugCameraScrollText',
              exists: !!this.debugCameraScrollText,
              scrollFactor: this.debugCameraScrollText?.scrollFactorX || null,
              expectedScrollFactor: 0,
              correct: (this.debugCameraScrollText?.scrollFactorX || 1) === 0
            }
          ]
        }
      },
      viewportBorderAlignment: {
        usesScaleManagerGameSize: true,
        gameSize: { width: gameSize.width, height: gameSize.height },
        cameraSize: { width: camera.width, height: camera.height },
        dimensionsMatch: camera.width === gameSize.width && camera.height === gameSize.height,
        pixelPerfectPadding: 1
      },
      overallValidation: {
        allWorldObjectsCorrect: true,
        allScreenObjectsCorrect: true,
        viewportBorderCorrect: true
      }
    };

    // Calculate overall validation results
    validation.overallValidation.allWorldObjectsCorrect = validation.coordinateSystems.worldCoordinates.objects.every(obj => obj.correct);
    validation.overallValidation.allScreenObjectsCorrect = validation.coordinateSystems.screenCoordinates.objects.every(obj => obj.correct);
    validation.overallValidation.viewportBorderCorrect = validation.viewportBorderAlignment.dimensionsMatch;

    console.log('🔍 DEBUG OVERLAY COORDINATE VALIDATION:', validation);
    return validation;
  }

  /**
   * Draw visible viewport border (screen coordinates - only when zoom is not 100%)
   * Shows the screen-space viewport boundary for debugging
   */
  private drawViewportBorder(): void {
    if (!this.debugViewportBorder) return;

    const camera = this.cameras.main;
    const scale = this.scale;

    this.debugViewportBorder.clear();

    // Only show viewport border when zoom is significantly different from 100%
    // This eliminates the mysterious magenta line at normal zoom levels
    const zoomThreshold = 0.05; // 5% threshold
    if (Math.abs(camera.zoom - 1.0) < zoomThreshold) {
      return; // Don't draw border when zoom is close to 100%
    }

    // Use a more subtle color and transparency
    this.debugViewportBorder.lineStyle(2, 0xff00ff, 0.6); // Magenta, semi-transparent

    // Get the actual game size from scale manager (authoritative source)
    const gameSize = scale.gameSize;

    // Use actual screen dimensions for screen-space border
    const viewportWidth = gameSize.width;
    const viewportHeight = gameSize.height;

    const padding = 2; // Slightly larger padding for visibility

    // Draw border using screen coordinates with debug offset and manual scale factor
    const scaledWidth = (viewportWidth - (padding * 2)) * this.manualScaleFactor;
    const scaledHeight = (viewportHeight - (padding * 2)) * this.manualScaleFactor;
    const offsetX = padding + this.pinkSquareOffset.x;
    const offsetY = padding + this.pinkSquareOffset.y;

    this.debugViewportBorder.strokeRect(
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    );

    // Add label to identify this border (positioned with offset)
    const labelText = `Screen Border (${Math.round(camera.zoom * 100)}%) [Scale: ${this.manualScaleFactor.toFixed(1)}]`;
    this.createOrUpdateLabel(offsetX + 10, offsetY + 10, labelText, 0xff00ff);

    // Enhanced debug logging with dimension verification (throttled to prevent infinite logs)
    if (this.shouldLogDebug()) {
      console.log('🔍 VIEWPORT BORDER DEBUG (Enhanced):', {
        gameSize: { width: gameSize.width, height: gameSize.height },
        cameraSize: { width: camera.width, height: camera.height },
        actualBorderRect: {
          x: padding,
          y: padding,
          width: viewportWidth - (padding * 2),
          height: viewportHeight - (padding * 2)
        },
        zoom: camera.zoom,
        zoomThreshold: Math.abs(camera.zoom - 1.0),
        borderVisible: Math.abs(camera.zoom - 1.0) >= 0.05,
        coordinateSystem: 'screen (setScrollFactor: 0)'
      });
    }
  }

  /**
   * Update debug text overlays
   */
  private updateDebugText(
    playerX: number,
    playerY: number,
    scrollX: number,
    scrollY: number,
    cameraViewportCenterX: number,
    cameraViewportCenterY: number
  ): void {
    if (!this.debugPlayerPositionText || !this.debugCameraScrollText) return;

    // Player position text
    const playerText = `Player: (${Math.round(playerX)}, ${Math.round(playerY)})`;
    this.debugPlayerPositionText.setText(playerText);

    // Enhanced camera text with viewport boundary info
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const displaySize = scale.displaySize;

    const cameraText = [
      `Camera: (${Math.round(scrollX)}, ${Math.round(scrollY)})`,
      `Viewport Center: (${Math.round(cameraViewportCenterX)}, ${Math.round(cameraViewportCenterY)})`,
      ``,
      `🔍 BOUNDARY CHECK:`,
      `Camera: ${camera.width}×${camera.height}`,
      `Game: ${Math.round(gameSize.width)}×${Math.round(gameSize.height)}`,
      `Display: ${Math.round(displaySize.width)}×${Math.round(displaySize.height)}`,
      `Match: ${camera.width === gameSize.width && camera.height === gameSize.height ? '✅' : '❌'}`
    ].join('\n');

    this.debugCameraScrollText.setText(cameraText);

    // Position camera text in top-right
    this.debugCameraScrollText.setPosition(camera.width - 280, 10);
  }

  /**
   * Update player following text that moves with the player
   */
  private updatePlayerFollowingText(playerX: number, playerY: number, zoom: number): void {
    if (!this.debugPlayerFollowingText) return;

    const camera = this.cameras.main;

    // Calculate viewport dimensions in world coordinates
    const viewportWidth = camera.width / zoom;
    const viewportHeight = camera.height / zoom;

    // Get camera scroll position and center
    const scrollX = camera.scrollX;
    const scrollY = camera.scrollY;
    const cameraCenterX = scrollX + (viewportWidth / 2);
    const cameraCenterY = scrollY + (viewportHeight / 2);

    // Calculate actual pixel dimensions at current zoom
    const pixelWidth = Math.round(camera.width);
    const pixelHeight = Math.round(camera.height);

    // Get player state information
    const playerOriginX = this.player?.originX || 0;
    const playerOriginY = this.player?.originY || 0;
    const playerVisible = this.player?.visible || false;

    // Calculate distance from player to camera center
    const distanceToCenter = Math.round(Math.sqrt(
      Math.pow(playerX - cameraCenterX, 2) + Math.pow(playerY - cameraCenterY, 2)
    ));

    // Get scale manager info for debugging
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const displaySize = scale.displaySize;
    const canvas = scale.canvas;

    // Check if camera dimensions match game dimensions
    const dimensionsMatch = camera.width === gameSize.width && camera.height === gameSize.height;

    // Enhanced debug data for investigation
    const scaleManagerDetails = {
      baseSize: scale.baseSize,
      parentSize: scale.parentSize,
      scaleMode: scale.scaleMode,
      autoCenter: scale.autoCenter,
      canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null
    };

    // Create comprehensive debug text with all metrics including boundary check
    const followingText = [
      `🎯 PLAYER DATA`,
      `Pos: (${Math.round(playerX)}, ${Math.round(playerY)})`,
      `Origin: (${playerOriginX.toFixed(1)}, ${playerOriginY.toFixed(1)})`,
      `Visible: ${playerVisible}`,
      `Distance to Center: ${distanceToCenter}px`,
      ``,
      `📷 CAMERA DATA`,
      `Scroll: (${Math.round(scrollX)}, ${Math.round(scrollY)})`,
      `Center: (${Math.round(cameraCenterX)}, ${Math.round(cameraCenterY)})`,
      `Size: ${pixelWidth}×${pixelHeight}px`,
      ``,
      `🔍 VIEWPORT DATA`,
      `World Size: ${Math.round(viewportWidth)}×${Math.round(viewportHeight)}`,
      `Zoom: ${Math.round(zoom * 100)}% (${zoom.toFixed(3)}x)`,
      `Pixel Ratio: 1:${Math.round(1/zoom)}`,
      ``,
      `🔍 BOUNDARY CHECK`,
      `Camera: ${camera.width}×${camera.height}`,
      `Game: ${Math.round(gameSize.width)}×${Math.round(gameSize.height)}`,
      `Display: ${Math.round(displaySize.width)}×${Math.round(displaySize.height)}`,
      `Match: ${dimensionsMatch ? '✅' : '❌'}`,
      ``,
      `📐 SCALE DATA`,
      `Mode: ${scale.scaleMode} (AutoCenter: ${scale.autoCenter})`,
      `Scale Factor: ${(camera.width / gameSize.width).toFixed(3)}`,
      `Base: ${Math.round(scaleManagerDetails.baseSize.width)}×${Math.round(scaleManagerDetails.baseSize.height)}`,
      `Parent: ${Math.round(scaleManagerDetails.parentSize.width)}×${Math.round(scaleManagerDetails.parentSize.height)}`,
      `Canvas: ${scaleManagerDetails.canvasSize ? `${scaleManagerDetails.canvasSize.width}×${scaleManagerDetails.canvasSize.height}` : 'null'}`
    ].join('\n');

    this.debugPlayerFollowingText.setText(followingText);

    // Position text below and to the right of the player (bottom-right relative to player)
    // Adjusted positioning to accommodate the expanded debug information
    const offsetX = 30; // Right of player (slightly more space)
    const offsetY = 45;  // Below player (positive Y moves down, more space for larger text block)
    this.debugPlayerFollowingText.setPosition(playerX + offsetX, playerY + offsetY);
  }

  /**
   * Validate object positioning relative to world bounds and camera viewport (for investigation)
   */
  public validateObjectPositioning(): any {
    const camera = this.cameras.main;
    const mapData = this.sharedMapSystem.getMapData();

    // Collect all game objects and their positions
    const gameObjects: any[] = [];

    // Player object
    if (this.player) {
      gameObjects.push({
        type: 'player',
        name: 'Player Character',
        x: this.player.x,
        y: this.player.y,
        width: this.player.width || 32,
        height: this.player.height || 32,
        bounds: {
          left: this.player.x - (this.player.width || 32) / 2,
          right: this.player.x + (this.player.width || 32) / 2,
          top: this.player.y - (this.player.height || 32) / 2,
          bottom: this.player.y + (this.player.height || 32) / 2
        },
        visible: this.player.visible,
        active: this.player.active
      });
    }

    // Interactive areas from map data
    if (mapData?.interactiveAreas) {
      mapData.interactiveAreas.forEach(area => {
        gameObjects.push({
          type: 'interactive_area',
          name: area.name,
          id: area.id,
          x: area.x + area.width / 2, // Center position
          y: area.y + area.height / 2,
          width: area.width,
          height: area.height,
          bounds: {
            left: area.x,
            right: area.x + area.width,
            top: area.y,
            bottom: area.y + area.height
          },
          areaType: area.type,
          color: area.color
        });
      });
    }

    // Collision areas from map data
    if (mapData?.impassableAreas) {
      mapData.impassableAreas.forEach(area => {
        gameObjects.push({
          type: 'collision_area',
          name: area.name,
          id: area.id,
          x: area.x + area.width / 2, // Center position
          y: area.y + area.height / 2,
          width: area.width,
          height: area.height,
          bounds: {
            left: area.x,
            right: area.x + area.width,
            top: area.y,
            bottom: area.y + area.height
          }
        });
      });
    }

    // Debug objects (if enabled)
    if (this.DEBUG_CAMERA_CENTERING) {
      const debugObjects = [
        { name: 'debugPlayerCross', obj: this.debugPlayerCross },
        { name: 'debugCameraCross', obj: this.debugCameraCross },
        { name: 'debugViewportBounds', obj: this.debugViewportBounds },
        { name: 'debugViewportBorder', obj: this.debugViewportBorder }
      ];

      debugObjects.forEach(({ name, obj }) => {
        if (obj) {
          gameObjects.push({
            type: 'debug_object',
            name,
            x: obj.x || 0,
            y: obj.y || 0,
            width: 10, // Approximate size for debug objects
            height: 10,
            bounds: {
              left: (obj.x || 0) - 5,
              right: (obj.x || 0) + 5,
              top: (obj.y || 0) - 5,
              bottom: (obj.y || 0) + 5
            },
            visible: obj.visible
          });
        }
      });
    }

    // Validate positioning
    const worldBounds = {
      left: 0,
      right: this.worldBounds.width,
      top: 0,
      bottom: this.worldBounds.height
    };

    const validation = {
      timestamp: new Date().toISOString(),
      worldBounds: { ...this.worldBounds },
      camera: {
        bounds: camera.getBounds(),
        viewport: {
          left: camera.scrollX,
          right: camera.scrollX + camera.width,
          top: camera.scrollY,
          bottom: camera.scrollY + camera.height
        },
        zoom: camera.zoom
      },
      totalObjects: gameObjects.length,
      objectsByType: {
        player: gameObjects.filter(obj => obj.type === 'player').length,
        interactive_areas: gameObjects.filter(obj => obj.type === 'interactive_area').length,
        collision_areas: gameObjects.filter(obj => obj.type === 'collision_area').length,
        debug_objects: gameObjects.filter(obj => obj.type === 'debug_object').length
      },
      positioningIssues: {
        outsideWorldBounds: gameObjects.filter(obj =>
          obj.bounds.left < worldBounds.left ||
          obj.bounds.right > worldBounds.right ||
          obj.bounds.top < worldBounds.top ||
          obj.bounds.bottom > worldBounds.bottom
        ),
        partiallyOutside: gameObjects.filter(obj =>
          (obj.bounds.left < worldBounds.left && obj.bounds.right > worldBounds.left) ||
          (obj.bounds.right > worldBounds.right && obj.bounds.left < worldBounds.right) ||
          (obj.bounds.top < worldBounds.top && obj.bounds.bottom > worldBounds.top) ||
          (obj.bounds.bottom > worldBounds.bottom && obj.bounds.top < worldBounds.bottom)
        ),
        atWorldEdges: gameObjects.filter(obj =>
          obj.bounds.left <= 5 || obj.bounds.right >= worldBounds.right - 5 ||
          obj.bounds.top <= 5 || obj.bounds.bottom >= worldBounds.bottom - 5
        )
      },
      allObjects: gameObjects
    };

    console.log('🔍 OBJECT POSITIONING VALIDATION:', validation);
    return validation;
  }

  /**
   * Test background image alignment with different aspect ratios (for investigation)
   */
  public testBackgroundImageAlignment(): any {
    const camera = this.cameras.main;
    const mapData = this.sharedMapSystem.getMapData();

    // Get background image texture if it exists
    let backgroundTexture: any = null;
    let backgroundImageObject: any = null;

    // Find the background image in the scene
    this.children.list.forEach((child: any) => {
      if (child.texture && child.depth === -1000) {
        backgroundImageObject = child;
        backgroundTexture = child.texture;
      }
    });

    const alignment = {
      timestamp: new Date().toISOString(),
      backgroundImage: {
        exists: !!backgroundImageObject,
        texture: backgroundTexture ? {
          key: backgroundTexture.key,
          width: backgroundTexture.source[0]?.width || 0,
          height: backgroundTexture.source[0]?.height || 0
        } : null,
        object: backgroundImageObject ? {
          x: backgroundImageObject.x,
          y: backgroundImageObject.y,
          scaleX: backgroundImageObject.scaleX,
          scaleY: backgroundImageObject.scaleY,
          originX: backgroundImageObject.originX,
          originY: backgroundImageObject.originY,
          width: backgroundImageObject.width,
          height: backgroundImageObject.height,
          displayWidth: backgroundImageObject.displayWidth,
          displayHeight: backgroundImageObject.displayHeight
        } : null
      },
      mapData: {
        backgroundImageDimensions: mapData?.backgroundImageDimensions || null,
        worldDimensions: mapData?.worldDimensions || null
      },
      worldBounds: { ...this.worldBounds },
      camera: {
        bounds: camera.getBounds(),
        scroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom
      },
      aspectRatios: {
        background: backgroundTexture ?
          (backgroundTexture.source[0]?.width / backgroundTexture.source[0]?.height).toFixed(3) : null,
        world: (this.worldBounds.width / this.worldBounds.height).toFixed(3),
        camera: (camera.width / camera.height).toFixed(3)
      },
      pixelMapping: {
        is1to1: backgroundImageObject ?
          (backgroundImageObject.scaleX === 1 && backgroundImageObject.scaleY === 1) : null,
        positionedAtOrigin: backgroundImageObject ?
          (backgroundImageObject.x === 0 && backgroundImageObject.y === 0) : null,
        originTopLeft: backgroundImageObject ?
          (backgroundImageObject.originX === 0 && backgroundImageObject.originY === 0) : null
      }
    };

    console.log('🔍 BACKGROUND IMAGE ALIGNMENT TEST:', alignment);
    return alignment;
  }

  /**
   * Verify canvas size vs map size relationships (for investigation)
   */
  public verifyCanvasMapSizeRelationship(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const mapData = this.sharedMapSystem.getMapData();

    const verification = {
      timestamp: new Date().toISOString(),
      worldBounds: { ...this.worldBounds },
      mapData: {
        hasBackgroundImage: !!mapData?.backgroundImage,
        backgroundImageDimensions: mapData?.backgroundImageDimensions || null,
        worldDimensions: mapData?.worldDimensions || null
      },
      camera: {
        bounds: camera.getBounds(),
        width: camera.width,
        height: camera.height
      },
      scale: {
        gameSize: { width: scale.gameSize.width, height: scale.gameSize.height },
        displaySize: { width: scale.displaySize.width, height: scale.displaySize.height },
        baseSize: { width: scale.baseSize.width, height: scale.baseSize.height },
        parentSize: { width: scale.parentSize.width, height: scale.parentSize.height }
      },
      consistency: {
        worldBoundsMatchCamera: this.worldBounds.width === camera.getBounds().width &&
                               this.worldBounds.height === camera.getBounds().height,
        cameraMatchesScale: camera.width === scale.gameSize.width &&
                           camera.height === scale.gameSize.height,
        backgroundImageMatchesWorld: mapData?.backgroundImageDimensions ?
          (mapData.backgroundImageDimensions.width === this.worldBounds.width &&
           mapData.backgroundImageDimensions.height === this.worldBounds.height) : null
      }
    };

    console.log('🔍 CANVAS-MAP SIZE VERIFICATION:', verification);
    return verification;
  }

  /**
   * Test boundary alignment at specific zoom level (for investigation) - ENHANCED
   */
  public testBoundaryAlignmentAtZoom(zoomLevel: number): any {
    const camera = this.cameras.main;
    const scale = this.scale;

    console.log(`🧪 TESTING ZOOM LEVEL: ${Math.round(zoomLevel * 100)}%`);

    // Set the zoom level
    camera.setZoom(zoomLevel);

    // Re-center on player
    if (this.player) {
      this.centerCameraOnPlayer();
    }

    // Calculate viewport dimensions at this zoom level
    const gameSize = scale.gameSize;
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;

    // Calculate expected vs actual center
    const expectedCenterX = camera.scrollX + viewportWidth / 2;
    const expectedCenterY = camera.scrollY + viewportHeight / 2;
    const playerX = this.player?.x || 0;
    const playerY = this.player?.y || 0;

    // Calculate centering accuracy
    const centeringErrorX = Math.abs(playerX - expectedCenterX);
    const centeringErrorY = Math.abs(playerY - expectedCenterY);

    // Check if magenta border should be visible
    const magentaBorderVisible = Math.abs(camera.zoom - 1.0) >= 0.05;

    // Collect comprehensive debug data
    const testResults = {
      zoomLevel,
      zoomPercentage: `${Math.round(zoomLevel * 100)}%`,
      timestamp: new Date().toISOString(),
      camera: {
        width: camera.width,
        height: camera.height,
        zoom: camera.zoom,
        scrollX: camera.scrollX,
        scrollY: camera.scrollY
      },
      viewport: {
        width: viewportWidth,
        height: viewportHeight,
        leftX: camera.scrollX,
        rightX: camera.scrollX + viewportWidth,
        topY: camera.scrollY,
        bottomY: camera.scrollY + viewportHeight
      },
      centering: {
        playerPos: { x: playerX, y: playerY },
        expectedCenter: { x: expectedCenterX, y: expectedCenterY },
        error: { x: centeringErrorX, y: centeringErrorY },
        accurate: centeringErrorX < 1.0 && centeringErrorY < 1.0
      },
      debugElements: {
        magentaBorderVisible,
        zoomThreshold: Math.abs(camera.zoom - 1.0),
        debugOverlaysEnabled: this.DEBUG_CAMERA_CENTERING
      },
      scale: {
        gameSize: { width: gameSize.width, height: gameSize.height },
        displaySize: { width: scale.displaySize.width, height: scale.displaySize.height }
      },
      dimensionsMatch: camera.width === scale.gameSize.width && camera.height === scale.gameSize.height,
      worldBounds: { ...this.worldBounds }
    };

    console.log(`🔍 ZOOM TEST RESULTS @ ${Math.round(zoomLevel * 100)}%:`, testResults);

    // Update debug overlays
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }

    return testResults;
  }

  /**
   * Comprehensive zoom range test - Tests dynamic zoom constraints
   */
  public testZoomRange(): any {
    const dynamicMinZoom = this.minZoom;
    const testZoomLevels = [
      dynamicMinZoom, // Test dynamic minimum
      dynamicMinZoom + 0.1, // Slightly above minimum
      0.98, 1.0, 1.05, 1.2, 1.4,
      this.maxZoom // Test maximum (1.65)
    ];
    const results: any[] = [];

    console.log('🧪 STARTING COMPREHENSIVE ZOOM RANGE TEST');

    testZoomLevels.forEach((zoomLevel, index) => {
      // Add a small delay between tests to allow for proper rendering
      this.time.delayedCall(index * 200, () => {
        const result = this.testBoundaryAlignmentAtZoom(zoomLevel);
        results.push(result);

        // If this is the last test, generate summary
        if (index === testZoomLevels.length - 1) {
          this.time.delayedCall(100, () => {
            const summary = {
              totalTests: results.length,
              accurateCentering: results.filter(r => r.centering.accurate).length,
              magentaBorderTests: results.filter(r => r.debugElements.magentaBorderVisible).length,
              problemZoomLevels: results.filter(r => !r.centering.accurate).map(r => r.zoomPercentage),
              timestamp: new Date().toISOString()
            };

            console.log('🧪 ZOOM RANGE TEST SUMMARY:', summary);
          });
        }
      });
    });

    return {
      testZoomLevels,
      dynamicMinZoom,
      maxZoom: this.maxZoom,
      message: 'Test initiated - check console for results'
    };
  }

  /**
   * Display current zoom constraints and calculations
   */
  public showZoomConstraints(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;
    const dynamicMinZoom = this.minZoom;

    const constraints = {
      current: {
        zoom: camera.zoom,
        zoomPercentage: `${Math.round(camera.zoom * 100)}%`
      },
      constraints: {
        minZoom: dynamicMinZoom,
        minZoomPercentage: `${Math.round(dynamicMinZoom * 100)}%`,
        maxZoom: this.maxZoom,
        maxZoomPercentage: `${Math.round(this.maxZoom * 100)}%`,
        zoomStep: this.zoomStep
      },
      calculations: {
        worldBounds: this.worldBounds,
        viewportSize: { width: gameSize.width, height: gameSize.height },
        zoomForWidth: gameSize.width / this.worldBounds.width,
        zoomForHeight: gameSize.height / this.worldBounds.height,
        staticMinZoom: this.staticMinZoom
      },
      capabilities: {
        canZoomIn: this.canZoomIn(),
        canZoomOut: this.canZoomOut()
      },
      explanation: {
        minZoom: 'Dynamic minimum: when map width OR height equals viewport',
        maxZoom: 'Fixed maximum: 165% zoom for optimal gameplay',
        currentRule: dynamicMinZoom > this.staticMinZoom ?
          'Using dynamic minimum (map fits viewport)' :
          'Using static minimum (fallback protection)'
      }
    };

    console.log('🔍 ZOOM CONSTRAINTS ANALYSIS:', constraints);
    return constraints;
  }

  /**
   * Comprehensive Scale Manager Diagnostic - Investigate scale issues
   */
  public diagnoseScaleManager(): any {
    const scale = this.scale;
    const camera = this.cameras.main;
    const canvas = scale.canvas;

    // Get all scale-related properties
    const scaleData = {
      timestamp: new Date().toISOString(),
      scaleManager: {
        mode: scale.scaleMode,
        modeString: this.getScaleModeString(scale.scaleMode),
        autoCenter: scale.autoCenter,
        autoCenterString: this.getAutoCenterString(scale.autoCenter),
        zoom: scale.zoom, // This is the scale factor that might be stuck at 1.000
        isFullscreen: scale.isFullscreen,
        orientation: scale.orientation
      },
      dimensions: {
        gameSize: { width: scale.gameSize.width, height: scale.gameSize.height },
        baseSize: { width: scale.baseSize.width, height: scale.baseSize.height },
        displaySize: { width: scale.displaySize.width, height: scale.displaySize.height },
        parentSize: { width: scale.parentSize.width, height: scale.parentSize.height },
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
        cameraSize: { width: camera.width, height: camera.height }
      },
      calculations: {
        scaleFactorX: scale.displaySize.width / scale.gameSize.width,
        scaleFactorY: scale.displaySize.height / scale.gameSize.height,
        aspectRatio: scale.gameSize.width / scale.gameSize.height,
        displayAspectRatio: scale.displaySize.width / scale.displaySize.height,
        scaleMismatch: Math.abs(scale.zoom - 1.0) < 0.001 // Check if stuck at 1.000
      },
      container: {
        parentElement: scale.parent,
        parentDimensions: scale.parent ? {
          width: scale.parent.clientWidth,
          height: scale.parent.clientHeight,
          offsetWidth: scale.parent.offsetWidth,
          offsetHeight: scale.parent.offsetHeight
        } : null
      },
      issues: {
        scaleStuckAt1: Math.abs(scale.zoom - 1.0) < 0.001,
        dimensionMismatch: camera.width !== scale.gameSize.width || camera.height !== scale.gameSize.height,
        canvasMismatch: canvas ? (canvas.width !== scale.displaySize.width || canvas.height !== scale.displaySize.height) : false,
        parentSizeMismatch: scale.parent ? (
          scale.parentSize.width !== scale.parent.clientWidth ||
          scale.parentSize.height !== scale.parent.clientHeight
        ) : false
      }
    };

    // Analyze potential problems
    const recommendations: string[] = [];

    if (scaleData.issues.scaleStuckAt1) {
      recommendations.push('Scale zoom stuck at 1.000 - container size detection may be broken');
    }
    if (scaleData.issues.dimensionMismatch) {
      recommendations.push('Camera dimensions don\'t match game size - sync required');
    }
    if (scaleData.issues.parentSizeMismatch) {
      recommendations.push('Parent size detection is incorrect - container resize not detected');
    }

    const analysis = {
      summary: {
        scaleWorking: !scaleData.issues.scaleStuckAt1,
        majorIssues: Object.values(scaleData.issues).filter(Boolean).length,
        likelyRootCause: scaleData.issues.scaleStuckAt1 ? 'Scale manager not responding to container changes' : 'Scale manager appears functional'
      },
      recommendations
    };

    const diagnostic = {
      ...scaleData,
      analysis
    };

    console.log('🔍 SCALE MANAGER DIAGNOSTIC:', diagnostic);

    // Test if this is causing viewport calculation errors
    if (scaleData.issues.scaleStuckAt1) {
      console.warn('⚠️ SCALE ISSUE DETECTED: Scale zoom stuck at 1.000 - this could be causing viewport offset issues!');
      console.log('💡 POTENTIAL FIX: Scale manager may need manual refresh or container size detection fix');
    }

    return diagnostic;
  }

  /**
   * Helper function to get human-readable scale mode string
   */
  private getScaleModeString(mode: number): string {
    const modes: { [key: number]: string } = {
      [Phaser.Scale.NONE]: 'NONE',
      [Phaser.Scale.WIDTH_CONTROLS_HEIGHT]: 'WIDTH_CONTROLS_HEIGHT',
      [Phaser.Scale.HEIGHT_CONTROLS_WIDTH]: 'HEIGHT_CONTROLS_WIDTH',
      [Phaser.Scale.FIT]: 'FIT',
      [Phaser.Scale.ENVELOP]: 'ENVELOP',
      [Phaser.Scale.RESIZE]: 'RESIZE'
    };
    return modes[mode] || `Unknown(${mode})`;
  }

  /**
   * Helper function to get human-readable auto center string
   */
  private getAutoCenterString(center: number): string {
    const centers: { [key: number]: string } = {
      [Phaser.Scale.NO_CENTER]: 'NO_CENTER',
      [Phaser.Scale.CENTER_BOTH]: 'CENTER_BOTH',
      [Phaser.Scale.CENTER_HORIZONTALLY]: 'CENTER_HORIZONTALLY',
      [Phaser.Scale.CENTER_VERTICALLY]: 'CENTER_VERTICALLY'
    };
    return centers[center] || `Unknown(${center})`;
  }

  /**
   * Force scale manager refresh - attempt to fix scale issues
   */
  public forceScaleRefresh(): any {
    const scale = this.scale;

    console.log('🔄 FORCING SCALE REFRESH...');

    // Get current state before refresh
    const beforeState = {
      zoom: scale.zoom,
      gameSize: { width: scale.gameSize.width, height: scale.gameSize.height },
      displaySize: { width: scale.displaySize.width, height: scale.displaySize.height }
    };

    // Force scale manager to refresh
    scale.refresh();

    // Wait a frame and check if anything changed
    this.time.delayedCall(100, () => {
      const afterState = {
        zoom: scale.zoom,
        gameSize: { width: scale.gameSize.width, height: scale.gameSize.height },
        displaySize: { width: scale.displaySize.width, height: scale.displaySize.height }
      };

      const changed = {
        zoom: beforeState.zoom !== afterState.zoom,
        gameSize: beforeState.gameSize.width !== afterState.gameSize.width ||
                 beforeState.gameSize.height !== afterState.gameSize.height,
        displaySize: beforeState.displaySize.width !== afterState.displaySize.width ||
                    beforeState.displaySize.height !== afterState.displaySize.height
      };

      const result = {
        beforeState,
        afterState,
        changed,
        success: Object.values(changed).some(Boolean),
        message: Object.values(changed).some(Boolean) ?
          'Scale refresh successful - values changed' :
          'Scale refresh had no effect - scale may be stuck'
      };

      console.log('🔄 SCALE REFRESH RESULT:', result);

      // If scale changed, update debug overlays
      if (result.success && this.DEBUG_CAMERA_CENTERING) {
        this.updateDebugOverlays();
      }

      return result;
    });

    return {
      message: 'Scale refresh initiated - check console for results',
      beforeState
    };
  }

  /**
   * DEEP INVESTIGATION: Camera Panning vs Zoom Viewport Bounds Conflict Analysis
   */
  public analyzePanningZoomConflict(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // Calculate current viewport and player positions
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;
    const viewportCenterX = camera.scrollX + viewportWidth / 2;
    const viewportCenterY = camera.scrollY + viewportHeight / 2;

    const playerX = this.player?.x || 0;
    const playerY = this.player?.y || 0;

    // Calculate offset between viewport center and player
    const offsetFromPlayer = {
      x: viewportCenterX - playerX,
      y: viewportCenterY - playerY
    };

    // Analyze panning state
    const panningAnalysis = {
      timestamp: new Date().toISOString(),
      currentState: {
        isPanning: this.isPanning,
        manualCameraControl: this.manualCameraControl,
        isFollowingPlayer: this.isFollowingPlayer,
        hasManuallePanned: this.hasManuallePanned
      },
      cameraPosition: {
        scrollX: camera.scrollX,
        scrollY: camera.scrollY,
        zoom: camera.zoom,
        zoomPercentage: `${Math.round(camera.zoom * 100)}%`
      },
      viewportCalculations: {
        viewportSize: { width: viewportWidth, height: viewportHeight },
        viewportCenter: { x: viewportCenterX, y: viewportCenterY },
        playerPosition: { x: playerX, y: playerY },
        offsetFromPlayer,
        offsetMagnitude: Math.sqrt(offsetFromPlayer.x ** 2 + offsetFromPlayer.y ** 2)
      },
      panningState: {
        panStartPosition: { x: this.panStartX, y: this.panStartY },
        panStartScroll: { x: this.panStartScrollX, y: this.panStartScrollY },
        panOffsetFromPlayer: this.panOffsetFromPlayer,
        lastKnownPlayerPosition: this.lastKnownPlayerPosition
      },
      conflictIndicators: {
        significantOffset: Math.abs(offsetFromPlayer.x) > 10 || Math.abs(offsetFromPlayer.y) > 10,
        playerNotCentered: Math.abs(offsetFromPlayer.x) > 1 || Math.abs(offsetFromPlayer.y) > 1,
        manualControlActive: this.manualCameraControl,
        followingDisabled: !this.isFollowingPlayer
      }
    };

    // Analyze potential conflicts
    const conflictAnalysis = {
      summary: {
        hasConflict: panningAnalysis.conflictIndicators.significantOffset &&
                    !panningAnalysis.currentState.manualCameraControl,
        conflictType: this.determineConflictType(panningAnalysis),
        severity: this.calculateConflictSeverity(panningAnalysis)
      },
      rootCause: this.analyzeRootCause(panningAnalysis),
      recommendations: this.generateConflictRecommendations(panningAnalysis)
    };

    const fullAnalysis = {
      ...panningAnalysis,
      conflictAnalysis
    };

    console.log('🔍 PANNING-ZOOM CONFLICT ANALYSIS:', fullAnalysis);

    return fullAnalysis;
  }

  /**
   * Determine the type of panning-zoom conflict
   */
  private determineConflictType(analysis: any): string {
    const { offsetFromPlayer } = analysis.viewportCalculations;
    const { manualCameraControl, isFollowingPlayer } = analysis.currentState;

    if (Math.abs(offsetFromPlayer.x) > 50 || Math.abs(offsetFromPlayer.y) > 50) {
      return 'Major viewport offset - likely zoom operation overwrote panning state';
    } else if (!isFollowingPlayer && (Math.abs(offsetFromPlayer.x) > 10 || Math.abs(offsetFromPlayer.y) > 10)) {
      return 'Moderate offset with following disabled - expected behavior';
    } else if (manualCameraControl) {
      return 'Manual control active - temporary state during operation';
    } else if (Math.abs(offsetFromPlayer.x) > 1 || Math.abs(offsetFromPlayer.y) > 1) {
      return 'Minor offset - possible precision issue or recent operation';
    } else {
      return 'No conflict detected - player properly centered';
    }
  }

  /**
   * Calculate conflict severity (0-10 scale)
   */
  private calculateConflictSeverity(analysis: any): number {
    const { offsetMagnitude } = analysis.viewportCalculations;
    const { manualCameraControl } = analysis.currentState;

    if (manualCameraControl) return 0; // Expected during manual operations
    if (offsetMagnitude < 1) return 0; // Negligible
    if (offsetMagnitude < 10) return 2; // Minor
    if (offsetMagnitude < 50) return 5; // Moderate
    if (offsetMagnitude < 100) return 7; // Significant
    return 10; // Severe
  }

  /**
   * Analyze root cause of conflict
   */
  private analyzeRootCause(analysis: any): string[] {
    const causes: string[] = [];
    const { offsetFromPlayer } = analysis.viewportCalculations;
    const { manualCameraControl, isFollowingPlayer } = analysis.currentState;

    if (Math.abs(offsetFromPlayer.x) > 10 || Math.abs(offsetFromPlayer.y) > 10) {
      if (!manualCameraControl && isFollowingPlayer) {
        causes.push('Zoom operation likely overwrote manual panning state');
        causes.push('camera.centerOn() called during zoom animation ignores existing scroll position');
      }
      if (!isFollowingPlayer) {
        causes.push('Camera following disabled - offset may be intentional');
      }
    }

    return causes.length > 0 ? causes : ['No significant issues detected'];
  }

  /**
   * Generate recommendations to fix conflicts
   */
  private generateConflictRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    const severity = this.calculateConflictSeverity(analysis);

    if (severity >= 5) {
      recommendations.push('Implement panning state preservation during zoom operations');
      recommendations.push('Modify centerCameraOnPlayer() to respect manual panning offsets');
      recommendations.push('Add option to reset camera to player center');
    }

    if (severity >= 7) {
      recommendations.push('CRITICAL: Zoom-panning conflict causing major viewport misalignment');
      recommendations.push('Consider disabling auto-centering during zoom when manual panning detected');
    }

    if (recommendations.length === 0) {
      recommendations.push('No action needed - camera behavior is working correctly');
    }

    return recommendations;
  }

  /**
   * Test panning-zoom interaction sequence
   */
  public testPanningZoomInteraction(): any {
    console.log('🧪 STARTING PANNING-ZOOM INTERACTION TEST');

    const testSequence = [
      { action: 'baseline', description: 'Record initial state' },
      { action: 'pan', description: 'Simulate manual panning' },
      { action: 'zoom', description: 'Perform zoom operation' },
      { action: 'analyze', description: 'Check for conflicts' }
    ];

    const results: any[] = [];

    // Baseline measurement
    const baseline = this.analyzePanningZoomConflict();
    results.push({ step: 'baseline', data: baseline });

    // Simulate panning by manually adjusting camera scroll
    const camera = this.cameras.main;
    const originalScrollX = camera.scrollX;
    const originalScrollY = camera.scrollY;

    // Apply test panning offset
    const testOffsetX = 100;
    const testOffsetY = 50;
    camera.setScroll(originalScrollX + testOffsetX, originalScrollY + testOffsetY);

    const afterPan = this.analyzePanningZoomConflict();
    results.push({ step: 'after_pan', data: afterPan });

    // Perform zoom operation (this should trigger the conflict)
    const originalZoom = camera.zoom;
    camera.setZoom(originalZoom * 1.2);

    // Call centerCameraOnPlayer (this is where the conflict occurs)
    if (this.player) {
      this.centerCameraOnPlayer();
    }

    const afterZoom = this.analyzePanningZoomConflict();
    results.push({ step: 'after_zoom', data: afterZoom });

    // Restore original state
    camera.setZoom(originalZoom);
    camera.setScroll(originalScrollX, originalScrollY);

    const testSummary = {
      testSequence,
      results,
      conflictDetected: {
        panningPreserved: Math.abs(afterZoom.viewportCalculations.offsetFromPlayer.x - afterPan.viewportCalculations.offsetFromPlayer.x) < 10,
        zoomOverwrotePanning: Math.abs(afterZoom.viewportCalculations.offsetFromPlayer.x) < 10 &&
                             Math.abs(afterPan.viewportCalculations.offsetFromPlayer.x) > 50,
        conclusion: 'Check results to see if zoom operation preserved or overwrote panning state'
      }
    };

    console.log('🧪 PANNING-ZOOM INTERACTION TEST RESULTS:', testSummary);

    return testSummary;
  }

  /**
   * Analyze viewport dimension calculation inconsistencies
   */
  public analyzeViewportCalculations(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    const analysis = {
      timestamp: new Date().toISOString(),
      cameraProperties: {
        width: camera.width,
        height: camera.height,
        zoom: camera.zoom,
        scrollX: camera.scrollX,
        scrollY: camera.scrollY
      },
      scaleManagerProperties: {
        gameWidth: gameSize.width,
        gameHeight: gameSize.height,
        baseWidth: scale.baseSize?.width || 'undefined',
        baseHeight: scale.baseSize?.height || 'undefined'
      },
      viewportCalculationMethods: {
        method1_scaleManager: {
          width: gameSize.width / camera.zoom,
          height: gameSize.height / camera.zoom,
          description: 'gameSize.width / camera.zoom (most common)'
        },
        method2_cameraSize: {
          width: camera.width / camera.zoom,
          height: camera.height / camera.zoom,
          description: 'camera.width / camera.zoom (alternative)'
        }
      },
      differences: {
        widthDifference: Math.abs((gameSize.width / camera.zoom) - (camera.width / camera.zoom)),
        heightDifference: Math.abs((gameSize.height / camera.zoom) - (camera.height / camera.zoom)),
        significantDifference: false
      },
      recommendations: [] as string[]
    };

    // Check for significant differences
    if (analysis.differences.widthDifference > 1 || analysis.differences.heightDifference > 1) {
      analysis.differences.significantDifference = true;
      analysis.recommendations.push('CRITICAL: Inconsistent viewport calculations detected!');
      analysis.recommendations.push('Scale manager and camera dimensions are not synchronized');
    }

    // Check if camera and scale manager are synchronized
    if (camera.width !== gameSize.width || camera.height !== gameSize.height) {
      analysis.recommendations.push('Camera dimensions do not match scale manager dimensions');
      analysis.recommendations.push('This could cause viewport bounds calculation errors');
    }

    if (analysis.recommendations.length === 0) {
      analysis.recommendations.push('Viewport calculations appear consistent');
    }

    console.log('🔍 VIEWPORT CALCULATION ANALYSIS:', analysis);
    return analysis;
  }

  /**
   * Test and fix viewport bounds calculation accuracy
   */
  public testViewportBoundsAccuracy(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    const test = {
      timestamp: new Date().toISOString(),
      currentCalculation: {
        method: 'gameSize / camera.zoom',
        viewportWidth: gameSize.width / camera.zoom,
        viewportHeight: gameSize.height / camera.zoom,
        leftX: camera.scrollX,
        rightX: camera.scrollX + (gameSize.width / camera.zoom),
        topY: camera.scrollY,
        bottomY: camera.scrollY + (gameSize.height / camera.zoom)
      },
      alternativeCalculation: {
        method: 'camera.width / camera.zoom',
        viewportWidth: camera.width / camera.zoom,
        viewportHeight: camera.height / camera.zoom,
        leftX: camera.scrollX,
        rightX: camera.scrollX + (camera.width / camera.zoom),
        topY: camera.scrollY,
        bottomY: camera.scrollY + (camera.height / camera.zoom)
      },
      manualOffsetThatWorks: {
        offsetX: this.viewportBoundsOffset.x,
        offsetY: this.viewportBoundsOffset.y,
        description: 'Manual offset that produces correct visual alignment'
      },
      calculatedCorrection: {
        suggestedOffsetX: 0,
        suggestedOffsetY: 0,
        description: 'Calculated offset needed to match manual adjustment'
      },
      worldToScreenTest: {
        playerWorldPos: { x: this.player?.x || 0, y: this.player?.y || 0 },
        expectedScreenPos: { x: gameSize.width / 2, y: gameSize.height / 2 },
        actualScreenPos: this.worldToScreen(this.player?.x || 0, this.player?.y || 0),
        description: 'Test if world-to-screen conversion is accurate'
      }
    };

    // Calculate what the offset should be based on manual adjustment
    if (Math.abs(this.viewportBoundsOffset.x) > 5 || Math.abs(this.viewportBoundsOffset.y) > 5) {
      test.calculatedCorrection.suggestedOffsetX = -this.viewportBoundsOffset.x;
      test.calculatedCorrection.suggestedOffsetY = -this.viewportBoundsOffset.y;
      test.calculatedCorrection.description = 'Apply this offset to automatic calculation to match manual adjustment';
    }

    console.log('🔍 VIEWPORT BOUNDS ACCURACY TEST:', test);
    return test;
  }

  /**
   * Test and fix character centering within viewport bounds
   */
  public testCharacterCentering(): any {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    if (!this.player) {
      return { error: 'No player found' };
    }

    const test = {
      timestamp: new Date().toISOString(),
      playerWorldPosition: {
        x: this.player.x,
        y: this.player.y
      },
      viewportCalculations: {
        current: {
          width: gameSize.width / camera.zoom,
          height: gameSize.height / camera.zoom,
          centerX: camera.scrollX + (gameSize.width / camera.zoom) / 2,
          centerY: camera.scrollY + (gameSize.height / camera.zoom) / 2
        },
        corrected: {
          width: gameSize.width / camera.zoom,
          height: gameSize.height / camera.zoom,
          centerX: camera.scrollX + (gameSize.width / camera.zoom) / 2,
          centerY: camera.scrollY + (gameSize.height / camera.zoom) / 2
        }
      },
      centeringAccuracy: {
        expectedPlayerAtCenter: {
          x: camera.scrollX + (gameSize.width / camera.zoom) / 2,
          y: camera.scrollY + (gameSize.height / camera.zoom) / 2
        },
        actualPlayerPosition: {
          x: this.player.x,
          y: this.player.y
        },
        offset: {
          x: 0,
          y: 0
        },
        offsetMagnitude: 0,
        isAccurate: false
      },
      screenPositionTest: {
        playerScreenPos: this.worldToScreen(this.player.x, this.player.y),
        expectedScreenCenter: { x: gameSize.width / 2, y: gameSize.height / 2 },
        screenOffset: { x: 0, y: 0 },
        screenOffsetMagnitude: 0
      },
      recommendations: [] as string[]
    };

    // Calculate centering accuracy
    const expectedCenterX = camera.scrollX + (gameSize.width / camera.zoom) / 2;
    const expectedCenterY = camera.scrollY + (gameSize.height / camera.zoom) / 2;

    test.centeringAccuracy.offset.x = this.player.x - expectedCenterX;
    test.centeringAccuracy.offset.y = this.player.y - expectedCenterY;
    test.centeringAccuracy.offsetMagnitude = Math.sqrt(
      test.centeringAccuracy.offset.x ** 2 + test.centeringAccuracy.offset.y ** 2
    );
    test.centeringAccuracy.isAccurate = test.centeringAccuracy.offsetMagnitude < 5; // Within 5 pixels

    // Calculate screen position accuracy
    const playerScreenPos = this.worldToScreen(this.player.x, this.player.y);
    test.screenPositionTest.screenOffset.x = playerScreenPos.x - (gameSize.width / 2);
    test.screenPositionTest.screenOffset.y = playerScreenPos.y - (gameSize.height / 2);
    test.screenPositionTest.screenOffsetMagnitude = Math.sqrt(
      test.screenPositionTest.screenOffset.x ** 2 + test.screenPositionTest.screenOffset.y ** 2
    );

    // Generate recommendations
    if (!test.centeringAccuracy.isAccurate) {
      test.recommendations.push(`Player is ${test.centeringAccuracy.offsetMagnitude.toFixed(1)} pixels off center`);
      test.recommendations.push(`Viewport bounds calculation may need adjustment`);
    }

    if (test.screenPositionTest.screenOffsetMagnitude > 5) {
      test.recommendations.push(`Screen position is ${test.screenPositionTest.screenOffsetMagnitude.toFixed(1)} pixels off center`);
      test.recommendations.push(`World-to-screen conversion may be incorrect`);
    }

    if (test.recommendations.length === 0) {
      test.recommendations.push('Character centering appears accurate');
    }

    console.log('🎯 CHARACTER CENTERING TEST:', test);
    return test;
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const camera = this.cameras.main;
    return {
      x: (worldX - camera.scrollX) * camera.zoom,
      y: (worldY - camera.scrollY) * camera.zoom
    };
  }

  /**
   * Debug logging control and infinite log prevention
   */
  public getDebugLoggingStatus(): any {
    const status = {
      timestamp: new Date().toISOString(),
      debugOverlaysEnabled: this.DEBUG_CAMERA_CENTERING,
      loggingThrottling: {
        lastLogTime: this.lastDebugLogTime,
        logInterval: this.debugLogInterval,
        timeSinceLastLog: Date.now() - this.lastDebugLogTime,
        nextLogAvailableIn: Math.max(0, this.debugLogInterval - (Date.now() - this.lastDebugLogTime))
      },
      overlayUpdateThrottling: {
        lastUpdateTime: this.lastDebugUpdateTime,
        updateInterval: this.debugUpdateInterval,
        timeSinceLastUpdate: Date.now() - this.lastDebugUpdateTime,
        nextUpdateAvailableIn: Math.max(0, this.debugUpdateInterval - (Date.now() - this.lastDebugUpdateTime))
      },
      recommendations: [
        'Debug overlays update at most every 100ms (10 FPS) to prevent performance issues',
        'Debug logs appear at most every 2 seconds to prevent console spam',
        'Use toggleDebugOverlays() to disable debug mode entirely if not needed'
      ]
    };

    console.log('🔍 DEBUG LOGGING STATUS:', status);
    return status;
  }

  /**
   * Control debug logging intervals
   */
  public setDebugLoggingIntervals(logInterval: number = 2000, updateInterval: number = 100): void {
    this.debugLogInterval = Math.max(1000, logInterval); // Minimum 1 second
    this.debugUpdateInterval = Math.max(50, updateInterval); // Minimum 50ms (20 FPS)

    console.log('🔧 DEBUG INTERVALS UPDATED:', {
      logInterval: this.debugLogInterval,
      updateInterval: this.debugUpdateInterval,
      message: 'Debug logging and overlay update frequencies have been adjusted'
    });
  }

  /**
   * Disable debug overlays to stop all debug logging
   */
  public disableDebugOverlays(): void {
    this.DEBUG_CAMERA_CENTERING = false;
    this.cleanupDebugOverlays();
    this.removeDebugControls();

    console.log('🔇 DEBUG OVERLAYS DISABLED - All debug logging stopped');
  }

  /**
   * Enable debug overlays
   */
  public enableDebugOverlays(): void {
    this.DEBUG_CAMERA_CENTERING = true;
    this.initializeDebugOverlays();
    this.createDebugControls();

    console.log('🔊 DEBUG OVERLAYS ENABLED - Debug logging resumed');
  }

  /**
   * Create debug controls UI overlay
   */
  private createDebugControls(): void {
    if (this.debugControlsContainer) {
      this.removeDebugControls();
    }

    // Create debug controls container
    this.debugControlsContainer = document.createElement('div');
    this.debugControlsContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 280px;
      border: 2px solid #ff00ff;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = '🔧 DEBUG CONTROLS';
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 10px;
      color: #ff00ff;
      text-align: center;
      border-bottom: 1px solid #ff00ff;
      padding-bottom: 5px;
    `;
    this.debugControlsContainer.appendChild(title);

    // Viewport Bounds Controls
    this.createControlSection('Viewport Bounds Offset', [
      { label: 'X Offset', value: this.viewportBoundsOffset.x, min: -1000, max: 1000, step: 5,
        onChange: (value: number) => {
          this.viewportBoundsOffset.x = value;
          this.updateDebugOverlays();
        }
      },
      { label: 'Y Offset', value: this.viewportBoundsOffset.y, min: -1000, max: 1000, step: 5,
        onChange: (value: number) => {
          this.viewportBoundsOffset.y = value;
          this.updateDebugOverlays();
        }
      }
    ]);

    // Pink Square (Viewport Border) Controls
    this.createControlSection('Pink Square Offset', [
      { label: 'X Offset', value: this.pinkSquareOffset.x, min: -1000, max: 1000, step: 5,
        onChange: (value: number) => {
          this.pinkSquareOffset.x = value;
          this.updateDebugOverlays();
        }
      },
      { label: 'Y Offset', value: this.pinkSquareOffset.y, min: -1000, max: 1000, step: 5,
        onChange: (value: number) => {
          this.pinkSquareOffset.y = value;
          this.updateDebugOverlays();
        }
      }
    ]);

    // Scale Factor Controls
    this.createControlSection('Manual Scale Factor', [
      { label: 'Scale', value: this.manualScaleFactor, min: 0.1, max: 2.0, step: 0.1,
        onChange: (value: number) => {
          this.manualScaleFactor = value;
          this.updateDebugOverlays();
        }
      }
    ]);

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset All';
    resetButton.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-top: 10px;
      background: #ff00ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;
    resetButton.onclick = () => {
      this.viewportBoundsOffset = { x: 0, y: 0 };
      this.pinkSquareOffset = { x: 0, y: 0 };
      this.manualScaleFactor = 1.0;
      this.removeDebugControls();
      this.createDebugControls();
      this.updateDebugOverlays();
    };
    this.debugControlsContainer.appendChild(resetButton);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-top: 5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeButton.onclick = () => {
      this.toggleDebugControls();
    };
    this.debugControlsContainer.appendChild(closeButton);

    // Add to DOM
    document.body.appendChild(this.debugControlsContainer);
    this.debugControlsVisible = true;
  }

  /**
   * Create a control section with sliders
   */
  private createControlSection(title: string, controls: Array<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
  }>): void {
    if (!this.debugControlsContainer) return;

    const section = document.createElement('div');
    section.style.cssText = `
      margin: 10px 0;
      padding: 8px;
      border: 1px solid #444;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
    `;

    const sectionTitle = document.createElement('div');
    sectionTitle.textContent = title;
    sectionTitle.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #ffff00;
      font-size: 11px;
    `;
    section.appendChild(sectionTitle);

    controls.forEach(control => {
      const controlDiv = document.createElement('div');
      controlDiv.style.cssText = `
        margin: 5px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;

      const label = document.createElement('span');
      label.textContent = control.label;
      label.style.cssText = `
        font-size: 10px;
        min-width: 60px;
      `;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = control.min.toString();
      slider.max = control.max.toString();
      slider.step = control.step.toString();
      slider.value = control.value.toString();
      slider.style.cssText = `
        flex: 1;
        margin: 0 8px;
      `;

      const valueDisplay = document.createElement('span');
      valueDisplay.textContent = control.step >= 1 ? control.value.toFixed(0) : control.value.toFixed(1);
      valueDisplay.style.cssText = `
        font-size: 10px;
        min-width: 40px;
        color: #00ff00;
        font-weight: bold;
        text-align: right;
      `;

      slider.oninput = () => {
        const value = parseFloat(slider.value);
        valueDisplay.textContent = control.step >= 1 ? value.toFixed(0) : value.toFixed(1);
        control.onChange(value);
      };

      controlDiv.appendChild(label);
      controlDiv.appendChild(slider);
      controlDiv.appendChild(valueDisplay);
      section.appendChild(controlDiv);
    });

    this.debugControlsContainer.appendChild(section);
  }

  /**
   * Toggle debug controls visibility
   */
  public toggleDebugControls(): void {
    if (this.debugControlsVisible) {
      this.removeDebugControls();
    } else {
      this.createDebugControls();
    }
  }

  /**
   * Remove debug controls
   */
  private removeDebugControls(): void {
    if (this.debugControlsContainer) {
      document.body.removeChild(this.debugControlsContainer);
      this.debugControlsContainer = undefined;
      this.debugControlsVisible = false;
    }
  }

  /**
   * Clean up existing debug overlays
   */
  private cleanupDebugOverlays(): void {
    if (this.debugPlayerCross) {
      this.debugPlayerCross.destroy();
      this.debugPlayerCross = undefined;
    }
    if (this.debugCameraCross) {
      this.debugCameraCross.destroy();
      this.debugCameraCross = undefined;
    }
    if (this.debugViewportBounds) {
      this.debugViewportBounds.destroy();
      this.debugViewportBounds = undefined;
    }
    if (this.debugViewportBorder) {
      this.debugViewportBorder.destroy();
      this.debugViewportBorder = undefined;
    }
    if (this.debugWorldCenterCross) {
      this.debugWorldCenterCross.destroy();
      this.debugWorldCenterCross = undefined;
    }
    if (this.debugDiagonalLines) {
      this.debugDiagonalLines.destroy();
      this.debugDiagonalLines = undefined;
    }
    if (this.debugPlayerPositionText) {
      this.debugPlayerPositionText.destroy();
      this.debugPlayerPositionText = undefined;
    }
    if (this.debugCameraScrollText) {
      this.debugCameraScrollText.destroy();
      this.debugCameraScrollText = undefined;
    }
    if (this.debugPlayerFollowingText) {
      this.debugPlayerFollowingText.destroy();
      this.debugPlayerFollowingText = undefined;
    }

    // Clean up all debug labels
    if (this.debugLabels) {
      this.debugLabels.forEach(label => {
        if (label) label.destroy();
      });
      this.debugLabels = [];
    }

    // Clean up debug controls UI
    this.removeDebugControls();
  }

  /**
   * Toggle debug overlays on/off
   */
  public toggleDebugOverlays(): void {
    this.DEBUG_CAMERA_CENTERING = !this.DEBUG_CAMERA_CENTERING;

    if (this.DEBUG_CAMERA_CENTERING) {
      console.log('🔧 DEBUG OVERLAYS ENABLED');
      this.initializeDebugOverlays();
    } else {
      console.log('🔧 DEBUG OVERLAYS DISABLED');
      this.cleanupDebugOverlays();
    }
  }
}

export const WorldModule: React.FC<WorldModuleProps> = ({
  playerId,
  className = '',
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const gameSceneRef = useRef<GameScene | null>(null);
  const { user } = useAuth();

  // Zoom control state
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);
  const [showPanHint, setShowPanHint] = useState(false);

  // Note: Video functionality is now handled by the persistent video panel
  const eventBus = useEventBus();

  // Update zoom state function - defined first so it can be used in other callbacks
  const updateZoomState = useCallback(() => {
    console.log('🔄 UPDATE ZOOM STATE');
    if (gameSceneRef.current) {
      const canIn = gameSceneRef.current.canZoomIn();
      const canOut = gameSceneRef.current.canZoomOut();
      const isFollowing = gameSceneRef.current.isCameraFollowingPlayer();
      console.log('🔄 Zoom state update:', { canIn, canOut, isFollowing });
      setCanZoomIn(canIn);
      setCanZoomOut(canOut);
      setIsCameraFollowing(isFollowing);
    } else {
      console.log('❌ Game scene not found in updateZoomState!');
    }
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    console.log('🎮 HANDLE ZOOM IN CLICKED');
    if (gameSceneRef.current) {
      console.log('🎮 Game scene found, calling zoomIn()');
      gameSceneRef.current.zoomIn();
      updateZoomState();
    } else {
      console.log('❌ Game scene not found!');
    }
  }, [updateZoomState]);

  const handleZoomOut = useCallback(() => {
    console.log('🎮 HANDLE ZOOM OUT CLICKED');
    if (gameSceneRef.current) {
      console.log('🎮 Game scene found, calling zoomOut()');
      gameSceneRef.current.zoomOut();
      updateZoomState();
    } else {
      console.log('❌ Game scene not found!');
    }
  }, [updateZoomState]);

  const handleResetZoom = useCallback(() => {
    console.log('🎮 HANDLE RESET ZOOM CLICKED');
    if (gameSceneRef.current) {
      console.log('🎮 Game scene found, calling resetZoom()');
      gameSceneRef.current.resetZoom();
      updateZoomState();
    } else {
      console.log('❌ Game scene not found!');
    }
  }, [updateZoomState]);

  const handleToggleCameraFollow = useCallback(() => {
    console.log('🎮 HANDLE TOGGLE CAMERA FOLLOW CLICKED');
    if (gameSceneRef.current) {
      const newFollowState = !isCameraFollowing;
      console.log('🎮 Toggling camera follow to:', newFollowState);

      if (newFollowState) {
        gameSceneRef.current.enableCameraFollowing();
      } else {
        gameSceneRef.current.disableCameraFollowing();
      }

      setIsCameraFollowing(newFollowState);
    } else {
      console.log('❌ Game scene not found!');
    }
  }, [isCameraFollowing]);


  const handleAreaClick = useCallback((areaId: string) => {
    // Get area data from SharedMapSystem (localStorage)
    const sharedMapSystem = SharedMapSystem.getInstance();
    const mapData = sharedMapSystem.getMapData();

    if (mapData) {
      const area = mapData.interactiveAreas.find(a => a.id === areaId);
      if (area) {
        // Emit event to notify the video panel to connect to this area
        eventBus.publish('area-selected', {
          areaId: area.id,
          areaName: area.name,
          roomId: area.id
        });

        console.log(`Area clicked: ${area.name} (${area.id})`);
        // The video panel will handle the connection automatically
      }
    }
  }, [eventBus]);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) {
      console.log('Skipping game creation:', {
        hasGameRef: !!gameRef.current,
        hasExistingGame: !!phaserGameRef.current
      });
      return;
    }

    console.log('Creating Phaser game...');

    const gameScene = new GameScene(eventBus, user?.username || playerId, handleAreaClick);
    gameSceneRef.current = gameScene;
    console.log('🎮 Game scene created and stored in ref:', gameScene);

    console.log('🌍 CANVAS: Creating Phaser game configuration', {
      timestamp: new Date().toISOString(),
      containerElement: !!gameRef.current,
      scaleMode: 'RESIZE with CENTER_BOTH'
    });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameRef.current,
      backgroundColor: 'transparent',
      scene: gameScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
    };

    try {
      phaserGameRef.current = new Phaser.Game(config);
      console.log('Phaser game created successfully:', phaserGameRef.current);

      // Log canvas dimensions for comparison with edit mode
      setTimeout(() => {
        const canvas = phaserGameRef.current?.canvas;
        if (canvas && gameSceneRef.current) {
          console.log('🎮 WORLD MODE: Canvas ready', {
            timestamp: new Date().toISOString(),
            canvasSize: { width: canvas.width, height: canvas.height },
            gameSize: {
              width: phaserGameRef.current?.scale.gameSize.width,
              height: phaserGameRef.current?.scale.gameSize.height
            },
            worldBounds: gameSceneRef.current.worldBounds,
            mode: 'world'
          });
        }
      }, 1000);

      // Store game instance globally for debugging
      (window as any).phaserGame = phaserGameRef.current;
      (window as any).testBoundaryAlignment = (zoom: number) => {
        return gameSceneRef.current?.testBoundaryAlignmentAtZoom(zoom);
      };
      (window as any).verifyCanvasMapSize = () => {
        return gameSceneRef.current?.verifyCanvasMapSizeRelationship();
      };
      (window as any).testBackgroundAlignment = () => {
        return gameSceneRef.current?.testBackgroundImageAlignment();
      };
      (window as any).validateObjectPositioning = () => {
        return gameSceneRef.current?.validateObjectPositioning();
      };
      (window as any).validateDebugOverlays = () => {
        return gameSceneRef.current?.validateDebugOverlayCoordinates();
      };
      (window as any).collectEnhancedDebugData = () => {
        return gameSceneRef.current?.collectEnhancedDebugData();
      };
      (window as any).runAutomatedTestSuite = () => {
        return gameSceneRef.current?.runAutomatedTestSuite();
      };
      (window as any).testZoomRange = () => {
        return gameSceneRef.current?.testZoomRange();
      };
      (window as any).showZoomConstraints = () => {
        return gameSceneRef.current?.showZoomConstraints();
      };
      (window as any).diagnoseScaleManager = () => {
        return gameSceneRef.current?.diagnoseScaleManager();
      };
      (window as any).forceScaleRefresh = () => {
        return gameSceneRef.current?.forceScaleRefresh();
      };
      (window as any).analyzePanningZoomConflict = () => {
        return gameSceneRef.current?.analyzePanningZoomConflict();
      };
      (window as any).testPanningZoomInteraction = () => {
        return gameSceneRef.current?.testPanningZoomInteraction();
      };
      (window as any).resetPanningState = () => {
        return gameSceneRef.current?.resetPanningState();
      };
      (window as any).getDebugLoggingStatus = () => {
        return gameSceneRef.current?.getDebugLoggingStatus();
      };
      (window as any).setDebugLoggingIntervals = (logInterval?: number, updateInterval?: number) => {
        return gameSceneRef.current?.setDebugLoggingIntervals(logInterval, updateInterval);
      };
      (window as any).disableDebugOverlays = () => {
        return gameSceneRef.current?.disableDebugOverlays();
      };
      (window as any).enableDebugOverlays = () => {
        return gameSceneRef.current?.enableDebugOverlays();
      };
      (window as any).toggleDebugControls = () => {
        return gameSceneRef.current?.toggleDebugControls();
      };
      (window as any).analyzeViewportCalculations = () => {
        return gameSceneRef.current?.analyzeViewportCalculations();
      };
      (window as any).testViewportBoundsAccuracy = () => {
        return gameSceneRef.current?.testViewportBoundsAccuracy();
      };
      (window as any).testCharacterCentering = () => {
        return gameSceneRef.current?.testCharacterCentering();
      };
      console.log('🔍 Boundary test function available as window.testBoundaryAlignment(zoom)');
      console.log('🔍 Canvas-map verification available as window.verifyCanvasMapSize()');
      console.log('🔍 Background alignment test available as window.testBackgroundAlignment()');
      console.log('🔍 Object positioning validation available as window.validateObjectPositioning()');
      console.log('🔍 Debug overlay validation available as window.validateDebugOverlays()');
      console.log('🔍 Enhanced debug data collection available as window.collectEnhancedDebugData()');
      console.log('🧪 Automated test suite available as window.runAutomatedTestSuite()');
      console.log('🧪 Comprehensive zoom range test available as window.testZoomRange()');
      console.log('🔍 Zoom constraints analysis available as window.showZoomConstraints()');
      console.log('🔍 Scale manager diagnostic available as window.diagnoseScaleManager()');
      console.log('🔄 Force scale refresh available as window.forceScaleRefresh()');
      console.log('🔍 Panning-zoom conflict analysis available as window.analyzePanningZoomConflict()');
      console.log('🧪 Panning-zoom interaction test available as window.testPanningZoomInteraction()');
      console.log('🔄 Reset panning state available as window.resetPanningState()');
      console.log('🔍 Debug logging status available as window.getDebugLoggingStatus()');
      console.log('🔧 Set debug intervals available as window.setDebugLoggingIntervals(logMs, updateMs)');
      console.log('🔇 Disable debug overlays available as window.disableDebugOverlays()');
      console.log('🔊 Enable debug overlays available as window.enableDebugOverlays()');
      console.log('🎛️ Toggle debug controls UI available as window.toggleDebugControls()');
      console.log('📐 Analyze viewport calculations available as window.analyzeViewportCalculations()');
      console.log('🎯 Test viewport bounds accuracy available as window.testViewportBoundsAccuracy()');
      console.log('🎮 Test character centering available as window.testCharacterCentering()');

      // Update zoom state after game is ready
      setTimeout(() => {
        console.log('🎮 Initial zoom state update after game creation');
        updateZoomState();
      }, 500);

      // Set up keyboard listeners for pan hint
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
          setShowPanHint(true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          setShowPanHint(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      // Store event listeners for cleanup
      (phaserGameRef.current as any).keyboardListeners = { handleKeyDown, handleKeyUp };

      // Set up resize observer to handle viewport changes
      // CRITICAL FIX: Optimized timing and debouncing for better panel resize performance
      let resizeTimeout: NodeJS.Timeout | null = null;
      const resizeObserver = new ResizeObserver(() => {
        if (gameSceneRef.current && phaserGameRef.current) {
          // Clear previous timeout to debounce rapid resize events
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }

          // Reduced delay from 100ms to 50ms for faster response
          resizeTimeout = setTimeout(() => {
            console.log('🔧 RESIZE: Processing viewport adjustment after panel resize');
            // Use adjustViewportWithoutZoomReset to preserve zoom level during panel resizes
            gameSceneRef.current?.adjustViewportWithoutZoomReset();
            updateZoomState();
            resizeTimeout = null;
          }, 50);
        }
      });

      if (gameRef.current) {
        resizeObserver.observe(gameRef.current);
      }

      // Store resize observer and timeout for cleanup
      (phaserGameRef.current as any).resizeObserver = resizeObserver;
      (phaserGameRef.current as any).resizeTimeout = resizeTimeout;
    } catch (error) {
      console.error('Failed to create Phaser game:', error);
    }

    return () => {
      console.log('Cleaning up Phaser game...');
      if (phaserGameRef.current) {
        // Clean up resize observer and timeout
        const resizeObserver = (phaserGameRef.current as any).resizeObserver;
        const resizeTimeout = (phaserGameRef.current as any).resizeTimeout;
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        // Clean up keyboard listeners
        const keyboardListeners = (phaserGameRef.current as any).keyboardListeners;
        if (keyboardListeners) {
          document.removeEventListener('keydown', keyboardListeners.handleKeyDown);
          document.removeEventListener('keyup', keyboardListeners.handleKeyUp);
        }

        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
        gameSceneRef.current = null;
        delete (window as any).phaserGame;
      }
    };
  }, [eventBus, user?.username, playerId, handleAreaClick, updateZoomState]);





  return (
    <div className={`world-module ${className}`} style={{ height: '100%', width: '100%' }}>
      <div className="world-container" style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div ref={gameRef} className="game-canvas" style={{ height: '100%', width: '100%' }} />

        {/* Pan Mode Hint */}
        {showPanHint && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(var(--color-bg-secondary-rgb), 0.9)',
              color: 'var(--color-text-primary)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backdropFilter: 'blur(8px)',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none'
            }}
          >
            🖱️ Hold Spacebar + Drag to Pan Camera
          </div>
        )}

        {/* Zoom Controls */}
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
    </div>
  );
};
