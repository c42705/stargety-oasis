import Phaser from 'phaser';
import { AvatarRenderer as AvatarRendererV2 } from '../../components/avatar/v2';
import { AnimationCategory } from '../../components/avatar/AvatarBuilderTypes';
import { logger } from '../../shared/logger';

/**
 * PlayerManager - Manages player character and avatar rendering
 * 
 * Responsibilities:
 * - Player sprite initialization
 * - Character switching (V2 system)
 * - Avatar rendering integration
 * - Player sprite management
 * - Animation handling
 */
export class PlayerManager {
  private scene: Phaser.Scene;
  private eventBus: any;
  private playerId: string;
  public player!: Phaser.GameObjects.Sprite;
  public avatarRendererV2!: AvatarRendererV2;
  
  // Player properties
  public playerSize: number = 32; // Player sprite size for collision detection and bounds
  public originalY: number = 0; // Original Y position for jump animations

  constructor(scene: Phaser.Scene, eventBus: any, playerId: string) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.playerId = playerId;
  }

  /**
   * Initialize player sprite and avatar renderer
   */
  public initialize(initialX: number, initialY: number): void {
    // Initialize avatar renderer V2
    this.avatarRendererV2 = new AvatarRendererV2(this.scene);

    // Create player from sprite sheet and play idle animation
    this.player = this.scene.add.sprite(initialX, initialY, 'player-sheet', 0);
    this.player.setDisplaySize(32, 32); // Use native sprite frame size for crisp animation
    this.player.setOrigin(0.5, 0.5); // Ensure sprite is centered on its position
    this.player.setDepth(10);
    this.originalY = this.player.y;
    this.player.anims.play('player_idle');

    // Load avatar asynchronously and update sprite when ready
    this.initializePlayerAsync();

    // Set up character switching event listener
    this.setupCharacterSwitchingV2();
  }

  /**
   * Asynchronously initialize player with V2 character system
   */
  private async initializePlayerAsync(): Promise<void> {
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

        logger.info('[PlayerManager] Player initialized with V2 character system');

        // Announce player joined
        this.eventBus.publish('world:playerJoined', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });

        return; // Successfully initialized with V2 system
      }
    } catch (error) {
      logger.info('[PlayerManager] No V2 character found, using default sprite');

      // Announce player joined with default sprite
      this.eventBus.publish('world:playerJoined', {
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
    logger.debug('[PlayerManager] Setting up character switching listener for player:', this.playerId);

    // Listen for characterSwitchedV2 custom event from MyProfileTab
    window.addEventListener('characterSwitchedV2', async (event) => {
      try {
        const customEvent = event as CustomEvent;
        const { username, slotNumber } = customEvent.detail;

        logger.debug('[PlayerManager] Received characterSwitchedV2 event:', { 
          username, 
          slotNumber, 
          myPlayerId: this.playerId 
        });

        // Only handle events for this player
        if (username !== this.playerId) {
          logger.debug('[PlayerManager] Ignoring event - not for this player');
          return;
        }

        logger.info(`[PlayerManager] Character switched to slot ${slotNumber} for ${username}`);

        // Update player sprite with new character
        await this.updatePlayerCharacterV2(slotNumber);
      } catch (error) {
        logger.error('[PlayerManager] Error in characterSwitchedV2 event handler:', error);
      }
    });
  }

  /**
   * Update player character sprite using V2 renderer
   */
  private async updatePlayerCharacterV2(slotNumber: number): Promise<void> {
    if (!this.player) {
      logger.warn('[PlayerManager] Cannot update character - player sprite not initialized');
      return;
    }

    try {
      logger.debug('[PlayerManager] Updating player character to slot:', slotNumber);
      
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
        logger.debug('[PlayerManager] New sprite created successfully, replacing old sprite');
        
        // Replace the old player sprite with the new one
        this.player.destroy();
        this.player = newSprite;
        this.player.setOrigin(0.5, 0.5);
        this.player.setDepth(10);

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        logger.info(`[PlayerManager] Successfully updated player character to slot ${slotNumber}`);
      } else {
        logger.warn(`[PlayerManager] Failed to create sprite for slot ${slotNumber}`);
      }
    } catch (error) {
      logger.error('[PlayerManager] Error updating player character:', error);
    }
  }

  /**
   * Play animation based on direction
   */
  public playAnimation(direction: 'up' | 'down' | 'left' | 'right' | 'idle'): void {
    // Try V2 renderer first (PRIMARY)
    if (this.avatarRendererV2.hasSprite(this.playerId)) {
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
      // Fallback to simple sprite flipping for non-animated sprites
      if (direction === 'left') {
        this.player.setFlipX(true);
      } else if (direction === 'right') {
        this.player.setFlipX(false);
      }
    }
  }

  /**
   * Get player sprite
   */
  public getPlayer(): Phaser.GameObjects.Sprite {
    return this.player;
  }

  /**
   * Get player position
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  /**
   * Set player position
   */
  public setPosition(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  /**
   * Update original Y position (for jump animations)
   */
  public updateOriginalY(y: number): void {
    this.originalY = y;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.avatarRendererV2) {
      this.avatarRendererV2.cleanup();
    }
  }
}

