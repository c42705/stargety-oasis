// Layer identifiers and ordering
export type LayerId = 'base' | 'hair' | 'accessories' | 'clothes';

export const LAYER_ORDER: LayerId[] = ['base', 'clothes', 'hair', 'accessories'];

export interface LayerState {
  enabled: boolean;
  src: string | null; // PNG URL or data URL
}

export interface AvatarConfig {
  base: LayerState; // required
  hair: LayerState;
  accessories: LayerState;
  clothes: LayerState;
  updatedAt?: string;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  base: { enabled: true, src: '/terra-branford.gif' },
  hair: { enabled: false, src: null },
  accessories: { enabled: false, src: null },
  clothes: { enabled: false, src: null },
};

// Dimensions required per asset type
export const ASSET_DIMENSIONS: Record<LayerId, { width: number; height: number }> = {
  base: { width: 128, height: 128 },
  hair: { width: 128, height: 128 },
  accessories: { width: 128, height: 128 },
  clothes: { width: 128, height: 128 },
};

export const AVATAR_STORAGE_KEY = (username: string) => `stargety_avatar_${username}`;

// Character slot system
export const MAX_CHARACTER_SLOTS = 5;

export interface CharacterSlot {
  slotNumber: number;
  name: string;
  config: AvatarConfig;
  createdAt: string;
  updatedAt: string;
  previewUrl?: string; // Optional preview image
}

export interface CharacterSlotMetadata {
  slotNumber: number;
  name: string;
  isEmpty: boolean;
  previewUrl?: string;
  updatedAt?: string;
}

// Storage keys for character slots
export const CHARACTER_SLOT_KEY = (username: string, slotNumber: number) =>
  `stargety_character_${username}_slot_${slotNumber}`;

export const ACTIVE_CHARACTER_SLOT_KEY = (username: string) =>
  `stargety_active_character_${username}`;

// Validate PNG and dimensions
export const validatePngDimensions = (file: File, dims: { width: number; height: number }): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (file.type !== 'image/png') {
      reject(new Error('Only PNG files are allowed.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const valid = img.width === dims.width && img.height === dims.height;
      URL.revokeObjectURL(url);
      if (!valid) {
        reject(new Error(`Invalid size: expected ${dims.width}x${dims.height}px, got ${img.width}x${img.height}px`));
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for validation.'));
    };
    img.src = url;
  });
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

