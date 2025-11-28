// Avatar API Sync Service - Fire-and-forget API calls
import { CharacterApiService } from '../../../services/api/CharacterApiService';
import { logger } from '../../../shared/logger';

export class AvatarApiSyncService {
  static async saveToApiAsync(username: string, slotNumber: number = 1, definition: any): Promise<void> {
    try {
      const result = await CharacterApiService.saveSlot(username, slotNumber, definition);
      if (result.success) {
        logger.info('V1 COMPAT CHARACTER SAVED TO API', { username, slotNumber });
      }
    } catch (error) {
      logger.warn('V1 API SAVE FAILED', { username, error });
    }
  }

  static async deleteFromApiAsync(username: string, slotNumber: number = 1): Promise<void> {
    try {
      const result = await CharacterApiService.clearSlot(username, slotNumber);
      if (result.success) {
        logger.info('V1 COMPAT CHARACTER DELETED FROM API', { username, slotNumber });
      }
    } catch (error) {
      logger.warn('V1 API DELETE FAILED', { username, error });
    }
  }
}
