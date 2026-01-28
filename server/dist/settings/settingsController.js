"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
// ============================================================================
// SETTINGS CONTROLLER
// ============================================================================
class SettingsController {
    // --------------------------------------------------------------------------
    // USER SETTINGS
    // --------------------------------------------------------------------------
    /**
     * Get user settings (creates default if not exists)
     */
    async getUserSettings(userId) {
        try {
            let settings = await prisma_1.prisma.userSettings.findUnique({
                where: { userId },
            });
            if (!settings) {
                // Create default settings
                settings = await prisma_1.prisma.userSettings.create({
                    data: {
                        userId,
                        theme: 'dark',
                        jitsiServerUrl: null,
                        editorPrefs: {
                            gridSize: 32,
                            snapToGrid: true,
                            showGrid: true,
                            gridOpacity: 0.3,
                        },
                    },
                });
                logger_1.logger.info(`Created default settings for user ${userId}`);
            }
            return {
                id: settings.id,
                userId: settings.userId,
                theme: settings.theme,
                jitsiServerUrl: settings.jitsiServerUrl,
                editorPrefs: settings.editorPrefs,
                createdAt: settings.createdAt,
                updatedAt: settings.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user settings:', error);
            // Return sensible defaults on error
            return {
                id: '',
                userId,
                theme: 'dark',
                jitsiServerUrl: null,
                editorPrefs: { gridSize: 32, snapToGrid: true, showGrid: true },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
    }
    /**
     * Update user settings (creates if not exists)
     */
    async updateUserSettings(userId, data) {
        try {
            const settings = await prisma_1.prisma.userSettings.upsert({
                where: { userId },
                update: {
                    ...(data.theme !== undefined && { theme: data.theme }),
                    ...(data.jitsiServerUrl !== undefined && { jitsiServerUrl: data.jitsiServerUrl }),
                    ...(data.editorPrefs !== undefined && { editorPrefs: data.editorPrefs }),
                },
                create: {
                    userId,
                    theme: data.theme ?? 'dark',
                    jitsiServerUrl: data.jitsiServerUrl ?? null,
                    editorPrefs: data.editorPrefs ?? {
                        gridSize: 32,
                        snapToGrid: true,
                        showGrid: true,
                    },
                },
            });
            logger_1.logger.info(`Updated settings for user ${userId}`);
            return {
                id: settings.id,
                userId: settings.userId,
                theme: settings.theme,
                jitsiServerUrl: settings.jitsiServerUrl,
                editorPrefs: settings.editorPrefs,
                createdAt: settings.createdAt,
                updatedAt: settings.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating user settings:', error);
            return null;
        }
    }
    // --------------------------------------------------------------------------
    // PLAYER POSITION (Ephemeral State)
    // --------------------------------------------------------------------------
    /**
     * Get player position by session ID
     */
    async getPlayerPosition(sessionId) {
        try {
            const position = await prisma_1.prisma.playerPosition.findUnique({
                where: { sessionId },
            });
            if (!position) {
                // Return default position
                return {
                    id: '',
                    sessionId,
                    userId: null,
                    roomId: 'default',
                    x: 400,
                    y: 300,
                    direction: 'down',
                    updatedAt: new Date(),
                };
            }
            return {
                id: position.id,
                sessionId: position.sessionId,
                userId: position.userId,
                roomId: position.roomId,
                x: position.x,
                y: position.y,
                direction: position.direction,
                updatedAt: position.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting player position:', error);
            return null;
        }
    }
    /**
     * Update player position (creates if not exists)
     */
    async updatePlayerPosition(sessionId, data) {
        try {
            const position = await prisma_1.prisma.playerPosition.upsert({
                where: { sessionId },
                update: {
                    ...(data.userId !== undefined && { userId: data.userId }),
                    ...(data.roomId !== undefined && { roomId: data.roomId }),
                    ...(data.x !== undefined && { x: data.x }),
                    ...(data.y !== undefined && { y: data.y }),
                    ...(data.direction !== undefined && { direction: data.direction }),
                },
                create: {
                    sessionId,
                    userId: data.userId ?? null,
                    roomId: data.roomId ?? 'default',
                    x: data.x ?? 400,
                    y: data.y ?? 300,
                    direction: data.direction ?? 'down',
                },
            });
            return {
                id: position.id,
                sessionId: position.sessionId,
                userId: position.userId,
                roomId: position.roomId,
                x: position.x,
                y: position.y,
                direction: position.direction,
                updatedAt: position.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating player position:', error);
            return null;
        }
    }
    /**
     * Delete player position (on disconnect)
     */
    async deletePlayerPosition(sessionId) {
        try {
            await prisma_1.prisma.playerPosition.delete({
                where: { sessionId },
            });
            return true;
        }
        catch (error) {
            // Ignore not found errors
            return false;
        }
    }
    /**
     * Get all players in a room
     */
    async getPlayersInRoom(roomId) {
        try {
            const positions = await prisma_1.prisma.playerPosition.findMany({
                where: { roomId },
            });
            return positions.map((p) => ({
                id: p.id,
                sessionId: p.sessionId,
                userId: p.userId,
                roomId: p.roomId,
                x: p.x,
                y: p.y,
                direction: p.direction,
                updatedAt: p.updatedAt,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting players in room:', error);
            return [];
        }
    }
    /**
     * Cleanup stale positions (older than 1 hour)
     */
    async cleanupStalePositions() {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const result = await prisma_1.prisma.playerPosition.deleteMany({
                where: {
                    updatedAt: { lt: oneHourAgo },
                },
            });
            if (result.count > 0) {
                logger_1.logger.info(`Cleaned up ${result.count} stale player positions`);
            }
            return result.count;
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up stale positions:', error);
            return 0;
        }
    }
}
exports.SettingsController = SettingsController;
// Export singleton instance
exports.settingsController = new SettingsController();
