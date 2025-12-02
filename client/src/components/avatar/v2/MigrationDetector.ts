/**
 * Migration Detector
 * Detects old layer-based characters that need migration to V2 system
 *
 * NOTE: The old layer-based avatar system has been completely removed from the codebase.
 * This migration tool only reads old localStorage data to help users migrate their existing
 * characters to the new V2 sprite-sheet system. The old UI components and renderers no longer exist.
 *
 * @version 2.0.0
 * @date 2025-11-06
 */

import { CharacterStorage } from './CharacterStorage';
import { AVATAR_SYSTEM_CONSTANTS } from './types';

/**
 * Old character slot structure (from layer-based system - REMOVED)
 * This interface is only used for reading old localStorage data during migration.
 */
interface OldCharacterSlot {
  slotNumber: number;
  name: string;
  config: {
    base: { enabled: boolean; src: string | null };
    hair: { enabled: boolean; src: string | null };
    accessories: { enabled: boolean; src: string | null };
    clothes: { enabled: boolean; src: string | null };
    updatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
}

/**
 * Migration detection result
 */
export interface MigrationDetectionResult {
  /** Whether old characters were found */
  hasOldCharacters: boolean;
  
  /** Number of old characters found */
  oldCharacterCount: number;
  
  /** Old character slots that need migration */
  oldCharacters: OldCharacterSlot[];
  
  /** Slots that are already migrated (exist in V2) */
  alreadyMigratedSlots: number[];
  
  /** Slots that need migration (old exists, V2 doesn't) */
  slotsToMigrate: number[];
}

/**
 * Migration Detector
 * Scans localStorage for old character data and determines what needs migration
 */
export class MigrationDetector {
  /**
   * Old storage key template
   */
  private static readonly OLD_SLOT_KEY_TEMPLATE = 'stargety_character_{username}_slot_{slotNumber}';
  
  /**
   * Old active character key template
   */
  private static readonly OLD_ACTIVE_KEY_TEMPLATE = 'stargety_active_character_{username}';
  
  /**
   * Get old storage key for a slot
   */
  private static getOldSlotKey(username: string, slotNumber: number): string {
    return this.OLD_SLOT_KEY_TEMPLATE
      .replace('{username}', username)
      .replace('{slotNumber}', slotNumber.toString());
  }
  
  /**
   * Get old active character key
   */
  private static getOldActiveKey(username: string): string {
    return this.OLD_ACTIVE_KEY_TEMPLATE.replace('{username}', username);
  }
  
  /**
   * Detect old characters that need migration
   */
  static detectOldCharacters(username: string): MigrationDetectionResult {
    const oldCharacters: OldCharacterSlot[] = [];
    const alreadyMigratedSlots: number[] = [];
    const slotsToMigrate: number[] = [];
    
    // Scan all 5 slots
    for (let slotNumber = 1; slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS; slotNumber++) {
      // Check if old slot exists
      const oldSlot = this.loadOldCharacterSlot(username, slotNumber);
      
      if (oldSlot) {
        oldCharacters.push(oldSlot);
        
        // Check if V2 slot already exists
        const v2Result = CharacterStorage.loadCharacterSlot(username, slotNumber);
        
        if (v2Result.success && v2Result.data && !v2Result.data.isEmpty) {
          // V2 slot exists - already migrated
          alreadyMigratedSlots.push(slotNumber);
        } else {
          // V2 slot doesn't exist - needs migration
          slotsToMigrate.push(slotNumber);
        }
      }
    }
    
    return {
      hasOldCharacters: oldCharacters.length > 0,
      oldCharacterCount: oldCharacters.length,
      oldCharacters,
      alreadyMigratedSlots,
      slotsToMigrate
    };
  }
  
  /**
   * Load an old character slot from localStorage
   */
  private static loadOldCharacterSlot(username: string, slotNumber: number): OldCharacterSlot | null {
    try {
      const key = this.getOldSlotKey(username, slotNumber);
      const data = localStorage.getItem(key);
      
      if (!data) {
        return null;
      }
      
      const slot = JSON.parse(data) as OldCharacterSlot;
      
      // Validate it's actually an old character slot
      if (!slot.config || !slot.config.base) {
        return null;
      }
      
      return slot;
    } catch (error) {
      console.warn(`Failed to load old character slot ${slotNumber}:`, error);
      return null;
    }
  }
  
