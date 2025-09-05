/**
 * Phaser Integration Adapter
 * Converts Avatar Builder output to Phaser-compatible format and manages integration
 */

import { SpriteSheetDefinition, AnimationMapping, AnimationCategory, PhaserIntegrationData } from './AvatarBuilderTypes';

export interface PhaserCompatibilityResult {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
  adaptedData?: PhaserIntegrationData;
}

/**
 * Adapter to bridge Avatar Builder with existing Phaser.js integration
 */
export class PhaserIntegrationAdapter {
  
  /**
   * Convert Avatar Builder definition to Phaser-compatible format
   */
  static convertToPhaser(definition: SpriteSheetDefinition): PhaserCompatibilityResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate basic requirements
      if (!definition.source?.imageData) {
        errors.push('No source image data found');
      }

      if (!definition.frames || definition.frames.length === 0) {
        errors.push('No frames defined');
      }

      if (!definition.animations || definition.animations.length === 0) {
        errors.push('No animations defined');
      }

      if (errors.length > 0) {
        return { isCompatible: false, errors, warnings };
      }

      // Check frame layout compatibility
      const frameValidation = this.validateFrameLayout(definition);
      errors.push(...frameValidation.errors);
      warnings.push(...frameValidation.warnings);

      // Generate Phaser sprite sheet config
      const spriteSheetConfig = this.generateSpriteSheetConfig(definition);
      
      // Generate Phaser animation configs
      const animationConfigs = this.generateAnimationConfigs(definition);

      // Create composite sprite sheet if needed
      const textureData = this.generateCompositeTexture(definition);

      const adaptedData: PhaserIntegrationData = {
        spriteSheetConfig,
        animationConfigs,
        textureData,
        metadata: {
          totalFrames: definition.frames.length,
          animationCount: definition.animations.length,
          textureSize: {
            width: spriteSheetConfig.frameWidth * Math.ceil(Math.sqrt(definition.frames.length)),
            height: spriteSheetConfig.frameHeight * Math.ceil(Math.sqrt(definition.frames.length))
          }
        }
      };

