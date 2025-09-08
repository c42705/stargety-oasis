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
  private defaultZoom: number = 1.10;
  private minZoom: number = 0.3;
  private maxZoom: number = 3;
  private zoomStep: number = 0.2;
  private worldBounds = { width: 800, height: 600 }; // Default, will be updated from SharedMapSystem

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
    this.player = this.add.sprite(400, 300, defaultTexture);
    this.player.setDisplaySize(64, 64); // Larger size for better visibility
    this.player.setDepth(10);
    this.originalY = this.player.y;

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
    } catch (error) {
      console.error('Failed to load player avatar, keeping default sprite:', error);

      // Still announce player joined with default sprite
      this.eventBus.publish('world:playerJoined', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
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
    const targetX = playerX - camera.width / (2 * camera.zoom) + this.cameraFollowOffset.x;
    const targetY = playerY - camera.height / (2 * camera.zoom) + this.cameraFollowOffset.y;

    // Apply world bounds constraints
    const constrainedTarget = this.constrainCameraToWorldBounds(targetX, targetY);

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


    }

    this.lastPlayerX = playerX;
    this.lastPlayerY = playerY;
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
    if (!this.player) return;

    const camera = this.cameras.main;
    const targetX = this.player.x - camera.width / (2 * camera.zoom) + this.cameraFollowOffset.x;
    const targetY = this.player.y - camera.height / (2 * camera.zoom) + this.cameraFollowOffset.y;

    const constrainedTarget = this.constrainCameraToWorldBounds(targetX, targetY);
    camera.setScroll(constrainedTarget.x, constrainedTarget.y);

    this.lastPlayerX = this.player.x;
    this.lastPlayerY = this.player.y;


  }

  // Update world bounds from SharedMapSystem
  private updateWorldBoundsFromMapData(): void {
    const mapData = this.sharedMapSystem.getMapData();
    if (mapData && mapData.worldDimensions) {
      const newBounds = {
        width: mapData.worldDimensions.width,
        height: mapData.worldDimensions.height
      };

      this.worldBounds = newBounds;

      // Update camera bounds
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
    this.sharedMapSystem.on('map:dimensionsChanged', (event: any) => {
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

    // Disable camera following when manually zooming
    this.manualCameraControl = true;

    this.cameras.main.setZoom(newZoom);
  }

  public zoomOut(): void {
    const currentZoom = this.cameras.main.zoom;
    const newZoom = Math.max(currentZoom - this.zoomStep, this.minZoom);

    // Disable camera following when manually zooming
    this.manualCameraControl = true;

    this.cameras.main.setZoom(newZoom);
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
   */
  public setDefaultZoomAndCenter(): void {
    const camera = this.cameras.main;

    console.log('🎮 SETTING DEFAULT ZOOM AND CENTER:', {
      defaultZoom: this.defaultZoom,
      playerPosition: this.player ? { x: this.player.x, y: this.player.y } : 'no player',
      currentZoom: camera.zoom
    });

    // Set the default zoom level
    camera.setZoom(this.defaultZoom);

    // Center camera on player if player exists
    if (this.player) {
      this.centerCameraOnPlayer();
      console.log('🎮 CAMERA CENTERED ON PLAYER:', {
        playerPos: { x: this.player.x, y: this.player.y },
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom
      });
    } else {
      // Fallback: center on world center
      const centerX = this.worldBounds.width / 2;
      const centerY = this.worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
      console.log('🎮 CAMERA CENTERED ON WORLD CENTER:', {
        worldCenter: { x: centerX, y: centerY },
        cameraScroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom
      });
    }

    // Enable camera following
    this.isFollowingPlayer = true;
    this.manualCameraControl = false;

    console.log('🎮 DEFAULT ZOOM AND CENTER COMPLETE:', {
      finalZoom: camera.zoom,
      isFollowing: this.isFollowingPlayer,
      manualControl: this.manualCameraControl
    });
  }

  public fitMapToViewport(): void {
    // This method ensures the entire map is visible when the viewport changes
    const camera = this.cameras.main;
    const gameWidth = this.scale.gameSize.width;
    const gameHeight = this.scale.gameSize.height;

    console.log('📐 FIT MAP TO VIEWPORT:', {
      gameWidth,
      gameHeight,
      worldBounds: this.worldBounds,
      currentZoom: camera.zoom
    });

    if (gameWidth === 0 || gameHeight === 0) {
      console.log('⚠️ FIT MAP TO VIEWPORT: Invalid game dimensions');
      return;
    }

    const scaleX = gameWidth / this.worldBounds.width;
    const scaleY = gameHeight / this.worldBounds.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);

    console.log('📐 FIT MAP CALCULATIONS:', {
      scaleX,
      scaleY,
      fitZoom
    });

    camera.setZoom(fitZoom);

    // Center the camera
    const centerX = this.worldBounds.width / 2;
    const centerY = this.worldBounds.height / 2;
    camera.centerOn(centerX, centerY);

    console.log('📐 FIT MAP RESULT:', {
      finalZoom: camera.zoom,
      centerX,
      centerY,
      scrollX: camera.scrollX,
      scrollY: camera.scrollY
    });
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
