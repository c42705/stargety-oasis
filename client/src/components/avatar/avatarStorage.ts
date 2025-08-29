import { AVATAR_STORAGE_KEY, AvatarConfig, DEFAULT_AVATAR_CONFIG } from './avatarTypes';

export const loadAvatarConfig = (username: string): AvatarConfig => {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY(username));
    if (!raw) return DEFAULT_AVATAR_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AVATAR_CONFIG, ...parsed } as AvatarConfig;
  } catch (e) {
    console.warn('Failed to load avatar config. Using defaults.', e);
    return DEFAULT_AVATAR_CONFIG;
  }
};

export const saveAvatarConfig = (username: string, config: AvatarConfig): void => {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY(username), JSON.stringify({ ...config, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.error('Failed to save avatar config', e);
  }
};

