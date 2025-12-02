/**
 * Avatar System V2 - Public API
 * Export all public components, utilities, and types
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

// Core Types
export * from './types';

// Storage
export { CharacterStorage } from './CharacterStorage';

// Components
export { AvatarBuilderIntegration } from './AvatarBuilderIntegration';
export { CharacterSelector } from './CharacterSelector';

// Renderer
export { AvatarRenderer, default as AvatarRendererDefault } from './AvatarRenderer';

// Utilities
export { ThumbnailGenerator } from './ThumbnailGenerator';
export type { ThumbnailOptions, ThumbnailResult } from './ThumbnailGenerator';

export { SpriteSheetValidator } from './SpriteSheetValidator';
export type { DetailedValidationResult } from './SpriteSheetValidator';

// Migration
export { MigrationDetector } from './MigrationDetector';
export type { MigrationDetectionResult } from './MigrationDetector';

export { MigrationConverter } from './MigrationConverter';
export type { CharacterMigrationResult, MigrationResult } from './MigrationConverter';

export { MigrationModal } from './MigrationModal';
export type { MigrationModalProps } from './MigrationModal';

// Default Templates
export { DefaultSpriteSheets } from './DefaultSpriteSheets';
export type { DefaultSpriteSheetTemplate, TemplateCategory } from './DefaultSpriteSheets';

export { TemplateSelectorModal } from './TemplateSelectorModal';
export type { TemplateSelectorModalProps } from './TemplateSelectorModal';

// Preview
export { CharacterPreviewModal } from './CharacterPreviewModal';
export type { CharacterPreviewModalProps } from './CharacterPreviewModal';

// Performance Monitoring
export { PerformanceMonitor } from './PerformanceMonitor';
export type { PerformanceMetric, PerformanceStats, MemorySnapshot } from './PerformanceMonitor';

// Texture Cache
export { TextureCache } from './TextureCache';
export type { CacheEntry, CacheStats } from './TextureCache';

