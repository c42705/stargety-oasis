/**
 * Avatar Renderer V2
 * Phaser.js renderer for sprite-sheet-based characters with built-in caching
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import { CharacterStorage } from './CharacterStorage';
import { CharacterSlot, EmptyCharacterSlot, isEmptySlot } from './types';
import { SpriteSheetDefinition, AnimationCategory, FrameDefinition } from '../AvatarBuilderTypes';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TextureCache } from './TextureCache';

/**
 * Texture cache entry
 */
interface TextureCacheEntry {
  textureKey: string;
  spriteSheetId: string;
  loadedAt: string;
  frameCount: number;
  animationKeys: string[];
}

/**
 * Render result
 */
interface RenderResult {
  success: boolean;
  textureKey?: string;
  error?: string;
}

/**
 * Avatar Renderer for Phaser.js
 * Handles sprite sheet loading, texture creation, and animation playback
 */
export class AvatarRenderer {
  private scene: Phaser.Scene;
  private textureCache: TextureCache<TextureCacheEntry>;
  private avatarSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private debugMode: boolean = false;

  constructor(
    scene: Phaser.Scene,
    debugMode: boolean = false,
    maxCachedTextures: number = 20,
    maxCacheMemoryMB: number = 50
  ) {
    this.scene = scene;
    this.debugMode = debugMode;
    this.textureCache = new TextureCache<TextureCacheEntry>(maxCachedTextures, maxCacheMemoryMB);

    this.log('Initialization', 'AvatarRenderer initialized', {
      maxCachedTextures,
      maxCacheMemoryMB
    });
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log debug message
   */
  private log(phase: string, message: string, data?: any): void {
    if (!this.debugMode) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AvatarRenderer:${phase}] ${message}`;
    
    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Log error message
   */
  private logError(phase: string, message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AvatarRenderer:${phase}] ERROR: ${message}`;
    
    if (error !== undefined) {
      console.error(logMessage, error);
    } else {
      console.error(logMessage);
    }
  }

  // ============================================================================
  // Texture Loading and Caching
  // ============================================================================

  /**
   * Load character sprite sheet into Phaser
   */
  async loadCharacterTexture(username: string, slotNumber?: number): Promise<RenderResult> {
    return PerformanceMonitor.measure('AvatarRenderer.loadCharacterTexture', async () => {
      try {
        this.log('TextureLoading', `Loading character texture for ${username}`, { slotNumber });

      // Load character slot
      let characterSlot: CharacterSlot | EmptyCharacterSlot;
      
      if (slotNumber !== undefined) {
        const result = CharacterStorage.loadCharacterSlot(username, slotNumber);
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to load character slot'
          };
        }
        characterSlot = result.data;
      } else {
        // Load active character
        const result = CharacterStorage.getActiveCharacterSlot(username);
        if (!result.success || !result.data) {
          return {
            success: false,
            error: result.error || 'Failed to load active character'
          };
        }
        characterSlot = result.data;
      }

      // Check if slot is empty
      if (isEmptySlot(characterSlot)) {
        return {
          success: false,
          error: 'Character slot is empty'
        };
      }

      // Check cache first
      const cachedTexture = this.getCachedTexture(characterSlot.spriteSheet.id);
      if (cachedTexture) {
        this.log('TextureLoading', 'Using cached texture', { textureKey: cachedTexture.textureKey });
        return {
          success: true,
          textureKey: cachedTexture.textureKey
        };
      }

      // Load sprite sheet into Phaser
      const textureKey = await this.loadSpriteSheet(username, characterSlot.spriteSheet);
      
      if (!textureKey) {
        return {
          success: false,
          error: 'Failed to load sprite sheet into Phaser'
        };
      }

      return {
        success: true,
        textureKey
      };

    } catch (error) {
      this.logError('TextureLoading', 'Failed to load character texture', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    }, { username, slotNumber });
  }

