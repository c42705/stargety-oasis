import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
      description: 'Join the weekly team sync'
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
      description: 'Watch presentations and demos'
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
      description: 'Casual conversations'
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
      description: 'Fun and games'
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
    width: 7603,
    height: 3679
  },
  backgroundImage: '/default-background.jpg',
  backgroundImageDimensions: {
    width: 7603,
    height: 3679
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

// Default character sprite sheet template
const defaultSpriteSheet = {
  version: 2,
  layers: [],
  frameWidth: 32,
  frameHeight: 48,
  animations: {
    idle_down: { row: 0, frames: 1 },
    idle_left: { row: 1, frames: 1 },
    idle_right: { row: 2, frames: 1 },
    idle_up: { row: 3, frames: 1 },
    walk_down: { row: 0, frames: 4 },
    walk_left: { row: 1, frames: 4 },
    walk_right: { row: 2, frames: 4 },
    walk_up: { row: 3, frames: 4 }
  }
};

async function main() {
  console.log('🌱 Starting database seed...');

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
        name: slotNumber === 1 ? 'Default Character' : `Character ${slotNumber}`,
        spriteSheet: slotNumber === 1 ? defaultSpriteSheet : {},
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

  // Create sample Jitsi room mappings
  const jitsiMappings = [
    { areaId: 'meeting-room-1', jitsiRoomName: 'meeting-room-1', displayName: 'Meeting Room' },
    { areaId: 'presentation-hall-1', jitsiRoomName: 'presentation-hall-1', displayName: 'Presentation Hall' },
    { areaId: 'coffee-corner-1', jitsiRoomName: 'coffee-corner-1', displayName: 'Coffee Corner' },
    { areaId: 'game-zone-1', jitsiRoomName: 'game-zone-1', displayName: 'Game Zone' }
  ];

  for (const mapping of jitsiMappings) {
    await prisma.jitsiRoomMapping.upsert({
      where: { areaId: mapping.areaId },
      update: {},
      create: {
        areaId: mapping.areaId,
        jitsiRoomName: mapping.jitsiRoomName,
        displayName: mapping.displayName,
        isCustom: false
      }
    });
  }
  console.log('✅ Created', jitsiMappings.length, 'Jitsi room mappings');

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

