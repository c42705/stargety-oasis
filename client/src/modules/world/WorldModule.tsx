import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { AvatarGameRenderer } from '../../components/avatar/AvatarGameRenderer';
import { useAuth } from '../../shared/AuthContext';
import { InteractiveArea } from '../../shared/MapDataContext';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
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
  private minZoom: number = 0.3;
  private maxZoom: number = 3;
  private zoomStep: number = 0.2;
  public worldBounds = { width: 800, height: 600 }; // Default, will be updated from SharedMapSystem

  // Camera panning properties
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;
  private panSensitivity: number = 1;

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
  private debugPlayerCross?: Phaser.GameObjects.Graphics;
  private debugCameraCross?: Phaser.GameObjects.Graphics;
  private debugViewportBounds?: Phaser.GameObjects.Graphics;
  private debugWorldCenterCross?: Phaser.GameObjects.Graphics;
  private debugPlayerPositionText?: Phaser.GameObjects.Text;
  private debugCameraScrollText?: Phaser.GameObjects.Text;

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
      }
    });

    this.input.on('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.game.canvas.style.cursor = 'default';
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

      // Debug logging for camera following (only log significant changes)
      if (Math.abs(newScrollX - currentScrollX) > 5 || Math.abs(newScrollY - currentScrollY) > 5) {
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

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
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
   * Instantly center camera on player (no lerp)
   */
  public centerCameraOnPlayer(): void {
    if (!this.player) {
      console.warn('🎯 CAMERA CENTERING: No player found');
      return;
    }

    const camera = this.cameras.main;

    // Calculate viewport dimensions in world coordinates
    const viewportWidth = camera.width / camera.zoom;
    const viewportHeight = camera.height / camera.zoom;

    // Calculate target camera scroll position to center player
    // Camera scroll position = player position - half viewport size + any offset
    const targetScrollX = this.player.x - (viewportWidth / 2) + this.cameraFollowOffset.x;
    const targetScrollY = this.player.y - (viewportHeight / 2) + this.cameraFollowOffset.y;

    // Apply world bounds constraints to prevent camera from going outside world
    const constrainedTarget = this.constrainCameraToWorldBounds(targetScrollX, targetScrollY);

    // Set the camera scroll position
    camera.setScroll(constrainedTarget.x, constrainedTarget.y);

    // Update tracking variables
    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;

    console.log('🎯 CAMERA CENTERED ON PLAYER:', {
      playerPos: { x: this.player.x, y: this.player.y },
      playerOrigin: { x: this.player.originX, y: this.player.originY },
      viewportSize: { width: viewportWidth, height: viewportHeight },
      cameraSize: { width: camera.width, height: camera.height },
      zoom: camera.zoom,
      worldBounds: this.worldBounds,
      targetScroll: { x: targetScrollX, y: targetScrollY },
      constrainedScroll: { x: constrainedTarget.x, y: constrainedTarget.y },
      finalScroll: { x: camera.scrollX, y: camera.scrollY },
      cameraFollowOffset: this.cameraFollowOffset,
      // Calculate where player appears in viewport
      playerInViewport: {
        x: this.player.x - camera.scrollX,
        y: this.player.y - camera.scrollY
      },
      viewportCenter: {
        x: viewportWidth / 2,
        y: viewportHeight / 2
      }
    });

    // Update debug overlays if enabled
    if (this.DEBUG_CAMERA_CENTERING) {
      this.updateDebugOverlays();
    }
  }

  // Update world bounds from background image dimensions (called by PhaserMapRenderer)
  public updateWorldBoundsFromBackgroundImage(imageWidth: number, imageHeight: number): void {
    console.log('🌍 CANVAS: Updating world bounds from background image', {
      timestamp: new Date().toISOString(),
      imageWidth,
      imageHeight,
      currentWorldBounds: this.worldBounds,
      playerPosition: this.player ? { x: this.player.x, y: this.player.y } : null
    });

    const oldBounds = { ...this.worldBounds };
    const newBounds = {
      width: imageWidth,
      height: imageHeight
    };

    this.worldBounds = newBounds;

    // Update camera bounds to match the background image exactly
    this.cameras.main.setBounds(0, 0, imageWidth, imageHeight);

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
        const newCenterX = imageWidth / 2;
        const newCenterY = imageHeight / 2;
        this.player.setPosition(newCenterX, newCenterY);

        console.log('🎮 PLAYER REPOSITIONED TO NEW WORLD CENTER:', {
          oldBounds,
          newBounds,
          oldPosition: { x: oldCenterX, y: oldCenterY },
          newPosition: { x: newCenterX, y: newCenterY },
          distanceFromOldCenter
        });
      }
    }

    console.log('🌍 CANVAS: World bounds updated from background image', {
      oldBounds,
      newBounds,
      cameraBounds: {
        x: 0,
        y: 0,
        width: imageWidth,
        height: imageHeight
      },
      playerPosition: this.player ? { x: this.player.x, y: this.player.y } : null
    });

    // Re-center camera on player with updated world bounds
    if (this.player) {
      this.time.delayedCall(50, () => {
        this.setDefaultZoomAndCenter();
        console.log('🎮 CAMERA RE-CENTERED AFTER WORLD BOUNDS UPDATE');
      });
    }
  }

  // Update world bounds from SharedMapSystem
  private updateWorldBoundsFromMapData(): void {
    const mapData = this.sharedMapSystem.getMapData();
    if (mapData) {
      console.log('🌍 CANVAS: Updating world bounds from map data', {
        timestamp: new Date().toISOString(),
        hasWorldDimensions: !!mapData.worldDimensions,
        worldDimensions: mapData.worldDimensions,
        hasBackgroundImage: !!mapData.backgroundImage,
        backgroundImageDimensions: mapData.backgroundImageDimensions,
        currentWorldBounds: this.worldBounds
      });

      // CRITICAL FIX: Use background image dimensions if available, otherwise fall back to world dimensions
      let newBounds;
      if (mapData.backgroundImageDimensions) {
        // Canvas should match background image dimensions for 1:1 pixel mapping
        newBounds = {
          width: mapData.backgroundImageDimensions.width,
          height: mapData.backgroundImageDimensions.height
        };
        console.log('🌍 CANVAS: Using background image dimensions for world bounds', newBounds);
      } else if (mapData.worldDimensions) {
        // Fallback to world dimensions if no background image
        newBounds = {
          width: mapData.worldDimensions.width,
          height: mapData.worldDimensions.height
        };
        console.log('🌍 CANVAS: Using world dimensions for world bounds', newBounds);
      } else {
        console.warn('🌍 CANVAS: No dimensions available, keeping current bounds');
        return;
      }

      this.worldBounds = newBounds;

      console.log('🌍 CANVAS: World bounds updated', {
        oldBounds: this.worldBounds,
        newBounds,
        source: mapData.backgroundImageDimensions ? 'backgroundImageDimensions' : 'worldDimensions'
      });

      // Update camera bounds to match the new world bounds
      this.cameras.main.setBounds(0, 0, this.worldBounds.width, this.worldBounds.height);

      // Update background size
      this.updateBackgroundSize();

      // Set default zoom and center on player with new dimensions
      this.time.delayedCall(100, () => {
        this.setDefaultZoomAndCenter();
      });
    }
  }

  // Set up listeners for map dimension changes
  private setupMapDimensionListeners(): void {
    // Listen for dimension changes from SharedMapSystem
    this.sharedMapSystem.on('map:dimensionsChanged', () => {
      this.updateWorldBoundsFromMapData();
    });

    // Listen for general map changes that might include dimension updates
    this.sharedMapSystem.on('map:changed', (event: any) => {
      if (event.mapData && event.mapData.worldDimensions) {
        const currentBounds = this.worldBounds;
        const newDimensions = event.mapData.worldDimensions;

        if (currentBounds.width !== newDimensions.width ||
            currentBounds.height !== newDimensions.height) {
          this.updateWorldBoundsFromMapData();
        }
      }
    });
  }

  // Update background size to match world bounds
  private updateBackgroundSize(): void {
    // Background size is now handled by the map renderer
    // No need to recreate gradient backgrounds
  }

  // Zoom control methods
  public zoomIn(): void {
    const currentZoom = this.cameras.main.zoom;
    const newZoom = Math.min(currentZoom + this.zoomStep, this.maxZoom);

    console.log('🔍 ZOOM IN:', {
      currentZoom,
      newZoom,
      zoomStep: this.zoomStep,
      maxZoom: this.maxZoom
    });

    // Apply new zoom level
    this.cameras.main.setZoom(newZoom);

    // Re-center camera on player with new zoom level
    if (this.player) {
      this.centerCameraOnPlayer();
      console.log('🎯 PLAYER RE-CENTERED AFTER ZOOM IN');
    }

    // Temporarily disable camera following to prevent immediate override
    this.manualCameraControl = true;

    // Re-enable camera following after a short delay to allow manual zoom control
    this.time.delayedCall(1000, () => {
      this.manualCameraControl = false;
      console.log('🎯 CAMERA FOLLOWING RE-ENABLED AFTER ZOOM IN');
    });
  }

  public zoomOut(): void {
    const currentZoom = this.cameras.main.zoom;
    const newZoom = Math.max(currentZoom - this.zoomStep, this.minZoom);

    console.log('🔍 ZOOM OUT:', {
      currentZoom,
      newZoom,
      zoomStep: this.zoomStep,
      minZoom: this.minZoom
    });

    // Apply new zoom level
    this.cameras.main.setZoom(newZoom);

    // Re-center camera on player with new zoom level
    if (this.player) {
      this.centerCameraOnPlayer();
      console.log('🎯 PLAYER RE-CENTERED AFTER ZOOM OUT');
    }

    // Temporarily disable camera following to prevent immediate override
    this.manualCameraControl = true;

    // Re-enable camera following after a short delay to allow manual zoom control
    this.time.delayedCall(1000, () => {
      this.manualCameraControl = false;
      console.log('🎯 CAMERA FOLLOWING RE-ENABLED AFTER ZOOM OUT');
    });
  }

  public resetZoom(): void {
    // Calculate the zoom level needed to fit the entire world in the viewport
    const camera = this.cameras.main;
    const gameWidth = this.scale.gameSize.width;
    const gameHeight = this.scale.gameSize.height;

    const scaleX = gameWidth / this.worldBounds.width;
    const scaleY = gameHeight / this.worldBounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 1x

    // Center the camera on the world center
    const centerX = this.worldBounds.width / 2;
    const centerY = this.worldBounds.height / 2;



    // Re-enable camera following when resetting
    this.manualCameraControl = false;

    // Smoothly animate to the reset position
    this.tweens.add({
      targets: camera,
      zoom: fitZoom,
      scrollX: centerX - gameWidth / (2 * fitZoom),
      scrollY: centerY - gameHeight / (2 * fitZoom),
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Reset complete
      }
    });
  }

  public canZoomIn(): boolean {
    const canZoom = this.cameras.main.zoom < this.maxZoom;
    console.log('🔍 CAN ZOOM IN:', {
      currentZoom: this.cameras.main.zoom,
      maxZoom: this.maxZoom,
      canZoom
    });
    return canZoom;
  }

  public canZoomOut(): boolean {
    const canZoom = this.cameras.main.zoom > this.minZoom;
    console.log('🔍 CAN ZOOM OUT:', {
      currentZoom: this.cameras.main.zoom,
      minZoom: this.minZoom,
      canZoom
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

    // Set the default zoom level (165%)
    camera.setZoom(this.defaultZoom);

    // Center camera on player if player exists
    if (this.player) {
      this.centerCameraOnPlayer();
      console.log('🎮 CAMERA CENTERED ON PLAYER (165%):', {
        playerPos: { x: this.player.x, y: this.player.y },
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom,
        zoomPercentage: `${Math.round(camera.zoom * 100)}%`
      });
    } else {
      // Fallback: center on world center
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
      console.log('🎮 CAMERA CENTERED ON WORLD CENTER (165%):', {
        worldCenter: { x: centerX, y: centerY },
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom,
        zoomPercentage: `${Math.round(camera.zoom * 100)}%`
      });
    }

    // Enable camera following with adaptive lerp system
    this.isFollowingPlayer = true;
    this.manualCameraControl = false;

    console.log('🎮 DEFAULT ZOOM AND CENTER COMPLETE (165%):', {
      finalZoom: camera.zoom,
      finalZoomPercentage: `${Math.round(camera.zoom * 100)}%`,
      isFollowing: this.isFollowingPlayer,
      manualControl: this.manualCameraControl,
      adaptiveLerpEnabled: true
    });

    // Initialize debug overlays if enabled (with a small delay to ensure camera is settled)
    if (this.DEBUG_CAMERA_CENTERING) {
      this.time.delayedCall(50, () => {
        this.initializeDebugOverlays();
      });
    }

    // Reset the flag after a short delay to allow for future calls
    this.time.delayedCall(200, () => {
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
   * Create debug crosshair elements
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
  }

  /**
   * Create debug viewport bounds rectangle
   */
  private createDebugViewportBounds(): void {
    this.debugViewportBounds = this.add.graphics();
    this.debugViewportBounds.setDepth(999);
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

    // Player position text (top-left)
    this.debugPlayerPositionText = this.add.text(10, 10, '', textStyle);
    this.debugPlayerPositionText.setDepth(1003);
    this.debugPlayerPositionText.setScrollFactor(0); // Fixed to camera

    // Camera scroll text (top-right)
    this.debugCameraScrollText = this.add.text(0, 10, '', textStyle);
    this.debugCameraScrollText.setDepth(1003);
    this.debugCameraScrollText.setScrollFactor(0); // Fixed to camera
  }

  /**
   * Update all debug overlays with current values
   */
  private updateDebugOverlays(): void {
    if (!this.DEBUG_CAMERA_CENTERING || !this.player) return;

    // Ensure debug overlays are initialized
    if (!this.debugPlayerCross || !this.debugCameraCross || !this.debugViewportBounds ||
        !this.debugWorldCenterCross || !this.debugPlayerPositionText || !this.debugCameraScrollText) {
      return;
    }

    const camera = this.cameras.main;
    const viewportWidth = camera.width / camera.zoom;
    const viewportHeight = camera.height / camera.zoom;

    // Calculate positions
    const playerX = this.player.x;
    const playerY = this.player.y;
    const cameraViewportCenterX = camera.scrollX + viewportWidth / 2;
    const cameraViewportCenterY = camera.scrollY + viewportHeight / 2;
    const worldCenterX = this.worldBounds.width / 2;
    const worldCenterY = this.worldBounds.height / 2;

    // Update crosshairs
    this.drawCrosshair(this.debugPlayerCross!, playerX, playerY, 0xff0000, 20); // Red
    this.drawCrosshair(this.debugCameraCross!, cameraViewportCenterX, cameraViewportCenterY, 0x0000ff, 20); // Blue
    this.drawCrosshair(this.debugWorldCenterCross!, worldCenterX, worldCenterY, 0xffff00, 25); // Yellow

    // Update viewport bounds
    this.drawViewportBounds(camera.scrollX, camera.scrollY, viewportWidth, viewportHeight);

    // Update text overlays
    this.updateDebugText(playerX, playerY, camera.scrollX, camera.scrollY, cameraViewportCenterX, cameraViewportCenterY);
  }

  /**
   * Draw a crosshair at the specified position
   */
  private drawCrosshair(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, size: number): void {
    graphics.clear();
    graphics.lineStyle(2, color, 1);

    // Horizontal line
    graphics.moveTo(x - size/2, y);
    graphics.lineTo(x + size/2, y);

    // Vertical line
    graphics.moveTo(x, y - size/2);
    graphics.lineTo(x, y + size/2);

    graphics.strokePath();
  }

  /**
   * Draw viewport bounds rectangle
   */
  private drawViewportBounds(scrollX: number, scrollY: number, width: number, height: number): void {
    if (!this.debugViewportBounds) return;

    this.debugViewportBounds.clear();
    this.debugViewportBounds.lineStyle(2, 0x00ff00, 0.8); // Green with transparency
    this.debugViewportBounds.strokeRect(scrollX, scrollY, width, height);
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

    // Camera scroll text (position in top-right)
    const cameraText = `Camera: (${Math.round(scrollX)}, ${Math.round(scrollY)})\nViewport Center: (${Math.round(cameraViewportCenterX)}, ${Math.round(cameraViewportCenterY)})`;
    this.debugCameraScrollText.setText(cameraText);

    // Position camera text in top-right
    const camera = this.cameras.main;
    this.debugCameraScrollText.setPosition(camera.width - 250, 10);
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
    if (this.debugWorldCenterCross) {
      this.debugWorldCenterCross.destroy();
      this.debugWorldCenterCross = undefined;
    }
    if (this.debugPlayerPositionText) {
      this.debugPlayerPositionText.destroy();
      this.debugPlayerPositionText = undefined;
    }
    if (this.debugCameraScrollText) {
      this.debugCameraScrollText.destroy();
      this.debugCameraScrollText = undefined;
    }
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
  }, []);

  const handleZoomOut = useCallback(() => {
    console.log('🎮 HANDLE ZOOM OUT CLICKED');
    if (gameSceneRef.current) {
      console.log('🎮 Game scene found, calling zoomOut()');
      gameSceneRef.current.zoomOut();
      updateZoomState();
    } else {
      console.log('❌ Game scene not found!');
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    console.log('🎮 HANDLE RESET ZOOM CLICKED');
    if (gameSceneRef.current) {
      console.log('🎮 Game scene found, calling resetZoom()');
      gameSceneRef.current.resetZoom();
      updateZoomState();
    } else {
      console.log('❌ Game scene not found!');
    }
  }, []);

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


  const handleAreaClick = (areaId: string) => {
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
  };

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
      const resizeObserver = new ResizeObserver(() => {
        if (gameSceneRef.current && phaserGameRef.current) {
          // Delay to ensure resize is complete
          setTimeout(() => {
            gameSceneRef.current?.fitMapToViewport();
            updateZoomState();
          }, 100);
        }
      });

      if (gameRef.current) {
        resizeObserver.observe(gameRef.current);
      }

      // Store resize observer for cleanup
      (phaserGameRef.current as any).resizeObserver = resizeObserver;
    } catch (error) {
      console.error('Failed to create Phaser game:', error);
    }

    return () => {
      console.log('Cleaning up Phaser game...');
      if (phaserGameRef.current) {
        // Clean up resize observer
        const resizeObserver = (phaserGameRef.current as any).resizeObserver;
        if (resizeObserver) {
          resizeObserver.disconnect();
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
  }, [eventBus, user?.username, playerId]);





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
