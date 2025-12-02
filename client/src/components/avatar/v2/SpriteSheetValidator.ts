/**
 * Sprite Sheet Validator V2
 * Comprehensive validation for sprite sheet definitions before saving to character slots
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import {
  SpriteSheetDefinition,
  AnimationCategory,
  FrameDefinition,
  AnimationMapping
} from '../AvatarBuilderTypes';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AVATAR_SYSTEM_CONSTANTS,
  DEFAULT_SPRITE_SHEET_REQUIREMENTS
} from './types';

/**
 * Detailed validation result with specific checks
 */
export interface DetailedValidationResult extends ValidationResult {
  /** Detailed breakdown of validation checks */
  details: {
    requiredAnimations: {
      passed: boolean;
      missing: AnimationCategory[];
      found: AnimationCategory[];
    };
    frames: {
      passed: boolean;
      count: number;
      minRequired: number;
      maxAllowed: number;
    };
    source: {
      passed: boolean;
      hasImageData: boolean;
      hasMetadata: boolean;
      fileSize: number;
      maxSize: number;
    };
    animations: {
      passed: boolean;
      count: number;
      validAnimations: number;
      invalidAnimations: string[];
    };
  };
}

/**
 * Sprite Sheet Validator
 * Validates sprite sheet definitions for character slots
 */
export class SpriteSheetValidator {
  
  /**
   * Validate sprite sheet definition
   */
  static validate(definition: SpriteSheetDefinition): DetailedValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Initialize details
    const details: DetailedValidationResult['details'] = {
      requiredAnimations: {
        passed: false,
        missing: [],
        found: []
      },
      frames: {
        passed: false,
        count: 0,
        minRequired: DEFAULT_SPRITE_SHEET_REQUIREMENTS.minFrames,
        maxAllowed: DEFAULT_SPRITE_SHEET_REQUIREMENTS.maxFrames
      },
      source: {
        passed: false,
        hasImageData: false,
        hasMetadata: false,
        fileSize: 0,
        maxSize: DEFAULT_SPRITE_SHEET_REQUIREMENTS.maxFileSize
      },
      animations: {
        passed: false,
        count: 0,
        validAnimations: 0,
        invalidAnimations: []
      }
    };

    // Check if definition exists
    if (!definition) {
      errors.push({
        type: 'spritesheet',
        code: 'MISSING_DEFINITION',
        message: 'Sprite sheet definition is missing',
        severity: 'error'
      });
      return this.buildResult(false, errors, warnings, details);
    }

    // Validate required animations
    const animationCheck = this.validateRequiredAnimations(definition);
    details.requiredAnimations = animationCheck;
    if (!animationCheck.passed) {
      errors.push({
        type: 'animation',
        code: 'MISSING_REQUIRED_ANIMATIONS',
        message: `Missing required animations: ${animationCheck.missing.join(', ')}`,
        severity: 'error'
      });
    }

    // Validate frames
    const frameCheck = this.validateFrames(definition);
    details.frames = frameCheck;
    if (!frameCheck.passed) {
      if (frameCheck.count < frameCheck.minRequired) {
        errors.push({
          type: 'frame',
          code: 'INSUFFICIENT_FRAMES',
          message: `Sprite sheet must have at least ${frameCheck.minRequired} frames (found ${frameCheck.count})`,
          severity: 'error'
        });
      }
      if (frameCheck.count > frameCheck.maxAllowed) {
        errors.push({
          type: 'frame',
          code: 'TOO_MANY_FRAMES',
          message: `Sprite sheet has too many frames: ${frameCheck.count} exceeds maximum of ${frameCheck.maxAllowed}`,
          severity: 'error'
        });
      }
    }

    // Validate source
    const sourceCheck = this.validateSource(definition);
    details.source = sourceCheck;
    if (!sourceCheck.passed) {
      if (!sourceCheck.hasImageData) {
        errors.push({
          type: 'spritesheet',
          code: 'MISSING_SOURCE_IMAGE',
          message: 'Sprite sheet source image is missing',
          severity: 'error'
        });
      }
      if (sourceCheck.fileSize > sourceCheck.maxSize) {
        errors.push({
          type: 'spritesheet',
          code: 'FILE_TOO_LARGE',
          message: `File size ${Math.round(sourceCheck.fileSize / 1024 / 1024)}MB exceeds maximum of ${Math.round(sourceCheck.maxSize / 1024 / 1024)}MB`,
          severity: 'error'
        });
      }
    }

    // Validate animations
    const animationsCheck = this.validateAnimations(definition);
    details.animations = animationsCheck;
    if (!animationsCheck.passed) {
      if (animationsCheck.invalidAnimations.length > 0) {
        warnings.push({
          type: 'animation',
          code: 'INVALID_ANIMATIONS',
          message: `Invalid animations: ${animationsCheck.invalidAnimations.join(', ')}`,
          severity: 'warning'
        });
      }
    }

