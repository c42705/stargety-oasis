import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Default map data structure matching SharedMapData interface
const defaultMapData = {
  interactiveAreas: [
    {
      id: 'meeting-room-1',
      name: 'Meeting Room',
      type: 'meeting-room',
      x: 1520,
      y: 919,
      width: 120,
      height: 80,
      color: '#4A90E2',
      description: 'Join the weekly team sync',
      actionType: 'jitsi',
      actionConfig: {
        autoJoinOnEntry: true,
        autoLeaveOnExit: true
      }
    },
    {
      id: 'presentation-hall-1',
      name: 'Presentation Hall',
      type: 'presentation-hall',
      x: 2000,
      y: 919,
      width: 140,
      height: 100,
      color: '#9B59B6',
      description: 'Watch presentations and demos',
      actionType: 'jitsi',
      actionConfig: {
        autoJoinOnEntry: true,
        autoLeaveOnExit: true
      }
    },
    {
      id: 'coffee-corner-1',
      name: 'Coffee Corner',
      type: 'coffee-corner',
      x: 4561,
      y: 2575,
      width: 100,
      height: 80,
      color: '#D2691E',
      description: 'Casual conversations',
      actionType: 'jitsi',
      actionConfig: {
        autoJoinOnEntry: true,
        autoLeaveOnExit: true
      }
    },
    {
      id: 'game-zone-1',
      name: 'Game Zone',
      type: 'game-zone',
      x: 5500,
      y: 1500,
      width: 120,
      height: 90,
      color: '#E74C3C',
      description: 'Fun and games',
      actionType: 'jitsi',
      actionConfig: {
        autoJoinOnEntry: true,
        autoLeaveOnExit: true
      }
    }
  ],
  impassableAreas: [
    {
      id: 'wall-1',
      x: 1200,
      y: 800,
      width: 80,
      height: 20,
      name: 'Wall Section'
    },
    {
      id: 'barrier-1',
      x: 3000,
      y: 1500,
      width: 60,
      height: 60,
      name: 'Barrier'
    }
  ],
  assets: [],
  worldDimensions: {
    width: 1920,
    height: 1080
  },
  backgroundImage: '/default-background.jpg',
  backgroundImageDimensions: {
    width: 1920,
    height: 1080
  },
  version: 1,
  lastModified: new Date().toISOString(),
  createdBy: 'system',
  metadata: {
    name: 'Stargety Oasis',
    description: 'Default Zep-style virtual office space',
    tags: ['default', 'office', 'zep-style'],
    isPublic: true
  },
  layers: [
    {
      id: 'background-layer',
      name: 'Background',
      type: 'background',
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 0,
      elements: []
    },
    {
      id: 'interactive-layer',
      name: 'Interactive Areas',
      type: 'interactive',
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      elements: []
    },
    {
      id: 'collision-layer',
      name: 'Collision Areas',
      type: 'collision',
      visible: true,
      locked: false,
      opacity: 0.7,
      zIndex: 2,
      elements: []
    }
  ],
  resources: []
};

// Default user settings
const defaultUserSettings = {
  theme: 'dark',
  jitsiServerUrl: null,
  editorPrefs: {
    gridSize: 32,
    snapToGrid: true,
    showGrid: true,
    showLabels: true
  }
};

/**
 * Load blob character sprite sheet from asset file
 * Converts the blob character.png to a V2 sprite sheet definition
 */
function loadBlobCharacterSpriteSheet(): any {
  try {
    // Path to blob character asset
    const assetPath = path.join(__dirname, '../../client/src/assets/blob character.png');

    if (!fs.existsSync(assetPath)) {
      console.warn('⚠️ Blob character asset not found at:', assetPath);
      return getDefaultFallbackSpriteSheet();
    }

    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(assetPath);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;

    // Create a V2 sprite sheet definition for the blob character
    // Assuming blob character is a simple sprite (adjust dimensions as needed)
    const now = new Date().toISOString();

    return {
      id: 'blob-character-sprite-sheet',
      name: 'Blob Character',
      description: 'Default blob character sprite',
      source: {
        id: 'blob-character-source',
        name: 'Blob Character Source',
        imageData: imageDataUrl,
        originalDimensions: { width: 128, height: 128 },
        format: 'image/png',
        fileSize: imageBuffer.length,
        uploadedAt: now
      },
      frames: [
        {
          id: 'blob-idle-0',
          name: 'Blob Idle',
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
            tags: ['idle', 'blob']
          },
          animationProperties: {
            category: 'IDLE',
            sequenceIndex: 0
          },
          createdAt: now,
          updatedAt: now
        }
      ],
      gridLayout: {
        frameWidth: 32,
        frameHeight: 32,
        spacing: { x: 0, y: 0 },
        margin: { x: 0, y: 0 }
      },
      animations: [
        {
          id: 'blob-idle',
          category: 'IDLE',
          name: 'Idle',
          description: 'Blob idle animation',
          sequence: {
            frameIds: ['blob-idle-0'],
            frameRate: 8,
            loop: true,
            duration: 1000
          },
          priority: 1,
          interruptible: true,
          transitions: {},
          createdAt: now,
          updatedAt: now
        }
      ],
      defaultSettings: {
        frameRate: 8,
        loop: true,
        category: 'IDLE'
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
      version: '2.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system'
    };
  } catch (error) {
    console.error('❌ Error loading blob character sprite sheet:', error);
    return getDefaultFallbackSpriteSheet();
  }
}

