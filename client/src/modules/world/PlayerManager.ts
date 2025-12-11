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
   public playerContainer!: Phaser.GameObjects.Container;
   public player!: Phaser.GameObjects.Sprite;
   public avatarRendererV2!: AvatarRendererV2;
   private nameText!: Phaser.GameObjects.Text;  // Store reference to name label

   // Player properties
   public playerSize: number = 32; // Player sprite size for collision detection and bounds
   public originalY: number = 0; // Original Y position for jump animations

  constructor(scene: Phaser.Scene, eventBus: any, playerId: string) {
    logger.debug('🔥🔥🔥 PlayerManager CONSTRUCTOR called for player:', playerId);
    this.scene = scene;
    this.eventBus = eventBus;
    this.playerId = playerId;
  }

  /**
   * Initialize player sprite and avatar renderer
   */
  public initialize(initialX: number, initialY: number): void {
    logger.debug('[PlayerManager] 🚀 INITIALIZE called for player:', this.playerId);
    logger.debug('[PlayerManager] Initial position:', { initialX, initialY });

    // Initialize avatar renderer V2
    this.avatarRendererV2 = new AvatarRendererV2(this.scene);
    logger.debug('[PlayerManager] ✅ AvatarRendererV2 created');

    // Create placeholder sprite (V1 player-sheet removed - now V2 only)
    // This placeholder will be replaced by V2 avatar when loaded
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x4a90d9, 1); // Blue placeholder
    graphics.fillCircle(16, 16, 14);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(16, 16, 14);
    graphics.generateTexture('player-placeholder', 32, 32);
    graphics.destroy();

    // Create container at the initial position
    this.playerContainer = this.scene.add.container(initialX, initialY);
    this.playerContainer.setDepth(500); // High depth to be above all map elements

    // Create placeholder sprite at (0,0) inside container
    this.player = this.scene.add.sprite(0, 0, 'player-placeholder');
    this.player.setOrigin(0.5, 0.5);
    this.playerContainer.add(this.player);

    // Add name label (similar to RemotePlayerManager)
    this.nameText = this.scene.add.text(0, -28, this.playerId, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#333333cc',
      padding: { x: 4, y: 2 },
    });
    this.nameText.setOrigin(0.5, 1);
    this.playerContainer.add(this.nameText);

    this.originalY = this.playerContainer.y;
    logger.debug('[PlayerManager] ✅ LOCAL PLAYER container created:');

    // Load avatar asynchronously and update sprite when ready
    logger.debug('[PlayerManager] 🔵 Calling initializePlayerAsync...');
    this.initializePlayerAsync();

    // Set up character switching event listener
    logger.debug('[PlayerManager] 🔵 Calling setupCharacterSwitchingV2...');
    this.setupCharacterSwitchingV2();
    logger.debug('[PlayerManager] ✅ INITIALIZE complete');
  }

  /**
   * Asynchronously initialize player with V2 character system
   */
  private async initializePlayerAsync(): Promise<void> {
    logger.debug('[PlayerManager] 🔵 initializePlayerAsync started');

    // DEBUG: Check localStorage for character data
    logger.debug('[PlayerManager] 🔍 Checking localStorage for character data...');
    const activeKey = `stargety_v2_active_character_${this.playerId}`;
    const activeData = localStorage.getItem(activeKey);
    logger.debug('[PlayerManager] Active character key:', activeKey);
    logger.debug('[PlayerManager] Active character data:', activeData);

    if (activeData) {
      try {
        const parsed = JSON.parse(activeData);
        logger.debug('[PlayerManager] Parsed active character:', parsed);
        const slotKey = `stargety_v2_character_${this.playerId}_slot_${parsed.activeSlotNumber}`;
        const slotData = localStorage.getItem(slotKey);
        logger.debug('[PlayerManager] Slot key:', slotKey);
        logger.debug('[PlayerManager] Slot data exists:', !!slotData);
        if (slotData) {
          const slotParsed = JSON.parse(slotData);
          logger.debug('[PlayerManager] Slot character name:', slotParsed.name);
        }
      } catch (e) {
        logger.error('[PlayerManager] Error parsing localStorage data:', e);
      }
    } else {
      logger.warn('[PlayerManager] ⚠️ No active character found in localStorage');
    }

    // Try V2 system first (NEW)
    try {
      logger.debug('[PlayerManager] Attempting to load V2 character for:', this.playerId);
      const v2Sprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        this.playerContainer.x,
        this.playerContainer.y
      );
      logger.debug('[PlayerManager] createOrUpdateSprite returned:', v2Sprite ? 'SUCCESS' : 'NULL');

      if (v2Sprite) {
        // Successfully loaded from V2 system
        logger.debug('[PlayerManager] ✅ V2 character loaded! Replacing default sprite...');

        // Remove old sprite from container and destroy it
        this.playerContainer.remove(this.player);
        this.player.destroy();

        // Add new sprite to container at (0,0)
        this.player = v2Sprite;
        this.player.setPosition(0, 0);
        this.player.setOrigin(0.5, 0.5);
        this.playerContainer.add(this.player);

        // Update name label position based on sprite height
        this.updateNameLabelPosition();

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        logger.info('[PlayerManager] Player initialized with V2 character system');

        // Announce player joined
        this.eventBus.publish('world:playerJoined', {
          playerId: this.playerId,
          x: this.playerContainer.x,
          y: this.playerContainer.y,
        });

        return; // Successfully initialized with V2 system
      } else {
        logger.warn('[PlayerManager] ⚠️ V2 sprite is null, using default sprite');
      }
    } catch (error) {
      logger.warn('[PlayerManager] ⚠️ Error loading V2 character:', error);
      logger.info('[PlayerManager] No V2 character found, using default sprite');

      // Announce player joined with default sprite
      this.eventBus.publish('world:playerJoined', {
        playerId: this.playerId,
        x: this.playerContainer.x,
        y: this.playerContainer.y,
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
        logger.debug('[PlayerManager] 🔵 Event listener triggered!');
        const customEvent = event as CustomEvent;
        const { username, slotNumber } = customEvent.detail;

        logger.debug('[PlayerManager] Received characterSwitchedV2 event:', {
          username,
          slotNumber,
          myPlayerId: this.playerId
        });

        // Only handle events for this player
        if (username !== this.playerId) {
          logger.debug('[PlayerManager] ❌ Ignoring event - not for this player');
          return;
        }

        logger.info(`[PlayerManager] Character switched to slot ${slotNumber} for ${username}`);

        logger.debug('[PlayerManager] 🔵 About to call updatePlayerCharacterV2...');
        // Update player sprite with new character
        await this.updatePlayerCharacterV2(slotNumber);
        logger.debug('[PlayerManager] 🔵 updatePlayerCharacterV2 completed');
      } catch (error) {
        logger.error('[PlayerManager] ❌ Error in characterSwitchedV2 event handler:', error);
      }
    });
  }

  /**
   * Update player character sprite using V2 renderer
   */
  private async updatePlayerCharacterV2(slotNumber: number): Promise<void> {
    logger.debug('[PlayerManager] updatePlayerCharacterV2 called with slot:', slotNumber);

    if (!this.player) {
      logger.warn('[PlayerManager] Cannot update character - player sprite not initialized');
      return;
    }

    try {
      logger.debug('[PlayerManager] Updating player character to slot:', slotNumber);

      // Store current position
      const currentX = this.playerContainer.x;
      const currentY = this.playerContainer.y;
      logger.debug('[PlayerManager] Current player position:', { currentX, currentY });

      logger.debug('[PlayerManager] Calling avatarRendererV2.createOrUpdateSprite...');
      // Create or update sprite using V2 renderer
      const newSprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        currentX,
        currentY,
        slotNumber
      );
      logger.debug('[PlayerManager] avatarRendererV2.createOrUpdateSprite returned:', newSprite ? 'SUCCESS' : 'NULL');

      if (newSprite) {
        logger.debug('[PlayerManager] Sprite updated successfully by AvatarRenderer');
        logger.debug('[PlayerManager] Old sprite texture:', this.player?.texture?.key);

        // IMPORTANT: AvatarRenderer.createOrUpdateSprite() already manages the sprite internally
        // It updates existing sprite's texture or creates a new one and stores in avatarSprites map
        // We need to update our container reference

        logger.debug('[PlayerManager] Updating player reference to point to updated sprite...');
        
        // Only swap if it's a different sprite object
        if (this.player && this.player !== newSprite) {
          // Remove old sprite from container (but don't destroy - it might still be tracked by AvatarRenderer)
          if (this.playerContainer.list.includes(this.player)) {
            this.playerContainer.remove(this.player);
          }
        }

        // Update our reference
        this.player = newSprite;
        this.player.setPosition(0, 0);
        this.player.setOrigin(0.5, 0.5);
        this.player.setVisible(true);
        this.player.setActive(true);
        
        // Ensure sprite is in container
        if (!this.playerContainer.list.includes(this.player)) {
          this.playerContainer.add(this.player);
          logger.debug('[PlayerManager] Added sprite to container');
        } else {
          logger.debug('[PlayerManager] Sprite already in container');
        }

        logger.debug('[PlayerManager] New sprite texture:', this.player.texture.key);

        // Update name label position based on new sprite height
        this.updateNameLabelPosition();

        // Play idle animation
        logger.debug('[PlayerManager] Playing idle animation...');
        const animResult = this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);
        logger.debug('[PlayerManager] Animation play result:', animResult);

        logger.info(`[PlayerManager] Successfully updated player character to slot ${slotNumber}`);

        // Emit event for multiplayer sync - GameScene will handle socket emission
        logger.debug('[PlayerManager] Publishing character-switched event for multiplayer sync...');
        this.eventBus.publish('world:characterSwitched', {
          playerId: this.playerId,
          slotNumber: slotNumber
        });
      } else {
        logger.warn(`[PlayerManager] Failed to create sprite for slot ${slotNumber}`);
        logger.warn('[PlayerManager] createOrUpdateSprite returned NULL - character may not exist or failed to load');
      }
    } catch (error) {
      logger.error('[PlayerManager] Error updating player character:', error);
    }
  }

  /**
   * Play animation based on direction
   */
  public playAnimation(direction: 'up' | 'down' | 'left' | 'right' | 'idle'): void {
    // Verify sprite is valid before attempting animation
    if (!this.verifySpriteValidity()) {
      logger.debug('[PlayerManager] Sprite not valid, cannot play animation');
      return;
    }
    
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
      const animSuccess = this.avatarRendererV2.playAnimation(this.playerId, animCategory);
      if (!animSuccess) {
        logger.debug(`[PlayerManager] Animation playback failed for direction ${direction} - falling back to idle`, {
          animCategory,
          playerId: this.playerId
        });
        // Try idle as fallback
        if (direction !== 'idle') {
          this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);
        }
      }
    } else {
      logger.debug(`[PlayerManager] No V2 sprite available for player ${this.playerId}, cannot play animation for direction ${direction}`);
    }
  }

  /**
   * Update the name label position based on current sprite height
   * This ensures the label appears above the sprite regardless of size
   */
  private updateNameLabelPosition(): void {
    if (!this.nameText || !this.player) return;

    // Calculate Y offset based on sprite height: -(sprite.height / 2) - 8px spacing
    const spriteHeight = this.player.height || 32;
    const nameYOffset = -(spriteHeight / 2) - 8;
    
    this.nameText.setY(nameYOffset);
    logger.debug('[PlayerManager] Updated name label position:', { spriteHeight, nameYOffset });
  }

  /**
   * Verify that player sprite is valid and in scene
   */
  private verifySpriteValidity(): boolean {
    if (!this.player) {
      logger.debug('[PlayerManager] Player sprite is null');
      return false;
    }
    
    if (!this.player.scene) {
      logger.debug('[PlayerManager] Player sprite is not in a scene');
      return false;
    }
    
    if (!this.player.active) {
      logger.debug('[PlayerManager] Player sprite is not active, re-activating...');
      this.player.setActive(true);
    }
    
    if (!this.player.visible) {
      logger.debug('[PlayerManager] Player sprite is not visible, making visible...');
      this.player.setVisible(true);
    }
    
    return true;
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
    return { x: this.playerContainer.x, y: this.playerContainer.y };
  }

  /**
   * Set player position
   */
  public setPosition(x: number, y: number): void {
    this.playerContainer.x = x;
    this.playerContainer.y = y;
  }

  /**
   * Update original Y position (for jump animations)
   */
  public updateOriginalY(y: number): void {
    this.originalY = y;
  }

  /**
   * Get player container (for backward compatibility)
   */
  public getPlayerContainer(): Phaser.GameObjects.Container {
    return this.playerContainer;
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

