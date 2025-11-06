/**
 * Avatar System V2 - Type Definitions
 * Sprite-sheet-only character system with built-in caching
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import {
  SpriteSheetDefinition,
  AnimationCategory,
  ValidationResult as BaseValidationResult,
  ValidationError,
  ValidationWarning
} from '../AvatarBuilderTypes';

// ============================================================================
// Core Character Slot Types
// ============================================================================

/**
 * Character Slot - Represents one of 5 character slots per user
 */
export interface CharacterSlot {
  /** Slot number (1-5) */
  slotNumber: number;
  
  /** Owner username */
  username: string;
  
  /** User-defined character name */
  name: string;
  
  /** Sprite sheet definition from Avatar Builder */
  spriteSheet: SpriteSheetDefinition;
  
  /** Cached composite texture (base64) for instant loading */
  cachedTexture?: string;
  
  /** When the cache was created */
  cacheTimestamp?: string;
  
  /** Idle pose frame for preview thumbnail */
  thumbnailUrl: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Last time this character was used */
  lastUsed?: string;
  
  /** Whether this slot is empty */
  isEmpty: boolean;
}

/**
 * Active Character State - Tracks which character is currently active
 */
export interface ActiveCharacterState {
  /** Owner username */
  username: string;
  
  /** Currently active slot number (1-5) */
  activeSlotNumber: number;
  
  /** When the character was last switched */
  lastSwitched: string;
}

/**
 * Character Slot Summary - Lightweight version for listing
 */
export interface CharacterSlotSummary {
  /** Slot number (1-5) */
  slotNumber: number;
  
  /** Character name */
  name: string;
  
  /** Preview thumbnail URL */
  thumbnailUrl: string;
  
  /** Whether this slot is empty */
  isEmpty: boolean;
  
  /** Last time this character was used */
  lastUsed?: string;
  
  /** Whether this is the active character */
  isActive: boolean;
}

/**
 * Empty Character Slot - Represents an unused slot
 */
export interface EmptyCharacterSlot {
  slotNumber: number;
  username: string;
  isEmpty: true;
  name: '';
  thumbnailUrl: '';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Storage statistics for a user
 */
export interface StorageStats {
  /** Username */
  username: string;
  
  /** Total number of character slots (max 5) */
  totalSlots: number;
  
  /** Number of used slots */
  usedSlots: number;
  
  /** Number of empty slots */
  emptySlots: number;
  
  /** Total storage size in bytes */
  totalSize: number;
  
  /** Storage size per slot in bytes */
  slotSizes: Record<number, number>;
  
  /** Last modification timestamp */
  lastModified: string;
  
  /** Percentage of localStorage used (0-100) */
  storageUsedPercent: number;
}

/**
 * Character metadata stored separately for quick access
 */
export interface CharacterMetadata {
  /** Schema version for migration */
  version: string;
  
  /** Last sync timestamp */
  lastSync: string;
  
  /** Number of character slots */
  slotCount: number;
  
  /** Active slot number */
  activeSlot: number;
  
