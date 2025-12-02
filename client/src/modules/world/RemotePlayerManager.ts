import Phaser from 'phaser';
import { AvatarSyncData, RemotePlayerData } from '../../services/WorldSocketService';
import { logger } from '../../shared/logger';

// Remote player sprite with metadata
interface RemotePlayer {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  nameLabel: Phaser.GameObjects.Text;
  playerId: string;
  targetX: number;
  targetY: number;
  avatarData?: AvatarSyncData;
}

/**
 * RemotePlayerManager - Manages rendering of other players in the world
 *
 * Responsibilities:
 * - Create sprites for remote players
 * - Update positions with smooth interpolation
 * - Destroy sprites when players leave
 * - Render V2 avatars or placeholder for remote players
 */
export class RemotePlayerManager {
  private scene: Phaser.Scene;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private interpolationSpeed: number = 0.15; // Smoothing factor for movement

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    logger.info('[RemotePlayerManager] Initialized');
  }

  /**
   * Add a new remote player
   */
  public addPlayer(data: RemotePlayerData): void {
    if (this.remotePlayers.has(data.playerId)) {
      logger.warn('[RemotePlayerManager] Player already exists:', data.playerId);
      return;
    }

    logger.info('[RemotePlayerManager] Adding remote player:', data.playerId);

    // Create sprite based on avatar data
    const sprite = this.createPlayerSprite(data);

    // Create name label
    const nameLabel = this.scene.add.text(data.x, data.y - 25, data.name || data.playerId, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#333333aa',
      padding: { x: 4, y: 2 },
    });
    nameLabel.setOrigin(0.5, 1);
    nameLabel.setDepth(11);

    const remotePlayer: RemotePlayer = {
      sprite,
      nameLabel,
      playerId: data.playerId,
      targetX: data.x,
      targetY: data.y,
      avatarData: data.avatarData,
    };

    this.remotePlayers.set(data.playerId, remotePlayer);
  }

  /**
   * Create sprite for remote player (V2 avatar or placeholder)
   */
  private createPlayerSprite(data: RemotePlayerData): Phaser.GameObjects.Sprite {
    // If avatar data exists, try to load it as texture
    if (data.avatarData?.spriteSheetImageData) {
      const textureKey = `remote_avatar_${data.playerId}`;

      try {
        // Create texture from base64 image data
        const img = new Image();
        img.src = data.avatarData.spriteSheetImageData;

        // For now, use placeholder until image loads
        // TODO: Implement async texture loading
        logger.info('[RemotePlayerManager] Avatar data received for:', data.playerId);
      } catch (error) {
        logger.error('[RemotePlayerManager] Failed to load avatar:', error);
      }
    }

    // Create placeholder sprite (colored circle with initial)
    const graphics = this.scene.add.graphics();
    const color = this.getPlayerColor(data.playerId);

    graphics.fillStyle(color, 1);
    graphics.fillCircle(16, 16, 14);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircle(16, 16, 14);

    const textureKey = `remote_placeholder_${data.playerId}`;
    graphics.generateTexture(textureKey, 32, 32);
    graphics.destroy();

    const sprite = this.scene.add.sprite(data.x, data.y, textureKey);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDepth(9); // Below local player (10)

    return sprite;
  }

  /**
   * Generate consistent color for player based on their ID
   */
  private getPlayerColor(playerId: string): number {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate vibrant colors
    const hue = Math.abs(hash % 360);
    return Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.5).color;
  }

  /**
   * Update remote player position
   */
  public updatePlayerPosition(playerId: string, x: number, y: number): void {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) return;

    remotePlayer.targetX = x;
    remotePlayer.targetY = y;
  }

  /**
   * Remove remote player
   */
  public removePlayer(playerId: string): void {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) return;

    logger.info('[RemotePlayerManager] Removing player:', playerId);

    remotePlayer.sprite.destroy();
    remotePlayer.nameLabel.destroy();
    this.remotePlayers.delete(playerId);
  }

  /**
   * Update all remote players (call in scene update loop)
   */
  public update(): void {
    this.remotePlayers.forEach((remotePlayer) => {
      // Interpolate position smoothly
      const sprite = remotePlayer.sprite;
      const currentX = sprite.x;
      const currentY = sprite.y;

      const dx = remotePlayer.targetX - currentX;
      const dy = remotePlayer.targetY - currentY;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        sprite.x += dx * this.interpolationSpeed;
        sprite.y += dy * this.interpolationSpeed;

        // Update name label position
        remotePlayer.nameLabel.x = sprite.x;
        remotePlayer.nameLabel.y = sprite.y - 25;
      }
    });
  }

  /**
   * Handle world state (multiple players at once)
   */
  public handleWorldState(players: RemotePlayerData[]): void {
    logger.info(`[RemotePlayerManager] Handling world state with ${players.length} players`);

    players.forEach(playerData => {
      if (!this.remotePlayers.has(playerData.playerId)) {
        this.addPlayer(playerData);
      }
    });
  }

  /**
   * Get number of remote players
   */
  public getPlayerCount(): number {
    return this.remotePlayers.size;
  }

  /**
   * Cleanup all remote players
   */
  public destroy(): void {
    this.remotePlayers.forEach((remotePlayer) => {
      remotePlayer.sprite.destroy();
      remotePlayer.nameLabel.destroy();
    });
    this.remotePlayers.clear();
    logger.info('[RemotePlayerManager] Destroyed');
  }
}
