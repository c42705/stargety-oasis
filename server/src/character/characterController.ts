import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import fs from 'fs';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SpriteSheetDefinition {
  layers: unknown[];
  animations?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface CharacterSlotData {
  id: string;
  userId: string;
  slotNumber: number;
  name: string;
  spriteSheet: SpriteSheetDefinition;
  thumbnailUrl: string | null;
  textureUrl: string | null;
  isEmpty: boolean;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterSlotSummary {
  slotNumber: number;
  name: string;
  thumbnailUrl: string | null;
  isEmpty: boolean;
  isActive: boolean;
  lastUsed: Date | null;
}

export interface ActiveCharacterData {
  userId: string;
  activeSlotNumber: number;
  lastSwitched: Date;
}

// ============================================================================
// CHARACTER CONTROLLER
// ============================================================================

export class CharacterController {
  // --------------------------------------------------------------------------
  // CHARACTER SLOTS CRUD
  // --------------------------------------------------------------------------

  /**
   * Get all character slots for a user (summaries for slot selection UI)
   */
  async listCharacterSlots(userId: string): Promise<CharacterSlotSummary[]> {
    try {
      // Get all characters for user
      const characters = await prisma.character.findMany({
        where: { userId },
        orderBy: { slotNumber: 'asc' },
        select: {
          slotNumber: true,
          name: true,
          thumbnailPath: true,
          isEmpty: true,
          lastUsed: true,
        },
      });

      // Get active slot
      const activeChar = await prisma.activeCharacter.findUnique({
        where: { userId },
      });
      const activeSlot = activeChar?.activeSlotNumber ?? 1;

      // Create map of existing slots
      const slotMap = new Map(characters.map((c) => [c.slotNumber, c]));

      // Build summary for all 5 slots (1-5)
      const summaries: CharacterSlotSummary[] = [];
      for (let slot = 1; slot <= 5; slot++) {
        const char = slotMap.get(slot);
        summaries.push({
          slotNumber: slot,
          name: char?.name ?? `Character ${slot}`,
          thumbnailUrl: char?.thumbnailPath
            ? `/uploads/${char.thumbnailPath.split('/uploads/')[1] || char.thumbnailPath}`
            : null,
          isEmpty: char?.isEmpty ?? true,
          isActive: slot === activeSlot,
          lastUsed: char?.lastUsed ?? null,
        });
      }

      return summaries;
    } catch (error) {
      logger.error('Error listing character slots:', error);
      return [];
    }
  }

  /**
   * Get a single character slot with full data
   */
  async getCharacterSlot(userId: string, slotNumber: number): Promise<CharacterSlotData | null> {
    try {
      const character = await prisma.character.findUnique({
        where: { userId_slotNumber: { userId, slotNumber } },
      });

      if (!character) {
        // Return empty slot placeholder
        return {
          id: '',
          userId,
          slotNumber,
          name: `Character ${slotNumber}`,
          spriteSheet: { layers: [] },
          thumbnailUrl: null,
          textureUrl: null,
          isEmpty: true,
          lastUsed: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return {
        id: character.id,
        userId: character.userId,
        slotNumber: character.slotNumber,
        name: character.name,
        spriteSheet: character.spriteSheet as unknown as SpriteSheetDefinition,
        thumbnailUrl: character.thumbnailPath
          ? `/uploads/${character.thumbnailPath.split('/uploads/')[1] || character.thumbnailPath}`
          : null,
        textureUrl: character.texturePath
          ? `/uploads/${character.texturePath.split('/uploads/')[1] || character.texturePath}`
          : null,
        isEmpty: character.isEmpty,
        lastUsed: character.lastUsed,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      };
    } catch (error) {
      logger.error(`Error getting character slot ${slotNumber}:`, error);
      return null;
    }
  }

  /**
   * Save/update a character slot
   */
  async saveCharacterSlot(
    userId: string,
    slotNumber: number,
    data: {
      name: string;
      spriteSheet: SpriteSheetDefinition;
      thumbnailPath?: string;
      texturePath?: string;
    }
  ): Promise<CharacterSlotData | null> {
    try {
      const character = await prisma.character.upsert({
        where: { userId_slotNumber: { userId, slotNumber } },
        update: {
          name: data.name,
          spriteSheet: data.spriteSheet as object,
          thumbnailPath: data.thumbnailPath,
          texturePath: data.texturePath,
          isEmpty: false,
          lastUsed: new Date(),
        },
        create: {
          userId,
          slotNumber,
          name: data.name,
          spriteSheet: data.spriteSheet as object,
          thumbnailPath: data.thumbnailPath,
          texturePath: data.texturePath,
          isEmpty: false,
          lastUsed: new Date(),
        },
      });

      logger.info(`Character slot ${slotNumber} saved for user ${userId}`);

      return {
        id: character.id,
        userId: character.userId,
        slotNumber: character.slotNumber,
        name: character.name,
        spriteSheet: character.spriteSheet as unknown as SpriteSheetDefinition,
        thumbnailUrl: character.thumbnailPath
          ? `/uploads/${character.thumbnailPath.split('/uploads/')[1] || character.thumbnailPath}`
          : null,
        textureUrl: character.texturePath
          ? `/uploads/${character.texturePath.split('/uploads/')[1] || character.texturePath}`
          : null,
        isEmpty: character.isEmpty,
        lastUsed: character.lastUsed,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      };
    } catch (error) {
      logger.error(`Error saving character slot ${slotNumber}:`, error);
      return null;
    }
  }

  /**
   * Delete/clear a character slot (resets to empty)
   */
  async deleteCharacterSlot(userId: string, slotNumber: number): Promise<boolean> {
    try {
      const character = await prisma.character.findUnique({
        where: { userId_slotNumber: { userId, slotNumber } },
      });

      if (!character) {
        return true; // Already empty
      }

      // Delete associated files
      if (character.thumbnailPath && fs.existsSync(character.thumbnailPath)) {
        fs.unlinkSync(character.thumbnailPath);
        logger.debug(`Deleted thumbnail: ${character.thumbnailPath}`);
      }
      if (character.texturePath && fs.existsSync(character.texturePath)) {
        fs.unlinkSync(character.texturePath);
        logger.debug(`Deleted texture: ${character.texturePath}`);
      }

      // Reset slot to empty state
      await prisma.character.update({
        where: { userId_slotNumber: { userId, slotNumber } },
        data: {
          name: `Character ${slotNumber}`,
          spriteSheet: { layers: [] },
          thumbnailPath: null,
          texturePath: null,
          isEmpty: true,
          lastUsed: null,
        },
      });

      logger.info(`Character slot ${slotNumber} cleared for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting character slot ${slotNumber}:`, error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // ACTIVE CHARACTER MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get the active character slot for a user
   */
  async getActiveCharacter(userId: string): Promise<ActiveCharacterData> {
    try {
      const active = await prisma.activeCharacter.findUnique({
        where: { userId },
      });

      if (!active) {
        // Default to slot 1
        return {
          userId,
          activeSlotNumber: 1,
          lastSwitched: new Date(),
        };
      }

      return {
        userId: active.userId,
        activeSlotNumber: active.activeSlotNumber,
        lastSwitched: active.lastSwitched,
      };
    } catch (error) {
      logger.error('Error getting active character:', error);
      return { userId, activeSlotNumber: 1, lastSwitched: new Date() };
    }
  }

  /**
   * Set the active character slot for a user
   */
  async setActiveCharacter(userId: string, slotNumber: number): Promise<ActiveCharacterData | null> {
    try {
      if (slotNumber < 1 || slotNumber > 5) {
        logger.warn(`Invalid slot number: ${slotNumber}`);
        return null;
      }

      const active = await prisma.activeCharacter.upsert({
        where: { userId },
        update: {
          activeSlotNumber: slotNumber,
          lastSwitched: new Date(),
        },
        create: {
          userId,
          activeSlotNumber: slotNumber,
          lastSwitched: new Date(),
        },
      });

      // Also update lastUsed on the character slot
      await prisma.character.updateMany({
        where: { userId, slotNumber },
        data: { lastUsed: new Date() },
      });

      logger.info(`Active character set to slot ${slotNumber} for user ${userId}`);

      return {
        userId: active.userId,
        activeSlotNumber: active.activeSlotNumber,
        lastSwitched: active.lastSwitched,
      };
    } catch (error) {
      logger.error('Error setting active character:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // FILE UPLOAD HELPERS
  // --------------------------------------------------------------------------

  /**
   * Update character slot with uploaded file paths
   */
  async updateCharacterFiles(
    userId: string,
    slotNumber: number,
    files: { thumbnailPath?: string; texturePath?: string }
  ): Promise<boolean> {
    try {
      await prisma.character.update({
        where: { userId_slotNumber: { userId, slotNumber } },
        data: {
          ...(files.thumbnailPath && { thumbnailPath: files.thumbnailPath }),
          ...(files.texturePath && { texturePath: files.texturePath }),
        },
      });
      return true;
    } catch (error) {
      logger.error('Error updating character files:', error);
      return false;
    }
  }
}

// Export singleton instance
export const characterController = new CharacterController();

