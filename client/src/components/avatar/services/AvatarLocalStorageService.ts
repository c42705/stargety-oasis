// Avatar LocalStorage Service - Pure local ops for V1 compat
// Delegates to v2 CharacterStorage for slot-based persistence

import { CharacterStorage } from '../v2/CharacterStorage';
import { StorageResult } from '../v2/types';
import type { CharacterSlot } from '../v2/types';
import { isEmptySlot } from '../v2/types';

export class AvatarLocalStorageService {
  /**
   * Save V1 character (maps to slot 1)
   */
  static saveCharacter(username: string, definition: any): StorageResult<void> {
    const slot: CharacterSlot = {
      slotNumber: 1,
      username,
      name: definition.name || 'Legacy V1 Character',
      spriteSheet: definition.spriteSheet,
      thumbnailUrl: '', // Generate if needed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEmpty: false,
      cachedTexture: definition.source?.imageData || ''
    };
    const result = CharacterStorage.saveCharacterSlot(username, slot);
    return { success: !!result.success, error: result.error };
  }

  /**
   * Load V1 character (from slot 1)
   */
  static loadCharacter(username: string): StorageResult<any> {
    const result = CharacterStorage.loadCharacterSlot(username, 1);
    if (result.success && result.data && !isEmptySlot(result.data)) {
      const slot = result.data as CharacterSlot;
      return {
        success: true,
        data: {
          spriteSheet: slot.spriteSheet,
          metadata: { version: '1.1.0', lastSaved: slot.updatedAt, autoSaveEnabled: true, compressionEnabled: false },
          userPreferences: { defaultFrameRate: 8, preferredExportFormat: 'png', autoValidation: true }
        }
      };
    }
    return { success: false, error: 'Character not found' };
  }

  // Add other V1 methods: delete, list, stats, clear...
  static deleteCharacter(username: string): StorageResult<void> {
    return CharacterStorage.deleteCharacterSlot(username, 1);
  }

  static listCharacters(username: string): StorageResult<string[]> {
    const result = CharacterStorage.listCharacterSlots(username);
    if (result.success && result.data) {
      const names = result.data.filter(slot => !slot.isEmpty).map(slot => slot.name);
      return { success: true, data: names };
    }
    return { success: false, error: result.error || 'Failed to list characters' };
  }

  static getStats(username: string): any {
    return CharacterStorage.getStorageStats(username);
  }

  static clearAll(username: string): StorageResult<void> {
    return CharacterStorage.clearAllCharacters(username);
  }
}
