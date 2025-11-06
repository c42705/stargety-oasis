/**
 * Character Storage System V2
 * Handles localStorage persistence for sprite-sheet-based character slots
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import {
  CharacterSlot,
  EmptyCharacterSlot,
  ActiveCharacterState,
  CharacterSlotSummary,
  CharacterMetadata,
  StorageResult,
  StorageStats,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AVATAR_SYSTEM_CONSTANTS,
  isValidSlotNumber,
  isEmptySlot
} from './types';
import { AnimationCategory } from '../AvatarBuilderTypes';
import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * Character Storage Manager
 * Handles all localStorage operations for character slots
 */
export class CharacterStorage {
  
  // ============================================================================
  // Character Slot Operations
  // ============================================================================
  
  /**
   * Save a character to a specific slot
   */
  static saveCharacterSlot(username: string, slot: CharacterSlot): StorageResult<CharacterSlot> {
    return PerformanceMonitor.measureSync<StorageResult<CharacterSlot>>('CharacterStorage.saveCharacterSlot', () => {
      try {
        // Validate slot number
        if (!isValidSlotNumber(slot.slotNumber)) {
          return {
            success: false,
            error: `Invalid slot number: ${slot.slotNumber}. Must be 1-5.`
          };
        }

        // Validate character data
        const validation = this.validateSlot(slot);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }
      
      // Check storage size
      const data = JSON.stringify(slot);
      const sizeCheck = this.checkStorageSize(data);
      if (!sizeCheck.success) {
        return {
          success: false,
          error: sizeCheck.error
        };
      }
      
      // Save to localStorage
      const key = this.getSlotKey(username, slot.slotNumber);
      localStorage.setItem(key, data);

      // Update metadata
      this.updateMetadata(username);

      return { success: true, data: slot };

    } catch (error) {
      return {
        success: false,
        error: `Failed to save character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
    }, { slotNumber: slot.slotNumber, username });
  }
  
  /**
   * Load a character from a specific slot
   */
  static loadCharacterSlot(username: string, slotNumber: number): StorageResult<CharacterSlot | EmptyCharacterSlot> {
    return PerformanceMonitor.measureSync('CharacterStorage.loadCharacterSlot', () => {
      try {
        // Validate slot number
        if (!isValidSlotNumber(slotNumber)) {
          return {
            success: false,
            error: `Invalid slot number: ${slotNumber}. Must be 1-5.`
          };
        }

        const key = this.getSlotKey(username, slotNumber);
        const data = localStorage.getItem(key);
      
      // Return empty slot if no data
      if (!data) {
        const emptySlot: EmptyCharacterSlot = {
          slotNumber,
          username,
          isEmpty: true,
          name: '',
          thumbnailUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          data: emptySlot
        };
      }
      
      // Parse and return character slot
      const slot: CharacterSlot = JSON.parse(data);
      
      return {
        success: true,
        data: slot
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to load character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
    }, { slotNumber, username });
  }
  
  /**
   * Delete a character from a specific slot
   */
  static deleteCharacterSlot(username: string, slotNumber: number): StorageResult<void> {
    try {
      // Validate slot number
      if (!isValidSlotNumber(slotNumber)) {
        return {
          success: false,
          error: `Invalid slot number: ${slotNumber}. Must be 1-5.`
        };
      }
      
      const key = this.getSlotKey(username, slotNumber);
      
      // Check if slot exists
      if (!localStorage.getItem(key)) {
        return {
          success: false,
          error: 'Character slot is already empty'
        };
      }
      
      // Remove from localStorage
      localStorage.removeItem(key);
      
      // Update metadata
      this.updateMetadata(username);
      
      // If this was the active character, switch to slot 1
      const activeState = this.getActiveCharacter(username);
      if (activeState.success && activeState.data?.activeSlotNumber === slotNumber) {
        this.setActiveCharacter(username, 1);
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * List all character slots for a user
   */
  static listCharacterSlots(username: string): StorageResult<CharacterSlotSummary[]> {
    try {
      const summaries: CharacterSlotSummary[] = [];
      const activeState = this.getActiveCharacter(username);
      const activeSlot = activeState.success && activeState.data ? activeState.data.activeSlotNumber : 1;
      
      // Load all 5 slots
      for (let slotNumber = 1; slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS; slotNumber++) {
        const result = this.loadCharacterSlot(username, slotNumber);
        
        if (result.success && result.data) {
          const slot = result.data;
          
          summaries.push({
            slotNumber,
            name: slot.name,
            thumbnailUrl: slot.thumbnailUrl,
            isEmpty: slot.isEmpty,
            lastUsed: !isEmptySlot(slot) ? slot.lastUsed : undefined,
            isActive: slotNumber === activeSlot
          });
        }
      }
      
      return {
        success: true,
        data: summaries
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to list characters: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // ============================================================================
  // Active Character Operations
  // ============================================================================
  
  /**
   * Set the active character slot
   */
  static setActiveCharacter(username: string, slotNumber: number): StorageResult<void> {
    try {
      // Validate slot number
      if (!isValidSlotNumber(slotNumber)) {
        return {
          success: false,
          error: `Invalid slot number: ${slotNumber}. Must be 1-5.`
        };
      }
      
      const activeState: ActiveCharacterState = {
        username,
        activeSlotNumber: slotNumber,
        lastSwitched: new Date().toISOString()
      };
      
      const key = this.getActiveKey(username);
      localStorage.setItem(key, JSON.stringify(activeState));
      
      // Update lastUsed timestamp on the character slot
      const slotResult = this.loadCharacterSlot(username, slotNumber);
      if (slotResult.success && slotResult.data && !isEmptySlot(slotResult.data)) {
        const slot = slotResult.data;
        slot.lastUsed = new Date().toISOString();
        this.saveCharacterSlot(username, slot);
      }
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to set active character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get the active character state
   */
  static getActiveCharacter(username: string): StorageResult<ActiveCharacterState> {
    try {
      const key = this.getActiveKey(username);
      const data = localStorage.getItem(key);
      
      // Default to slot 1 if no active character set
      if (!data) {
        const defaultState: ActiveCharacterState = {
          username,
          activeSlotNumber: 1,
          lastSwitched: new Date().toISOString()
        };
        
        return {
          success: true,
          data: defaultState
        };
      }
      
      const activeState: ActiveCharacterState = JSON.parse(data);
      
      return {
        success: true,
        data: activeState
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to get active character: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get the active character slot data
   */
  static getActiveCharacterSlot(username: string): StorageResult<CharacterSlot | EmptyCharacterSlot> {
    try {
      const activeState = this.getActiveCharacter(username);
      
      if (!activeState.success || !activeState.data) {
        return {
          success: false,
          error: activeState.error || 'Failed to get active character state'
        };
      }
      
      return this.loadCharacterSlot(username, activeState.data.activeSlotNumber);
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to get active character slot: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // ============================================================================
  // Cache Operations
  // ============================================================================
  
  /**
   * Update cached texture for a character slot
   */
  static updateCache(username: string, slotNumber: number, textureData: string): StorageResult<void> {
    try {
      const slotResult = this.loadCharacterSlot(username, slotNumber);
      
      if (!slotResult.success || !slotResult.data || isEmptySlot(slotResult.data)) {
        return {
          success: false,
          error: 'Cannot update cache for empty slot'
        };
      }
      
      const slot = slotResult.data;
      slot.cachedTexture = textureData;
      slot.cacheTimestamp = new Date().toISOString();
      slot.updatedAt = new Date().toISOString();

      const saveResult = this.saveCharacterSlot(username, slot);
      if (saveResult.success) {
        return { success: true };
      } else {
        return { success: false, error: saveResult.error };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to update cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Clear cached texture for a character slot
   */
  static clearCache(username: string, slotNumber: number): StorageResult<void> {
    try {
      const slotResult = this.loadCharacterSlot(username, slotNumber);
      
      if (!slotResult.success || !slotResult.data || isEmptySlot(slotResult.data)) {
        return { success: true }; // Nothing to clear
      }
      
      const slot = slotResult.data;
      delete slot.cachedTexture;
      delete slot.cacheTimestamp;
      slot.updatedAt = new Date().toISOString();

      const saveResult = this.saveCharacterSlot(username, slot);
      if (saveResult.success) {
        return { success: true };
      } else {
        return { success: false, error: saveResult.error };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // ============================================================================
  // Utility Operations
  // ============================================================================

  /**
   * Get storage statistics for a user
   */
  static getStorageStats(username: string): StorageStats {
    const summaries = this.listCharacterSlots(username);
    const slotSizes: Record<number, number> = {};
    let totalSize = 0;
    let lastModified = '';

    if (summaries.success && summaries.data) {
      summaries.data.forEach(summary => {
        const key = this.getSlotKey(username, summary.slotNumber);
        const data = localStorage.getItem(key);

        if (data) {
          const size = data.length * 2; // UTF-16 bytes
          slotSizes[summary.slotNumber] = size;
          totalSize += size;

          try {
            const slot: CharacterSlot = JSON.parse(data);
            if (slot.updatedAt > lastModified) {
              lastModified = slot.updatedAt;
            }
          } catch {
            // Ignore parsing errors
          }
        }
      });
    }

    // Calculate localStorage usage
    let storageUsedPercent = 0;
    try {
      let usedSpace = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            usedSpace += (key.length + value.length) * 2;
          }
        }
      }
      storageUsedPercent = (usedSpace / AVATAR_SYSTEM_CONSTANTS.MAX_USER_SIZE) * 100;
    } catch {
      storageUsedPercent = 0;
    }

    const usedSlots = summaries.data?.filter(s => !s.isEmpty).length || 0;

    return {
      username,
      totalSlots: AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS,
      usedSlots,
      emptySlots: AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS - usedSlots,
      totalSize,
      slotSizes,
      lastModified: lastModified || new Date().toISOString(),
      storageUsedPercent: Math.min(storageUsedPercent, 100)
    };
  }

  /**
   * Clear all character data for a user
   */
  static clearAllCharacters(username: string): StorageResult<void> {
    try {
      const keysToRemove: string[] = [];

      // Collect all keys for this user
      for (let slotNumber = 1; slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS; slotNumber++) {
        keysToRemove.push(this.getSlotKey(username, slotNumber));
      }
      keysToRemove.push(this.getActiveKey(username));
      keysToRemove.push(this.getMetadataKey(username));

      // Remove all keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `Failed to clear characters: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Export all character data for a user
   */
  static exportAllCharacters(username: string): StorageResult<string> {
    try {
      const exportData: any = {
        version: '2.0.0',
        username,
        exportedAt: new Date().toISOString(),
        characters: []
      };

      for (let slotNumber = 1; slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS; slotNumber++) {
        const result = this.loadCharacterSlot(username, slotNumber);
        if (result.success && result.data && !isEmptySlot(result.data)) {
          exportData.characters.push(result.data);
        }
      }

      const activeState = this.getActiveCharacter(username);
      if (activeState.success && activeState.data) {
        exportData.activeSlot = activeState.data.activeSlotNumber;
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
   * Import character data for a user
   */
  static importCharacters(jsonData: string, username: string): StorageResult<number> {
    try {
      const data = JSON.parse(jsonData);

      if (!data.characters || !Array.isArray(data.characters)) {
        return {
          success: false,
          error: 'Invalid import data: missing characters array'
        };
      }

      let importedCount = 0;

      data.characters.forEach((character: CharacterSlot) => {
        // Update username to current user
        character.username = username;
        character.updatedAt = new Date().toISOString();

        const result = this.saveCharacterSlot(username, character);
        if (result.success) {
          importedCount++;
        }
      });

      // Set active slot if provided
      if (data.activeSlot && isValidSlotNumber(data.activeSlot)) {
        this.setActiveCharacter(username, data.activeSlot);
      }

      return {
        success: true,
        data: importedCount
      };

    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Get localStorage key for a character slot
   */
  private static getSlotKey(username: string, slotNumber: number): string {
    return `${AVATAR_SYSTEM_CONSTANTS.STORAGE_PREFIX}character_${username}_slot_${slotNumber}`;
  }
  
  /**
   * Get localStorage key for active character state
   */
  private static getActiveKey(username: string): string {
    return `${AVATAR_SYSTEM_CONSTANTS.STORAGE_PREFIX}active_character_${username}`;
  }
  
  /**
   * Get localStorage key for metadata
   */
  private static getMetadataKey(username: string): string {
    return `${AVATAR_SYSTEM_CONSTANTS.STORAGE_PREFIX}character_metadata_${username}`;
  }
  
  /**
   * Check if data size is within limits
   */
  private static checkStorageSize(data: string): StorageResult<void> {
    const dataSize = data.length * 2; // UTF-16 bytes
    
    if (dataSize > AVATAR_SYSTEM_CONSTANTS.MAX_SLOT_SIZE) {
      return {
        success: false,
        error: `Character data too large: ${Math.round(dataSize / 1024 / 1024)}MB exceeds ${Math.round(AVATAR_SYSTEM_CONSTANTS.MAX_SLOT_SIZE / 1024 / 1024)}MB limit`
      };
    }
    
    return { success: true };
  }
  
  /**
   * Update metadata for quick access
   */
  private static updateMetadata(username: string): void {
    try {
      const summaries = this.listCharacterSlots(username);
      const activeState = this.getActiveCharacter(username);
      
      if (!summaries.success || !activeState.success) {
        return; // Silently fail metadata update
      }
      
      const metadata: CharacterMetadata = {
        version: '2.0.0',
        lastSync: new Date().toISOString(),
        slotCount: AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS,
        activeSlot: activeState.data?.activeSlotNumber || 1,
        slots: summaries.data || []
      };
      
      const key = this.getMetadataKey(username);
      localStorage.setItem(key, JSON.stringify(metadata));
      
    } catch {
      // Silently fail metadata update
    }
  }
  
  /**
   * Validate character slot data
   */
  private static validateSlot(slot: CharacterSlot): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    if (!slot.name || slot.name.trim() === '') {
      errors.push({
        type: 'spritesheet',
        code: 'MISSING_NAME',
        message: 'Character name is required',
        severity: 'error'
      });
    }

    if (!slot.spriteSheet) {
      errors.push({
        type: 'spritesheet',
        code: 'MISSING_SPRITESHEET',
        message: 'Sprite sheet is required',
        severity: 'error'
      });
    }

    if (!slot.thumbnailUrl) {
      errors.push({
        type: 'spritesheet',
        code: 'MISSING_THUMBNAIL',
        message: 'Thumbnail is required',
        severity: 'error'
      });
    }

    // Check required animations
    const hasRequiredAnimations = AVATAR_SYSTEM_CONSTANTS.REQUIRED_ANIMATIONS.every(category =>
      slot.spriteSheet?.animations?.some(anim => anim.category === category)
    );

    if (!hasRequiredAnimations) {
      errors.push({
        type: 'animation',
        code: 'MISSING_REQUIRED_ANIMATIONS',
        message: 'Missing required animations (idle, walk_down, walk_left, walk_up, walk_right)',
        severity: 'error'
      });
    }

    // Check sprite sheet frames
    if (slot.spriteSheet?.frames?.length < 5) {
      warnings.push({
        type: 'frame',
        code: 'LOW_FRAME_COUNT',
        message: 'Sprite sheet has fewer than 5 frames',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      checks: {
        hasRequiredAnimations,
        hasThumbnail: !!slot.thumbnailUrl,
        hasValidSpriteSheet: !!slot.spriteSheet,
        withinSizeLimit: true, // Checked separately
        hasValidName: !!slot.name && slot.name.trim() !== ''
      }
    };
  }
}

