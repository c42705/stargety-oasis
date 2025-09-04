import { AvatarConfig, LAYER_ORDER, ASSET_DIMENSIONS } from './avatarTypes';

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
 * Compose avatar into a 3x3 sprite sheet for animations
 * Layout: Row 1 (walk down), Row 2 (walk left), Row 3 (walk up)
 */
export const composeAvatarSpriteSheet = async (config: AvatarConfig): Promise<string | null> => {
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

    // Create 9 frames (3x3 grid)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = col * frameWidth;
        const y = row * frameHeight;

        // Draw all layers for this frame
        for (const layer of LAYER_ORDER) {
          const img = layerImages[layer];
          if (!img) continue;
          ctx.drawImage(img, x, y, frameWidth, frameHeight);
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

