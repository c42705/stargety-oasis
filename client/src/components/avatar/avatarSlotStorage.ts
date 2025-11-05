/**
 * Character Slot Storage System
 * Manages multiple character slots per user with active slot tracking
 * TODO: Migrate to database when backend is implemented
 */

import {
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  CharacterSlot,
  CharacterSlotMetadata,
  CHARACTER_SLOT_KEY,
  ACTIVE_CHARACTER_SLOT_KEY,
  MAX_CHARACTER_SLOTS,
  AVATAR_STORAGE_KEY
} from './avatarTypes';

/**
 * Get the active character slot number for a user
 * Defaults to slot 1 if not set
 */
export const getActiveSlot = (username: string): number => {
  try {
    const raw = localStorage.getItem(ACTIVE_CHARACTER_SLOT_KEY(username));
    if (!raw) return 1; // Default to slot 1
    const slotNumber = parseInt(raw, 10);
    return slotNumber >= 1 && slotNumber <= MAX_CHARACTER_SLOTS ? slotNumber : 1;
  } catch (e) {
    console.warn('Failed to get active slot, defaulting to 1', e);
    return 1;
  }
};

/**
 * Set the active character slot for a user
 */
export const setActiveSlot = (username: string, slotNumber: number): boolean => {
  try {
    if (slotNumber < 1 || slotNumber > MAX_CHARACTER_SLOTS) {
      console.error(`Invalid slot number: ${slotNumber}. Must be between 1 and ${MAX_CHARACTER_SLOTS}`);
      return false;
    }
    localStorage.setItem(ACTIVE_CHARACTER_SLOT_KEY(username), slotNumber.toString());
    return true;
  } catch (e) {
    console.error('Failed to set active slot', e);
    return false;
  }
};

/**
 * Load a character from a specific slot
 */
export const loadCharacterSlot = (username: string, slotNumber: number): CharacterSlot | null => {
  try {
    const raw = localStorage.getItem(CHARACTER_SLOT_KEY(username, slotNumber));
    if (!raw) return null;
    
    const slot = JSON.parse(raw) as CharacterSlot;
    return slot;
  } catch (e) {
    console.warn(`Failed to load character slot ${slotNumber}`, e);
    return null;
  }
};

/**
 * Save a character to a specific slot
 */
export const saveCharacterSlot = (
  username: string,
  slotNumber: number,
  name: string,
  config: AvatarConfig,
  previewUrl?: string
): boolean => {
  try {
    if (slotNumber < 1 || slotNumber > MAX_CHARACTER_SLOTS) {
      console.error(`Invalid slot number: ${slotNumber}`);
      return false;
    }

    const now = new Date().toISOString();
    const existingSlot = loadCharacterSlot(username, slotNumber);

    const slot: CharacterSlot = {
      slotNumber,
      name,
      config,
      createdAt: existingSlot?.createdAt || now,
      updatedAt: now,
      previewUrl
    };

    localStorage.setItem(CHARACTER_SLOT_KEY(username, slotNumber), JSON.stringify(slot));
    return true;
  } catch (e) {
    console.error(`Failed to save character slot ${slotNumber}`, e);
    return false;
  }
};

/**
 * Delete a character from a specific slot
 */
export const deleteCharacterSlot = (username: string, slotNumber: number): boolean => {
  try {
    localStorage.removeItem(CHARACTER_SLOT_KEY(username, slotNumber));
    
    // If this was the active slot, switch to slot 1
    if (getActiveSlot(username) === slotNumber) {
      setActiveSlot(username, 1);
    }
    
    return true;
  } catch (e) {
    console.error(`Failed to delete character slot ${slotNumber}`, e);
    return false;
  }
};

/**
 * Get metadata for all character slots (without full config data)
 */
export const getAllSlotMetadata = (username: string): CharacterSlotMetadata[] => {
  const metadata: CharacterSlotMetadata[] = [];

  for (let i = 1; i <= MAX_CHARACTER_SLOTS; i++) {
    const slot = loadCharacterSlot(username, i);
    
    if (slot) {
      metadata.push({
        slotNumber: i,
        name: slot.name,
        isEmpty: false,
        previewUrl: slot.previewUrl,
        updatedAt: slot.updatedAt
      });
    } else {
      metadata.push({
        slotNumber: i,
        name: `Character ${i}`,
        isEmpty: true
      });
    }
  }

  return metadata;
};

/**
 * Get the active character configuration for a user
 * This is the main function that should be used to load avatars
 */
export const getActiveCharacterConfig = (username: string): AvatarConfig => {
  const activeSlot = getActiveSlot(username);
  const slot = loadCharacterSlot(username, activeSlot);
  
  if (slot) {
    return slot.config;
  }
  
  // Fallback: try to migrate from old storage system
  return migrateFromOldStorage(username, activeSlot);
};

/**
 * Save the active character configuration
 */
export const saveActiveCharacterConfig = (
  username: string,
  config: AvatarConfig,
  characterName?: string
): boolean => {
  const activeSlot = getActiveSlot(username);
  const existingSlot = loadCharacterSlot(username, activeSlot);
  const name = characterName || existingSlot?.name || `Character ${activeSlot}`;
  
  return saveCharacterSlot(username, activeSlot, name, config);
};

/**
 * Migrate from old single-avatar storage to slot-based storage
 * This ensures backward compatibility
 */
const migrateFromOldStorage = (username: string, targetSlot: number): AvatarConfig => {
  try {
    // Check if old storage exists
    const oldKey = AVATAR_STORAGE_KEY(username);
    const raw = localStorage.getItem(oldKey);
    
    if (raw) {
      const oldConfig = JSON.parse(raw) as AvatarConfig;
      
      // Migrate to slot 1 if it doesn't exist
      const slot1 = loadCharacterSlot(username, 1);
      if (!slot1) {
        saveCharacterSlot(username, 1, 'My Character', oldConfig);
        setActiveSlot(username, 1);
        
        // Remove old storage key
        localStorage.removeItem(oldKey);
        
        console.log('Migrated avatar from old storage to slot 1');
      }
      
      return oldConfig;
    }
  } catch (e) {
    console.warn('Failed to migrate from old storage', e);
  }
  
  return DEFAULT_AVATAR_CONFIG;
};

/**
 * Switch to a different character slot
 * Returns the new active character config
 */
export const switchToCharacterSlot = (username: string, slotNumber: number): AvatarConfig | null => {
  if (slotNumber < 1 || slotNumber > MAX_CHARACTER_SLOTS) {
    console.error(`Invalid slot number: ${slotNumber}`);
    return null;
  }

  const slot = loadCharacterSlot(username, slotNumber);
  if (!slot) {
    console.warn(`Slot ${slotNumber} is empty`);
    return null;
  }

  setActiveSlot(username, slotNumber);
  return slot.config;
};

/**
 * Create a new character in the first available slot
 * Returns the slot number if successful, null otherwise
 */
export const createNewCharacter = (
  username: string,
  name: string,
  config: AvatarConfig = DEFAULT_AVATAR_CONFIG
): number | null => {
  // Find first empty slot
  for (let i = 1; i <= MAX_CHARACTER_SLOTS; i++) {
    const slot = loadCharacterSlot(username, i);
    if (!slot) {
      if (saveCharacterSlot(username, i, name, config)) {
        return i;
      }
      return null;
    }
  }
  
  console.warn('All character slots are full');
  return null;
};

