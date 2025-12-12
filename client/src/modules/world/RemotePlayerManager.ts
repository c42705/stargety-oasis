import Phaser from 'phaser';
import { AvatarSyncData, RemotePlayerData } from '../../services/WorldSocketService';
import { logger } from '../../shared/logger';

// Remote player container with metadata
interface RemotePlayer {
  container: Phaser.GameObjects.Container;
  playerId: string;
  targetX: number;
  targetY: number;
  avatarData?: AvatarSyncData;
}

/**
 * RemotePlayerManager - Manages rendering of other players in the world
 *
 * Responsibilities:
 * - Create sprites and nameplates for remote players in a container
 * - Update positions with smooth interpolation
 * - Destroy containers when players leave
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

  private truncateName(name: string, maxLength: number = 15): string {
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...';
    }
    return name;
  }

  /**
   * Calculate dynamic name label Y offset based on sprite height
   * This ensures the label appears above the sprite regardless of size
   */
  private getNameLabelYOffset(sprite: Phaser.GameObjects.Sprite): number {
    const spriteHeight = sprite.height || 32;
    return -(spriteHeight / 2) - 8;  // -(sprite.height / 2) - 8px spacing
  }

  /**
   * Add a new remote player
   */
  public addPlayer(data: RemotePlayerData): void {
    if (this.remotePlayers.has(data.playerId)) {
      logger.warn(`[RemotePlayerManager] Player already exists: ${data.playerId}`);
      return;
    }

    logger.info(`[RemotePlayerManager] Adding remote player: id=${data.playerId}, name=${data.name}, pos=(${data.x}, ${data.y})`);

    const container = this.scene.add.container(data.x, data.y);
    container.setDepth(500); // High depth to be above all map elements

    // 1. Player Sprite
    const sprite = this.createPlayerSprite(data);
    container.add(sprite);

    // 2. Status Dot
    // TODO: Connect this to actual player status (live, idle, busy)
    const statusDot = this.scene.add.circle(0, 0, 4, 0x2ade2a); // Default 'online' green
    statusDot.setStrokeStyle(1.5, 0x1a1a1a); // Dark outline
    container.add(statusDot);

    // 3. Name Text
    const truncatedName = this.truncateName(data.name || data.playerId);
    const nameText = this.scene.add.text(0, 0, truncatedName, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      // backgroundColor: '#00000099',
      padding: { x: 4, y: 2 },
    });
    nameText.setOrigin(0.5, 1);
    container.add(nameText);
    
    // Position elements relative to the sprite (which is at 0,0 in the container)
    // Dynamically calculate nameplate Y offset based on sprite height
    const nameplateYOffset = this.getNameLabelYOffset(sprite);
    
    // Position the text centered horizontally
    nameText.y = nameplateYOffset;

    // Position the dot to the left of the text
    const textWidth = nameText.getBounds().width;
    statusDot.x = -(textWidth / 2) - 8; // 8px spacing
    statusDot.y = nameplateYOffset - nameText.getBounds().height / 2 + 1; // Vertically center with text

    const remotePlayer: RemotePlayer = {
      container,
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
        logger.info(`[RemotePlayerManager] Avatar data received for: ${data.playerId}`);
      } catch (error) {
        logger.error(`[RemotePlayerManager] Failed to load avatar: ${error}`);
      }
    }

    // Create placeholder sprite (colored circle - larger and more visible)
    const size = 48; // Increased from 32
    const radius = 22; // Increased from 14
    const graphics = this.scene.add.graphics();
    const color = this.getPlayerColor(data.playerId);

    graphics.fillStyle(color, 1);
    graphics.fillCircle(size / 2, size / 2, radius);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.strokeCircle(size / 2, size / 2, radius);

    const textureKey = `remote_placeholder_${data.playerId}_${Date.now()}`;
    graphics.generateTexture(textureKey, size, size);
    graphics.destroy();
    
    // Sprite is positioned at (0,0) relative to its container
    const sprite = this.scene.add.sprite(0, 0, textureKey);
    sprite.setOrigin(0.5, 0.5);

    // Debug: Log sprite creation details
    logger.debug(`[RemotePlayerManager] Created sprite for ${data.playerId}:`);
    logger.debug(`  - Texture: ${sprite.texture.key}, Color: 0x${color.toString(16)}`);

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

    remotePlayer.container.destroy();
    this.remotePlayers.delete(playerId);
  }

  /**
   * Update all remote players (call in scene update loop)
   */
  public update(): void {
    this.remotePlayers.forEach((remotePlayer) => {
      // Interpolate position smoothly
      const container = remotePlayer.container;
      const currentX = container.x;
      const currentY = container.y;

      const dx = remotePlayer.targetX - currentX;
      const dy = remotePlayer.targetY - currentY;

      // Only move if the distance is significant to avoid jitter
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        container.x += dx * this.interpolationSpeed;
        container.y += dy * this.interpolationSpeed;
      }
    });
  }

  /**
   * Handle world state (multiple players at once)
   */
  public handleWorldState(players: RemotePlayerData[]): void {
    logger.debug(`[RemotePlayerManager] Handling world state with ${players.length} players`);

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
      remotePlayer.container.destroy();
    });
    this.remotePlayers.clear();
    logger.info('[RemotePlayerManager] Destroyed');
  }
}
