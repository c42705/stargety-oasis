/**
 * Default Sprite Sheets Registry
 * Catalog of pre-made sprite sheet templates for quick character creation
 *
 * @version 2.0.0
 * @date 2025-11-06
 */

import {
  SpriteSheetDefinition,
  SpriteSheetSource,
  FrameDefinition,
  AnimationMapping,
  AnimationCategory,
  AnimationSequence
} from '../AvatarBuilderTypes';

/**
 * Template category
 */
export type TemplateCategory = 'basic' | 'fantasy' | 'modern' | 'themed';

/**
 * Default sprite sheet template with metadata
 */
export interface DefaultSpriteSheetTemplate {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Brief description */
  description: string;

  /** Category */
  category: TemplateCategory;

  /** Search tags */
  tags: string[];

  /** Creator/source */
  author: string;

  /** License type */
  license: string;

  /** Preview thumbnail URL */
  thumbnailUrl: string;

  /** The actual sprite sheet definition */
  spriteSheet: SpriteSheetDefinition;

  /** Usage count (for sorting by popularity) */
  popularity: number;

  /** Show in featured section */
  featured: boolean;
}

/**
 * Helper function to create a minimal valid sprite sheet definition
 */
function createDefaultSpriteSheet(): SpriteSheetDefinition {
  const now = new Date().toISOString();
  const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // Create source
  const source: SpriteSheetSource = {
    id: 'default-source',
    name: 'Default Character Source',
    imageData: placeholderImage,
    originalDimensions: { width: 128, height: 128 },
    format: 'image/png',
    fileSize: 1024,
    uploadedAt: now
  };

  // Create frames (minimal - just one idle frame)
  const frames: FrameDefinition[] = [{
    id: 'frame-0',
    name: 'Idle Frame 0',
    sourceRect: { x: 0, y: 0, width: 32, height: 32 },
    outputRect: { x: 0, y: 0, width: 32, height: 32 },
    transform: {
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
      flipY: false
    },
    metadata: {
      isEmpty: false,
      hasTransparency: true,
      tags: ['idle']
    },
    animationProperties: {
      category: AnimationCategory.IDLE,
      sequenceIndex: 0
    },
    createdAt: now,
    updatedAt: now
  }];

  // Create animations
  const idleSequence: AnimationSequence = {
    frameIds: ['frame-0'],
    frameRate: 8,
    loop: true,
    pingPong: false
  };

  const animations: AnimationMapping[] = [{
    id: 'anim-idle',
    category: AnimationCategory.IDLE,
    name: 'Idle',
    description: 'Default idle animation',
    sequence: idleSequence,
    priority: 1,
    interruptible: true,
    transitions: {},
    createdAt: now,
    updatedAt: now
  }];

  return {
    id: 'default-sprite-sheet',
    name: 'Default Character',
    description: 'Default character sprite sheet',
    source,
    frames,
    animations,
    defaultSettings: {
      frameRate: 8,
      loop: true,
      category: AnimationCategory.IDLE
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      lastValidated: now
    },
    exportSettings: {
      format: 'png',
      quality: 1,
      optimization: false,
      includeMetadata: true
    },
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system'
  };
}

/**
 * Default Sprite Sheets Registry
 * Central catalog of all available default templates
 */
export class DefaultSpriteSheets {
  /**
   * All available default templates
   */
  private static readonly templates: DefaultSpriteSheetTemplate[] = [
    // Basic Category - Default Character
    {
      id: 'default-character',
      name: 'Default Character',
      description: 'A simple, versatile character suitable for most uses',
      category: 'basic',
      tags: ['default', 'basic', 'neutral', 'simple'],
      author: 'System',
      license: 'MIT',
      thumbnailUrl: '', // Will be generated
      featured: true,
      popularity: 1000,
      spriteSheet: createDefaultSpriteSheet()
    },

    // TODO: Add more templates in future phases
    // - Default Female
    // - Default Neutral
    // - Warrior (fantasy)
    // - Mage (fantasy)
    // - Casual (modern)
    // - Business (modern)
    // - Sci-Fi (themed)
  ];

  /**
   * Get all available templates
   */
  static getAllTemplates(): DefaultSpriteSheetTemplate[] {
    return [...this.templates];
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: TemplateCategory): DefaultSpriteSheetTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Get featured templates
   */
  static getFeaturedTemplates(): DefaultSpriteSheetTemplate[] {
    return this.templates.filter(t => t.featured);
  }

  /**
   * Get template by ID
   */
  static getTemplateById(id: string): DefaultSpriteSheetTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  /**
   * Search templates by name or tags
   */
  static searchTemplates(query: string): DefaultSpriteSheetTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get most popular templates
   */
  static getPopularTemplates(limit: number = 5): DefaultSpriteSheetTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Get default template (fallback)
   * This is the template used for migrations and when no template is selected
   */
  static getDefaultTemplate(): DefaultSpriteSheetTemplate {
    return this.templates[0]; // Default Character
  }

  /**
   * Increment template usage count
   */
  static incrementPopularity(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      template.popularity++;
    }
  }

  /**
   * Get all categories
   */
  static getCategories(): TemplateCategory[] {
    return ['basic', 'fantasy', 'modern', 'themed'];
  }

  /**
   * Get category display name
   */
  static getCategoryName(category: TemplateCategory): string {
    const names: Record<TemplateCategory, string> = {
      basic: 'Basic Characters',
      fantasy: 'Fantasy Characters',
      modern: 'Modern Characters',
      themed: 'Themed Characters'
    };
    return names[category];
  }

  /**
   * Get category description
   */
  static getCategoryDescription(category: TemplateCategory): string {
    const descriptions: Record<TemplateCategory, string> = {
      basic: 'Simple, versatile characters suitable for most uses',
      fantasy: 'RPG-style characters for gaming and fantasy themes',
      modern: 'Contemporary characters with modern styling',
      themed: 'Special themed characters for unique aesthetics'
    };
    return descriptions[category];
  }
}
