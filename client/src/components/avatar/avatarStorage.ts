import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from './avatarTypes';
import { getActiveCharacterConfig, saveActiveCharacterConfig } from './avatarSlotStorage';

/**
 * Load avatar configuration for a user
 * Now uses the character slot system with automatic migration from old storage
 */
export const loadAvatarConfig = (username: string): AvatarConfig => {
  try {
    return getActiveCharacterConfig(username);
  } catch (e) {
    console.warn('Failed to load avatar config. Using defaults.', e);
    return DEFAULT_AVATAR_CONFIG;
  }
};

/**
 * Save avatar configuration for a user
 * Now saves to the active character slot
 */
export const saveAvatarConfig = (username: string, config: AvatarConfig): void => {
  try {
    saveActiveCharacterConfig(username, config);
  } catch (e) {
    console.error('Failed to save avatar config', e);
  }
};