  /**
   * Load sprite sheet definition into Phaser texture manager
   */
  private async loadSpriteSheet(username: string, definition: SpriteSheetDefinition): Promise<string | null> {
    try {
      const textureKey = `avatar_v2_${username}_${definition.id}`;
      
      this.log('SpriteSheetLoading', 'Loading sprite sheet', {
        textureKey,
        frameCount: definition.frames.length,
        animationCount: definition.animations.length
      });

      // Check if texture already exists
      if (this.scene.textures.exists(textureKey)) {
        this.log('SpriteSheetLoading', 'Texture already exists, reusing', { textureKey });
        return textureKey;
      }

      // Load image from source data
      const img = await this.loadImage(definition.source.imageData);
      
      if (!img) {
        this.logError('SpriteSheetLoading', 'Failed to load source image');
        return null;
      }

      this.log('SpriteSheetLoading', 'Source image loaded', {
        width: img.width,
        height: img.height
      });

      // Determine if we can use grid layout or need custom frames
      if (definition.gridLayout) {
        // Use Phaser's built-in sprite sheet loader for grid layouts
        return this.loadGridSpriteSheet(textureKey, img, definition);
      } else {
        // Use custom frame loading for non-grid layouts
        return this.loadCustomFrameSpriteSheet(textureKey, img, definition);
      }

    } catch (error) {
      this.logError('SpriteSheetLoading', 'Failed to load sprite sheet', error);
      return null;
    }
  }

  /**
   * Load image from data URL
   */
  private loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        this.logError('ImageLoading', 'Failed to load image from data URL');
        resolve(null);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Load sprite sheet with grid layout
   */
  private loadGridSpriteSheet(
    textureKey: string,
    img: HTMLImageElement,
    definition: SpriteSheetDefinition
  ): string | null {
    try {
      const { gridLayout } = definition;
      
      if (!gridLayout) {
        return null;
      }

      this.log('GridSpriteSheet', 'Loading grid-based sprite sheet', {
        columns: gridLayout.columns,
        rows: gridLayout.rows,
        frameWidth: gridLayout.frameWidth,
        frameHeight: gridLayout.frameHeight
      });

      // Use Phaser's addSpriteSheet for grid layouts
      this.scene.textures.addSpriteSheet(textureKey, img, {
        frameWidth: gridLayout.frameWidth,
        frameHeight: gridLayout.frameHeight,
        startFrame: 0,
        endFrame: definition.frames.length - 1,
        spacing: gridLayout.spacing?.x || 0,
        margin: gridLayout.margin?.x || 0
      });

      // Register animations
      this.registerAnimations(textureKey, definition);

      // Cache texture
      this.cacheTexture(textureKey, definition);

      this.log('GridSpriteSheet', 'Grid sprite sheet loaded successfully', { textureKey });
      
      return textureKey;

    } catch (error) {
      this.logError('GridSpriteSheet', 'Failed to load grid sprite sheet', error);
      return null;
    }
  }

  /**
   * Load sprite sheet with custom frame positions
   */
  private loadCustomFrameSpriteSheet(
    textureKey: string,
    img: HTMLImageElement,
    definition: SpriteSheetDefinition
  ): string | null {
    try {
      this.log('CustomFrameSpriteSheet', 'Loading custom frame sprite sheet', {
        frameCount: definition.frames.length
      });

      // Add base texture
      this.scene.textures.addImage(textureKey, img);

      // Add individual frames
      const texture = this.scene.textures.get(textureKey);
      
      definition.frames.forEach((frame, index) => {
        const frameName = index.toString();
        
        texture.add(frameName, 0, 
          frame.sourceRect.x,
          frame.sourceRect.y,
          frame.sourceRect.width,
          frame.sourceRect.height
        );
      });

      // Register animations
      this.registerAnimations(textureKey, definition);

      // Cache texture
      this.cacheTexture(textureKey, definition);

      this.log('CustomFrameSpriteSheet', 'Custom frame sprite sheet loaded successfully', { textureKey });
      
      return textureKey;

    } catch (error) {
      this.logError('CustomFrameSpriteSheet', 'Failed to load custom frame sprite sheet', error);
      return null;
    }
  }

  /**
   * Get cached texture if available
   */
  private getCachedTexture(spriteSheetId: string): TextureCacheEntry | null {
    const cached = this.textureCache.get(spriteSheetId);
    
    if (cached && this.scene.textures.exists(cached.textureKey)) {
      return cached;
    }
    
    // Remove invalid cache entry
    if (cached) {
      this.textureCache.delete(spriteSheetId);
    }
    
    return null;
  }

