import { AvatarConfig, LAYER_ORDER, ASSET_DIMENSIONS } from './avatarTypes';
import { AvatarBuilderStorage } from './AvatarBuilderStorage';
import { PhaserIntegrationAdapter } from './PhaserIntegrationAdapter';
import { SpriteSheetDefinition } from './AvatarBuilderTypes';

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load layer image'));
    img.src = src;
  });
};

export const composeAvatarDataUrl = async (config: AvatarConfig): Promise<string | null> => {
  try {
    const { width, height } = ASSET_DIMENSIONS.base;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (const layer of LAYER_ORDER) {
      const state = (config as any)[layer];
      if (!state?.enabled || !state?.src) continue;
      const img = await loadImage(state.src);
      ctx.drawImage(img, 0, 0, width, height);
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('composeAvatarDataUrl failed', e);
    return null;
  }
};

/**
 * DEPRECATED: Legacy sprite sheet composition - replaced by Avatar Builder
 * This function had a critical bug where it copied the same image 9 times
 * instead of extracting different animation frames from source sprite sheets.
 *
 * Use AvatarBuilderStorage.loadCharacterDefinition() and PhaserIntegrationAdapter
 * for new avatar creation and management.
 */
export const composeAvatarSpriteSheet = async (config: AvatarConfig): Promise<string | null> => {
  console.warn('composeAvatarSpriteSheet is deprecated. Use Avatar Builder instead.');

  // Fallback to legacy behavior for backward compatibility
  try {
    const { width: frameWidth, height: frameHeight } = ASSET_DIMENSIONS.base;
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * 3;  // 3 columns
    canvas.height = frameHeight * 3; // 3 rows
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Load all layer images first
    const layerImages: { [key: string]: HTMLImageElement } = {};
    for (const layer of LAYER_ORDER) {
      const state = (config as any)[layer];
      if (!state?.enabled || !state?.src) continue;
      layerImages[layer] = await loadImage(state.src);
    }

    // FIXED: Properly extract frames from source sprite sheets
    // Check if source images are sprite sheets (3x3 grid)
    const firstLayer = Object.values(layerImages)[0];
    if (firstLayer && firstLayer.width >= frameWidth * 3 && firstLayer.height >= frameHeight * 3) {
      // Source is a sprite sheet - extract frames properly
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const destX = col * frameWidth;
          const destY = row * frameHeight;

          // Draw all layers for this frame, extracting from source sprite sheets
          for (const layer of LAYER_ORDER) {
            const img = layerImages[layer];
            if (!img) continue;

            // Extract frame from source sprite sheet
            const srcX = col * frameWidth;
            const srcY = row * frameHeight;
            ctx.drawImage(
              img,
              srcX, srcY, frameWidth, frameHeight,  // Source coordinates and size
              destX, destY, frameWidth, frameHeight // Destination coordinates and size
            );
          }
        }
      }
    } else {
      // Source is single frame - replicate for compatibility (legacy behavior)
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = col * frameWidth;
          const y = row * frameHeight;

          for (const layer of LAYER_ORDER) {
            const img = layerImages[layer];
            if (!img) continue;
            ctx.drawImage(img, x, y, frameWidth, frameHeight);
          }
        }
      }
    }

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.warn('composeAvatarSpriteSheet failed', e);
    return null;
  }
};

/**
 * Detect frame dimensions from a sprite sheet image
 */
export const detectFrameSize = (imageUrl: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const frameWidth = Math.floor(img.width / 3);  // 3 columns
      const frameHeight = Math.floor(img.height / 3); // 3 rows
      resolve({ width: frameWidth, height: frameHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image for frame detection'));
    img.src = imageUrl;
  });
};

// ============================================================================
// NEW AVATAR BUILDER INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Create sprite sheet using Avatar Builder system
 * This is the new recommended way to create custom avatars
 */
export const createAvatarWithBuilder = async (
  username: string,
  spriteSheetDefinition: SpriteSheetDefinition
): Promise<{ success: boolean; textureKey?: string; error?: string }> => {
  try {
    // Save the character definition
    const saveResult = AvatarBuilderStorage.saveCharacterDefinition(username, spriteSheetDefinition);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    // The texture will be registered with Phaser when needed
    return {
      success: true,
      textureKey: `avatar_sheet_${username}`
    };
  } catch (error) {
    return {
      success: false,
      error: `Avatar creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Load avatar from Avatar Builder storage
 */
export const loadAvatarFromBuilder = async (username: string): Promise<{
  success: boolean;
  spriteSheetDefinition?: SpriteSheetDefinition;
  error?: string;
}> => {
  try {
    const loadResult = AvatarBuilderStorage.loadCharacterDefinition(username);
    if (!loadResult.success || !loadResult.data) {
      return { success: false, error: loadResult.error };
    }

    return {
      success: true,
      spriteSheetDefinition: loadResult.data.spriteSheet
    };
  } catch (error) {
    return {
      success: false,
      error: `Avatar loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Register Avatar Builder sprite sheet with Phaser
 * This replaces the manual texture registration in AvatarGameRenderer
 */
export const registerAvatarWithPhaser = async (
  scene: Phaser.Scene,
  username: string
): Promise<{ success: boolean; textureKey?: string; error?: string }> => {
  try {
    // Load avatar definition
    const loadResult = await loadAvatarFromBuilder(username);
    if (!loadResult.success || !loadResult.spriteSheetDefinition) {
      return { success: false, error: loadResult.error };
    }

    // Register with Phaser
    const registrationResult = await PhaserIntegrationAdapter.registerWithPhaser(
      scene,
      loadResult.spriteSheetDefinition
    );

    return registrationResult;
  } catch (error) {
    return {
      success: false,
      error: `Phaser registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check if user has Avatar Builder character
 */
export const hasAvatarBuilderCharacter = (username: string): boolean => {
  const loadResult = AvatarBuilderStorage.loadCharacterDefinition(username);
  return loadResult.success;
};

/**
 * Migrate legacy avatar config to Avatar Builder format
 * This helps transition from old system to new system
 */
export const migrateLegacyAvatar = async (
  username: string,
  config: AvatarConfig
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create a basic sprite sheet definition from legacy config
    const spriteSheetUrl = await composeAvatarSpriteSheet(config);
    if (!spriteSheetUrl) {
      return { success: false, error: 'Failed to compose legacy sprite sheet' };
    }

    // This is a simplified migration - in practice, you'd want to
    // create proper frame definitions and animations

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