  /**
   * Get old active slot number
   */
  static getOldActiveSlot(username: string): number {
    try {
      const key = this.getOldActiveKey(username);
      const data = localStorage.getItem(key);
      
      if (!data) {
        return 1; // Default to slot 1
      }
      
      const slotNumber = parseInt(data, 10);
      
      if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS) {
        return 1;
      }
      
      return slotNumber;
    } catch (error) {
      console.warn('Failed to get old active slot:', error);
      return 1;
    }
  }
  
  /**
   * Check if user has any old characters
   */
  static hasOldCharacters(username: string): boolean {
    const result = this.detectOldCharacters(username);
    return result.hasOldCharacters;
  }
  
  /**
   * Get count of characters that need migration
   */
  static getMigrationCount(username: string): number {
    const result = this.detectOldCharacters(username);
    return result.slotsToMigrate.length;
  }
  
  /**
   * Check if a specific slot needs migration
   */
  static slotNeedsMigration(username: string, slotNumber: number): boolean {
    const result = this.detectOldCharacters(username);
    return result.slotsToMigrate.includes(slotNumber);
  }
  
  /**
   * Get old character data for a specific slot
   */
  static getOldCharacter(username: string, slotNumber: number): OldCharacterSlot | null {
    return this.loadOldCharacterSlot(username, slotNumber);
  }
  
  /**
   * Delete old character data (after successful migration)
   * WARNING: This is destructive! Only call after confirming migration success.
   */
  static deleteOldCharacter(username: string, slotNumber: number): boolean {
    try {
      const key = this.getOldSlotKey(username, slotNumber);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to delete old character slot ${slotNumber}:`, error);
      return false;
    }
  }
  
  /**
   * Delete old active slot marker (after successful migration)
   */
  static deleteOldActiveSlot(username: string): boolean {
    try {
      const key = this.getOldActiveKey(username);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete old active slot:', error);
      return false;
    }
  }
  
  /**
   * Delete all old character data for a user (after successful migration)
   * WARNING: This is destructive! Only call after confirming migration success.
   */
  static deleteAllOldCharacters(username: string): { success: boolean; deletedCount: number; errors: string[] } {
    const errors: string[] = [];
    let deletedCount = 0;
    
    // Delete all character slots
    for (let slotNumber = 1; slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS; slotNumber++) {
      const oldSlot = this.loadOldCharacterSlot(username, slotNumber);
      
      if (oldSlot) {
        const deleted = this.deleteOldCharacter(username, slotNumber);
        
        if (deleted) {
          deletedCount++;
        } else {
          errors.push(`Failed to delete slot ${slotNumber}`);
        }
      }
    }
    
    // Delete active slot marker
    const activeDeleted = this.deleteOldActiveSlot(username);
    if (!activeDeleted) {
      errors.push('Failed to delete active slot marker');
    }
    
    return {
      success: errors.length === 0,
      deletedCount,
      errors
    };
  }
  
  /**
   * Get migration summary for display
   */
  static getMigrationSummary(username: string): string {
    const result = this.detectOldCharacters(username);
    
    if (!result.hasOldCharacters) {
      return 'No old characters found.';
    }
    
    const lines: string[] = [];
    lines.push(`Found ${result.oldCharacterCount} old character(s):`);
    
    result.oldCharacters.forEach(char => {
      const status = result.alreadyMigratedSlots.includes(char.slotNumber)
        ? '✓ Already migrated'
        : '⚠ Needs migration';
      
      lines.push(`  Slot ${char.slotNumber}: "${char.name}" - ${status}`);
    });
    
    if (result.slotsToMigrate.length > 0) {
      lines.push('');
      lines.push(`${result.slotsToMigrate.length} character(s) need migration.`);
    }
    
    return lines.join('\n');
  }
}