  /**
   * Cache texture entry
   */
  private cacheTexture(textureKey: string, definition: SpriteSheetDefinition): void {
    const cacheEntry: TextureCacheEntry = {
      textureKey,
      spriteSheetId: definition.id,
      loadedAt: new Date().toISOString(),
      frameCount: definition.frames.length,
      animationKeys: definition.animations.map(anim => `${textureKey}_${anim.category}`)
    };

    // Estimate memory size (width * height * 4 bytes for RGBA)
    const memorySize = this.estimateTextureMemory(textureKey);

    this.textureCache.set(definition.id, cacheEntry, memorySize);

    this.log('TextureCache', 'Texture cached', {
      spriteSheetId: definition.id,
      textureKey,
      memorySize: this.formatBytes(memorySize)
    });
  }

  /**
   * Estimate texture memory usage
   */
  private estimateTextureMemory(textureKey: string): number {
    const texture = this.scene.textures.get(textureKey);
    if (texture && texture.source && texture.source[0]) {
      const source = texture.source[0];
      const width = source.width;
      const height = source.height;
      // RGBA = 4 bytes per pixel
      return width * height * 4;
    }
    return 0;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // ============================================================================
  // Animation Registration
  // ============================================================================

  /**
   * Register animations with Phaser animation manager
   */
  private registerAnimations(textureKey: string, definition: SpriteSheetDefinition): void {
    try {
      this.log('AnimationRegistration', 'Registering animations', {
        textureKey,
        animationCount: definition.animations.length
      });

      definition.animations.forEach(animation => {
        const animKey = `${textureKey}_${animation.category}`;

        // Skip if animation already exists
        if (this.scene.anims.exists(animKey)) {
          this.log('AnimationRegistration', 'Animation already exists, skipping', { animKey });
          return;
        }

        // Get frame indices from frame IDs
        const frameIndices = animation.sequence.frameIds.map(frameId => {
          const frameIndex = definition.frames.findIndex(f => f.id === frameId);
          return frameIndex >= 0 ? frameIndex : 0;
        });

        // Create animation config
        const animConfig: Phaser.Types.Animations.Animation = {
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(textureKey, {
            frames: frameIndices
          }),
          frameRate: animation.sequence.frameRate || definition.defaultSettings.frameRate,
          repeat: animation.sequence.loop ? -1 : 0
        };

        this.scene.anims.create(animConfig);

        this.log('AnimationRegistration', 'Animation registered', {
          animKey,
          category: animation.category,
          frameCount: frameIndices.length,
          frameRate: animConfig.frameRate
        });
      });

      this.log('AnimationRegistration', 'All animations registered successfully');

    } catch (error) {
      this.logError('AnimationRegistration', 'Failed to register animations', error);
    }
  }

  /**
   * Get animation key for a category
   */
  private getAnimationKey(textureKey: string, category: AnimationCategory): string {
    return `${textureKey}_${category}`;
  }

  // ============================================================================
  // Sprite Creation and Management
  // ============================================================================

  /**
   * Create or update avatar sprite for a player
   */
  async createOrUpdateSprite(
    username: string,
    x: number,
    y: number,
    slotNumber?: number
  ): Promise<Phaser.GameObjects.Sprite | null> {
    try {
      this.log('SpriteCreation', `Creating/updating sprite for ${username}`, { x, y, slotNumber });

      // Load texture
      const textureResult = await this.loadCharacterTexture(username, slotNumber);

      if (!textureResult.success || !textureResult.textureKey) {
        this.logError('SpriteCreation', 'Failed to load texture', textureResult.error);
        return null;
      }

      const textureKey = textureResult.textureKey;

      // Check if sprite already exists
      let sprite = this.avatarSprites.get(username);

      if (sprite) {
        // Update existing sprite
        this.log('SpriteCreation', 'Updating existing sprite', { username, textureKey });
        sprite.setTexture(textureKey);
        sprite.setPosition(x, y);
      } else {
        // Create new sprite
        this.log('SpriteCreation', 'Creating new sprite', { username, textureKey });
        sprite = this.scene.add.sprite(x, y, textureKey);
        this.avatarSprites.set(username, sprite);
      }

      // Play idle animation by default
      const idleAnimKey = this.getAnimationKey(textureKey, AnimationCategory.IDLE);
      if (this.scene.anims.exists(idleAnimKey)) {
        sprite.play(idleAnimKey);
      }

      this.log('SpriteCreation', 'Sprite created/updated successfully', { username });

      return sprite;

    } catch (error) {
      this.logError('SpriteCreation', 'Failed to create/update sprite', error);
      return null;
    }
  }

  /**
   * Get sprite for a player
   */
  getSprite(username: string): Phaser.GameObjects.Sprite | null {
    return this.avatarSprites.get(username) || null;
  }

  /**
   * Check if sprite exists for a player
   */
  hasSprite(username: string): boolean {
    return this.avatarSprites.has(username);
  }

  /**
   * Play animation on player sprite
   */
  playAnimation(username: string, category: AnimationCategory): boolean {
    try {
      const sprite = this.avatarSprites.get(username);

      if (!sprite) {
        this.logError('AnimationPlayback', `No sprite found for ${username}`);
        return false;
      }

      // Get texture key from sprite
      const textureKey = sprite.texture.key;
      const animKey = this.getAnimationKey(textureKey, category);

      if (!this.scene.anims.exists(animKey)) {
        this.logError('AnimationPlayback', `Animation not found: ${animKey}`);
        return false;
      }

      // Only play if not already playing this animation
      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey);
        this.log('AnimationPlayback', `Playing animation ${category} for ${username}`);
      }

      return true;

    } catch (error) {
      this.logError('AnimationPlayback', 'Failed to play animation', error);
      return false;
    }
  }

  /**
   * Remove sprite for a player
   */
  removeSprite(username: string): void {
    const sprite = this.avatarSprites.get(username);

    if (sprite) {
      sprite.destroy();
      this.avatarSprites.delete(username);
      this.log('SpriteManagement', `Sprite removed for ${username}`);
    }
  }

  // ============================================================================
  // Cleanup and Memory Management
  // ============================================================================

  /**
   * Clear texture cache
   */
  clearTextureCache(): void {
    // Remove all textures from Phaser
    this.textureCache.entries().forEach(entry => {
      if (this.scene.textures.exists(entry.value.textureKey)) {
        this.scene.textures.remove(entry.value.textureKey);
      }
    });

    this.textureCache.clear();
    this.log('Cleanup', 'Texture cache cleared');
  }

  /**
   * Remove specific texture from cache
   */
  removeTextureFromCache(spriteSheetId: string): void {
    const entry = this.textureCache.get(spriteSheetId);

    if (entry) {
      if (this.scene.textures.exists(entry.textureKey)) {
        this.scene.textures.remove(entry.textureKey);
      }

      this.textureCache.delete(spriteSheetId);
      this.log('Cleanup', 'Texture removed from cache', { spriteSheetId });
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Remove all sprites
    this.avatarSprites.forEach((sprite, username) => {
      sprite.destroy();
    });
    this.avatarSprites.clear();

    // Clear texture cache
    this.clearTextureCache();

    this.log('Cleanup', 'All resources cleaned up');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cachedTextures: number;
    activeSprites: number;
    textureKeys: string[];
  } {
    return {
      cachedTextures: this.textureCache.size,
      activeSprites: this.avatarSprites.size,
      textureKeys: this.textureCache.entries().map(e => e.value.textureKey)
    };
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): {
    cachedTextureCount: number;
    estimatedTextureMemory: number;
  } {
    const cacheStats = this.textureCache.getStats();

    return {
      cachedTextureCount: cacheStats.size,
      estimatedTextureMemory: cacheStats.memoryUsage
    };
  }

  /**
   * Print performance report
   */
  printPerformanceReport(): void {
    const memoryUsage = this.getMemoryUsage();
    const snapshot = PerformanceMonitor.getMemorySnapshot(
      memoryUsage.cachedTextureCount,
      memoryUsage.estimatedTextureMemory
    );

    PerformanceMonitor.printReport();
    PerformanceMonitor.printMemoryReport(snapshot);
    this.textureCache.printReport();
  }
}

export default AvatarRenderer;