    // Additional warnings
    if (frameCheck.count < 10) {
      warnings.push({
        type: 'frame',
        code: 'LOW_FRAME_COUNT',
        message: 'Sprite sheet has fewer than 10 frames - animations may be limited',
        severity: 'warning'
      });
    }

    if (!definition.name || definition.name.trim() === '') {
      warnings.push({
        type: 'spritesheet',
        code: 'EMPTY_NAME',
        message: 'Character name is empty',
        severity: 'warning'
      });
    }

    const isValid = errors.length === 0;

    return this.buildResult(isValid, errors, warnings, details);
  }

  /**
   * Validate required animations exist
   */
  private static validateRequiredAnimations(definition: SpriteSheetDefinition) {
    const missing: AnimationCategory[] = [];
    const found: AnimationCategory[] = [];

    AVATAR_SYSTEM_CONSTANTS.REQUIRED_ANIMATIONS.forEach(category => {
      const hasAnimation = definition.animations?.some(anim => anim.category === category);
      if (hasAnimation) {
        found.push(category);
      } else {
        missing.push(category);
      }
    });

    return {
      passed: missing.length === 0,
      missing,
      found
    };
  }

  /**
   * Validate frames
   */
  private static validateFrames(definition: SpriteSheetDefinition) {
    const count = definition.frames?.length || 0;
    const minRequired = DEFAULT_SPRITE_SHEET_REQUIREMENTS.minFrames;
    const maxAllowed = DEFAULT_SPRITE_SHEET_REQUIREMENTS.maxFrames;

    return {
      passed: count >= minRequired && count <= maxAllowed,
      count,
      minRequired,
      maxAllowed
    };
  }

  /**
   * Validate source image
   */
  private static validateSource(definition: SpriteSheetDefinition) {
    const hasImageData = !!(definition.source && definition.source.imageData);
    const hasMetadata = !!(definition.source && definition.source.originalDimensions);
    const fileSize = definition.source?.fileSize || 0;
    const maxSize = DEFAULT_SPRITE_SHEET_REQUIREMENTS.maxFileSize;

    return {
      passed: hasImageData && fileSize <= maxSize,
      hasImageData,
      hasMetadata,
      fileSize,
      maxSize
    };
  }

  /**
   * Validate animations
   */
  private static validateAnimations(definition: SpriteSheetDefinition) {
    const animations = definition.animations || [];
    const count = animations.length;
    let validAnimations = 0;
    const invalidAnimations: string[] = [];

    animations.forEach(anim => {
      const isValid = this.validateAnimation(anim, definition.frames || []);
      if (isValid) {
        validAnimations++;
      } else {
        invalidAnimations.push(anim.id);
      }
    });

    return {
      passed: invalidAnimations.length === 0,
      count,
      validAnimations,
      invalidAnimations
    };
  }

  /**
   * Validate a single animation
   */
  private static validateAnimation(animation: AnimationMapping, frames: FrameDefinition[]): boolean {
    // Check if animation has frames
    if (!animation.sequence || !animation.sequence.frameIds || animation.sequence.frameIds.length === 0) {
      return false;
    }

    // Check if all frame IDs exist
    const frameIds = new Set(frames.map(f => f.id));
    const allFramesExist = animation.sequence.frameIds.every(frameId => frameIds.has(frameId));

    return allFramesExist;
  }

  /**
   * Build validation result
   */
  private static buildResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    details: DetailedValidationResult['details']
  ): DetailedValidationResult {
    return {
      isValid,
      errors,
      warnings,
      checks: {
        hasRequiredAnimations: details.requiredAnimations.passed,
        hasThumbnail: true, // Thumbnail is generated, not validated here
        hasValidSpriteSheet: details.source.passed && details.frames.passed,
        withinSizeLimit: details.source.fileSize <= details.source.maxSize,
        hasValidName: true // Name is validated separately
      },
      details
    };
  }

  /**
   * Quick validation - returns only boolean
   */
  static isValid(definition: SpriteSheetDefinition): boolean {
    const result = this.validate(definition);
    return result.isValid;
  }

  /**
   * Get validation summary as string
   */
  static getValidationSummary(definition: SpriteSheetDefinition): string {
    const result = this.validate(definition);
    
    if (result.isValid) {
      return '✓ Sprite sheet is valid';
    }

    const summary: string[] = [];
    
    if (result.errors.length > 0) {
      summary.push('Errors:');
      result.errors.forEach(error => summary.push(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      summary.push('Warnings:');
      result.warnings.forEach(warning => summary.push(`  - ${warning}`));
    }

    return summary.join('\n');
  }

  /**
   * Validate character name
   */
  static validateCharacterName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim() === '') {
      return {
        isValid: false,
        error: 'Character name cannot be empty'
      };
    }

    if (name.length > 50) {
      return {
        isValid: false,
        error: 'Character name must be 50 characters or less'
      };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return {
        isValid: false,
        error: 'Character name contains invalid characters'
      };
    }

    return { isValid: true };
  }
}

export default SpriteSheetValidator;

