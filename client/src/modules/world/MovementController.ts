import Phaser from 'phaser';
import { logger } from '../../shared/logger';

/**
 * MovementController - Handles player movement and input
 * 
 * Responsibilities:
 * - Keyboard input processing
 * - Movement logic
 * - Jump mechanics
 * - Fire effects
 * - Rotation toggle
 * - Canvas focus checking
 */
export class MovementController {
  private scene: Phaser.Scene;
  private eventBus: any;
  private playerId: string;
  
  // Input controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private xKey!: Phaser.Input.Keyboard.Key;
  private oKey!: Phaser.Input.Keyboard.Key;

  // Animation states
  private isJumping: boolean = false;
  private isRotating: boolean = false;
  private rotationTween?: Phaser.Tweens.Tween;

  // Callbacks
  private getPlayer: () => Phaser.GameObjects.Sprite;
  private getOriginalY: () => number;
  private setOriginalY: (y: number) => void;
  private checkCollision: (x: number, y: number, size: number) => boolean;
  private getWorldBounds: () => { width: number; height: number };
  private getPlayerSize: () => number;

  constructor(
    scene: Phaser.Scene,
    eventBus: any,
    playerId: string,
    callbacks: {
      getPlayer: () => Phaser.GameObjects.Sprite;
      getOriginalY: () => number;
      setOriginalY: (y: number) => void;
      checkCollision: (x: number, y: number, size: number) => boolean;
      getWorldBounds: () => { width: number; height: number };
      getPlayerSize: () => number;
    }
  ) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.getPlayer = callbacks.getPlayer;
    this.getOriginalY = callbacks.getOriginalY;
    this.setOriginalY = callbacks.setOriginalY;
    this.checkCollision = callbacks.checkCollision;
    this.getWorldBounds = callbacks.getWorldBounds;
    this.getPlayerSize = callbacks.getPlayerSize;
  }

  /**
   * Initialize input controls
   */
  public initialize(): void {
    // Create cursor keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();

    // Create custom key bindings for interactive controls
    this.spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.xKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.oKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O);

    // Set up key event handlers
    this.setupKeyHandlers();
  }

  /**
   * Check if the game canvas has focus
   */
  private canvasHasFocus(): boolean {
    return document.activeElement === this.scene.game.canvas;
  }

  /**
   * Set up key event handlers
   */
  private setupKeyHandlers(): void {
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

  /**
   * Perform jump action
   */
  private performJump(): void {
    if (this.isJumping) return; // Prevent multiple jumps

    const player = this.getPlayer();
    const originalY = this.getOriginalY();
    const worldBounds = this.getWorldBounds();
    const playerSize = this.getPlayerSize();

    this.isJumping = true;
    const jumpHeight = 60;
    const jumpDuration = 600;
    const horizontalDistance = 120; // Distance to move horizontally during jump

    // Determine jump direction based on current input
    let jumpDirection: 'left' | 'right' | 'none' = 'none';
    let targetX = player.x;

    // Check for directional input during jump
    if (this.cursors.left.isDown) {
      jumpDirection = 'left';
      targetX = player.x - horizontalDistance;
    } else if (this.cursors.right.isDown) {
      jumpDirection = 'right';
      targetX = player.x + horizontalDistance;
    }

    // Constrain horizontal movement to world bounds
    targetX = Phaser.Math.Clamp(targetX, playerSize / 2, worldBounds.width - playerSize / 2);

    // Check for collision at target position
    if (this.checkCollision(targetX, player.y, playerSize)) {
      // If collision detected, reduce jump distance
      const reducedDistance = horizontalDistance * 0.5;
      if (jumpDirection === 'left') {
        targetX = Math.max(player.x - reducedDistance, playerSize / 2);
      } else if (jumpDirection === 'right') {
        targetX = Math.min(player.x + reducedDistance, worldBounds.width - playerSize / 2);
      }

      // Check again with reduced distance
      if (this.checkCollision(targetX, player.y, playerSize)) {
        targetX = player.x; // No horizontal movement if still colliding
        jumpDirection = 'none';
      }
    }

    // Create arc-shaped jump animation
    if (jumpDirection !== 'none') {
      // Directional jump with arc movement
      this.scene.tweens.add({
        targets: player,
        x: targetX,
        y: originalY - jumpHeight,
        duration: jumpDuration / 2,
        ease: 'Power2',
        onComplete: () => {
          // Second half of jump (landing)
          this.scene.tweens.add({
            targets: player,
            y: originalY,
            duration: jumpDuration / 2,
            ease: 'Power2',
            onComplete: () => {
              this.isJumping = false;
              this.setOriginalY(player.y);

              // Publish movement event for directional jumps
              this.eventBus.publish('world:playerMoved', {
                playerId: this.playerId,
                x: player.x,
                y: player.y,
              });
            }
          });
        }
      });
    } else {
      // Vertical jump only (original behavior)
      this.scene.tweens.add({
        targets: player,
        y: originalY - jumpHeight,
        duration: jumpDuration / 2,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          this.isJumping = false;
          this.setOriginalY(player.y);
        }
      });
    }

    // Add visual effect for jump
    this.createJumpEffect(jumpDirection);
  }

  /**
   * Create jump visual effect
   */
  private createJumpEffect(jumpDirection: 'left' | 'right' | 'none' = 'none'): void {
    const player = this.getPlayer();
    const originalY = this.getOriginalY();

    // Create dust cloud effect at player's feet
    const dustCloud = this.scene.add.graphics();
    dustCloud.fillStyle(0xD2B48C, 0.6);
    dustCloud.fillCircle(player.x, originalY + 16, 20);
    dustCloud.setDepth(5);

    // Create directional dust particles for directional jumps
    if (jumpDirection !== 'none') {
      const particleCount = 5;
      for (let i = 0; i < particleCount; i++) {
        const particle = this.scene.add.graphics();
        particle.fillStyle(0xD2B48C, 0.4);
        particle.fillCircle(0, 0, 3);
        particle.setPosition(
          player.x + (Math.random() - 0.5) * 20,
          originalY + 16 + (Math.random() - 0.5) * 10
        );
        particle.setDepth(5);

        // Animate particles in jump direction
        const particleTargetX = jumpDirection === 'left' ?
          particle.x - 30 - Math.random() * 20 :
          particle.x + 30 + Math.random() * 20;

        this.scene.tweens.add({
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
    this.scene.tweens.add({
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

  /**
   * Perform fire action
   */
  private performFire(): void {
    // Create fire effect
    this.createFireEffect();

    // Add brief cooldown to prevent spam
    this.xKey.enabled = false;
    this.scene.time.delayedCall(200, () => {
      this.xKey.enabled = true;
    });
  }

  /**
   * Create fire visual effect
   */
  private createFireEffect(): void {
    const player = this.getPlayer();

    // Create projectile/fire effect
    const projectile = this.scene.add.graphics();
    projectile.fillStyle(0xFF4500, 0.8);
    projectile.fillCircle(0, 0, 8);
    projectile.setPosition(player.x, player.y);
    projectile.setDepth(8);

    // Determine direction based on player's last movement or default to right
    const direction = player.scaleX < 0 ? -1 : 1;
    const targetX = player.x + (direction * 150);

    // Animate projectile
    this.scene.tweens.add({
      targets: projectile,
      x: targetX,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Create explosion effect
        this.createExplosionEffect(targetX, player.y);
        projectile.destroy();
      }
    });

    // Add fire trail effect
    const trail = this.scene.add.graphics();
    trail.lineStyle(4, 0xFF6347, 0.6);
    trail.beginPath();
    trail.moveTo(player.x, player.y);
    trail.lineTo(targetX, player.y);
    trail.strokePath();
    trail.setDepth(7);

    // Fade out trail
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        trail.destroy();
      }
    });
  }

  /**
   * Create explosion visual effect
   */
  private createExplosionEffect(x: number, y: number): void {
    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xFF4500, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(x, y);
      particle.setDepth(9);

      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Math.random() * 20;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.scene.tweens.add({
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

  /**
   * Toggle rotation
   */
  private toggleRotation(): void {
    const player = this.getPlayer();

    if (this.isRotating) {
      // Stop rotation
      this.isRotating = false;
      if (this.rotationTween) {
        this.rotationTween.stop();
        this.rotationTween = undefined;
      }
      // Reset rotation smoothly
      this.scene.tweens.add({
        targets: player,
        rotation: 0,
        duration: 300,
        ease: 'Power2'
      });
    } else {
      // Start continuous rotation
      this.isRotating = true;
      this.rotationTween = this.scene.tweens.add({
        targets: player,
        rotation: Math.PI * 2,
        duration: 2000,
        ease: 'Linear',
        repeat: -1
      });
    }
  }

  /**
   * Get cursor keys
   */
  public getCursors(): Phaser.Types.Input.Keyboard.CursorKeys {
    return this.cursors;
  }

  /**
   * Check if currently jumping
   */
  public isCurrentlyJumping(): boolean {
    return this.isJumping;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Clean up rotation tween if it exists
    if (this.rotationTween) {
      this.rotationTween.stop();
      this.rotationTween = undefined;
    }
  }
}

