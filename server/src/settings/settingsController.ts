import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EditorPrefs {
  gridSize?: number;
  snapToGrid?: boolean;
  showGrid?: boolean;
  gridOpacity?: number;
  viewportPrefs?: Record<string, unknown>;
  toolPrefs?: Record<string, unknown>;
}

export interface UserSettingsData {
  id: string;
  userId: string;
  theme: string;
  jitsiServerUrl: string | null;
  editorPrefs: EditorPrefs | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JitsiMappingData {
  id: string;
  areaId: string;
  jitsiRoomName: string;
  displayName: string | null;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerPositionData {
  id: string;
  sessionId: string;
  userId: string | null;
  roomId: string;
  x: number;
  y: number;
  direction: string;
  updatedAt: Date;
}

// ============================================================================
// SETTINGS CONTROLLER
// ============================================================================

export class SettingsController {
  // --------------------------------------------------------------------------
  // USER SETTINGS
  // --------------------------------------------------------------------------

  /**
   * Get user settings (creates default if not exists)
   */
  async getUserSettings(userId: string): Promise<UserSettingsData> {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        // Create default settings
        settings = await prisma.userSettings.create({
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
        logger.info(`Created default settings for user ${userId}`);
      }

      return {
        id: settings.id,
        userId: settings.userId,
        theme: settings.theme,
        jitsiServerUrl: settings.jitsiServerUrl,
        editorPrefs: settings.editorPrefs as EditorPrefs | null,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting user settings:', error);
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
  async updateUserSettings(
    userId: string,
    data: {
      theme?: string;
      jitsiServerUrl?: string | null;
      editorPrefs?: EditorPrefs;
    }
  ): Promise<UserSettingsData | null> {
    try {
      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          ...(data.theme !== undefined && { theme: data.theme }),
          ...(data.jitsiServerUrl !== undefined && { jitsiServerUrl: data.jitsiServerUrl }),
          ...(data.editorPrefs !== undefined && { editorPrefs: data.editorPrefs as object }),
        },
        create: {
          userId,
          theme: data.theme ?? 'dark',
          jitsiServerUrl: data.jitsiServerUrl ?? null,
          editorPrefs: (data.editorPrefs as object) ?? {
            gridSize: 32,
            snapToGrid: true,
            showGrid: true,
          },
        },
      });

      logger.info(`Updated settings for user ${userId}`);

      return {
        id: settings.id,
        userId: settings.userId,
        theme: settings.theme,
        jitsiServerUrl: settings.jitsiServerUrl,
        editorPrefs: settings.editorPrefs as EditorPrefs | null,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      };
    } catch (error) {
      logger.error('Error updating user settings:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // JITSI ROOM MAPPINGS
  // --------------------------------------------------------------------------

  /**
   * Get all Jitsi room mappings
   */
  async listJitsiMappings(): Promise<JitsiMappingData[]> {
    try {
      const mappings = await prisma.jitsiRoomMapping.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return mappings.map((m) => ({
        id: m.id,
        areaId: m.areaId,
        jitsiRoomName: m.jitsiRoomName,
        displayName: m.displayName,
        isCustom: m.isCustom,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    } catch (error) {
      logger.error('Error listing Jitsi mappings:', error);
      return [];
    }
  }

  /**
   * Get Jitsi mapping by area ID
   */
  async getJitsiMappingByArea(areaId: string): Promise<JitsiMappingData | null> {
    try {
      const mapping = await prisma.jitsiRoomMapping.findUnique({
        where: { areaId },
      });
      if (!mapping) return null;
      return {
        id: mapping.id,
        areaId: mapping.areaId,
        jitsiRoomName: mapping.jitsiRoomName,
        displayName: mapping.displayName,
        isCustom: mapping.isCustom,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      };
    } catch (error) {
      logger.error('Error getting Jitsi mapping:', error);
      return null;
    }
  }

  /**
   * Create or update a Jitsi mapping
   */
  async upsertJitsiMapping(data: {
    areaId: string;
    jitsiRoomName: string;
    displayName?: string;
    isCustom?: boolean;
  }): Promise<JitsiMappingData | null> {
    try {
      const mapping = await prisma.jitsiRoomMapping.upsert({
        where: { areaId: data.areaId },
        update: {
          jitsiRoomName: data.jitsiRoomName,
          displayName: data.displayName,
          isCustom: data.isCustom ?? true,
        },
        create: {
          areaId: data.areaId,
          jitsiRoomName: data.jitsiRoomName,
          displayName: data.displayName ?? null,
          isCustom: data.isCustom ?? false,
        },
      });

      logger.info(`Upserted Jitsi mapping for area ${data.areaId}`);

      return {
        id: mapping.id,
        areaId: mapping.areaId,
        jitsiRoomName: mapping.jitsiRoomName,
        displayName: mapping.displayName,
        isCustom: mapping.isCustom,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      };
    } catch (error) {
      logger.error('Error upserting Jitsi mapping:', error);
      return null;
    }
  }

  /**
   * Delete a Jitsi mapping by area ID
   */
  async deleteJitsiMapping(areaId: string): Promise<boolean> {
    try {
      await prisma.jitsiRoomMapping.delete({
        where: { areaId },
      });
      logger.info(`Deleted Jitsi mapping for area ${areaId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting Jitsi mapping:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // PLAYER POSITION (Ephemeral State)
  // --------------------------------------------------------------------------

  /**
   * Get player position by session ID
   */
  async getPlayerPosition(sessionId: string): Promise<PlayerPositionData | null> {
    try {
      const position = await prisma.playerPosition.findUnique({
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
    } catch (error) {
      logger.error('Error getting player position:', error);
      return null;
    }
  }

  /**
   * Update player position (creates if not exists)
   */
  async updatePlayerPosition(
    sessionId: string,
    data: {
      userId?: string | null;
      roomId?: string;
      x?: number;
      y?: number;
      direction?: string;
    }
  ): Promise<PlayerPositionData | null> {
    try {
      const position = await prisma.playerPosition.upsert({
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
    } catch (error) {
      logger.error('Error updating player position:', error);
      return null;
    }
  }

  /**
   * Delete player position (on disconnect)
   */
  async deletePlayerPosition(sessionId: string): Promise<boolean> {
    try {
      await prisma.playerPosition.delete({
        where: { sessionId },
      });
      return true;
    } catch (error) {
      // Ignore not found errors
      return false;
    }
  }

  /**
   * Get all players in a room
   */
  async getPlayersInRoom(roomId: string): Promise<PlayerPositionData[]> {
    try {
      const positions = await prisma.playerPosition.findMany({
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
    } catch (error) {
      logger.error('Error getting players in room:', error);
      return [];
    }
  }

  /**
   * Cleanup stale positions (older than 1 hour)
   */
  async cleanupStalePositions(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = await prisma.playerPosition.deleteMany({
        where: {
          updatedAt: { lt: oneHourAgo },
        },
      });
      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} stale player positions`);
      }
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up stale positions:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const settingsController = new SettingsController();

