/**
 * Migration Converter
 * Converts old layer-based characters to new sprite-sheet-based V2 format
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import { SpriteSheetDefinition } from '../AvatarBuilderTypes';
import { CharacterSlot } from './types';
import { CharacterStorage } from './CharacterStorage';
import { MigrationDetector } from './MigrationDetector';
import { ThumbnailGenerator } from './ThumbnailGenerator';
import { DefaultSpriteSheets } from './DefaultSpriteSheets';

/**
 * Migration result for a single character
 */
export interface CharacterMigrationResult {
  /** Whether migration was successful */
  success: boolean;
  
  /** Slot number that was migrated */
  slotNumber: number;
  
  /** Character name */
  characterName: string;
  
  /** Error message if migration failed */
  error?: string;
  
  /** Migrated character data (if successful) */
  migratedCharacter?: CharacterSlot;
}

/**
 * Migration result for all characters
 */
export interface MigrationResult {
  /** Whether all migrations were successful */
  success: boolean;
  
  /** Total number of characters attempted */
  totalAttempted: number;
  
  /** Number of successful migrations */
  successCount: number;
  
  /** Number of failed migrations */
  failureCount: number;
  
  /** Individual character results */
  characterResults: CharacterMigrationResult[];
  
  /** Overall error messages */
  errors: string[];
}

/**
 * Migration Converter
 * Handles conversion of old character data to V2 format
 */
export class MigrationConverter {
  /**
   * Get default sprite sheet for migrated characters
   * Uses the default template from DefaultSpriteSheets registry
   */
  private static getDefaultSpriteSheet(): SpriteSheetDefinition {
    const defaultTemplate = DefaultSpriteSheets.getDefaultTemplate();
    return defaultTemplate.spriteSheet;
  }
  
  /**
   * Migrate a single character from old to V2 format
   */
  static async migrateCharacter(username: string, slotNumber: number): Promise<CharacterMigrationResult> {
    try {
      // Load old character data
      const oldCharacter = MigrationDetector.getOldCharacter(username, slotNumber);
      
      if (!oldCharacter) {
        return {
          success: false,
          slotNumber,
          characterName: '',
          error: `No old character found in slot ${slotNumber}`
        };
      }
      
      // Check if V2 slot already exists
      const existingV2 = CharacterStorage.loadCharacterSlot(username, slotNumber);
      if (existingV2.success && existingV2.data && !existingV2.data.isEmpty) {
        return {
          success: false,
          slotNumber,
          characterName: oldCharacter.name,
          error: `Slot ${slotNumber} already has a V2 character`
        };
      }
      
      // Get default sprite sheet from registry
      const defaultSpriteSheet = this.getDefaultSpriteSheet();

      // Generate thumbnail from default sprite sheet
      const thumbnailResult = await ThumbnailGenerator.generateThumbnail(
        defaultSpriteSheet,
        { width: 64, height: 64 }
      );
      const thumbnailUrl = thumbnailResult.success ? thumbnailResult.data : '';

      // Create new V2 character slot
      const now = new Date().toISOString();
      const newCharacter: CharacterSlot = {
        slotNumber,
        username,
        name: oldCharacter.name, // Preserve name
        spriteSheet: defaultSpriteSheet,
        thumbnailUrl: thumbnailUrl || '',
        createdAt: oldCharacter.createdAt, // Preserve creation date
        updatedAt: now, // Update to migration time
        lastUsed: oldCharacter.updatedAt, // Use old update time as last used
        isEmpty: false
      };
      
      // Add migration metadata (extend the type temporarily)
      (newCharacter as any).migrated = true;
      (newCharacter as any).migratedFrom = 'layer-based-v1';
      (newCharacter as any).migratedAt = now;
      (newCharacter as any).originalPreviewUrl = oldCharacter.previewUrl;
      
      // Save to V2 storage
      const saveResult = CharacterStorage.saveCharacterSlot(username, newCharacter);
      
      if (!saveResult.success) {
        return {
          success: false,
          slotNumber,
          characterName: oldCharacter.name,
          error: saveResult.error || 'Failed to save migrated character'
        };
      }
      
      return {
        success: true,
        slotNumber,
        characterName: oldCharacter.name,
        migratedCharacter: newCharacter
      };
    } catch (error) {
      return {
        success: false,
        slotNumber,
        characterName: '',
        error: error instanceof Error ? error.message : 'Unknown error during migration'
      };
    }
  }
  
  /**
   * Migrate all characters for a user
   */
  static async migrateAllCharacters(username: string): Promise<MigrationResult> {
    const detection = MigrationDetector.detectOldCharacters(username);
    const characterResults: CharacterMigrationResult[] = [];
    const errors: string[] = [];
    
    // Migrate each slot that needs migration
    for (const slotNumber of detection.slotsToMigrate) {
      const result = await this.migrateCharacter(username, slotNumber);
      characterResults.push(result);
      
      if (!result.success && result.error) {
        errors.push(`Slot ${slotNumber}: ${result.error}`);
      }
    }
    
    const successCount = characterResults.filter(r => r.success).length;
    const failureCount = characterResults.filter(r => !r.success).length;
    
    // Migrate active slot if all migrations successful
    if (successCount > 0 && failureCount === 0) {
      const oldActiveSlot = MigrationDetector.getOldActiveSlot(username);

      // Only set active slot if it was migrated
      if (detection.slotsToMigrate.includes(oldActiveSlot)) {
        CharacterStorage.setActiveCharacter(username, oldActiveSlot);
      }
    }
    
    return {
      success: failureCount === 0 && successCount > 0,
      totalAttempted: detection.slotsToMigrate.length,
      successCount,
      failureCount,
      characterResults,
      errors
    };
  }
  
  /**
   * Verify migration was successful
   */
  static verifyMigration(username: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];
    const detection = MigrationDetector.detectOldCharacters(username);
    
    // Check each old character has a corresponding V2 character
    for (const oldChar of detection.oldCharacters) {
      const v2Result = CharacterStorage.loadCharacterSlot(username, oldChar.slotNumber);
      
      if (!v2Result.success || !v2Result.data || v2Result.data.isEmpty) {
        errors.push(`Slot ${oldChar.slotNumber} ("${oldChar.name}") was not migrated`);
      } else {
        // Verify name was preserved
        if (v2Result.data.name !== oldChar.name) {
          errors.push(`Slot ${oldChar.slotNumber} name mismatch: expected "${oldChar.name}", got "${v2Result.data.name}"`);
        }
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }
  
  /**
   * Rollback migration for a specific slot
   * Deletes V2 character, keeps old character intact
   */
  static rollbackCharacter(username: string, slotNumber: number): boolean {
    try {
      const deleteResult = CharacterStorage.deleteCharacterSlot(username, slotNumber);
      return deleteResult.success;
    } catch (error) {
      console.error(`Failed to rollback slot ${slotNumber}:`, error);
      return false;
    }
  }
  
  /**
   * Complete migration cleanup
   * Deletes old character data after successful migration
   * WARNING: This is destructive! Only call after user confirmation.
   */
  static completeMigration(username: string): { success: boolean; errors: string[] } {
    // Verify migration first
    const verification = this.verifyMigration(username);
    
    if (!verification.success) {
      return {
        success: false,
        errors: ['Migration verification failed', ...verification.errors]
      };
    }
    
    // Delete old character data
    const deleteResult = MigrationDetector.deleteAllOldCharacters(username);
    
    return {
      success: deleteResult.success,
      errors: deleteResult.errors
    };
  }
}

