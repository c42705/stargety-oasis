/**
 * Simple Player Controller
 * 
 * Handles player movement, input processing, and world boundary constraints
 * with optimized performance for the simplified world module.
 */

interface PlayerMovementConfig {
  speed: number;
  worldBounds: { width: number; height: number };
}

interface Position {
  x: number;
  y: number;
}

export class SimplePlayerController {
  private scene: Phaser.Scene;
  private player: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private config: PlayerMovementConfig;
  
  // Movement state
  private isMoving: boolean = false;
  private currentDirection: string = 'down';

  constructor(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    config: PlayerMovementConfig
  ) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    
    this.setupInput();
    
  }

  /**
   * Setup keyboard input
   */
  private setupInput(): void {
    // Create cursor keys
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // Create WASD keys
    this.wasdKeys = this.scene.input.keyboard!.addKeys('W,S,A,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    
  }

  /**
   * Update player movement
   */
  update(delta: number): Position | null {
    if (!this.player || !this.cursors || !this.wasdKeys) {
      return null;
    }

    const deltaSeconds = delta / 1000;
    let newX = this.player.x;
    let newY = this.player.y;
    let direction = this.currentDirection;
    let hasMoved = false;

    // Calculate movement distance based on delta time
    const moveDistance = this.config.speed * deltaSeconds;

    // Check input and calculate new position
    if (this.isLeftPressed()) {
      newX -= moveDistance;
      direction = 'left';
      hasMoved = true;
    } else if (this.isRightPressed()) {
      newX += moveDistance;
      direction = 'right';
      hasMoved = true;
    }

    if (this.isUpPressed()) {
      newY -= moveDistance;
      direction = 'up';
      hasMoved = true;
    } else if (this.isDownPressed()) {
      newY += moveDistance;
      direction = 'down';
      hasMoved = true;
    }

    // Apply world boundary constraints
    const { constrainedX, constrainedY } = this.constrainToWorldBounds(newX, newY);
    
    // Update player position if moved
    if (hasMoved) {
      this.player.setPosition(constrainedX, constrainedY);
      this.currentDirection = direction;
      this.isMoving = true;
      
      return {
        x: constrainedX,
        y: constrainedY
      };
    } else {
      this.isMoving = false;
      return null;
    }
  }

  /**
   * Check if left movement keys are pressed
   */
  private isLeftPressed(): boolean {
    return this.cursors.left.isDown || this.wasdKeys.A.isDown;
  }

  /**
   * Check if right movement keys are pressed
   */
  private isRightPressed(): boolean {
    return this.cursors.right.isDown || this.wasdKeys.D.isDown;
  }

  /**
   * Check if up movement keys are pressed
   */
  private isUpPressed(): boolean {
    return this.cursors.up.isDown || this.wasdKeys.W.isDown;
  }

  /**
   * Check if down movement keys are pressed
   */
  private isDownPressed(): boolean {
    return this.cursors.down.isDown || this.wasdKeys.S.isDown;
  }

  /**
   * Constrain position to world bounds
   */
  private constrainToWorldBounds(x: number, y: number): { constrainedX: number; constrainedY: number } {
    const playerHalfWidth = this.player.displayWidth / 2;
    const playerHalfHeight = this.player.displayHeight / 2;
    
    const constrainedX = Phaser.Math.Clamp(
      x,
      playerHalfWidth,
      this.config.worldBounds.width - playerHalfWidth
    );
    
    const constrainedY = Phaser.Math.Clamp(
      y,
      playerHalfHeight,
      this.config.worldBounds.height - playerHalfHeight
    );
    
    return { constrainedX, constrainedY };
  }

  /**
   * Set player position directly (for external control)
   */
  setPosition(x: number, y: number): void {
    const { constrainedX, constrainedY } = this.constrainToWorldBounds(x, y);
    
    this.player.setPosition(constrainedX, constrainedY);
  }

  /**
   * Get current player position
   */
  getPosition(): Position {
    return {
      x: this.player.x,
      y: this.player.y
    };
  }

  /**
   * Get current movement state
   */
  getMovementState(): { isMoving: boolean; direction: string } {
    return {
      isMoving: this.isMoving,
      direction: this.currentDirection
    };
  }

  /**
   * Update world bounds (for external control)
   */
  updateWorldBounds(width: number, height: number): void {
    this.config.worldBounds = { width, height };
    
    // Ensure player is still within bounds after update
    const currentPos = this.getPosition();
    this.setPosition(currentPos.x, currentPos.y);
    
  }

  /**
   * Get world bounds
   */
  getWorldBounds(): { width: number; height: number } {
    return { ...this.config.worldBounds };
  }

  /**
   * Check if player is at world boundary
   */
  isAtBoundary(): { left: boolean; right: boolean; top: boolean; bottom: boolean } {
    const pos = this.getPosition();
    const playerHalfWidth = this.player.displayWidth / 2;
    const playerHalfHeight = this.player.displayHeight / 2;
    
    return {
      left: pos.x <= playerHalfWidth,
      right: pos.x >= this.config.worldBounds.width - playerHalfWidth,
      top: pos.y <= playerHalfHeight,
      bottom: pos.y >= this.config.worldBounds.height - playerHalfHeight
    };
  }

  /**
   * Get distance to world center
   */
  getDistanceToCenter(): number {
    const pos = this.getPosition();
    const centerX = this.config.worldBounds.width / 2;
    const centerY = this.config.worldBounds.height / 2;
    
    return Phaser.Math.Distance.Between(pos.x, pos.y, centerX, centerY);
  }

  /**
   * Teleport to world center
   */
  teleportToCenter(): void {
    const centerX = this.config.worldBounds.width / 2;
    const centerY = this.config.worldBounds.height / 2;
    
    this.setPosition(centerX, centerY);
  }
}
