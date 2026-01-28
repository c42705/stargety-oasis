"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.characterController = exports.CharacterController = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
// ============================================================================
// CHARACTER CONTROLLER
// ============================================================================
class CharacterController {
    // --------------------------------------------------------------------------
    // CHARACTER SLOTS CRUD
    // --------------------------------------------------------------------------
    /**
     * Get all character slots for a user (summaries for slot selection UI)
     */
    async listCharacterSlots(userId) {
        try {
            // Get all characters for user
            const characters = await prisma_1.prisma.character.findMany({
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
            const activeChar = await prisma_1.prisma.activeCharacter.findUnique({
                where: { userId },
            });
            const activeSlot = activeChar?.activeSlotNumber ?? 1;
            // Create map of existing slots
            const slotMap = new Map(characters.map((c) => [c.slotNumber, c]));
            // Build summary for all 5 slots (1-5)
            const summaries = [];
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
        }
        catch (error) {
            logger_1.logger.error('Error listing character slots:', error);
            return [];
        }
    }
    /**
     * Get a single character slot with full data
     */
    async getCharacterSlot(userId, slotNumber) {
        try {
            const character = await prisma_1.prisma.character.findUnique({
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
                spriteSheet: character.spriteSheet,
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
        }
        catch (error) {
            logger_1.logger.error(`Error getting character slot ${slotNumber}:`, error);
            return null;
        }
    }
    /**
     * Save/update a character slot
     */
    async saveCharacterSlot(userId, slotNumber, data) {
        try {
            const character = await prisma_1.prisma.character.upsert({
                where: { userId_slotNumber: { userId, slotNumber } },
                update: {
                    name: data.name,
                    spriteSheet: data.spriteSheet,
                    thumbnailPath: data.thumbnailPath,
                    texturePath: data.texturePath,
                    isEmpty: false,
                    lastUsed: new Date(),
                },
                create: {
                    userId,
                    slotNumber,
                    name: data.name,
                    spriteSheet: data.spriteSheet,
                    thumbnailPath: data.thumbnailPath,
                    texturePath: data.texturePath,
                    isEmpty: false,
                    lastUsed: new Date(),
                },
            });
            logger_1.logger.info(`Character slot ${slotNumber} saved for user ${userId}`);
            return {
                id: character.id,
                userId: character.userId,
                slotNumber: character.slotNumber,
                name: character.name,
                spriteSheet: character.spriteSheet,
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
        }
        catch (error) {
            logger_1.logger.error(`Error saving character slot ${slotNumber}:`, error);
            return null;
        }
    }
    /**
     * Delete/clear a character slot (resets to empty)
     */
    async deleteCharacterSlot(userId, slotNumber) {
        try {
            const character = await prisma_1.prisma.character.findUnique({
                where: { userId_slotNumber: { userId, slotNumber } },
            });
            if (!character) {
                return true; // Already empty
            }
            // Delete associated files
            if (character.thumbnailPath && fs_1.default.existsSync(character.thumbnailPath)) {
                fs_1.default.unlinkSync(character.thumbnailPath);
                logger_1.logger.debug(`Deleted thumbnail: ${character.thumbnailPath}`);
            }
            if (character.texturePath && fs_1.default.existsSync(character.texturePath)) {
                fs_1.default.unlinkSync(character.texturePath);
                logger_1.logger.debug(`Deleted texture: ${character.texturePath}`);
            }
            // Reset slot to empty state
            await prisma_1.prisma.character.update({
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
            logger_1.logger.info(`Character slot ${slotNumber} cleared for user ${userId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error deleting character slot ${slotNumber}:`, error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // ACTIVE CHARACTER MANAGEMENT
    // --------------------------------------------------------------------------
    /**
     * Get the active character slot for a user
     */
    async getActiveCharacter(userId) {
        try {
            const active = await prisma_1.prisma.activeCharacter.findUnique({
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
        }
        catch (error) {
            logger_1.logger.error('Error getting active character:', error);
            return { userId, activeSlotNumber: 1, lastSwitched: new Date() };
        }
    }
    /**
     * Set the active character slot for a user
     */
    async setActiveCharacter(userId, slotNumber) {
        try {
            if (slotNumber < 1 || slotNumber > 5) {
                logger_1.logger.warn(`Invalid slot number: ${slotNumber}`);
                return null;
            }
            const active = await prisma_1.prisma.activeCharacter.upsert({
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
            await prisma_1.prisma.character.updateMany({
                where: { userId, slotNumber },
                data: { lastUsed: new Date() },
            });
            logger_1.logger.info(`Active character set to slot ${slotNumber} for user ${userId}`);
            return {
                userId: active.userId,
                activeSlotNumber: active.activeSlotNumber,
                lastSwitched: active.lastSwitched,
            };
        }
        catch (error) {
            logger_1.logger.error('Error setting active character:', error);
            return null;
        }
    }
    // --------------------------------------------------------------------------
    // FILE UPLOAD HELPERS
    // --------------------------------------------------------------------------
    /**
     * Update character slot with uploaded file paths
     */
    async updateCharacterFiles(userId, slotNumber, files) {
        try {
            await prisma_1.prisma.character.update({
                where: { userId_slotNumber: { userId, slotNumber } },
                data: {
                    ...(files.thumbnailPath && { thumbnailPath: files.thumbnailPath }),
                    ...(files.texturePath && { texturePath: files.texturePath }),
                },
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error updating character files:', error);
            return false;
        }
    }
    /**
     * Get avatar sync data for a player's active character (for multiplayer sync)
     * Returns base64 sprite sheet or null if no active character
     */
    async getActiveCharacterAvatarSync(userId) {
        try {
            // Get active character slot for this user
            const activeChar = await prisma_1.prisma.activeCharacter.findUnique({
                where: { userId },
            });
            const activeSlotNumber = activeChar?.activeSlotNumber ?? 1;
            // Get the character from that slot
            const character = await prisma_1.prisma.character.findUnique({
                where: { userId_slotNumber: { userId, slotNumber: activeSlotNumber } },
            });
            // If no character or it's empty, return null
            if (!character || character.isEmpty) {
                logger_1.logger.debug(`[CharacterController] No active character for user ${userId}`);
                return null;
            }
            // Extract spriteSheet and return as AvatarSyncData
            const spriteSheet = character.spriteSheet;
            const frameWidth = spriteSheet?.gridLayout?.frameWidth || 32;
            const frameHeight = spriteSheet?.gridLayout?.frameHeight || 32;
            const spriteSheetImageData = spriteSheet?.source?.imageData || '';
            if (!spriteSheetImageData) {
                logger_1.logger.debug(`[CharacterController] No image data for active character of user ${userId}`);
                return null;
            }
            logger_1.logger.debug(`[CharacterController] Loaded avatar sync data for user ${userId}, character ${character.name}`);
            return {
                spriteSheetImageData,
                frameWidth,
                frameHeight,
                characterName: character.name,
            };
        }
        catch (error) {
            logger_1.logger.error(`[CharacterController] Error loading avatar sync data for user ${userId}:`, error);
            return null;
        }
    }
}
exports.CharacterController = CharacterController;
// Export singleton instance
exports.characterController = new CharacterController();
