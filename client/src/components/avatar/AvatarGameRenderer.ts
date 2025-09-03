import { AvatarConfig } from './avatarTypes';
import { composeAvatarDataUrl } from './composeAvatar';
import { loadAvatarConfig } from './avatarStorage';

export class AvatarGameRenderer {
  private scene: Phaser.Scene;
  private avatarTextures: Map<string, string> = new Map(); // username -> texture key
  private avatarSprites: Map<string, Phaser.GameObjects.Sprite> = new Map(); // username -> sprite

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for avatar configuration updates
    window.addEventListener('avatarConfigUpdated', this.handleAvatarUpdate.bind(this) as EventListener);
  }

  private async handleAvatarUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    const { username, config } = customEvent.detail;
    await this.updatePlayerAvatar(username, config);
  }

  /**
   * Load and create avatar texture for a player
   */
  public async loadPlayerAvatar(username: string): Promise<string | null> {
    try {
      // Load saved avatar config for this user
      const config = loadAvatarConfig(username);
      if (!config) {
        console.log(`No avatar config found for ${username}, will use default`);
        return null;
      }

      // Compose the avatar into a single image
      const avatarDataUrl = await composeAvatarDataUrl(config);
      if (!avatarDataUrl) {
        console.warn(`Failed to compose avatar for ${username}, will use default`);
        return null;
      }

      // Create unique texture key for this user
      const textureKey = `avatar_${username}`;

      // Remove existing texture if it exists
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }

      // Load the composed avatar as a texture
      return new Promise((resolve, reject) => {
        this.scene.load.image(textureKey, avatarDataUrl);
        this.scene.load.once('complete', () => {
          this.avatarTextures.set(username, textureKey);
          resolve(textureKey);
        });
        this.scene.load.once('loaderror', () => {
          console.error(`Failed to load avatar texture for ${username}`);
          reject(new Error('Avatar texture load failed'));
        });
        this.scene.load.start();
      });
    } catch (error) {
      console.error(`Failed to load avatar for ${username}:`, error);
      return null;
    }
  }

  /**
   * Update an existing player's avatar
   */
  public async updatePlayerAvatar(username: string, config?: AvatarConfig): Promise<void> {
    try {
      const avatarConfig = config || loadAvatarConfig(username);
      const avatarDataUrl = await composeAvatarDataUrl(avatarConfig);
      
      if (!avatarDataUrl) {
        console.warn(`Failed to compose updated avatar for ${username}`);
        return;
      }

      const textureKey = `avatar_${username}`;
      
      // Remove existing texture
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }

      // Load new texture
      this.scene.load.image(textureKey, avatarDataUrl);
      this.scene.load.once('complete', () => {
        this.avatarTextures.set(username, textureKey);
        
        // Update existing sprite if it exists
        const sprite = this.avatarSprites.get(username);
        if (sprite) {
          sprite.setTexture(textureKey);
        }
      });
      this.scene.load.start();
    } catch (error) {
      console.error(`Failed to update avatar for ${username}:`, error);
    }
  }

  /**
   * Create a player sprite with their avatar
   */
  public createPlayerSprite(username: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    const textureKey = this.avatarTextures.get(username);

    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      console.log(`No avatar texture found for ${username}, using default player sprite`);
      // Create default sprite
      const sprite = this.scene.add.sprite(x, y, 'player');
      this.avatarSprites.set(username, sprite);
      return sprite;
    }

    // Create sprite with avatar texture
    console.log(`Creating avatar sprite for ${username} with texture ${textureKey}`);
    const sprite = this.scene.add.sprite(x, y, textureKey);
    sprite.setDisplaySize(32, 32); // Scale to appropriate game size
    this.avatarSprites.set(username, sprite);
    return sprite;
  }

  /**
   * Get existing player sprite
   */
  public getPlayerSprite(username: string): Phaser.GameObjects.Sprite | null {
    return this.avatarSprites.get(username) || null;
  }

  /**
   * Remove player sprite and cleanup
   */
  public removePlayer(username: string): void {
    const sprite = this.avatarSprites.get(username);
    if (sprite) {
      sprite.destroy();
      this.avatarSprites.delete(username);
    }

    const textureKey = this.avatarTextures.get(username);
    if (textureKey && this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
      this.avatarTextures.delete(username);
    }
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('avatarConfigUpdated', this.handleAvatarUpdate.bind(this) as EventListener);

    // Cleanup all sprites and textures
    const usernames = Array.from(this.avatarSprites.keys());
    for (const username of usernames) {
      this.removePlayer(username);
    }
  }
}
