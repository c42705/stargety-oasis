/**
 * Avatar Builder Integration V2
 * Wrapper component that integrates existing Avatar Builder with new v2 storage system
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import React, { useState, useCallback, useEffect } from 'react';
import { message, Modal, Button, Space } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { AvatarBuilderModal } from '../AvatarBuilderModal';
import { CharacterStorage } from './CharacterStorage';
import { ThumbnailGenerator } from './ThumbnailGenerator';
import { SpriteSheetValidator } from './SpriteSheetValidator';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { DefaultSpriteSheets, DefaultSpriteSheetTemplate } from './DefaultSpriteSheets';
import {
  CharacterSlot,
  EmptyCharacterSlot,
  AvatarBuilderIntegrationProps,
  AVATAR_SYSTEM_CONSTANTS,
  isEmptySlot
} from './types';
import { SpriteSheetDefinition, AnimationCategory } from '../AvatarBuilderTypes';

/**
 * Avatar Builder Integration Component
 * Wraps the existing AvatarBuilderModal and integrates it with v2 storage
 */
export const AvatarBuilderIntegration: React.FC<AvatarBuilderIntegrationProps> = ({
  username,
  slotNumber,
  existingCharacter,
  onSave,
  onCancel,
  isOpen
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DefaultSpriteSheetTemplate | null>(null);

  /**
   * Validate sprite sheet has required animations
   */
  const validateSpriteSheet = useCallback((definition: SpriteSheetDefinition) => {
    // Use comprehensive validator
    const validation = SpriteSheetValidator.validate(definition);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }, []);

  /**
   * Generate thumbnail from idle animation
   */
  const generateThumbnail = useCallback(async (definition: SpriteSheetDefinition): Promise<string> => {
    try {
      // Use ThumbnailGenerator to extract idle frame
      const result = await ThumbnailGenerator.generateThumbnail(definition, {
        width: 64,
        height: 64,
        format: 'png',
        quality: 0.9
      });

      if (result.success && result.data) {
        return result.data;
      }

      // Fallback to full sprite sheet if thumbnail generation fails
      console.warn('Thumbnail generation failed, using full sprite sheet:', result.error);
      return definition.source?.imageData || '';

    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return definition.source?.imageData || '';
    }
  }, []);

  /**
   * Handle save from Avatar Builder
   */
  const handleSave = useCallback(async (definition: SpriteSheetDefinition) => {
    setIsSaving(true);

    try {
      // Validate sprite sheet
      const validation = validateSpriteSheet(definition);
      if (!validation.isValid) {
        Modal.error({
          title: 'Validation Failed',
          content: (
            <div>
              <p>Cannot save character due to validation errors:</p>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
              {validation.warnings && validation.warnings.length > 0 && (
                <>
                  <p style={{ marginTop: 16 }}>Warnings:</p>
                  <ul>
                    {validation.warnings.map((warning, index) => (
                      <li key={index} style={{ color: '#faad14' }}>{warning.message}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )
        });
        setIsSaving(false);
        return;
      }

      // Show warnings if validation passed but has warnings
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          message.warning(warning.message);
        });
      }

      // Generate thumbnail
      const thumbnailUrl = await generateThumbnail(definition);

      // Create character slot
      const now = new Date().toISOString();
      const characterSlot: CharacterSlot = {
        slotNumber,
        username,
        name: definition.name || `Character ${slotNumber}`,
        spriteSheet: definition,
        thumbnailUrl,
        createdAt: existingCharacter && !isEmptySlot(existingCharacter) 
          ? existingCharacter.createdAt 
          : now,
        updatedAt: now,
        lastUsed: existingCharacter && !isEmptySlot(existingCharacter)
          ? existingCharacter.lastUsed
          : undefined,
        isEmpty: false
      };

      // Save to storage
      const saveResult = CharacterStorage.saveCharacterSlot(username, characterSlot);

      if (!saveResult.success) {
        message.error(saveResult.error || 'Failed to save character');
        setIsSaving(false);
        return;
      }

      // Show warnings if any
      if (saveResult.warnings && saveResult.warnings.length > 0) {
        saveResult.warnings.forEach(warning => {
          message.warning(warning);
        });
      }

      message.success(`Character saved to slot ${slotNumber}!`);

      // Call onSave callback
      if (onSave) {
        onSave(characterSlot);
      }

      setIsSaving(false);

    } catch (error) {
      console.error('Failed to save character:', error);
      message.error('An unexpected error occurred while saving');
      setIsSaving(false);
    }
  }, [username, slotNumber, existingCharacter, validateSpriteSheet, generateThumbnail, onSave]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    if (isSaving) {
      message.warning('Please wait for save to complete');
      return;
    }

    if (onCancel) {
      onCancel();
    }
  }, [isSaving, onCancel]);

  /**
   * Handle template selection
   */
  const handleTemplateSelect = useCallback((template: DefaultSpriteSheetTemplate) => {
    setSelectedTemplate(template);
    setTemplateSelectorOpen(false);

    // Auto-save template as character
    const now = new Date().toISOString();
    const newCharacter: CharacterSlot = {
      slotNumber,
      username,
      name: template.name,
      spriteSheet: template.spriteSheet,
      thumbnailUrl: template.thumbnailUrl || '',
      createdAt: now,
      updatedAt: now,
      isEmpty: false
    };

    // Generate thumbnail if not available
    if (!template.thumbnailUrl) {
      ThumbnailGenerator.generateThumbnail(template.spriteSheet, { width: 64, height: 64 })
        .then((result) => {
          if (result.success && result.data) {
            newCharacter.thumbnailUrl = result.data;
          }

          // Save character
          const saveResult = CharacterStorage.saveCharacterSlot(username, newCharacter);
          if (saveResult.success) {
            message.success(`Template "${template.name}" applied successfully!`);
            onSave?.(newCharacter);
          } else {
            message.error(saveResult.error || 'Failed to apply template');
          }
        });
    } else {
      // Save character immediately
      const saveResult = CharacterStorage.saveCharacterSlot(username, newCharacter);
      if (saveResult.success) {
        message.success(`Template "${template.name}" applied successfully!`);
        onSave?.(newCharacter);
      } else {
        message.error(saveResult.error || 'Failed to apply template');
      }
    }
  }, [username, slotNumber, onSave]);

  return (
    <>
      <AvatarBuilderModal
        visible={isOpen}
        onClose={handleCancel}
        username={username}
        onSave={handleSave}
      />

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        visible={isTemplateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={handleTemplateSelect}
        selectedTemplateId={selectedTemplate?.id}
      />
    </>
  );
};

export default AvatarBuilderIntegration;

