/**
 * Avatar Builder Data Structures
 * Comprehensive type definitions for frame definitions, positions, and animation mappings
 */

// ============================================================================
// Core Data Structures
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rectangle extends Point, Dimensions {}

export interface Transform {
  rotation: number; // degrees
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
}

// ============================================================================
// Frame Definition System
// ============================================================================

export interface FrameDefinition {
  id: string;
  name?: string;
  
  // Position in source sprite sheet
  sourceRect: Rectangle;
  
  // Output dimensions (may differ from source if scaled)
  outputRect: Rectangle;
  
  // Transformations applied to this frame
  transform: Transform;
  
  // Frame metadata
  metadata: {
    isEmpty: boolean;
    hasTransparency: boolean;
    dominantColor?: string;
    contentBounds?: Rectangle; // Actual content within frame
    tags: string[]; // User-defined tags
  };
  
  // Animation properties
  animationProperties: {
    category?: AnimationCategory;
    sequenceIndex?: number; // Position in animation sequence
    duration?: number; // Frame duration in milliseconds
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  
  // Creation metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Animation System
// ============================================================================

export enum AnimationCategory {
  // Basic movement
  IDLE = 'idle',
  WALK_DOWN = 'walk_down',
  WALK_LEFT = 'walk_left',
  WALK_UP = 'walk_up',
  WALK_RIGHT = 'walk_right',
  
  // Advanced movement
  RUN_DOWN = 'run_down',
  RUN_LEFT = 'run_left',
  RUN_UP = 'run_up',
  RUN_RIGHT = 'run_right',
  
  // Actions
  JUMP = 'jump',
  FALL = 'fall',
  LAND = 'land',
  
  // Combat
  ATTACK_MELEE = 'attack_melee',
  ATTACK_RANGED = 'attack_ranged',
  ATTACK_MAGIC = 'attack_magic',
  DEFEND = 'defend',
  BLOCK = 'block',
  
  // Reactions
  HURT = 'hurt',
  DEATH = 'death',
  VICTORY = 'victory',
  
  // Interactions
  INTERACT = 'interact',
  PICKUP = 'pickup',
  USE_ITEM = 'use_item',
  
  // Emotions
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  
  // Special
  SPECIAL_1 = 'special_1',
  SPECIAL_2 = 'special_2',
  SPECIAL_3 = 'special_3',
  
  // Custom
  CUSTOM = 'custom'
}

export interface AnimationSequence {
  frameIds: string[];
  frameRate: number; // Frames per second
  loop: boolean;
  pingPong: boolean; // Play forward then backward
  startFrame?: number; // Start from specific frame index
  endFrame?: number; // End at specific frame index
}

export interface AnimationMapping {
  id: string;
  category: AnimationCategory;
  name: string;
  description?: string;
  
  // Animation sequence
  sequence: AnimationSequence;
  
  // Playback properties
  priority: number; // Higher priority animations can interrupt lower ones
  interruptible: boolean;
  
  // Transition properties
  transitions: {
    [key in AnimationCategory]?: {
      allowed: boolean;
      blendDuration?: number; // Milliseconds
      condition?: string; // JavaScript expression
    };
  };
  
  // Audio integration
  audio?: {
    soundEffects: Array<{
      frameIndex: number;
      soundId: string;
      volume: number;
    }>;
  };
  
  // Visual effects
  effects?: {
    particles: Array<{
      frameIndex: number;
      effectType: string;
      position: Point;
      duration: number;
    }>;
    
    screenShake?: {
      frameIndex: number;
      intensity: number;
      duration: number;
    };
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sprite Sheet Definition
// ============================================================================

export interface SpriteSheetSource {
  id: string;
  name: string;
  originalFile?: File;
  imageData: string; // base64 data URL
  originalDimensions: Dimensions;
  format: string; // MIME type
  fileSize: number;
  uploadedAt: string;
}

export interface GridLayout {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  spacing: Point; // Space between frames
  margin: Point; // Margin around entire grid
}

export interface SpriteSheetDefinition {
  id: string;
  name: string;
  description?: string;
  
  // Source image
  source: SpriteSheetSource;
  
  // Frame organization
  frames: FrameDefinition[];
  gridLayout?: GridLayout; // If using regular grid
  
  // Animation definitions
  animations: AnimationMapping[];
  
  // Default animation settings
  defaultSettings: {
    frameRate: number;
    loop: boolean;
    category: AnimationCategory;
  };
  
  // Validation status
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    lastValidated: string;
  };
  
  // Export settings
  exportSettings: {
    format: 'png' | 'jpeg' | 'webp';
    quality: number; // 0-1 for lossy formats
    optimization: boolean;
    includeMetadata: boolean;
  };
  
  // Version control
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // username
}

// ============================================================================
// Phaser.js Integration Types
// ============================================================================

export interface PhaserSpriteSheetConfig {
  textureKey: string;
  frameWidth: number;
  frameHeight: number;
  startFrame: number;
  endFrame: number;
  margin?: number;
  spacing?: number;
}

export interface PhaserAnimationConfig {
  key: string;
  frames: Array<{
    key: string;
    frame: number | string;
  }>;
  frameRate: number;
  repeat: number; // -1 for infinite
  yoyo?: boolean;
  delay?: number;
  repeatDelay?: number;
}

export interface PhaserIntegrationData {
  spriteSheetConfig: PhaserSpriteSheetConfig;
  animationConfigs: PhaserAnimationConfig[];
  textureData: string; // base64 sprite sheet
  metadata: {
    totalFrames: number;
    animationCount: number;
    textureSize: Dimensions;
  };
}

// ============================================================================
// User Interface Types
// ============================================================================

export interface UIState {
  currentTool: 'select' | 'crop' | 'resize' | 'rotate' | 'flip';
  selectedFrames: string[];
  currentAnimation?: string;
  previewPlaying: boolean;
  gridVisible: boolean;
  snapToGrid: boolean;
  zoomLevel: number;
  panOffset: Point;
}

export interface ToolSettings {
  crop: {
    aspectRatio?: number;
    snapToPixels: boolean;
  };
  
  resize: {
    maintainAspectRatio: boolean;
    algorithm: 'nearest' | 'bilinear';
  };
  
  rotate: {
    snapToAngles: boolean;
    backgroundColor: string;
  };
  
  grid: {
    size: number;
    color: string;
    opacity: number;
    visible: boolean;
  };
}

// ============================================================================
// Validation and Error Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'frame' | 'animation' | 'spritesheet' | 'export';
  code: string;
  message: string;
  frameId?: string;
  animationId?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning extends ValidationError {
  suggestion?: string;
  autoFixAvailable?: boolean;
}

// ============================================================================
// Storage and Persistence Types
// ============================================================================

export interface StorageMetadata {
  version: string;
  lastSaved: string;
  autoSaveEnabled: boolean;
  compressionEnabled: boolean;
}

export interface CharacterDefinition {
  spriteSheet: SpriteSheetDefinition;
  metadata: StorageMetadata;
  userPreferences: {
    defaultFrameRate: number;
    preferredExportFormat: string;
    autoValidation: boolean;
  };
}

export interface ExportOptions {
  format: 'json' | 'phaser' | 'unity' | 'godot';
  includeSource: boolean;
  includeMetadata: boolean;
  compression: boolean;
  optimization: boolean;
}

// ============================================================================
// Event System Types
// ============================================================================

export interface AvatarBuilderEvent {
  type: string;
  timestamp: number;
  data: any;
}

export interface FrameEvent extends AvatarBuilderEvent {
  type: 'frame:created' | 'frame:updated' | 'frame:deleted' | 'frame:selected';
  data: {
    frameId: string;
    frame?: FrameDefinition;
  };
}

export interface AnimationEvent extends AvatarBuilderEvent {
  type: 'animation:created' | 'animation:updated' | 'animation:deleted' | 'animation:played';
  data: {
    animationId: string;
    animation?: AnimationMapping;
  };
}

export interface SpriteSheetEvent extends AvatarBuilderEvent {
  type: 'spritesheet:loaded' | 'spritesheet:saved' | 'spritesheet:exported';
  data: {
    spriteSheetId: string;
    spriteSheet?: SpriteSheetDefinition;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================================
// Default Values and Constants
// ============================================================================

export const DEFAULT_FRAME_DEFINITION: Omit<FrameDefinition, 'id' | 'sourceRect' | 'outputRect'> = {
  transform: {
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipX: false,
    flipY: false
  },
  metadata: {
    isEmpty: false,
    hasTransparency: false,
    tags: []
  },
  animationProperties: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_ANIMATION_MAPPING: Omit<AnimationMapping, 'id' | 'category' | 'name' | 'sequence'> = {
  priority: 1,
  interruptible: true,
  transitions: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const REQUIRED_ANIMATIONS: AnimationCategory[] = [
  AnimationCategory.IDLE,
  AnimationCategory.WALK_DOWN,
  AnimationCategory.WALK_LEFT,
  AnimationCategory.WALK_UP,
  AnimationCategory.WALK_RIGHT
];

export const ANIMATION_FRAME_REQUIREMENTS: Record<AnimationCategory, { min: number; max: number; recommended: number }> = {
  [AnimationCategory.IDLE]: { min: 1, max: 8, recommended: 1 },
  [AnimationCategory.WALK_DOWN]: { min: 2, max: 8, recommended: 3 },
  [AnimationCategory.WALK_LEFT]: { min: 2, max: 8, recommended: 3 },
  [AnimationCategory.WALK_UP]: { min: 2, max: 8, recommended: 3 },
  [AnimationCategory.WALK_RIGHT]: { min: 2, max: 8, recommended: 3 },
  [AnimationCategory.RUN_DOWN]: { min: 2, max: 8, recommended: 4 },
  [AnimationCategory.RUN_LEFT]: { min: 2, max: 8, recommended: 4 },
  [AnimationCategory.RUN_UP]: { min: 2, max: 8, recommended: 4 },
  [AnimationCategory.RUN_RIGHT]: { min: 2, max: 8, recommended: 4 },
  [AnimationCategory.JUMP]: { min: 1, max: 6, recommended: 3 },
  [AnimationCategory.FALL]: { min: 1, max: 4, recommended: 2 },
  [AnimationCategory.LAND]: { min: 1, max: 4, recommended: 2 },
  [AnimationCategory.ATTACK_MELEE]: { min: 2, max: 12, recommended: 6 },
  [AnimationCategory.ATTACK_RANGED]: { min: 2, max: 10, recommended: 5 },
  [AnimationCategory.ATTACK_MAGIC]: { min: 3, max: 15, recommended: 8 },
  [AnimationCategory.DEFEND]: { min: 1, max: 6, recommended: 2 },
  [AnimationCategory.BLOCK]: { min: 1, max: 4, recommended: 2 },
  [AnimationCategory.HURT]: { min: 1, max: 6, recommended: 3 },
  [AnimationCategory.DEATH]: { min: 3, max: 12, recommended: 6 },
  [AnimationCategory.VICTORY]: { min: 2, max: 10, recommended: 5 },
  [AnimationCategory.INTERACT]: { min: 1, max: 8, recommended: 4 },
  [AnimationCategory.PICKUP]: { min: 2, max: 6, recommended: 3 },
  [AnimationCategory.USE_ITEM]: { min: 2, max: 8, recommended: 4 },
  [AnimationCategory.HAPPY]: { min: 1, max: 8, recommended: 3 },
  [AnimationCategory.SAD]: { min: 1, max: 6, recommended: 2 },
  [AnimationCategory.ANGRY]: { min: 1, max: 6, recommended: 3 },
  [AnimationCategory.SURPRISED]: { min: 1, max: 4, recommended: 2 },
  [AnimationCategory.SPECIAL_1]: { min: 1, max: 20, recommended: 8 },
  [AnimationCategory.SPECIAL_2]: { min: 1, max: 20, recommended: 8 },
  [AnimationCategory.SPECIAL_3]: { min: 1, max: 20, recommended: 8 },
  [AnimationCategory.CUSTOM]: { min: 1, max: 50, recommended: 5 }
};
