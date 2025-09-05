/**
 * Avatar Builder Storage System
 * Handles localStorage persistence and data management for Avatar Builder
 */

import { SpriteSheetDefinition, CharacterDefinition, ExportOptions } from './AvatarBuilderTypes';

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StorageStats {
  totalCharacters: number;
  totalSize: number; // in bytes
  lastModified: string;
  storageUsed: number; // percentage of localStorage used
}

/**
 * Storage manager for Avatar Builder character definitions
 */
export class AvatarBuilderStorage {
  private static readonly STORAGE_PREFIX = 'avatar_builder_';
  private static readonly CHARACTER_PREFIX = 'character_';
  private static readonly METADATA_KEY = 'metadata';
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

  /**
   * Save character definition to localStorage
   */
  static saveCharacterDefinition(username: string, definition: SpriteSheetDefinition): StorageResult<void> {
    try {
      const characterDefinition: CharacterDefinition = {
        spriteSheet: definition,
        metadata: {
          version: '1.0.0',
          lastSaved: new Date().toISOString(),
          autoSaveEnabled: true,
          compressionEnabled: true
        },
        userPreferences: {
          defaultFrameRate: 8,
          preferredExportFormat: 'png',
          autoValidation: true
        }
      };

      const key = this.getCharacterKey(username);
      const data = JSON.stringify(characterDefinition);

      // Check storage size
      const sizeCheck = this.checkStorageSize(data);
      if (!sizeCheck.success) {
        return sizeCheck;
      }

      localStorage.setItem(key, data);
      this.updateMetadata();

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Failed to save character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load character definition from localStorage
   */
  static loadCharacterDefinition(username: string): StorageResult<CharacterDefinition> {
    try {
      const key = this.getCharacterKey(username);
      const data = localStorage.getItem(key);

      if (!data) {
        return {
          success: false,
          error: 'Character not found'
        };
      }

      const characterDefinition: CharacterDefinition = JSON.parse(data);
      
      // Validate structure
      if (!characterDefinition.spriteSheet || !characterDefinition.metadata) {
        return {
          success: false,
          error: 'Invalid character data structure'
        };
      }

      return {
        success: true,
        data: characterDefinition
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to load character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete character definition
   */
  static deleteCharacterDefinition(username: string): StorageResult<void> {
    try {
      const key = this.getCharacterKey(username);
      
      if (!localStorage.getItem(key)) {
        return {
          success: false,
          error: 'Character not found'
        };
      }

      localStorage.removeItem(key);
      this.updateMetadata();

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Failed to delete character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List all saved characters
   */
  static listSavedCharacters(): StorageResult<string[]> {
    try {
      const characters: string[] = [];
      const prefix = this.STORAGE_PREFIX + this.CHARACTER_PREFIX;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const username = key.substring(prefix.length);
          characters.push(username);
        }
      }

      return {
        success: true,
        data: characters.sort()
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to list characters: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export character definition as JSON
   */
  static exportCharacterDefinition(
    username: string, 
    options: ExportOptions = { format: 'json', includeSource: true, includeMetadata: true, compression: false, optimization: false }
  ): StorageResult<string> {
    try {
      const loadResult = this.loadCharacterDefinition(username);
      if (!loadResult.success || !loadResult.data) {
        return {
          success: false,
          error: loadResult.error || 'Character not found'
        };
      }

      const characterDefinition = loadResult.data;
      let exportData: any;

      switch (options.format) {
        case 'json':
          exportData = this.exportAsJSON(characterDefinition, options);
          break;
        case 'phaser':
          exportData = this.exportAsPhaser(characterDefinition, options);
          break;
        case 'unity':
          exportData = this.exportAsUnity(characterDefinition, options);
          break;
        case 'godot':
          exportData = this.exportAsGodot(characterDefinition, options);
          break;
        default:
          return {
            success: false,
            error: `Unsupported export format: ${options.format}`
          };
      }

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };

    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Import character definition from JSON
   */
  static importCharacterDefinition(jsonData: string, username?: string): StorageResult<SpriteSheetDefinition> {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate import data
      if (!data.spriteSheet && !data.source) {
        return {
          success: false,
          error: 'Invalid import data: missing sprite sheet information'
        };
      }

      let spriteSheetDefinition: SpriteSheetDefinition;

      if (data.spriteSheet) {
        // Full character definition import
        spriteSheetDefinition = data.spriteSheet;
      } else {
        // Direct sprite sheet definition import
        spriteSheetDefinition = data;
      }

      // Update metadata
      if (username) {
        spriteSheetDefinition.createdBy = username;
        spriteSheetDefinition.updatedAt = new Date().toISOString();
      }

      return {
        success: true,
        data: spriteSheetDefinition
      };

    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): StorageStats {
    const characters = this.listSavedCharacters();
    let totalSize = 0;
    let lastModified = '';

    if (characters.success && characters.data) {
      characters.data.forEach(username => {
        const key = this.getCharacterKey(username);
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += data.length * 2; // Approximate bytes (UTF-16)
          
          try {
            const characterDef: CharacterDefinition = JSON.parse(data);
            if (characterDef.metadata.lastSaved > lastModified) {
              lastModified = characterDef.metadata.lastSaved;
            }
          } catch {
            // Ignore parsing errors for stats
          }
        }
      });
    }

    // Estimate localStorage usage
    let storageUsed = 0;
    try {
      const testKey = 'test_storage_size';
      const testData = 'x'.repeat(1024); // 1KB test
      let usedSpace = 0;

      // Estimate current usage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            usedSpace += (key.length + value.length) * 2;
          }
        }
      }

      storageUsed = (usedSpace / this.MAX_STORAGE_SIZE) * 100;
    } catch {
      // Fallback if estimation fails
      storageUsed = 0;
    }

    return {
      totalCharacters: characters.data?.length || 0,
      totalSize,
      lastModified: lastModified || new Date().toISOString(),
      storageUsed: Math.min(storageUsed, 100)
    };
  }

  /**
   * Clear all Avatar Builder data
   */
  static clearAllData(): StorageResult<void> {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Auto-save character definition (debounced)
   */
  private static autoSaveTimeouts = new Map<string, NodeJS.Timeout>();

  static autoSave(username: string, definition: SpriteSheetDefinition, delay = 2000): void {
    // Clear existing timeout
    const existingTimeout = this.autoSaveTimeouts.get(username);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.saveCharacterDefinition(username, definition);
      this.autoSaveTimeouts.delete(username);
    }, delay);

    this.autoSaveTimeouts.set(username, timeout);
  }

  // Private helper methods

  private static getCharacterKey(username: string): string {
    return `${this.STORAGE_PREFIX}${this.CHARACTER_PREFIX}${username}`;
  }

  private static getMetadataKey(): string {
    return `${this.STORAGE_PREFIX}${this.METADATA_KEY}`;
  }

  private static checkStorageSize(data: string): StorageResult<void> {
    const dataSize = data.length * 2; // UTF-16 bytes
    
    if (dataSize > this.MAX_STORAGE_SIZE) {
      return {
        success: false,
        error: `Data too large: ${Math.round(dataSize / 1024 / 1024)}MB exceeds ${Math.round(this.MAX_STORAGE_SIZE / 1024 / 1024)}MB limit`
      };
    }

    return { success: true };
  }

  private static updateMetadata(): void {
    try {
      const metadata = {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      localStorage.setItem(this.getMetadataKey(), JSON.stringify(metadata));
    } catch {
      // Ignore metadata update errors
    }
  }

  private static exportAsJSON(characterDefinition: CharacterDefinition, options: ExportOptions): any {
    const exportData: any = {
      format: 'avatar_builder_json',
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };

    if (options.includeMetadata) {
      exportData.metadata = characterDefinition.metadata;
      exportData.userPreferences = characterDefinition.userPreferences;
    }

    exportData.spriteSheet = { ...characterDefinition.spriteSheet };

    if (!options.includeSource) {
      delete exportData.spriteSheet.source.originalFile;
      delete exportData.spriteSheet.source.imageData;
    }

    return exportData;
  }

  private static exportAsPhaser(characterDefinition: CharacterDefinition, options: ExportOptions): any {
    // Convert to Phaser-specific format
    const spriteSheet = characterDefinition.spriteSheet;
    
    return {
      format: 'phaser_spritesheet',
      textureKey: `avatar_sheet_${spriteSheet.createdBy}`,
      frames: spriteSheet.frames.map((frame, index) => ({
        frame: index,
        x: frame.sourceRect.x,
        y: frame.sourceRect.y,
        w: frame.sourceRect.width,
        h: frame.sourceRect.height
      })),
      animations: spriteSheet.animations.map(anim => ({
        key: `${spriteSheet.createdBy}_${anim.category}`,
        frames: anim.sequence.frameIds.map(frameId => 
          spriteSheet.frames.findIndex(f => f.id === frameId)
        ),
        frameRate: anim.sequence.frameRate,
        repeat: anim.sequence.loop ? -1 : 0
      }))
    };
  }

  private static exportAsUnity(characterDefinition: CharacterDefinition, options: ExportOptions): any {
    // Convert to Unity-specific format
    return {
      format: 'unity_spritesheet',
      // Unity-specific export format would go here
      message: 'Unity export format not yet implemented'
    };
  }

  private static exportAsGodot(characterDefinition: CharacterDefinition, options: ExportOptions): any {
    // Convert to Godot-specific format
    return {
      format: 'godot_spritesheet',
      // Godot-specific export format would go here
      message: 'Godot export format not yet implemented'
    };
  }
}