  /** Quick slot summaries */
  slots: CharacterSlotSummary[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Character slot validation result
 */
export interface ValidationResult extends BaseValidationResult {
  /** Specific validation checks */
  checks: {
    hasRequiredAnimations: boolean;
    hasThumbnail: boolean;
    hasValidSpriteSheet: boolean;
    withinSizeLimit: boolean;
    hasValidName: boolean;
  };
}

/**
 * Sprite sheet validation requirements
 */
export interface SpriteSheetRequirements {
  /** Required animation categories */
  requiredAnimations: AnimationCategory[];
  
  /** Minimum number of frames */
  minFrames: number;
  
  /** Maximum number of frames */
  maxFrames: number;
  
  /** Maximum file size in bytes */
  maxFileSize: number;
  
  /** Allowed image formats */
  allowedFormats: string[];
}

// ============================================================================
// Rendering Types
// ============================================================================

/**
 * Phaser texture information
 */
export interface TextureInfo {
  /** Phaser texture key */
  textureKey: string;
  
  /** Whether texture is loaded in Phaser */
  isLoaded: boolean;
  
  /** Texture dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** Frame count */
  frameCount: number;
  
  /** Animation keys registered */
  animationKeys: string[];
}

/**
 * Character rendering state
 */
export interface RenderingState {
  /** Current character slot */
  currentSlot?: CharacterSlot;
  
  /** Loaded texture info */
  textureInfo?: TextureInfo;
  
  /** Current animation playing */
  currentAnimation?: string;
  
  /** Whether character is rendering */
  isRendering: boolean;
  
  /** Last render timestamp */
  lastRender?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Character switched event data
 */
export interface CharacterSwitchedEvent {
  username: string;
  previousSlot?: number;
  newSlot: number;
  newCharacter: CharacterSlot;
  timestamp: string;
}

/**
 * Character updated event data
 */
export interface CharacterUpdatedEvent {
  username: string;
  slotNumber: number;
  character: CharacterSlot;
  changes: string[];
  timestamp: string;
}

/**
 * Character deleted event data
 */
export interface CharacterDeletedEvent {
  username: string;
  slotNumber: number;
  characterName: string;
  timestamp: string;
}

/**
 * Character created event data
 */
export interface CharacterCreatedEvent {
  username: string;
  slotNumber: number;
  character: CharacterSlot;
  timestamp: string;
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration status
 */
export interface MigrationStatus {
  /** Whether migration is needed */
  needsMigration: boolean;
  
  /** Number of old characters found */
  oldCharactersFound: number;
  
  /** Migration progress (0-100) */
  progress: number;
  
  /** Migration errors */
  errors: string[];
  
  /** Migration warnings */
  warnings: string[];
  
  /** Whether migration is complete */
  isComplete: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migratedSlots: number[];
  failedSlots: number[];
  errors: Record<number, string>;
  warnings: string[];
}

// ============================================================================
// UI Component Props
// ============================================================================

/**
 * Character Selector component props
 */
export interface CharacterSelectorProps {
  username: string;
  onCharacterSwitch?: (slotNumber: number) => void;
  onCharacterEdit?: (slotNumber: number) => void;
  onCharacterDelete?: (slotNumber: number) => void;
  onCharacterCreate?: (slotNumber: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Avatar Builder Integration component props
 */
export interface AvatarBuilderIntegrationProps {
  username: string;
  slotNumber: number;
  existingCharacter?: CharacterSlot | EmptyCharacterSlot;
  onSave?: (character: CharacterSlot) => void;
  onCancel?: () => void;
  isOpen: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * System constants
 */
export const AVATAR_SYSTEM_CONSTANTS = {
  /** Maximum number of character slots per user */
  MAX_SLOTS: 5,
  
  /** Maximum size per character slot (5MB) */
  MAX_SLOT_SIZE: 5 * 1024 * 1024,
  
  /** Maximum total size per user (25MB) */
  MAX_USER_SIZE: 25 * 1024 * 1024,
  
  /** localStorage key prefix */
  STORAGE_PREFIX: 'stargety_v2_',
  
  /** Character slot key template */
  SLOT_KEY_TEMPLATE: 'stargety_v2_character_{username}_slot_{slotNumber}',
  
  /** Active character key template */
  ACTIVE_KEY_TEMPLATE: 'stargety_v2_active_character_{username}',
  
  /** Metadata key template */
  METADATA_KEY_TEMPLATE: 'stargety_v2_character_metadata_{username}',
  
  /** Cache expiration time (7 days) */
  CACHE_EXPIRATION_MS: 7 * 24 * 60 * 60 * 1000,
  
  /** Default character name */
  DEFAULT_CHARACTER_NAME: 'New Character',
  
  /** Required animations */
  REQUIRED_ANIMATIONS: [
    AnimationCategory.IDLE,
    AnimationCategory.WALK_DOWN,
    AnimationCategory.WALK_LEFT,
    AnimationCategory.WALK_UP,
    AnimationCategory.WALK_RIGHT
  ] as const,
};

/**
 * Default sprite sheet requirements
 */
export const DEFAULT_SPRITE_SHEET_REQUIREMENTS: SpriteSheetRequirements = {
  requiredAnimations: [...AVATAR_SYSTEM_CONSTANTS.REQUIRED_ANIMATIONS],
  minFrames: 5,
  maxFrames: 256,
  maxFileSize: AVATAR_SYSTEM_CONSTANTS.MAX_SLOT_SIZE,
  allowedFormats: ['image/png', 'image/jpeg', 'image/webp']
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a character slot is empty
 */
export function isEmptySlot(slot: CharacterSlot | EmptyCharacterSlot): slot is EmptyCharacterSlot {
  return slot.isEmpty === true;
}

/**
 * Check if a character slot is filled
 */
export function isFilledSlot(slot: CharacterSlot | EmptyCharacterSlot): slot is CharacterSlot {
  return slot.isEmpty === false;
}

/**
 * Check if a slot number is valid (1-5)
 */
export function isValidSlotNumber(slotNumber: number): boolean {
  return Number.isInteger(slotNumber) && slotNumber >= 1 && slotNumber <= AVATAR_SYSTEM_CONSTANTS.MAX_SLOTS;
}

// Re-export validation types for convenience
export type { ValidationError, ValidationWarning };
