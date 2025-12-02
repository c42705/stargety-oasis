/**
 * Comprehensive Avatar Builder Test Suite
 * Tests all core functionality including upload, frame definition, animation mapping, and preview
 */

import { SpriteSheetProcessor } from '../SpriteSheetProcessor';
import { FrameDetectionAlgorithms } from '../FrameDetectionAlgorithms';
import { CanvasManipulationTools } from '../CanvasManipulationTools';
import { PhaserIntegrationAdapter } from '../PhaserIntegrationAdapter';
import { AvatarBuilderStorage } from '../AvatarBuilderStorage';
import { 
  SpriteSheetDefinition, 
  FrameDefinition, 
  AnimationMapping, 
  AnimationCategory 
} from '../AvatarBuilderTypes';

// Mock canvas and image APIs for testing
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(400) })),
  putImageData: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
}));

global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');
global.HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['test'], { type: 'image/png' }));
});

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  width = 384;
  height = 384;
  naturalWidth = 384;
  naturalHeight = 384;
  crossOrigin = '';

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

// Mock File API
global.FileReader = class {
  onload: ((event: any) => void) | null = null;
  onerror: (() => void) | null = null;
  result = 'data:image/png;base64,test';

  readAsDataURL() {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
} as any;

describe('SpriteSheetProcessor', () => {
  test('should load valid image file', async () => {
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    const result = await SpriteSheetProcessor.loadImage(mockFile);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('should reject invalid file format', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = await SpriteSheetProcessor.loadImage(mockFile);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported format');
  });

  test('should extract image metadata', () => {
    const mockImg = new Image();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    const metadata = SpriteSheetProcessor.extractMetadata(mockImg, mockFile);
    
    expect(metadata.originalDimensions).toEqual({ width: 384, height: 384 });
    expect(metadata.format).toBe('image/png');
  });

  test('should extract region from image', () => {
    const mockImg = new Image();
    const result = SpriteSheetProcessor.extractRegion(mockImg, 0, 0, 128, 128);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('should validate region bounds', () => {
    const mockImg = new Image();
    const result = SpriteSheetProcessor.extractRegion(mockImg, 500, 500, 128, 128);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds source bounds');
  });
});

describe('FrameDetectionAlgorithms', () => {
  test('should detect frames in sprite sheet', async () => {
    const mockImg = new Image();
    const result = await FrameDetectionAlgorithms.detectFrames(mockImg);
    
    expect(result.success).toBe(true);
    expect(result.data?.suggestions).toBeDefined();
    expect(result.data?.suggestions.length).toBeGreaterThan(0);
  });

  test('should validate grid suggestions', () => {
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 384;
    mockCanvas.height = 384;
    
    const suggestion = {
      columns: 3,
      rows: 3,
      frameWidth: 128,
      frameHeight: 128,
      confidence: 0.8,
      method: 'test',
      totalFrames: 9
    };
    
    const validation = FrameDetectionAlgorithms.validateGridSuggestion(mockCanvas, suggestion);
    
    expect(validation.isValid).toBeDefined();
    expect(validation.contentFrames).toBeDefined();
    expect(validation.emptyFrames).toBeDefined();
  });
});

describe('CanvasManipulationTools', () => {
  test('should crop image correctly', () => {
    const mockImg = new Image();
    const cropOperation = { x: 0, y: 0, width: 128, height: 128 };
    
    const result = CanvasManipulationTools.cropAdvanced(mockImg, cropOperation);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('should resize image with aspect ratio', () => {
    const mockImg = new Image();
    const resizeOperation = {
      width: 256,
      height: 256,
      algorithm: 'bilinear' as const,
      maintainAspectRatio: true
    };
    
    const result = CanvasManipulationTools.resizeAdvanced(mockImg, resizeOperation);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('should rotate image', () => {
    const mockImg = new Image();
    const rotateOperation = { degrees: 90 };
    
    const result = CanvasManipulationTools.rotateAdvanced(mockImg, rotateOperation);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('should extract multiple frames', () => {
    const mockImg = new Image();
    const frameDefinitions = [
      { id: 'frame1', x: 0, y: 0, width: 128, height: 128 },
      { id: 'frame2', x: 128, y: 0, width: 128, height: 128 }
    ];
    
    const result = CanvasManipulationTools.extractFrames(mockImg, frameDefinitions);
    
    expect(result.success).toBe(true);
    expect(result.data?.size).toBe(2);
  });

  test('should handle batch operations', () => {
    const mockImg = new Image();
    const operations = [
      { type: 'crop' as const, parameters: { x: 0, y: 0, width: 200, height: 200 } },
      { type: 'resize' as const, parameters: { width: 128, height: 128, algorithm: 'nearest' as const } }
    ];
    
    const result = CanvasManipulationTools.batchProcess(mockImg, operations);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe('PhaserIntegrationAdapter', () => {
  const mockSpriteSheetDefinition: SpriteSheetDefinition = {
    id: 'test-avatar',
    name: 'Test Avatar',
    source: {
      id: 'test-source',
      name: 'test.png',
      imageData: 'data:image/png;base64,test',
      originalDimensions: { width: 384, height: 384 },
      format: 'image/png',
      fileSize: 1024,
      uploadedAt: new Date().toISOString()
    },
    frames: [
      {
        id: 'frame1',
        sourceRect: { x: 0, y: 0, width: 128, height: 128 },
        outputRect: { x: 0, y: 0, width: 128, height: 128 },
        transform: { rotation: 0, scaleX: 1, scaleY: 1, flipX: false, flipY: false },
        metadata: { isEmpty: false, hasTransparency: false, tags: [] },
        animationProperties: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    animations: [
      {
        id: 'idle',
        category: AnimationCategory.IDLE,
        name: 'Idle',
        sequence: { frameIds: ['frame1'], frameRate: 1, loop: true, pingPong: false },
        priority: 1,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    defaultSettings: { frameRate: 8, loop: true, category: AnimationCategory.IDLE },
    validation: { isValid: true, errors: [], warnings: [], lastValidated: new Date().toISOString() },
    exportSettings: { format: 'png', quality: 1, optimization: true, includeMetadata: true },
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'testuser'
  };

  test('should convert to Phaser format', () => {
    const result = PhaserIntegrationAdapter.convertToPhaser(mockSpriteSheetDefinition);
    
    expect(result.isCompatible).toBe(true);
    expect(result.adaptedData).toBeDefined();
    expect(result.adaptedData?.spriteSheetConfig).toBeDefined();
    expect(result.adaptedData?.animationConfigs).toBeDefined();
  });

  test('should validate required animations', () => {
    const validation = PhaserIntegrationAdapter.validateRequiredAnimations(mockSpriteSheetDefinition);
    
    expect(validation.isValid).toBeDefined();
    expect(validation.missing).toBeDefined();
  });

  test('should generate fallback animations', () => {
    const fallbacks = PhaserIntegrationAdapter.generateFallbackAnimations(mockSpriteSheetDefinition);
    
    expect(Array.isArray(fallbacks)).toBe(true);
  });
});

describe('AvatarBuilderStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should save character definition', () => {
    const result = AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    expect(result.success).toBe(true);
  });

  test('should load character definition', () => {
    // First save
    AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    // Then load
    const result = AvatarBuilderStorage.loadCharacterDefinition('testuser');
    
    expect(result.success).toBe(true);
    expect(result.data?.spriteSheet.id).toBe('test-avatar');
  });

  test('should list saved characters', () => {
    AvatarBuilderStorage.saveCharacterDefinition('user1', mockSpriteSheetDefinition);
    AvatarBuilderStorage.saveCharacterDefinition('user2', mockSpriteSheetDefinition);
    
    const result = AvatarBuilderStorage.listSavedCharacters();
    
    expect(result.success).toBe(true);
    expect(result.data?.length).toBe(2);
    expect(result.data).toContain('user1');
    expect(result.data).toContain('user2');
  });

  test('should delete character definition', () => {
    AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    const deleteResult = AvatarBuilderStorage.deleteCharacterDefinition('testuser');
    expect(deleteResult.success).toBe(true);
    
    const loadResult = AvatarBuilderStorage.loadCharacterDefinition('testuser');
    expect(loadResult.success).toBe(false);
  });

  test('should export character definition', () => {
    AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    const result = AvatarBuilderStorage.exportCharacterDefinition('testuser');
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(() => JSON.parse(result.data!)).not.toThrow();
  });

  test('should import character definition', () => {
    const exportResult = AvatarBuilderStorage.exportCharacterDefinition('testuser');
    if (exportResult.success && exportResult.data) {
      const importResult = AvatarBuilderStorage.importCharacterDefinition(exportResult.data, 'newuser');
      
      expect(importResult.success).toBe(true);
      expect(importResult.data?.createdBy).toBe('newuser');
    }
  });

  test('should get storage statistics', () => {
    AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    const stats = AvatarBuilderStorage.getStorageStats();
    
    expect(stats.totalCharacters).toBe(1);
    expect(stats.totalSize).toBeGreaterThan(0);
    expect(stats.storageUsed).toBeGreaterThanOrEqual(0);
  });

  test('should clear all data', () => {
    AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    
    const clearResult = AvatarBuilderStorage.clearAllData();
    expect(clearResult.success).toBe(true);
    
    const listResult = AvatarBuilderStorage.listSavedCharacters();
    expect(listResult.data?.length).toBe(0);
  });
});

describe('Integration Tests', () => {
  test('should complete full avatar creation workflow', async () => {
    // 1. Load image
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    const loadResult = await SpriteSheetProcessor.loadImage(mockFile);
    expect(loadResult.success).toBe(true);

    // 2. Detect frames
    if (loadResult.data) {
      const detectionResult = await FrameDetectionAlgorithms.detectFrames(loadResult.data);
      expect(detectionResult.success).toBe(true);
    }

    // 3. Save character
    const saveResult = AvatarBuilderStorage.saveCharacterDefinition('testuser', mockSpriteSheetDefinition);
    expect(saveResult.success).toBe(true);

    // 4. Convert to Phaser format
    const conversionResult = PhaserIntegrationAdapter.convertToPhaser(mockSpriteSheetDefinition);
    expect(conversionResult.isCompatible).toBe(true);
  });

  test('should handle error cases gracefully', async () => {
    // Test invalid file
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const loadResult = await SpriteSheetProcessor.loadImage(invalidFile);
    expect(loadResult.success).toBe(false);

    // Test loading non-existent character
    const loadCharResult = AvatarBuilderStorage.loadCharacterDefinition('nonexistent');
    expect(loadCharResult.success).toBe(false);

    // Test invalid sprite sheet definition
    const invalidDefinition = { ...mockSpriteSheetDefinition, frames: [] };
    const conversionResult = PhaserIntegrationAdapter.convertToPhaser(invalidDefinition);
    expect(conversionResult.isCompatible).toBe(false);
  });
});