/**
 * Fallback sprite sheet if blob character cannot be loaded
 */
function getDefaultFallbackSpriteSheet(): any {
  const now = new Date().toISOString();
  const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  return {
    id: 'default-fallback-sprite-sheet',
    name: 'Default Character',
    description: 'Fallback default character sprite',
    source: {
      id: 'default-fallback-source',
      name: 'Default Fallback Source',
      imageData: placeholderImage,
      originalDimensions: { width: 32, height: 32 },
      format: 'image/png',
      fileSize: 1024,
      uploadedAt: now
    },
    frames: [
      {
        id: 'default-idle-0',
        name: 'Default Idle',
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
          category: 'IDLE',
          sequenceIndex: 0
        },
        createdAt: now,
        updatedAt: now
      }
    ],
    gridLayout: {
      frameWidth: 32,
      frameHeight: 32,
      spacing: { x: 0, y: 0 },
      margin: { x: 0, y: 0 }
    },
    animations: [
      {
        id: 'default-idle',
        category: 'IDLE',
        name: 'Idle',
        description: 'Default idle animation',
        sequence: {
          frameIds: ['default-idle-0'],
          frameRate: 8,
          loop: true,
          duration: 1000
        },
        priority: 1,
        interruptible: true,
        transitions: {},
        createdAt: now,
        updatedAt: now
      }
    ],
    defaultSettings: {
      frameRate: 8,
      loop: true,
      category: 'IDLE'
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
    version: '2.0.0',
    createdAt: now,
    updatedAt: now,
    createdBy: 'system'
  };
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Load blob character sprite sheet
  const blobCharacterSpriteSheet = loadBlobCharacterSpriteSheet();
  console.log('✅ Loaded blob character sprite sheet');

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@stargety.io' },
    update: {},
    create: {
      email: 'test@stargety.io',
      username: 'testuser',
      password: hashedPassword,
      avatarUrl: null
    }
  });
  console.log('✅ Created test user:', testUser.username);

  // Create user settings for test user
  await prisma.userSettings.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      theme: defaultUserSettings.theme,
      jitsiServerUrl: defaultUserSettings.jitsiServerUrl,
      editorPrefs: defaultUserSettings.editorPrefs
    }
  });
  console.log('✅ Created user settings for:', testUser.username);

  // Create default map
  const defaultMap = await prisma.map.upsert({
    where: { roomId: 'default' },
    update: { data: defaultMapData, version: 1 },
    create: {
      roomId: 'default',
      name: 'Stargety Oasis',
      data: defaultMapData,
      version: 1
    }
  });
  console.log('✅ Created default map:', defaultMap.name);

  // Create empty character slots for test user (5 slots)
  for (let slotNumber = 1; slotNumber <= 5; slotNumber++) {
    await prisma.character.upsert({
      where: {
        userId_slotNumber: {
          userId: testUser.id,
          slotNumber
        }
      },
      update: {},
      create: {
        userId: testUser.id,
        slotNumber,
        name: slotNumber === 1 ? 'Blob Character' : `Character ${slotNumber}`,
        spriteSheet: slotNumber === 1 ? blobCharacterSpriteSheet : {},
        isEmpty: slotNumber !== 1,
        thumbnailPath: null,
        texturePath: null
      }
    });
  }
  console.log('✅ Created 5 character slots for:', testUser.username);

  // Create active character state
  await prisma.activeCharacter.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      activeSlotNumber: 1
    }
  });
  console.log('✅ Set active character slot to 1');

  // Create default chat room
  await prisma.chatRoom.upsert({
    where: { roomId: 'general' },
    update: {},
    create: {
      roomId: 'general',
      name: 'General Chat',
      description: 'Main chat room for everyone',
      ownerId: testUser.id
    }
  });
  console.log('✅ Created general chat room');

  console.log('');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('Test credentials:');
  console.log('  Email: test@stargety.io');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

