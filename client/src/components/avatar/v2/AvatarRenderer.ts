/**
 * Avatar Renderer V2
 * Phaser.js renderer for sprite-sheet-based characters with built-in caching
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import { CharacterStorage } from './CharacterStorage';
import { CharacterSlot, EmptyCharacterSlot, isEmptySlot } from './types';
import { SpriteSheetDefinition, AnimationCategory } from '../AvatarBuilderTypes';
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
        console.log('[AvatarRenderer] 🟦 loadCharacterTexture START:', { username, slotNumber });
        this.log('TextureLoading', `Loading character texture for ${username}`, { slotNumber });

      // Load character slot
      let characterSlot: CharacterSlot | EmptyCharacterSlot;

      if (slotNumber !== undefined) {
        console.log('[AvatarRenderer] 🟦 Loading specific slot:', slotNumber);
        const result = CharacterStorage.loadCharacterSlot(username, slotNumber);
        console.log('[AvatarRenderer] 🟦 Load slot result:', result);
        if (!result.success || !result.data) {
          console.error('[AvatarRenderer] ❌ Failed to load slot:', result.error);
          return {
            success: false,
            error: result.error || 'Failed to load character slot'
          };
        }
        characterSlot = result.data;
        console.log('[AvatarRenderer] ✅ Slot loaded:', characterSlot);
      } else {
        // Load active character
        console.log('[AvatarRenderer] 🟦 Loading active character (no slot specified)');
        const result = CharacterStorage.getActiveCharacterSlot(username);
        console.log('[AvatarRenderer] 🟦 Active character result:', result);
        if (!result.success || !result.data) {
          console.error('[AvatarRenderer] ❌ Failed to load active character:', result.error);
          return {
            success: false,
            error: result.error || 'Failed to load active character'
          };
        }
        characterSlot = result.data;
        console.log('[AvatarRenderer] ✅ Active character loaded:', characterSlot);
      }

      // Check if slot is empty
      const isEmpty = isEmptySlot(characterSlot);
      console.log('[AvatarRenderer] 🟦 Checking if slot is empty:', isEmpty);
      if (isEmpty) {
        console.error('[AvatarRenderer] ❌ Character slot is empty!');
        return {
          success: false,
          error: 'Character slot is empty'
        };
      }

      // TypeScript: After checking isEmpty, we know it's a CharacterSlot
      const character = characterSlot as CharacterSlot;
      console.log('[AvatarRenderer] ✅ Character slot loaded successfully:', character.name);

      // Check cache first
      console.log('[AvatarRenderer] 🟦 Checking texture cache for sprite sheet ID:', character.spriteSheet.id);
      const cachedTexture = this.getCachedTexture(character.spriteSheet.id);
      if (cachedTexture) {
        console.log('[AvatarRenderer] ✅ Using cached texture:', cachedTexture.textureKey);
        this.log('TextureLoading', 'Using cached texture', { textureKey: cachedTexture.textureKey });
        return {
          success: true,
          textureKey: cachedTexture.textureKey
        };
      }

      // Load sprite sheet into Phaser
      console.log('[AvatarRenderer] 🟦 No cached texture found, loading sprite sheet into Phaser...');
      const textureKey = await this.loadSpriteSheet(username, character.spriteSheet);
      console.log('[AvatarRenderer] 🟦 loadSpriteSheet returned:', textureKey);

      if (!textureKey) {
        console.error('[AvatarRenderer] ❌ Failed to load sprite sheet into Phaser');
        return {
          success: false,
          error: 'Failed to load sprite sheet into Phaser'
        };
      }

      console.log('[AvatarRenderer] ✅✅ Sprite sheet loaded successfully:', textureKey);
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

      console.log('[AvatarRenderer] Loading sprite sheet:', { textureKey, frameCount: definition.frames.length });
      this.log('SpriteSheetLoading', 'Loading sprite sheet', {
        textureKey,
        frameCount: definition.frames.length,
        animationCount: definition.animations.length
      });

      // Check if texture already exists
      if (this.scene.textures.exists(textureKey)) {
        console.log('[AvatarRenderer] Texture already exists, reusing:', textureKey);
        this.log('SpriteSheetLoading', 'Texture already exists, reusing', { textureKey });
        return textureKey;
      }

      // Load image from source data
      console.log('[AvatarRenderer] Loading image from data URL...');
      const img = await this.loadImage(definition.source.imageData);

      if (!img) {
        console.error('[AvatarRenderer] Failed to load source image');
        this.logError('SpriteSheetLoading', 'Failed to load source image');
        return null;
      }

      console.log('[AvatarRenderer] Source image loaded:', { width: img.width, height: img.height });
      this.log('SpriteSheetLoading', 'Source image loaded', {
        width: img.width,
        height: img.height
      });

      // Determine if we can use grid layout or need custom frames
      if (definition.gridLayout) {
        console.log('[AvatarRenderer] Using grid layout');
        // Use Phaser's built-in sprite sheet loader for grid layouts
        return this.loadGridSpriteSheet(textureKey, img, definition);
      } else {
        console.log('[AvatarRenderer] Using custom frame layout');
        // Use custom frame loading for non-grid layouts
        return this.loadCustomFrameSpriteSheet(textureKey, img, definition);
      }

    } catch (error) {
      console.error('[AvatarRenderer] Failed to load sprite sheet:', error);
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
        console.error('[AvatarRenderer] No grid layout defined');
        return null;
      }

      console.log('[AvatarRenderer] Loading grid-based sprite sheet:', {
        columns: gridLayout.columns,
        rows: gridLayout.rows,
        frameWidth: gridLayout.frameWidth,
        frameHeight: gridLayout.frameHeight
      });
      this.log('GridSpriteSheet', 'Loading grid-based sprite sheet', {
        columns: gridLayout.columns,
        rows: gridLayout.rows,
        frameWidth: gridLayout.frameWidth,
        frameHeight: gridLayout.frameHeight
      });

      // Use Phaser's addSpriteSheet for grid layouts
      console.log('[AvatarRenderer] Adding sprite sheet to Phaser textures...');
      this.scene.textures.addSpriteSheet(textureKey, img, {
        frameWidth: gridLayout.frameWidth,
        frameHeight: gridLayout.frameHeight,
        startFrame: 0,
        endFrame: definition.frames.length - 1,
        spacing: gridLayout.spacing?.x || 0,
        margin: gridLayout.margin?.x || 0
      });

      // Register animations
      console.log('[AvatarRenderer] Registering animations...');
      this.registerAnimations(textureKey, definition);

      // Cache texture
      console.log('[AvatarRenderer] Caching texture...');
      this.cacheTexture(textureKey, definition);

      console.log('[AvatarRenderer] Grid sprite sheet loaded successfully:', textureKey);
      this.log('GridSpriteSheet', 'Grid sprite sheet loaded successfully', { textureKey });

      return textureKey;

    } catch (error) {
      console.error('[AvatarRenderer] Failed to load grid sprite sheet:', error);
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
        animationCount: definition.animations.length,
        defaultFrameRate: definition.defaultSettings.frameRate
      });

      console.log('[AvatarRenderer] Default framerate from definition:', definition.defaultSettings.frameRate);

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

        // Determine framerate (animation-specific or default)
        const finalFrameRate = animation.sequence.frameRate || definition.defaultSettings.frameRate;

        // Create animation config
        const animConfig: Phaser.Types.Animations.Animation = {
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(textureKey, {
            frames: frameIndices
          }),
          frameRate: finalFrameRate,
          repeat: animation.sequence.loop ? -1 : 0
        };

        this.scene.anims.create(animConfig);

        console.log(`[AvatarRenderer] Animation ${animation.category}:`, {
          sequenceFrameRate: animation.sequence.frameRate,
          defaultFrameRate: definition.defaultSettings.frameRate,
          finalFrameRate: finalFrameRate
        });

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
      console.log('[AvatarRenderer] 🔵 createOrUpdateSprite START:', { username, x, y, slotNumber });
      this.log('SpriteCreation', `Creating/updating sprite for ${username}`, { x, y, slotNumber });

      // Load texture
      console.log('[AvatarRenderer] 🔵 Step 1: Loading character texture...');
      const textureResult = await this.loadCharacterTexture(username, slotNumber);
      console.log('[AvatarRenderer] 🔵 Step 1 COMPLETE: textureResult =', textureResult);

      if (!textureResult.success || !textureResult.textureKey) {
        console.error('[AvatarRenderer] ❌ FAILED at Step 1: Texture loading failed:', textureResult.error);
        this.logError('SpriteCreation', 'Failed to load texture', textureResult.error);
        return null;
      }

      const textureKey = textureResult.textureKey;
      console.log('[AvatarRenderer] ✅ Texture loaded successfully:', textureKey);

      // Check if sprite already exists
      console.log('[AvatarRenderer] 🔵 Step 2: Checking for existing sprite...');
      let sprite = this.avatarSprites.get(username);
      console.log('[AvatarRenderer] 🔵 Existing sprite found:', !!sprite);

      if (sprite) {
        // Update existing sprite
        console.log('[AvatarRenderer] 🔵 Step 3a: Updating existing sprite with new texture');
        this.log('SpriteCreation', 'Updating existing sprite', { username, textureKey });

        console.log('[AvatarRenderer] 🔵 Calling sprite.setTexture...');
        sprite.setTexture(textureKey);
        console.log('[AvatarRenderer] 🔵 Calling sprite.setPosition...');
        sprite.setPosition(x, y);

        // CRITICAL FIX: Ensure sprite is visible and active after texture change
        console.log('[AvatarRenderer] 🔵 Setting sprite to visible and active...');
        sprite.setVisible(true);
        sprite.setActive(true);

        console.log('[AvatarRenderer] ✅ Existing sprite updated');
      } else {
        // Create new sprite
        console.log('[AvatarRenderer] 🔵 Step 3b: Creating NEW sprite');
        this.log('SpriteCreation', 'Creating new sprite', { username, textureKey });

        console.log('[AvatarRenderer] 🔵 Calling scene.add.sprite...');
        sprite = this.scene.add.sprite(x, y, textureKey);
        console.log('[AvatarRenderer] 🔵 New sprite created:', !!sprite);

        // Ensure new sprite is visible and active
        console.log('[AvatarRenderer] 🔵 Setting new sprite to visible and active...');
        sprite.setVisible(true);
        sprite.setActive(true);

        console.log('[AvatarRenderer] 🔵 Adding sprite to avatarSprites map...');
        this.avatarSprites.set(username, sprite);
        console.log('[AvatarRenderer] ✅ New sprite added to map');
      }

      // Play idle animation by default
      console.log('[AvatarRenderer] 🔵 Step 4: Setting up idle animation...');
      const idleAnimKey = this.getAnimationKey(textureKey, AnimationCategory.IDLE);
      console.log('[AvatarRenderer] 🔵 Idle animation key:', idleAnimKey);
      console.log('[AvatarRenderer] 🔵 Animation exists?', this.scene.anims.exists(idleAnimKey));

      if (this.scene.anims.exists(idleAnimKey)) {
        console.log('[AvatarRenderer] 🔵 Playing idle animation');
        // Safety check before playing
        if (sprite && sprite.active && sprite.scene && sprite.play && typeof sprite.play === 'function') {
          sprite.play(idleAnimKey);
          console.log('[AvatarRenderer] ✅ Idle animation playing');
        } else {
          console.warn('[AvatarRenderer] ⚠️ Sprite not ready for animation playback:', {
            exists: !!sprite,
            active: sprite?.active,
            hasScene: !!sprite?.scene,
            hasPlay: !!sprite?.play
          });
        }
      } else {
        console.warn('[AvatarRenderer] ⚠️ Idle animation not found:', idleAnimKey);
      }

      console.log('[AvatarRenderer] ✅✅✅ Sprite created/updated successfully - RETURNING SPRITE');
      this.log('SpriteCreation', 'Sprite created/updated successfully', { username });

      return sprite;

    } catch (error) {
      console.error('[AvatarRenderer] ❌❌❌ EXCEPTION CAUGHT in createOrUpdateSprite:', error);
      console.error('[AvatarRenderer] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
      console.log('[AvatarRenderer] 🎬 playAnimation called:', { username, category });
      const sprite = this.avatarSprites.get(username);
      console.log('[AvatarRenderer] 🎬 Sprite from map:', {
        exists: !!sprite,
        active: sprite?.active,
        hasScene: !!sprite?.scene,
        texture: sprite?.texture?.key
      });

      if (!sprite || !sprite.active || !sprite.scene) {
        console.error('[AvatarRenderer] ❌ No valid sprite found for', username, {
          exists: !!sprite,
          active: sprite?.active,
          hasScene: !!sprite?.scene
        });
        return false;
      }

      // Get texture key from sprite
      const textureKey = sprite.texture.key;
      const animKey = this.getAnimationKey(textureKey, category);
      console.log('[AvatarRenderer] 🎬 Animation key:', animKey);
      console.log('[AvatarRenderer] 🎬 Animation exists?', this.scene.anims.exists(animKey));

      if (!this.scene.anims.exists(animKey)) {
        console.error('[AvatarRenderer] ❌ Animation not found:', animKey);
        this.logError('AnimationPlayback', `Animation not found: ${animKey}`);
        return false;
      }

      // Only play if not already playing this animation
      const currentAnimKey = sprite.anims?.currentAnim?.key;
      console.log('[AvatarRenderer] 🎬 Current animation:', currentAnimKey);
      console.log('[AvatarRenderer] 🎬 Need to switch?', currentAnimKey !== animKey);

      if (currentAnimKey !== animKey) {
        // Additional safety check before playing
        if (sprite.play && typeof sprite.play === 'function') {
          console.log('[AvatarRenderer] 🎬 Calling sprite.play...');
          sprite.play(animKey);
          console.log('[AvatarRenderer] ✅ Animation playing:', animKey);
          this.log('AnimationPlayback', `Playing animation ${category} for ${username}`);
        } else {
          console.error('[AvatarRenderer] ❌ Sprite play method not available');
          this.logError('AnimationPlayback', `Sprite play method not available for ${username}`);
          return false;
        }
      } else {
        console.log('[AvatarRenderer] ℹ️ Animation already playing, skipping');
      }

      return true;

    } catch (error) {
      console.error('[AvatarRenderer] ❌ Exception in playAnimation:', error);
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
    this.avatarSprites.forEach((sprite) => {
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


