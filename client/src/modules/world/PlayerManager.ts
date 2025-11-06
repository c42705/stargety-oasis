import Phaser from 'phaser';
import { AvatarRenderer as AvatarRendererV2 } from '../../components/avatar/v2';
import { AnimationCategory } from '../../components/avatar/AvatarBuilderTypes';
import { logger } from '../../shared/logger';

console.log('🔥🔥🔥 PlayerManager.ts FILE LOADED 🔥🔥🔥');

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
    console.log('🔥🔥🔥 PlayerManager CONSTRUCTOR called for player:', playerId);
    this.scene = scene;
    this.eventBus = eventBus;
    this.playerId = playerId;
  }

  /**
   * Initialize player sprite and avatar renderer
   */
  public initialize(initialX: number, initialY: number): void {
    console.log('[PlayerManager] 🚀 INITIALIZE called for player:', this.playerId);
    console.log('[PlayerManager] Initial position:', { initialX, initialY });

    // Initialize avatar renderer V2
    this.avatarRendererV2 = new AvatarRendererV2(this.scene);
    console.log('[PlayerManager] ✅ AvatarRendererV2 created');

    // Create player from sprite sheet and play idle animation
    // Check if sprite sheet exists, otherwise create a simple rectangle as placeholder
    if (this.scene.textures.exists('player-sheet')) {
      this.player = this.scene.add.sprite(initialX, initialY, 'player-sheet', 0);
      this.player.setDisplaySize(32, 32); // Use native sprite frame size for crisp animation
      this.player.setOrigin(0.5, 0.5); // Ensure sprite is centered on its position
      this.player.setDepth(10);
      this.originalY = this.player.y;

      // Only play animation if it exists
      if (this.scene.anims.exists('player_idle')) {
        this.player.anims.play('player_idle');
      }
      console.log('[PlayerManager] ✅ Default player sprite created from sprite sheet');
    } else {
      // Fallback: create a simple colored rectangle as placeholder
      console.warn('[PlayerManager] ⚠️ player-sheet texture not found, creating placeholder');
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x00ff00, 1);
      graphics.fillRect(-16, -16, 32, 32);
      graphics.generateTexture('player-placeholder', 32, 32);
      graphics.destroy();

      this.player = this.scene.add.sprite(initialX, initialY, 'player-placeholder');
      this.player.setOrigin(0.5, 0.5);
      this.player.setDepth(10);
      this.originalY = this.player.y;
      console.log('[PlayerManager] ✅ Default player placeholder created');
    }

    // Load avatar asynchronously and update sprite when ready
    console.log('[PlayerManager] 🔵 Calling initializePlayerAsync...');
    this.initializePlayerAsync();

    // Set up character switching event listener
    console.log('[PlayerManager] 🔵 Calling setupCharacterSwitchingV2...');
    this.setupCharacterSwitchingV2();
    console.log('[PlayerManager] ✅ INITIALIZE complete');
  }

  /**
   * Asynchronously initialize player with V2 character system
   */
  private async initializePlayerAsync(): Promise<void> {
    console.log('[PlayerManager] 🔵 initializePlayerAsync started');

    // DEBUG: Check localStorage for character data
    console.log('[PlayerManager] 🔍 Checking localStorage for character data...');
    const activeKey = `stargety_v2_active_character_${this.playerId}`;
    const activeData = localStorage.getItem(activeKey);
    console.log('[PlayerManager] Active character key:', activeKey);
    console.log('[PlayerManager] Active character data:', activeData);

    if (activeData) {
      try {
        const parsed = JSON.parse(activeData);
        console.log('[PlayerManager] Parsed active character:', parsed);
        const slotKey = `stargety_v2_character_${this.playerId}_slot_${parsed.activeSlotNumber}`;
        const slotData = localStorage.getItem(slotKey);
        console.log('[PlayerManager] Slot key:', slotKey);
        console.log('[PlayerManager] Slot data exists:', !!slotData);
        if (slotData) {
          const slotParsed = JSON.parse(slotData);
          console.log('[PlayerManager] Slot character name:', slotParsed.name);
        }
      } catch (e) {
        console.error('[PlayerManager] Error parsing localStorage data:', e);
      }
    } else {
      console.log('[PlayerManager] ⚠️ No active character found in localStorage');
    }

    // Try V2 system first (NEW)
    try {
      console.log('[PlayerManager] Attempting to load V2 character for:', this.playerId);
      const v2Sprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        this.player.x,
        this.player.y
      );
      console.log('[PlayerManager] createOrUpdateSprite returned:', v2Sprite ? 'SUCCESS' : 'NULL');

      if (v2Sprite) {
        // Successfully loaded from V2 system
        console.log('[PlayerManager] ✅ V2 character loaded! Replacing default sprite...');
        const oldX = this.player.x;
        const oldY = this.player.y;
        this.player.destroy();

        this.player = v2Sprite;
        this.player.setPosition(oldX, oldY);
        this.player.setOrigin(0.5, 0.5);
        this.player.setDepth(10);

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        console.log('[PlayerManager] ✅ Player initialized with V2 character system');
        logger.info('[PlayerManager] Player initialized with V2 character system');

        // Announce player joined
        this.eventBus.publish('world:playerJoined', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });

        return; // Successfully initialized with V2 system
      } else {
        console.log('[PlayerManager] ⚠️ V2 sprite is null, using default sprite');
      }
    } catch (error) {
      console.log('[PlayerManager] ⚠️ Error loading V2 character:', error);
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
    console.log('[PlayerManager] 🔵 Setting up character switching listener for player:', this.playerId);
    logger.debug('[PlayerManager] Setting up character switching listener for player:', this.playerId);

    // Listen for characterSwitchedV2 custom event from MyProfileTab
    window.addEventListener('characterSwitchedV2', async (event) => {
      try {
        console.log('[PlayerManager] 🔵 Event listener triggered!');
        const customEvent = event as CustomEvent;
        const { username, slotNumber } = customEvent.detail;

        console.log('[PlayerManager] Received characterSwitchedV2 event:', {
          username,
          slotNumber,
          myPlayerId: this.playerId
        });
        logger.debug('[PlayerManager] Received characterSwitchedV2 event:', {
          username,
          slotNumber,
          myPlayerId: this.playerId
        });

        console.log('[PlayerManager] 🔵 About to check username match...');
        console.log('[PlayerManager] Username comparison:', {
          username,
          playerId: this.playerId,
          areEqual: username === this.playerId,
          usernameType: typeof username,
          playerIdType: typeof this.playerId
        });

        // Only handle events for this player
        if (username !== this.playerId) {
          console.log('[PlayerManager] ❌ Ignoring event - not for this player');
          logger.debug('[PlayerManager] Ignoring event - not for this player');
          return;
        }

        console.log('[PlayerManager] ✅ Event is for this player, proceeding with character update');
        logger.info(`[PlayerManager] Character switched to slot ${slotNumber} for ${username}`);

        console.log('[PlayerManager] 🔵 About to call updatePlayerCharacterV2...');
        // Update player sprite with new character
        await this.updatePlayerCharacterV2(slotNumber);
        console.log('[PlayerManager] 🔵 updatePlayerCharacterV2 completed');
      } catch (error) {
        console.error('[PlayerManager] ❌ Error in characterSwitchedV2 event handler:', error);
        logger.error('[PlayerManager] Error in characterSwitchedV2 event handler:', error);
      }
    });
  }

  /**
   * Update player character sprite using V2 renderer
   */
  private async updatePlayerCharacterV2(slotNumber: number): Promise<void> {
    console.log('[PlayerManager] 🔵 updatePlayerCharacterV2 called with slot:', slotNumber);

    if (!this.player) {
      console.error('[PlayerManager] ❌ Cannot update character - player sprite not initialized');
      logger.warn('[PlayerManager] Cannot update character - player sprite not initialized');
      return;
    }

    try {
      console.log('[PlayerManager] Updating player character to slot:', slotNumber);
      logger.debug('[PlayerManager] Updating player character to slot:', slotNumber);

      // Store current position
      const currentX = this.player.x;
      const currentY = this.player.y;
      console.log('[PlayerManager] Current player position:', { currentX, currentY });

      console.log('[PlayerManager] 🔵 Calling avatarRendererV2.createOrUpdateSprite...');
      // Create or update sprite using V2 renderer
      const newSprite = await this.avatarRendererV2.createOrUpdateSprite(
        this.playerId,
        currentX,
        currentY,
        slotNumber
      );
      console.log('[PlayerManager] 🔵 avatarRendererV2.createOrUpdateSprite returned:', newSprite ? 'SUCCESS' : 'NULL');

      if (newSprite) {
        console.log('[PlayerManager] ✅ New sprite created successfully, replacing old sprite');
        logger.debug('[PlayerManager] New sprite created successfully, replacing old sprite');

        // Replace the old player sprite with the new one
        this.player.destroy();
        this.player = newSprite;
        this.player.setOrigin(0.5, 0.5);
        this.player.setDepth(10);

        // Play idle animation
        this.avatarRendererV2.playAnimation(this.playerId, AnimationCategory.IDLE);

        console.log('[PlayerManager] ✅ Successfully updated player character to slot', slotNumber);
        logger.info(`[PlayerManager] Successfully updated player character to slot ${slotNumber}`);
      } else {
        console.error('[PlayerManager] ❌ Failed to create sprite for slot', slotNumber);
        logger.warn(`[PlayerManager] Failed to create sprite for slot ${slotNumber}`);
      }
    } catch (error) {
      console.error('[PlayerManager] ❌ Error updating player character:', error);
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

