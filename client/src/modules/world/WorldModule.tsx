import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { AvatarRenderer as AvatarRendererV2 } from '../../components/avatar/v2';
import { AnimationCategory } from '../../components/avatar/AvatarBuilderTypes';
import { useAuth } from '../../shared/AuthContext';
import { InteractiveArea } from '../../shared/MapDataContext';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { worldDimensionsManager, WorldDimensionsState } from '../../shared/WorldDimensionsManager';
import WorldZoomControls from './WorldZoomControls';
import { makeFocusable, addClickToFocus } from '../../shared/keyboardFocusUtils';

import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import './WorldModule.css';
import { logger } from '../../shared/logger';

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
  private previousArea: string | null = null; // Track previous area for entry/exit detection
  private mapRenderer!: PhaserMapRenderer;
  private sharedMapSystem!: SharedMapSystem;
  public avatarRendererV2!: AvatarRendererV2; // V2 renderer

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
  private defaultZoom: number = 1;
  private staticMinZoom: number = 0.25; // Fallback minimum zoom
  private maxZoom: number = 2; // Updated: max zoom is now 1.65 (165%)
  private zoomStep: number = 0.25;
  public worldBounds = { width: 7603, height: 3679 }; // Updated to match actual map dimensions from localStorage

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

  // Character following properties (now handled by native Phaser camera)
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;

  // Simplified debug logging (no visual overlays)
  private DEBUG_CAMERA_CENTERING: boolean = false; // Disabled by default
  private lastDebugLogTime: number = 0;
  private debugLogInterval: number = 2000; // Log at most every 2 seconds

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
    // Ensure we never have a stale texture for the player-sheet key!
    if (this.textures.exists('player-sheet')) {
      this.textures.remove('player-sheet');
    }
    // Load custom player sprite sheet as default player sprite
    this.load.spritesheet('player-sheet', 'assets/test frame.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

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

    // Instructions removed for cleaner UI

    // Initialize and render map from localStorage
    this.mapRenderer.initialize().then(() => {
      // Update world bounds from map data
      this.updateWorldBoundsFromMapData();
    }).catch(error => {
      logger.error('Failed to load map data from localStorage', error);
      // Continue with empty map if loading fails
    });

    // Set up interactive area click handling
    this.events.on('interactiveAreaClicked', (area: InteractiveArea) => {
      this.onAreaClick(area.id);
    });

    // Initialize avatar renderer V2
    this.avatarRendererV2 = new AvatarRendererV2(this);

    // Set camera background color to transparent to show background image
    this.cameras.main.setBackgroundColor('transparent');

    // Set up camera bounds and initial zoom
    this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

    // Create animations for player sprite sheet
    // Explicit frame mapping for each animation row (3 frames per row)
    // idle: 0,1,2 | left: 3,4,5 | right: 6,7,8 | up: 9,10,11 | down: 12,13,14 | jump: 15,16,17 | attack: 18,19,20
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [0, 1, 2] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_left',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [3, 4, 5] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_right',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [6, 7, 8] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_up',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [9, 10, 11] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_down',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [12, 13, 14] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_jump',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [15, 16, 17] }),
      frameRate: 8,
      repeat: 0
    });
    this.anims.create({
      key: 'player_attack',
      frames: this.anims.generateFrameNumbers('player-sheet', { frames: [18, 19, 20] }),
      frameRate: 8,
      repeat: 0
    });

    // Debug: Add animation cycle on click (Phaser-inspired)
    const animKeys = [
      'player_idle',
      'player_left',
      'player_right',
      'player_up',
      'player_down',
      'player_jump',
      'player_attack'
    ];
    let animIndex = 0;
    this.input.on('pointerdown', () => {
      animIndex = (animIndex + 1) % animKeys.length;
      this.player.anims.play(animKeys[animIndex], true);
      this.add.text(this.player.x + 34, this.player.y - 34, 'Anim: ' + animKeys[animIndex], { color: '#0f0', fontSize: '14px' }).setDepth(100).setScrollFactor(0).setAlpha(0.6).setOrigin(0, 0.5);
    });

    // Calculate initial player position based on world bounds (center of world)
    const initialX = this.worldBounds.width / 2;
    const initialY = this.worldBounds.height / 2;

    // Create player from sprite sheet and play idle animation
    this.player = this.add.sprite(initialX, initialY, 'player-sheet', 0);
    this.player.setDisplaySize(32, 32); // Use native sprite frame size for crisp animation
    this.player.setOrigin(0.5, 0.5); // Ensure sprite is centered on its position
    this.player.setDepth(10);
    this.originalY = this.player.y;
    this.player.anims.play('player_idle');

    // Initialize native Phaser camera following
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Set default zoom and center on player initially
    this.time.delayedCall(100, () => {
      this.setDefaultZoomAndCenter();
    });

    // Player creation logging removed for cleaner console

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

    // Set up scroll wheel zoom controls
    this.setupScrollWheelZoom();

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

    // Listen for V2 character switching events
    this.setupCharacterSwitchingV2();
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

  /**
   * Set up V2 character switching event listener
   */
  private setupCharacterSwitchingV2(): void {
    // Listen for characterSwitchedV2 custom event from MyProfileTab
    window.addEventListener('characterSwitchedV2', async (event) => {
      const customEvent = event as CustomEvent;
      const { username, slotNumber } = customEvent.detail;

      // Only handle events for this player
      if (username !== this.playerId) {
        return;
      }

      logger.info(`[WorldModule] Character switched to slot ${slotNumber} for ${username}`);

      // Update player sprite with new character
      await this.updatePlayerCharacterV2(slotNumber);
    });
  }

  /**
   * Update player character sprite using V2 renderer
   */
  private async updatePlayerCharacterV2(slotNumber: number): Promise<void> {
    if (!this.player) {
      logger.warn('[WorldModule] Cannot update character - player sprite not initialized');
      return;
    }

    try {
      // Store current position
      const currentX = this.player.x;
      const currentY = this.player.y;

      // Create or update sprite using V2 renderer
      const newSprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        currentX,
        currentY,
        slotNumber
      );

      if (newSprite) {
        // Replace the old player sprite with the new one
        this.player.destroy();
        this.player = newSprite;
        this.player.setOrigin(0.5, 0.5);
        this.player.setDepth(10);

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        logger.info(`[WorldModule] Successfully updated player character to slot ${slotNumber}`);
      } else {
        logger.warn(`[WorldModule] Failed to create sprite for slot ${slotNumber}`);
      }
    } catch (error) {
      logger.error('[WorldModule] Error updating player character:', error);
    }
  }

  async initializePlayer() {
    // Try V2 system first (NEW)
    try {
      const v2Sprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        this.player.x,
        this.player.y
      );

      if (v2Sprite) {
        // Successfully loaded from V2 system
        const oldX = this.player.x;
        const oldY = this.player.y;
        this.player.destroy();

        this.player = v2Sprite;
        this.player.setPosition(oldX, oldY);
        this.player.setOrigin(0.5, 0.5);
        this.player.setDepth(10);

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        logger.info('[WorldModule] Player initialized with V2 character system');

        // Announce player joined
        this.eventBus.publish('world:playerJoined', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });

        this.time.delayedCall(50, () => {
          this.setDefaultZoomAndCenter();
          this.enableCameraFollowing();
          this.centerCameraOnPlayer();
        });

        return; // Successfully initialized with V2 system
      }
    } catch (error) {
      logger.info('[WorldModule] No V2 character found, using default sprite');

      // Announce player joined with default sprite
      this.eventBus.publish('world:playerJoined', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
      });

      // Apply camera settings after player is fully initialized
      this.time.delayedCall(50, () => {
        this.setDefaultZoomAndCenter();
        this.enableCameraFollowing();
        this.centerCameraOnPlayer();
      });
    }
  }

  /**
   * Check if the game canvas has focus
   * Only process keyboard input when canvas is focused
   */
  private canvasHasFocus(): boolean {
    return document.activeElement === this.game.canvas;
  }

  private setupKeyHandlers() {
    // Jump action (Spacebar)
    this.spaceKey.on('down', () => {
      if (this.canvasHasFocus()) {
        this.performJump();
      }
    });

    // Fire action (X key)
    this.xKey.on('down', () => {
      if (this.canvasHasFocus()) {
        this.performFire();
      }
    });

    // Rotation toggle (O key)
    this.oKey.on('down', () => {
      if (this.canvasHasFocus()) {
        this.toggleRotation();
      }
    });
  }

  private performJump() {
    if (this.isJumping) return; // Prevent multiple jumps

    this.isJumping = true;
    const jumpHeight = 60;
    const jumpDuration = 600;
    const horizontalDistance = 120; // Distance to move horizontally during jump

    // Determine jump direction based on current input
    let jumpDirection: 'left' | 'right' | 'none' = 'none';
    let targetX = this.player.x;

    // Check for directional input during jump
    if (this.cursors.left.isDown) {
      jumpDirection = 'left';
      targetX = this.player.x - horizontalDistance;
    } else if (this.cursors.right.isDown) {
      jumpDirection = 'right';
      targetX = this.player.x + horizontalDistance;
    }

    // Constrain horizontal movement to world bounds
    targetX = Phaser.Math.Clamp(targetX, this.playerSize / 2, this.worldBounds.width - this.playerSize / 2);

    // Check for collision at target position
    if (this.checkCollisionWithImpassableAreas(targetX, this.player.y, this.playerSize)) {
      // If collision detected, reduce jump distance
      const reducedDistance = horizontalDistance * 0.5;
      if (jumpDirection === 'left') {
        targetX = Math.max(this.player.x - reducedDistance, this.playerSize / 2);
      } else if (jumpDirection === 'right') {
        targetX = Math.min(this.player.x + reducedDistance, this.worldBounds.width - this.playerSize / 2);
      }

      // Check again with reduced distance
      if (this.checkCollisionWithImpassableAreas(targetX, this.player.y, this.playerSize)) {
        targetX = this.player.x; // No horizontal movement if still colliding
        jumpDirection = 'none';
      }
    }

    // Create arc-shaped jump animation
    if (jumpDirection !== 'none') {
      // Directional jump with arc movement
      this.tweens.add({
        targets: this.player,
        x: targetX,
        y: this.originalY - jumpHeight,
        duration: jumpDuration / 2,
        ease: 'Power2',
        onComplete: () => {
          // Second half of jump (landing)
          this.tweens.add({
            targets: this.player,
            y: this.originalY,
            duration: jumpDuration / 2,
            ease: 'Power2',
            onComplete: () => {
              this.isJumping = false;
              this.originalY = this.player.y;

              // Publish movement event for directional jumps
              this.eventBus.publish('world:playerMoved', {
                playerId: this.playerId,
                x: this.player.x,
                y: this.player.y,
              });
            }
          });
        }
      });
    } else {
      // Vertical jump only (original behavior)
      this.tweens.add({
        targets: this.player,
        y: this.originalY - jumpHeight,
        duration: jumpDuration / 2,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          this.isJumping = false;
          this.originalY = this.player.y;
        }
      });
    }

    // Add visual effect for jump
    this.createJumpEffect(jumpDirection);
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

  private createJumpEffect(jumpDirection: 'left' | 'right' | 'none' = 'none') {
    // Create dust cloud effect at player's feet
    const dustCloud = this.add.graphics();
    dustCloud.fillStyle(0xD2B48C, 0.6);
    dustCloud.fillCircle(this.player.x, this.originalY + 16, 20);
    dustCloud.setDepth(5);

    // Create directional dust particles for directional jumps
    if (jumpDirection !== 'none') {
      const particleCount = 5;
      for (let i = 0; i < particleCount; i++) {
        const particle = this.add.graphics();
        particle.fillStyle(0xD2B48C, 0.4);
        particle.fillCircle(0, 0, 3);
        particle.setPosition(
          this.player.x + (Math.random() - 0.5) * 20,
          this.originalY + 16 + (Math.random() - 0.5) * 10
        );
        particle.setDepth(5);

        // Animate particles in jump direction
        const particleTargetX = jumpDirection === 'left' ?
          particle.x - 30 - Math.random() * 20 :
          particle.x + 30 + Math.random() * 20;

        this.tweens.add({
          targets: particle,
          x: particleTargetX,
          y: particle.y - 10 - Math.random() * 15,
          alpha: 0,
          duration: 300 + Math.random() * 200,
          ease: 'Power2',
          onComplete: () => {
            particle.destroy();
          }
        });
      }
    }

    // Animate main dust cloud
    this.tweens.add({
      targets: dustCloud,
      scaleX: jumpDirection !== 'none' ? 2.5 : 2,
      scaleY: jumpDirection !== 'none' ? 2.5 : 2,
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
    // Only process keyboard input when canvas has focus
    if (!this.canvasHasFocus()) {
      return;
    }

    // Only allow movement if player exists and not jumping
    if (!this.isJumping && this.player) {
      const speed = 250;
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

      // Play appropriate animation - Try V2 renderer first (PRIMARY)
      if (this.avatarRendererV2.hasSprite(this.playerId)) {
        if (moved) {
          // Determine animation category based on direction
          let animCategory: AnimationCategory;
          switch (direction) {
            case 'up':
              animCategory = AnimationCategory.WALK_UP;
              break;
            case 'down':
              animCategory = AnimationCategory.WALK_DOWN;
              break;
            case 'left':
              animCategory = AnimationCategory.WALK_LEFT;
              break;
            case 'right':
              animCategory = AnimationCategory.WALK_RIGHT;
              break;
            default:
              animCategory = AnimationCategory.IDLE;
          }
          this.avatarRendererV2.playAnimation(this.playerId, animCategory);
        } else {
          // Play idle animation when not moving
          this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);
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
    // Clean up avatar renderer V2
    if (this.avatarRendererV2) {
      this.avatarRendererV2.cleanup();
    }

    // Clean up map renderer
    if (this.mapRenderer) {
      this.mapRenderer.destroy();
    }

    // Clean up scroll wheel event listener
    const canvas = this.game.canvas;
    const wheelHandler = (this as any).wheelEventHandler;
    if (canvas && wheelHandler) {
      canvas.removeEventListener('wheel', wheelHandler);
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
   * Uses two-phase detection: quick AABB check first, then precise polygon check
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

    // 🔍 DEBUG: Log collision check (increased frequency for debugging)
    if (Math.random() < 0.05) { // Log 5% of checks (increased from 1%)
      console.log('🔍 [Collision] Checking impassable areas:', {
        totalAreas: mapData.impassableAreas.length,
        polygonAreas: mapData.impassableAreas.filter(a => a.type === 'impassable-polygon').length,
        rectangleAreas: mapData.impassableAreas.filter(a => a.type !== 'impassable-polygon').length,
        playerPos: { x, y },
        playerBounds: { left: playerLeft, right: playerRight, top: playerTop, bottom: playerBottom },
        polygonDetails: mapData.impassableAreas
          .filter(a => a.type === 'impassable-polygon')
          .map(a => ({
            id: a.id,
            boundingBox: { x: a.x, y: a.y, width: a.width, height: a.height },
            pointsCount: a.points?.length || 0
          }))
      });
    }

    // Check collision with each impassable area
    for (const area of mapData.impassableAreas) {
      // Check if this is a polygon type
      if (area.type === 'impassable-polygon' && area.points && area.points.length > 0) {
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

        // Check for overlap using AABB (Axis-Aligned Bounding Box) collision detection
        if (playerLeft < areaRight &&
            playerRight > areaLeft &&
            playerTop < areaBottom &&
            playerBottom > areaTop) {
          // Collision detected
          return true;
        }
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
    let currentlyInArea: string | null = null;

    // Find which area player is currently in
    areas.forEach(area => {
      // Check if player is within area bounds
      if (this.player.x >= area.x &&
          this.player.x <= area.x + area.width &&
          this.player.y >= area.y &&
          this.player.y <= area.y + area.height) {
        currentlyInArea = area.id;
      }
    });

    // Detect area changes and emit events for Jitsi auto-join/leave
    if (currentlyInArea !== this.previousArea) {
      // Exited previous area
      if (this.previousArea && !shouldBlockBackgroundInteractions()) {
        const previousAreaData = areas.find(a => a.id === this.previousArea);
        if (previousAreaData) {
          this.eventBus.publish('area-exited', {
            areaId: previousAreaData.id,
            areaName: previousAreaData.name
          });
        }
      }

      // Entered new area
      if (currentlyInArea && !shouldBlockBackgroundInteractions()) {
        const currentAreaData = areas.find(a => a.id === currentlyInArea);
        if (currentAreaData) {
          this.eventBus.publish('area-entered', {
            areaId: currentAreaData.id,
            areaName: currentAreaData.name,
            roomId: currentAreaData.id // Use area ID as default room ID
          });

          // Also trigger the legacy area click handler for backward compatibility
          this.onAreaClick(currentAreaData.id);
        }
      }

      this.previousArea = currentlyInArea;
    }

    this.currentArea = currentlyInArea;

    // Camera following is now handled natively by Phaser
  }

  // Camera panning setup
  private setupCameraPanning(): void {

    // Mouse/pointer events for panning
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Support both spacebar + left click and middle mouse button for panning
      if (this.spaceKey.isDown || pointer.button === 1) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = this.cameras.main.scrollX;
        this.panStartScrollY = this.cameras.main.scrollY;
        // Disable camera following during manual panning
        this.cameras.main.stopFollow();

        // Change cursor to indicate panning mode
        this.game.canvas.style.cursor = 'grabbing';

        // Update React UI state to show camera follow is OFF
        if (window && window.dispatchEvent) {
          const evt = new CustomEvent('phaser-camera-follow-changed', { detail: false });
          window.dispatchEvent(evt);
        }

        // Removed: Non-critical panning started log.
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Support panning with either spacebar + drag or middle mouse drag
      if (this.isPanning && (this.spaceKey.isDown || pointer.button === 1)) {
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

        // Removed: Non-critical panning ended log.
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
   * Set up scroll wheel zoom controls
   */
  private setupScrollWheelZoom(): void {
    // Add wheel event listener to the game canvas
    const canvas = this.game.canvas;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault(); // Prevent page scrolling

      // Determine zoom direction based on wheel delta
      const zoomDirection = event.deltaY > 0 ? 'out' : 'in';
      const camera = this.cameras.main;
      const currentZoom = camera.zoom;

      // Calculate new zoom level
      let newZoom: number;
      if (zoomDirection === 'in') {
        newZoom = Math.min(currentZoom + this.zoomStep, this.maxZoom);
        if (currentZoom >= this.maxZoom) {
          return; // Already at max zoom
        }
      } else {
        const dynamicMinZoom = this.minZoom;
        newZoom = Math.max(currentZoom - this.zoomStep, dynamicMinZoom);
        if (currentZoom <= dynamicMinZoom) {
          return; // Already at min zoom
        }
      }

      // Removed: Non-critical scroll wheel zoom log.

      // Apply zoom with smooth animation
      camera.zoomTo(newZoom, 200, 'Power2');

      // Re-enable camera following and center on player (same as zoom buttons)
      this.enableCameraFollowing();
      this.centerCameraOnPlayer();
    };

    // Add event listener
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Store reference for cleanup
    (this as any).wheelEventHandler = handleWheel;
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

    // Re-enable camera following
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    // Removed: Non-critical panning state reset log.
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



  // Camera control methods (simplified for native Phaser following)
  public enableCameraFollowing(): void {
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }
  }

  public disableCameraFollowing(): void {
    this.cameras.main.stopFollow();
  }

  public setFollowSettings(lerpFactor: number, deadZone: number): void {
    // Native Phaser following settings are set during startFollow()
    // Removed: Non-critical follow settings updated log.
  }

  public isCameraFollowingPlayer(): boolean {
    // Check if camera is following by looking at the internal _follow property
    return (this.cameras.main as any)._follow !== null;
  }

  /**
   * Set camera follow offset for custom positioning (simplified for native Phaser)
   */
  public setCameraFollowOffset(x: number, y: number): void {
    // Removed: Non-critical camera follow offset set log.
  }

  /**
   * Set adaptive lerp factor range (simplified for native Phaser)
   */
  public setAdaptiveLerpRange(min: number, max: number): void {
    // Removed: Non-critical adaptive lerp range set log.
  }

  /**
   * Instantly center camera on player (no lerp) - ENHANCED with panning state preservation
   */
  public centerCameraOnPlayer(): void {
    if (!this.player) {
      logger.warn('CAMERA CENTERING: No player found');
      return;
    }

    const camera = this.cameras.main;

    // Simplified centering with native Phaser camera
    if (this.hasManuallePanned) {
      // Preserve manual panning offset during zoom operations
      const scale = this.scale;
      const gameSize = scale.gameSize;
      const viewportWidth = gameSize.width / camera.zoom;
      const viewportHeight = gameSize.height / camera.zoom;

      const targetCenterX = this.player.x + this.panOffsetFromPlayer.x;
      const targetCenterY = this.player.y + this.panOffsetFromPlayer.y;
      const targetScrollX = targetCenterX - viewportWidth / 2;
      const targetScrollY = targetCenterY - viewportHeight / 2;

      const constrainedScroll = this.constrainCameraToWorldBounds(targetScrollX, targetScrollY);
      camera.setScroll(constrainedScroll.x, constrainedScroll.y);

      // Removed: Non-critical camera centered with panning offset log.
    } else {
      // Standard centering - native Phaser handles this
      camera.centerOn(this.player.x, this.player.y);
      this.updatePanOffsetFromPlayer();
      // Removed: Non-critical camera centered on player log.
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

    // Removed: Non-critical camera centered on player (zoom-corrected) log.


  }

  /**
   * AUTHORITATIVE world bounds update method
   * All other world bounds updates should delegate to this method
   */
  private updateWorldBounds(width: number, height: number, source: string): void {
    // Removed: Non-critical authoritative world bounds update log.

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

        logger.info('PLAYER repositioned to new world center', {
          oldPosition: { x: oldCenterX, y: oldCenterY },
          newPosition: { x: newCenterX, y: newCenterY },
          reason: 'world bounds changed significantly'
        });
      }
    }

    // Synchronize camera dimensions after bounds update
    this.synchronizeCameraDimensions();



    // Set default zoom and center on player with new dimensions
    this.time.delayedCall(100, () => {
      this.setDefaultZoomAndCenter();
    });

    // Recalculate zoom constraints with new world bounds
    const newMinZoom = this.calculateMinZoom();

    // Removed: Non-critical bounds update complete log.
  }

  // Update world bounds from background image dimensions (called by PhaserMapRenderer)
  // CRITICAL FIX: Cap world bounds to reasonable dimensions to prevent coordinate system issues
  public updateWorldBoundsFromBackgroundImage(imageWidth: number, imageHeight: number): void {
    // Removed: Non-critical updating world bounds from background image log.

    // CRITICAL FIX: Cap world bounds to reasonable maximums
    // Background images can be large for detail, but world bounds should be reasonable for gameplay
    const MAX_WORLD_WIDTH = 4000;  // Reasonable maximum for world width
    const MAX_WORLD_HEIGHT = 3000; // Reasonable maximum for world height
    const MIN_WORLD_WIDTH = 800;   // Minimum for gameplay
    const MIN_WORLD_HEIGHT = 600;  // Minimum for gameplay

    // Calculate reasonable world bounds
    const reasonableWidth = Math.max(MIN_WORLD_WIDTH, Math.min(MAX_WORLD_WIDTH, imageWidth));
    const reasonableHeight = Math.max(MIN_WORLD_HEIGHT, Math.min(MAX_WORLD_HEIGHT, imageHeight));

    // Removed: Non-critical applying reasonable world bounds limits log.

    // Delegate to the authoritative world bounds update method with reasonable dimensions
    this.updateWorldBounds(reasonableWidth, reasonableHeight, 'backgroundImage-capped');
  }

  // Update world bounds from WorldDimensionsManager (authoritative source)
  // SIMPLIFIED: This method now uses WorldDimensionsManager as single source of truth
  private updateWorldBoundsFromMapData(): void {
    try {
      // Get effective dimensions from WorldDimensionsManager (authoritative)
      const effectiveDimensions = worldDimensionsManager.getEffectiveDimensions();

      // Removed: Non-critical using WorldDimensionsManager effective dimensions log.

      // Update world bounds with effective dimensions
      this.updateWorldBounds(
        effectiveDimensions.width,
        effectiveDimensions.height,
        'WorldDimensionsManager-effective'
      );
    } catch (error) {
      logger.error('BOUNDS: Failed to get dimensions from WorldDimensionsManager', error);

      // Fallback to SharedMapSystem for backward compatibility
      const mapData = this.sharedMapSystem.getMapData();
      if (mapData && mapData.worldDimensions) {
        logger.warn('BOUNDS: Falling back to SharedMapSystem dimensions');
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
      // Removed: Non-critical dimension change received log.

      // Check if dimensions actually changed to prevent unnecessary updates
      const currentBounds = this.worldBounds;
      const newDimensions = state.effectiveDimensions;

      if (currentBounds.width !== newDimensions.width ||
          currentBounds.height !== newDimensions.height) {

        // Removed: Non-critical updating world bounds from WorldDimensionsManager log.

        // Update world bounds directly with effective dimensions
        this.updateWorldBounds(
          newDimensions.width,
          newDimensions.height,
          `WorldDimensionsManager-${state.source}`
        );
      } else {
        // Removed: Non-critical dimension change ignored log.
      }
    });

    // Store unsubscribe function for cleanup
    this.events.once('destroy', () => {
      // Removed: Non-critical cleaning up WorldDimensionsManager subscription log.
      unsubscribe();
    });
  }

  /**
   * Set up scale manager synchronization to fix dimension mismatch issues
   * CRITICAL FIX: Ensures camera dimensions stay synchronized with scale manager
   */
  private setupScaleManagerSync(): void {
    // Removed: Non-critical setting up scale manager synchronization log.

    // Listen for scale manager resize events
    this.scale.on('resize', (gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number) => {
      // Removed: Non-critical scale manager resize event triggered log.

      // Synchronize camera dimensions with game size
      this.synchronizeCameraDimensions();
    });

    // Initial synchronization
    this.time.delayedCall(100, () => {
      this.synchronizeCameraDimensions();
    });

    // Removed: Non-critical scale manager synchronization setup complete log.
  }

  /**
   * Synchronize camera dimensions with scale manager game size
   * This fixes the dimension mismatch that causes boundary alignment issues
   */
  private synchronizeCameraDimensions(): void {
    const camera = this.cameras.main;
    const scale = this.scale;
    const gameSize = scale.gameSize;

    // Removed: Non-critical synchronizing camera dimensions log.

    // Force camera to match game size exactly
    if (camera.width !== gameSize.width || camera.height !== gameSize.height) {
      // Update camera viewport size to match scale manager game size
      camera.setSize(gameSize.width, gameSize.height);

      // Removed: Non-critical camera dimensions updated log.

      // Update debug overlays if they exist
      if (this.DEBUG_CAMERA_CENTERING) {
        this.updateDebugOverlays();
      }
    } else {
      // Removed: Non-critical camera dimensions already synchronized log.
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
   * Simplified debug overlay methods (disabled by default)
   */
  private shouldUpdateDebugOverlays(): boolean {
    return false; // Always disabled
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

    // logger.debug('DYNAMIC MIN ZOOM CALCULATION', {
    //   worldBounds: this.worldBounds,
    //   viewportSize: { width: gameSize.width, height: gameSize.height },
    //   zoomForWidth,
    //   zoomForHeight,
    //   calculatedMinZoom,
    //   staticMinZoom: this.staticMinZoom,
    //   finalMinZoom,
    //   zoomPercentage: `${Math.round(finalMinZoom * 100)}%`
    // });

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
      return;
    }

    // logger.debug('ZOOM IN', {
    //   currentZoom,
    //   newZoom,
    //   zoomStep: this.zoomStep,
    //   maxZoom: this.maxZoom
    // });

    // Use Phaser's native camera zoom animation - following is maintained automatically
    camera.zoomTo(newZoom, 400, 'Power2');
  }

  public zoomOut(): void {
    const camera = this.cameras.main;
    const currentZoom = camera.zoom;
    const dynamicMinZoom = this.minZoom;
    const newZoom = Math.max(currentZoom - this.zoomStep, dynamicMinZoom);

    if (currentZoom <= dynamicMinZoom) {
      return;
    }

    // logger.debug('ZOOM OUT (Native Phaser):', {
    //   currentZoom,
    //   newZoom,
    //   zoomStep: this.zoomStep,
    //   dynamicMinZoom
    // });

    // Use Phaser's native camera zoom animation - following is maintained automatically
    camera.zoomTo(newZoom, 400, 'Power2');
  }

  public resetZoom(): void {

    // Use the existing setDefaultZoomAndCenter method which sets zoom to 1.65 and centers on player
    this.setDefaultZoomAndCenter();

  }

  public canZoomIn(): boolean {
    const currentZoom = this.cameras.main.zoom;
    const canZoom = currentZoom < this.maxZoom;

    // logger.debug('CAN ZOOM IN', {
    //   currentZoom,
    //   currentZoomPercentage: `${Math.round(currentZoom * 100)}%`,
    //   maxZoom: this.maxZoom,
    //   maxZoomPercentage: `${Math.round(this.maxZoom * 100)}%`,
    //   canZoom,
    //   reason: canZoom ? 'Can zoom in further' : 'Already at maximum zoom (165%)'
    // });
    return canZoom;
  }

  public canZoomOut(): boolean {
    const currentZoom = this.cameras.main.zoom;
    const dynamicMinZoom = this.minZoom;
    const canZoom = currentZoom > dynamicMinZoom;

    // logger.debug('CAN ZOOM OUT', {
    //   currentZoom,
    //   currentZoomPercentage: `${Math.round(currentZoom * 100)}%`,
    //   dynamicMinZoom,
    //   minZoomPercentage: `${Math.round(dynamicMinZoom * 100)}%`,
    //   canZoom,
    //   reason: canZoom ? 'Can zoom out further' : 'Map already fits viewport'
    // });
    return canZoom;
  }

  /**
   * Set default zoom level and center camera on player
   * Configures camera with 165% zoom, centers on player, and enables following
   */
  public setDefaultZoomAndCenter(): void {
    // Prevent multiple simultaneous calls
    if (this.isSettingDefaultZoom) {
      return;
    }

    this.isSettingDefaultZoom = true;
    const camera = this.cameras.main;

    // logger.debug('SETTING DEFAULT ZOOM', {
    //   defaultZoom: this.defaultZoom,
    //   currentZoom: camera.zoom
    // });

    // Use Phaser's native camera zoom - following handles centering automatically
    camera.zoomTo(this.defaultZoom, 300, 'Power2', false, () => {
      this.isSettingDefaultZoom = false;
    });

    // Debug overlays disabled for performance

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

    // logger.debug('FIT MAP TO VIEWPORT', {
    //   gameWidth,
    //   gameHeight,
    //   worldBounds: this.worldBounds,
    //   currentZoom: camera.zoom,
    //   playerExists: !!this.player
    // });

    if (gameWidth === 0 || gameHeight === 0) {
      return;
    }

    // Calculate the zoom level needed to fit the entire world in the viewport
    const scaleX = gameWidth / this.worldBounds.width;
    const scaleY = gameHeight / this.worldBounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);

    // logger.debug('FIT MAP CALCULATIONS', {
    //   scaleX,
    //   scaleY,
    //   fitZoom
    // });

    // Set the new zoom level
    camera.setZoom(fitZoom);

    // If player exists, re-center camera on player to maintain player centering
    // Otherwise, center on world center as fallback
    if (this.player) {
      this.centerCameraOnPlayer();
    } else {
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
    }

    // logger.debug('FIT MAP RESULT', {
    //   finalZoom: camera.zoom,
    //   scrollX: camera.scrollX,
    //   scrollY: camera.scrollY,
    //   playerCentered: !!this.player
    // });

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

    // logger.debug('ADJUST VIEWPORT WITHOUT ZOOM RESET', {
    //   gameWidth,
    //   gameHeight,
    //   worldBounds: this.worldBounds,
    //   currentZoom: camera.zoom,
    //   playerExists: !!this.player
    // });

    if (gameWidth === 0 || gameHeight === 0) {
      return;
    }

    // Preserve the current zoom level - DO NOT CHANGE IT
    const preservedZoom = camera.zoom;

    // Update camera bounds to match the new viewport size
    // This ensures the camera system knows about the new container dimensions
    camera.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

    // Re-center camera on player to maintain player centering with preserved zoom
    if (this.player) {
      this.centerCameraOnPlayer();
    } else {
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
    }

    // logger.debug('VIEWPORT ADJUSTMENT RESULT', {
    //   preservedZoom,
    //   finalZoom: camera.zoom,
    //   scrollX: camera.scrollX,
    //   scrollY: camera.scrollY,
    //   playerCentered: !!this.player,
    //   zoomWasPreserved: camera.zoom === preservedZoom
    // });

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }
  }



  /**
   * Debug overlay creation methods (disabled for performance)
   */
  private createDebugCrosshairs(): void {
    // Debug overlays disabled for performance
  }

  private createDebugViewportBounds(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Create debug text overlays (disabled for performance)
   */
  private createDebugTextOverlays(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Update debug overlays (disabled for performance)
   */
  private updateDebugOverlays(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Draw enhanced crosshair (disabled for performance)
   */
  private drawEnhancedCrosshair(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size: number, label: string): void {
    // Debug overlays disabled for performance
  }

  /**
   * Draw diagonal center lines (disabled for performance)
   */
  private drawDiagonalCenterLines(viewportWidth: number, viewportHeight: number): void {
    // Debug overlays disabled for performance
  }

  /**
   * Create or update label (disabled for performance)
   */
  private createOrUpdateLabel(x: number, y: number, text: string, color: number): void {
    // Debug overlays disabled for performance
  }

  /**
   * Clear debug labels (disabled for performance)
   */
  private clearDebugLabels(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Draw viewport bounds (disabled for performance)
   */
  private drawViewportBounds(viewportWidth: number, viewportHeight: number): void {
    // Debug overlays disabled for performance
  }

  /**
   * Automated test suite (disabled for performance)
   */
  public runAutomatedTestSuite(): any {
    return { message: 'Debug test suite disabled for performance' };
  }

  /**
   * Debug test methods (disabled for performance)
   */
  private runMultiZoomTest(): any {
    return { message: 'Debug test disabled for performance' };
  }

  private runPanelResizeTest(): any {
    return { message: 'Debug test disabled for performance' };
  }

  private runBackgroundChangeTest(): any {
    return { message: 'Debug test disabled for performance' };
  }

  private runObjectPositionTest(): any {
    return { message: 'Debug test disabled for performance' };
  }

  private runPerformanceTest(): any {
    return { message: 'Debug test disabled for performance' };
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
      debugOverlayAccuracy: true, // Debug overlays disabled
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

    return enhancedDebugData;
  }

  /**
   * Validate debug overlay coordinate systems (disabled for performance)
   */
  public validateDebugOverlayCoordinates(): any {
    // Debug validation disabled for performance
    return { status: 'disabled' };
  }

  /**
   * Draw viewport border (disabled for performance)
   */
  private drawViewportBorder(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Update debug text (disabled for performance)
   */
  private updateDebugText(
    playerX: number,
    playerY: number,
    scrollX: number,
    scrollY: number,
    cameraViewportCenterX: number,
    cameraViewportCenterY: number
  ): void {
    // Debug overlays disabled for performance
  }

  /**
   * Update player following text (disabled for performance)
   */
  private updatePlayerFollowingText(playerX: number, playerY: number, zoom: number): void {
    // Debug overlays disabled for performance
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

    // Debug objects disabled for performance

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

    return verification;
  }

  /**
   * Test boundary alignment at specific zoom level (for investigation) - ENHANCED
   */
  public testBoundaryAlignmentAtZoom(zoomLevel: number): any {
    const camera = this.cameras.main;
    const scale = this.scale;


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


    // Test if this is causing viewport calculation errors
    if (scaleData.issues.scaleStuckAt1) {
      console.warn('⚠️ SCALE ISSUE DETECTED: Scale zoom stuck at 1.000 - this could be causing viewport offset issues!');
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
        isFollowingPlayer: this.isCameraFollowingPlayer(),
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
        followingDisabled: !this.isCameraFollowingPlayer()
      }
    };

    // Analyze potential conflicts
    const conflictAnalysis = {
      summary: {
        hasConflict: panningAnalysis.conflictIndicators.significantOffset,
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


    return fullAnalysis;
  }

  /**
   * Determine the type of panning-zoom conflict
   */
  private determineConflictType(analysis: any): string {
    const { offsetFromPlayer } = analysis.viewportCalculations;
    const { isFollowingPlayer } = analysis.currentState;

    if (Math.abs(offsetFromPlayer.x) > 50 || Math.abs(offsetFromPlayer.y) > 50) {
      return 'Major viewport offset - likely zoom operation overwrote panning state';
    } else if (!isFollowingPlayer && (Math.abs(offsetFromPlayer.x) > 10 || Math.abs(offsetFromPlayer.y) > 10)) {
      return 'Moderate offset with following disabled - expected behavior';
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
    const { isFollowingPlayer } = analysis.currentState;

    if (Math.abs(offsetFromPlayer.x) > 10 || Math.abs(offsetFromPlayer.y) > 10) {
      if (isFollowingPlayer) {
        causes.push('Zoom operation may have affected camera positioning');
        causes.push('Native Phaser following should handle this automatically');
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

    return analysis;
  }

  /**
   * Test viewport bounds (disabled for performance)
   */
  public testViewportBoundsAccuracy(): any {
    // Debug testing disabled for performance
    return { status: 'disabled' };
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
   * Debug logging status (disabled for performance)
   */
  public getDebugLoggingStatus(): any {
    // Debug logging disabled for performance
    return { status: 'disabled' };
  }

  /**
   * Debug logging intervals (disabled for performance)
   */
  public setDebugLoggingIntervals(logInterval: number = 2000, updateInterval: number = 100): void {
    // Debug logging disabled for performance
  }

  /**
   * Disable debug overlays to stop all debug logging
   */
  public disableDebugOverlays(): void {
    this.DEBUG_CAMERA_CENTERING = false;
    this.cleanupDebugOverlays();
    this.removeDebugControls();

  }

  /**
   * Enable debug overlays
   */
  public enableDebugOverlays(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Create debug controls (disabled for performance)
   */
  private createDebugControls(): void {
    // Debug controls disabled for performance
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
    // Debug controls disabled for performance
  }

  /**
   * Toggle debug controls (disabled for performance)
   */
  public toggleDebugControls(): void {
    // Debug controls disabled for performance
  }

  /**
   * Remove debug controls (disabled for performance)
   */
  private removeDebugControls(): void {
    // Debug controls disabled for performance
  }

  /**
   * Clean up debug overlays (disabled for performance)
   */
  private cleanupDebugOverlays(): void {
    // Debug overlays disabled for performance
  }

  /**
   * Toggle debug overlays on/off
   */
  public toggleDebugOverlays(): void {
    // Debug overlays disabled for performance
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

  // Listen for camera follow changes from Phaser and update UI state
  useEffect(() => {
    const handler = (evt: any) => {
      if (typeof evt.detail === 'boolean') {
        setIsCameraFollowing(evt.detail);
      }
    };
    window.addEventListener('phaser-camera-follow-changed', handler);
    return () => window.removeEventListener('phaser-camera-follow-changed', handler);
  }, []);
  // showPanHint state removed for cleaner UI

  // Note: Video functionality is now handled by the persistent video panel
  const eventBus = useEventBus();

  // Update zoom state function - defined first so it can be used in other callbacks
  const updateZoomState = useCallback(() => {
    // Removed: Non-critical update zoom state and zoom state update logs.
    if (gameSceneRef.current) {
      const canIn = gameSceneRef.current.canZoomIn();
      const canOut = gameSceneRef.current.canZoomOut();
      const isFollowing = gameSceneRef.current.isCameraFollowingPlayer();
      setCanZoomIn(canIn);
      setCanZoomOut(canOut);
      setIsCameraFollowing(isFollowing);
    }
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    // Zoom in logging removed for cleaner console
    if (gameSceneRef.current) {
      gameSceneRef.current.zoomIn();

      // Re-enable camera following and center on player when zoom controls are used
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);

      updateZoomState();
    } else {
      // Removed: Non-critical game scene not found log.
    }
  }, [updateZoomState]);

  const handleZoomOut = useCallback(() => {
    // Zoom out logging removed for cleaner console
    if (gameSceneRef.current) {
      gameSceneRef.current.zoomOut();

      // Re-enable camera following and center on player when zoom controls are used
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);

      updateZoomState();
    } else {
      // Removed: Non-critical game scene not found log.
    }
  }, [updateZoomState]);

  const handleResetZoom = useCallback(() => {
    // Reset zoom logging removed for cleaner console
    if (gameSceneRef.current) {
      gameSceneRef.current.resetZoom();

      // Re-enable camera following and center on player when zoom controls are used
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);

      updateZoomState();
    } else {
      // Removed: Non-critical game scene not found log.
    }
  }, [updateZoomState]);

  const handleToggleCameraFollow = useCallback(() => {
    // Removed: Non-critical handle toggle camera follow clicked log.
    if (gameSceneRef.current) {
      const newFollowState = !isCameraFollowing;
      // Removed: Non-critical toggling camera follow to log.

      if (newFollowState) {
        gameSceneRef.current.enableCameraFollowing();
        gameSceneRef.current.centerCameraOnPlayer(); // recenter on player when following is enabled
      } else {
        gameSceneRef.current.disableCameraFollowing();
      }

      setIsCameraFollowing(newFollowState);
      updateZoomState(); // ensure UI state matches camera state
    } else {
      // Removed: Non-critical game scene not found log.
    }
  }, [isCameraFollowing, updateZoomState]);


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

        // Removed: Non-critical area clicked log.
        // The video panel will handle the connection automatically
      }
    }
  }, [eventBus]);

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) {
      // Removed: Non-critical skipping game creation log.
      return;
    }

    // Removed: Non-critical creating Phaser game log.

    const gameScene = new GameScene(eventBus, user?.username || playerId, handleAreaClick);
    gameSceneRef.current = gameScene;
    // Removed: Non-critical game scene created and stored in ref log.

    // Removed: Non-critical canvas: creating Phaser game configuration log.

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
      // Removed: Non-critical Phaser game created successfully log.

      // Log canvas dimensions for comparison with edit mode
      setTimeout(() => {
        const canvas = phaserGameRef.current?.canvas;
        if (canvas && gameSceneRef.current) {
          // Removed: Non-critical world mode: canvas ready log.

          // Make canvas focusable and add click-to-focus behavior
          const cleanupFocusable = makeFocusable(canvas);
          const cleanupClickToFocus = addClickToFocus(canvas);

          // Store cleanup functions for later
          (canvas as any).__focusCleanup = () => {
            cleanupFocusable();
            cleanupClickToFocus();
          };
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
      // Removed: Non-critical dev window test and debug logs.

      // Update zoom state after game is ready
      setTimeout(() => {
        // Removed: Non-critical initial zoom state update after game creation log.
        updateZoomState();
      }, 500);

      // Keyboard listeners for pan hint removed for cleaner UI

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
            // Removed: Non-critical resize processing viewport adjustment log.
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
      logger.error('Failed to create Phaser game', error);
    }

    return () => {
      // Removed: Non-critical cleaning up Phaser game log.
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

        // Clean up focus handlers
        const canvas = phaserGameRef.current.canvas;
        if (canvas && (canvas as any).__focusCleanup) {
          (canvas as any).__focusCleanup();
          delete (canvas as any).__focusCleanup;
        }

        // Keyboard listeners cleanup removed (no longer needed)

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

        {/* Pan Mode Hint removed for cleaner UI */}

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
