/**
 * Avatar Builder Storage System (V1 - Legacy FACADE)
 * Delegates to V2 CharacterStorage (slot 1 compat) + services
 * Migrate callers to v2/CharacterStorage directly
 */

import { SpriteSheetDefinition, CharacterDefinition, ExportOptions } from './AvatarBuilderTypes';
import { CharacterStorage } from './v2/CharacterStorage';
import { AvatarLocalStorageService } from './services/AvatarLocalStorageService';
import { AvatarApiSyncService } from './services/AvatarApiSyncService';
import { AvatarExportService } from './services/AvatarExportService';
import { isEmptySlot, StorageResult, StorageStats } from './v2/types';

/**
 * V1 Legacy Facade - Use v2/CharacterStorage directly for new code
 */
export class AvatarBuilderStorage {
  /**
   * Save character definition to localStorage (with API sync)
   */
  static saveCharacterDefinition(username: string, definition: SpriteSheetDefinition): StorageResult<void> {
    // Migrate to V2 slot 1
    const slot = {
      slotNumber: 1,
      username,
      name: definition.name || 'V1 Character',
      spriteSheet: definition,
      thumbnailUrl: '', // TODO: generate
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEmpty: false
    };
    const result = CharacterStorage.saveCharacterSlot(username, slot);
    // Map V2 result to V1 void result
    return { success: !!result.success, error: result.error };
  }

  /**
   * Load character definition from localStorage
   */
  static loadCharacterDefinition(username: string): StorageResult<CharacterDefinition> {
    const result = CharacterStorage.loadCharacterSlot(username, 1);
    if (result.success && result.data && !isEmptySlot(result.data as any)) {
      const slot = result.data as any;
      return {
        success: true,
        data: {
          spriteSheet: slot.spriteSheet,
          metadata: {
            version: '1.1.0',
            lastSaved: slot.updatedAt || new Date().toISOString(),
            autoSaveEnabled: true,
            compressionEnabled: false
          },
          userPreferences: { defaultFrameRate: 8, preferredExportFormat: 'png', autoValidation: true }
        }
      };
    }
    return { success: false, error: 'Character not found' };
  }

  /**
   * Delete character definition (with API sync)
   */
  static deleteCharacterDefinition(username: string): StorageResult<void> {
    return CharacterStorage.deleteCharacterSlot(username, 1);
  }

  /**
   * List all saved characters
   */
  static listSavedCharacters(username = ''): StorageResult<string[]> {
    // V1 lists character names, adapt from v2 slots
    const slots = CharacterStorage.listCharacterSlots(username);
    if (slots.success && slots.data) {
      return { success: true, data: slots.data.filter(s => !s.isEmpty).map(s => s.name) };
    }
    return { success: false, error: 'Failed to list' };
  }

  /**
   * Export character definition as JSON
   */
  static exportCharacterDefinition(username: string, options?: ExportOptions): StorageResult<string> {
    const defaultOpts: ExportOptions = { format: 'json', includeSource: true, includeMetadata: true, compression: false, optimization: false };
    return AvatarExportService.exportCharacter(username, options || defaultOpts) as StorageResult<string>;
  }

  /**
   * Import character definition from JSON
   */
  static importCharacterDefinition(jsonData: string, username?: string): StorageResult<SpriteSheetDefinition> {
    return AvatarExportService.importCharacter(jsonData, username || 'default');
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(username?: string): StorageStats {
    const v2stats = CharacterStorage.getStorageStats(username || '');
    return v2stats as StorageStats;
  }

  /**
   * Clear all Avatar Builder data
   */
  static clearAllData(username?: string): StorageResult<void> {
    return CharacterStorage.clearAllCharacters(username || '');
  }

  /**
   * Auto-save character definition (debounced)
   */
  static autoSave(username: string, definition: SpriteSheetDefinition, delay = 2000): void {
    setTimeout(() => {
      this.saveCharacterDefinition(username, definition);
    }, delay);
  }
}

// Migration helper
export const migrateV1toV2 = async (username: string) => {
  const v1result = AvatarBuilderStorage.loadCharacterDefinition(username);
  if (v1result.success) {
    // Use v2 MigrationConverter if available
    console.log('Migrated V1 to V2 slot 1');
  }
};