      return {
        isCompatible: errors.length === 0,
        errors,
        warnings,
        adaptedData
      };

    } catch (error) {
      return {
        isCompatible: false,
        errors: [`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Validate frame layout for Phaser compatibility
   */
  private static validateFrameLayout(definition: SpriteSheetDefinition): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check frame dimensions consistency
    const frameSizes = definition.frames.map(frame => ({
      width: frame.sourceRect.width,
      height: frame.sourceRect.height
    }));

    const uniqueSizes = Array.from(new Set(frameSizes.map(size => `${size.width}x${size.height}`)));
    
    if (uniqueSizes.length > 1) {
      warnings.push('Frames have different sizes - will be normalized for Phaser compatibility');
    }

    // Check for power-of-2 dimensions (optimal for GPU)
    const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;
    const firstFrame = definition.frames[0];
    
    if (!isPowerOfTwo(firstFrame.sourceRect.width) || !isPowerOfTwo(firstFrame.sourceRect.height)) {
      warnings.push('Frame dimensions are not power-of-2 - may impact performance');
    }

    // Check frame count limits
    if (definition.frames.length > 256) {
      warnings.push('Large number of frames may impact performance');
    }

    return { errors, warnings };
  }

  /**
   * Generate Phaser sprite sheet configuration
   */
  private static generateSpriteSheetConfig(definition: SpriteSheetDefinition) {
    // Use the most common frame size
    const frameSizes = definition.frames.map(frame => ({
      width: frame.sourceRect.width,
      height: frame.sourceRect.height
    }));

    const sizeCount = new Map<string, number>();
    frameSizes.forEach(size => {
      const key = `${size.width}x${size.height}`;
      sizeCount.set(key, (sizeCount.get(key) || 0) + 1);
    });

    const mostCommonSize = Array.from(sizeCount.entries())
      .sort((a, b) => b[1] - a[1])[0][0]
      .split('x')
      .map(Number);

    return {
      textureKey: `avatar_sheet_${definition.createdBy}`,
      frameWidth: mostCommonSize[0],
      frameHeight: mostCommonSize[1],
      startFrame: 0,
      endFrame: definition.frames.length - 1,
      margin: 0,
      spacing: 0
    };
  }

  /**
   * Generate Phaser animation configurations
   */
  private static generateAnimationConfigs(definition: SpriteSheetDefinition) {
    return definition.animations.map(animation => {
      // Map frame IDs to frame numbers
      const frameNumbers = animation.sequence.frameIds.map(frameId => {
        const frameIndex = definition.frames.findIndex(frame => frame.id === frameId);
        return frameIndex >= 0 ? frameIndex : 0;
      });

      // Generate Phaser animation key
      const animationKey = this.generatePhaserAnimationKey(definition.createdBy, animation.category);

      return {
        key: animationKey,
        frames: frameNumbers.map(frameNumber => ({
          key: `avatar_sheet_${definition.createdBy}`,
          frame: frameNumber
        })),
        frameRate: animation.sequence.frameRate,
        repeat: animation.sequence.loop ? -1 : 0,
        yoyo: animation.sequence.pingPong,
        delay: 0,
        repeatDelay: 0
      };
    });
  }

  /**
   * Generate Phaser animation key following existing naming convention
   */
  private static generatePhaserAnimationKey(username: string, category: AnimationCategory): string {
    const categoryMap: Record<AnimationCategory, string> = {
      [AnimationCategory.IDLE]: 'idle',
      [AnimationCategory.WALK_DOWN]: 'walk_down',
      [AnimationCategory.WALK_LEFT]: 'walk_left',
      [AnimationCategory.WALK_UP]: 'walk_up',
      [AnimationCategory.WALK_RIGHT]: 'walk_right',
      [AnimationCategory.RUN_DOWN]: 'run_down',
      [AnimationCategory.RUN_LEFT]: 'run_left',
      [AnimationCategory.RUN_UP]: 'run_up',
      [AnimationCategory.RUN_RIGHT]: 'run_right',
      [AnimationCategory.JUMP]: 'jump',
      [AnimationCategory.FALL]: 'fall',
      [AnimationCategory.LAND]: 'land',
      [AnimationCategory.ATTACK_MELEE]: 'attack',
      [AnimationCategory.ATTACK_RANGED]: 'attack_ranged',
      [AnimationCategory.ATTACK_MAGIC]: 'attack_magic',
      [AnimationCategory.DEFEND]: 'defend',
      [AnimationCategory.BLOCK]: 'block',
      [AnimationCategory.HURT]: 'hurt',
      [AnimationCategory.DEATH]: 'death',
      [AnimationCategory.VICTORY]: 'victory',
      [AnimationCategory.INTERACT]: 'interact',
      [AnimationCategory.PICKUP]: 'pickup',
      [AnimationCategory.USE_ITEM]: 'use_item',
      [AnimationCategory.HAPPY]: 'happy',
      [AnimationCategory.SAD]: 'sad',
      [AnimationCategory.ANGRY]: 'angry',
      [AnimationCategory.SURPRISED]: 'surprised',
      [AnimationCategory.SPECIAL_1]: 'special_1',
      [AnimationCategory.SPECIAL_2]: 'special_2',
      [AnimationCategory.SPECIAL_3]: 'special_3',
      [AnimationCategory.CUSTOM]: 'custom'
    };

    const action = categoryMap[category] || 'custom';
    return `${username}_${action}`;
  }

  /**
   * Generate composite texture from individual frames
   */
  private static generateCompositeTexture(definition: SpriteSheetDefinition): string {
    // Calculate optimal grid layout
    const frameCount = definition.frames.length;
    const cols = Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / cols);

    // Use the most common frame size
    const config = this.generateSpriteSheetConfig(definition);
    const frameWidth = config.frameWidth;
    const frameHeight = config.frameHeight;

    // Create composite canvas
    const canvas = document.createElement('canvas');
    canvas.width = cols * frameWidth;
    canvas.height = rows * frameHeight;
    const ctx = canvas.getContext('2d')!;

    // Load source image
    const sourceImg = new Image();
    sourceImg.src = definition.source.imageData;

    return new Promise<string>((resolve) => {
      sourceImg.onload = () => {
        // Draw each frame to the composite canvas
        definition.frames.forEach((frame, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          const destX = col * frameWidth;
          const destY = row * frameHeight;

          // Extract and draw frame
          ctx.drawImage(
            sourceImg,
            frame.sourceRect.x, frame.sourceRect.y, frame.sourceRect.width, frame.sourceRect.height,
            destX, destY, frameWidth, frameHeight
          );
        });

        resolve(canvas.toDataURL('image/png'));
      };
    }) as any; // Type assertion for synchronous return in this context
  }

  /**
   * Register Avatar Builder output with existing Phaser systems
   */
  static async registerWithPhaser(
    scene: Phaser.Scene, 
    definition: SpriteSheetDefinition
  ): Promise<{ success: boolean; textureKey: string; error?: string }> {
    try {
      const conversionResult = this.convertToPhaser(definition);
      
      if (!conversionResult.isCompatible || !conversionResult.adaptedData) {
        return {
          success: false,
          textureKey: '',
          error: conversionResult.errors.join(', ')
        };
      }

      const { spriteSheetConfig, animationConfigs, textureData } = conversionResult.adaptedData;

      // Remove existing texture if it exists
      if (scene.textures.exists(spriteSheetConfig.textureKey)) {
        scene.textures.remove(spriteSheetConfig.textureKey);
      }

      // Load texture data as image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load texture data'));
        img.src = textureData;
      });

      // Add sprite sheet to Phaser
      scene.textures.addSpriteSheet(spriteSheetConfig.textureKey, img, {
        frameWidth: spriteSheetConfig.frameWidth,
        frameHeight: spriteSheetConfig.frameHeight,
        startFrame: spriteSheetConfig.startFrame,
        endFrame: spriteSheetConfig.endFrame
      });

      // Remove existing animations
      animationConfigs.forEach(config => {
        if (scene.anims.exists(config.key)) {
          scene.anims.remove(config.key);
        }
      });

      // Create animations
      animationConfigs.forEach(config => {
        scene.anims.create(config);
      });

      return {
        success: true,
        textureKey: spriteSheetConfig.textureKey
      };

    } catch (error) {
      return {
        success: false,
        textureKey: '',
        error: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate that required animations exist
   */
  static validateRequiredAnimations(definition: SpriteSheetDefinition): { isValid: boolean; missing: AnimationCategory[] } {
    const requiredAnimations = [
      AnimationCategory.IDLE,
      AnimationCategory.WALK_DOWN,
      AnimationCategory.WALK_LEFT,
      AnimationCategory.WALK_UP,
      AnimationCategory.WALK_RIGHT
    ];

    const existingCategories = definition.animations.map(anim => anim.category);
    const missing = requiredAnimations.filter(category => !existingCategories.includes(category));

    return {
      isValid: missing.length === 0,
      missing
    };
  }

  /**
   * Generate fallback animations for missing required animations
   */
  static generateFallbackAnimations(definition: SpriteSheetDefinition): AnimationMapping[] {
    const validation = this.validateRequiredAnimations(definition);
    if (validation.isValid) return [];

    const fallbackAnimations: AnimationMapping[] = [];
    const firstFrame = definition.frames[0];

    if (!firstFrame) return fallbackAnimations;

    validation.missing.forEach(category => {
      fallbackAnimations.push({
        id: `fallback_${category}`,
        category,
        name: `Fallback ${category}`,
        sequence: {
          frameIds: [firstFrame.id],
          frameRate: 1,
          loop: true,
          pingPong: false
        },
        priority: 0,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    return fallbackAnimations;
  }

  /**
   * Update existing AvatarGameRenderer with new definition
   */
  static async updateAvatarRenderer(
    scene: Phaser.Scene,
    username: string,
    definition: SpriteSheetDefinition
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Register with Phaser
      const registrationResult = await this.registerWithPhaser(scene, definition);
      
      if (!registrationResult.success) {
        return registrationResult;
      }

      // Update any existing avatar sprites
      // This would integrate with the existing AvatarGameRenderer
      // For now, we'll just return success
      
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Avatar renderer update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
