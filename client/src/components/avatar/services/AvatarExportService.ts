// Avatar Export Service - Format-specific exports
import type { CharacterDefinition, ExportOptions, SpriteSheetDefinition } from '../AvatarBuilderTypes';
import type { CharacterSlot } from '../v2/types';
import { CharacterStorage } from '../v2/CharacterStorage';
import { StorageResult } from '../v2/types';

export class AvatarExportService {
  static exportCharacter(username: string, options: ExportOptions = { format: 'json', includeSource: true, includeMetadata: true, compression: false, optimization: false }): StorageResult<string> {
    const result = CharacterStorage.loadCharacterSlot(username, 1);
    if (!result.success || !result.data) {
      throw new Error('Character not found');
    }
    const slot = result.data as CharacterSlot;
    const def: CharacterDefinition = {
      spriteSheet: slot.spriteSheet as SpriteSheetDefinition,
      metadata: { version: '1.1.0', lastSaved: slot.updatedAt, autoSaveEnabled: true, compressionEnabled: false },
      userPreferences: { defaultFrameRate: 8, preferredExportFormat: 'png', autoValidation: true }
    };

    switch (options.format) {
      case 'json':
        return this.exportAsJSON(def, options);
      case 'phaser':
        return this.exportAsPhaser(def, options);
      case 'unity':
        return this.exportAsUnity(def, options);
      case 'godot':
        return this.exportAsGodot(def, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private static exportAsJSON(def: CharacterDefinition, options: ExportOptions): StorageResult<string> {
    const data: any = {
      format: 'avatar_builder_json',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      spriteSheet: { ...def.spriteSheet }
    };
    if (options.includeMetadata) {
      data.metadata = def.metadata;
    }
    if (!options.includeSource && data.spriteSheet.source?.imageData) {
      const sheet = data.spriteSheet;
      delete sheet.source.imageData;
    }
    return { success: true, data: JSON.stringify(data, null, 2) };
  }

  private static exportAsPhaser(def: CharacterDefinition, options: ExportOptions): any {
    const ss = def.spriteSheet;
    return {
      format: 'phaser_spritesheet',
      textureKey: `avatar_${ss.name || 'legacy'}`,
      frames: ss.frames?.map((f, i) => ({
        frame: i,
        x: f.sourceRect.x,
        y: f.sourceRect.y,
        w: f.sourceRect.width,
        h: f.sourceRect.height
      })) || [],
      animations: ss.animations?.map(a => ({
        key: a.category,
        frames: a.sequence.frameIds.map(id => ss.frames.findIndex(f => f.id === id)),
        frameRate: a.sequence.frameRate,
        repeat: a.sequence.loop ? -1 : 0
      })) || []
    };
  }

  private static exportAsUnity(def: CharacterDefinition, options: ExportOptions): any {
    return { format: 'unity_spritesheet', message: 'TBD' };
  }

  private static exportAsGodot(def: CharacterDefinition, options: ExportOptions): any {
    return { format: 'godot_spritesheet', message: 'TBD' };
  }

  static importCharacter(jsonData: string, username: string): StorageResult<SpriteSheetDefinition> {
    try {
      const data = JSON.parse(jsonData);
      const ss = data.spriteSheet || data;
      if (username) {
        ss.createdBy = username;
        ss.updatedAt = new Date().toISOString();
      }
      // Save as slot 1
      const slot = {
        slotNumber: 1,
        username,
        name: ss.name || 'Imported',
        spriteSheet: ss,
        thumbnailUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEmpty: false
      };
      const result = CharacterStorage.saveCharacterSlot(username, slot);
      if (result.success) {
        return { success: true, data: ss as SpriteSheetDefinition };
      }
      return { success: false, error: result.error || 'Failed to save character' };
    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }
}
