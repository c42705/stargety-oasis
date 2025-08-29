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

