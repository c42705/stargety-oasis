import React, { useState, useCallback } from 'react';
import { logger } from '../../../../shared/logger';
import {
  Card,
  Space,
  Switch,
  Slider,
  Form,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Tooltip,
  message,
  Upload,
  Modal,
  Alert,
  Badge
} from 'antd';
import { UploadOutlined, InfoCircleOutlined, ExpandOutlined } from '@ant-design/icons';
import { GridConfig } from '../../types/ui.types';
import { GRID_PATTERNS } from '../../constants/editorConstants';
import { MapDataManager } from '../../../../components/MapDataManager';
import { useMapData } from '../../../../shared/MapDataContext';
import { useSharedMap } from '../../../../shared/useSharedMap';
import { useWorldDimensions } from '../../../../shared/useWorldDimensions';
import { useAnimatedGifSettings } from '../../hooks/useAnimatedGifSettings';

const { Option } = Select;

// Map size presets
const MAP_SIZE_PRESETS = {
  small: { width: 800, height: 600, label: 'Small (800×600)' },
  medium: { width: 1200, height: 800, label: 'Medium (1200×800)' },
  large: { width: 1600, height: 1200, label: 'Large (1600×1200)' },
  xlarge: { width: 2400, height: 1600, label: 'Extra Large (2400×1600)' },
  custom: { width: 0, height: 0, label: 'Custom Size' }
};

// Map size limits
const MAP_SIZE_LIMITS = {
  min: { width: 400, height: 300 },
  max: { width: 8000, height: 4000 }
};

interface SettingsTabProps {
  gridConfig: GridConfig;
  previewMode: boolean;
  onGridConfigChange: (config: Partial<GridConfig>) => void;
  onPreviewModeChange: (enabled: boolean) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  gridConfig,
  previewMode,
  onGridConfigChange,
  onPreviewModeChange
}) => {
  const { mapData, updateInteractiveAreas } = useMapData();
  // Auto-save is now controlled by the Redux store configuration
  const sharedMap = useSharedMap({ source: 'editor' });
  const worldDimensions = useWorldDimensions();
  const [customMapSize, setCustomMapSize] = useState({
    width: mapData.worldDimensions.width,
    height: mapData.worldDimensions.height
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [backgroundImageDimensions, setBackgroundImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isApplyingBackgroundSize, setIsApplyingBackgroundSize] = useState(false);

  // Animated GIF settings
  const gifSettings = useAnimatedGifSettings();

  // Determine current preset based on map dimensions
  React.useEffect(() => {
    const currentDimensions = mapData.worldDimensions;
    const preset = Object.entries(MAP_SIZE_PRESETS).find(([key, value]) =>
      key !== 'custom' && value.width === currentDimensions.width && value.height === currentDimensions.height
    );
    setSelectedPreset(preset ? preset[0] : 'custom');
    setCustomMapSize(currentDimensions);
  }, [mapData.worldDimensions]);

  // Handle map size changes using WorldDimensionsManager
  const handleMapSizeChange = useCallback(async (newDimensions: { width: number; height: number }) => {
    try {
      // Validate dimensions using WorldDimensionsManager
      const validation = worldDimensions.validateDimensions(newDimensions);

      if (!validation.isValid) {
        message.error(validation.errors.join(', '));
        return;
      }

      // Show warnings if dimensions were scaled
      if (validation.scaled && validation.warnings.length > 0) {
        message.warning(validation.warnings.join(', '));
      }

      // Use the validated dimensions (may be scaled)
      const finalDimensions = validation.dimensions;

      // Check if areas will be outside new boundaries
      const areasOutsideBounds = mapData.interactiveAreas.filter(area =>
        area.x + area.width > finalDimensions.width || area.y + area.height > finalDimensions.height
      );

      if (areasOutsideBounds.length > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: 'Areas Outside Map Boundaries',
            content: `${areasOutsideBounds.length} interactive area(s) will be outside the new map boundaries. They will be automatically moved to fit within the new size. Continue?`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!confirmed) return;

        // Adjust areas to fit within new boundaries
        const adjustedAreas = mapData.interactiveAreas.map(area => {
          if (area.x + area.width > finalDimensions.width || area.y + area.height > finalDimensions.height) {
            return {
              ...area,
              x: Math.min(area.x, finalDimensions.width - area.width),
              y: Math.min(area.y, finalDimensions.height - area.height),
              width: Math.min(area.width, finalDimensions.width - area.x),
              height: Math.min(area.height, finalDimensions.height - area.y)
            };
          }
          return area;
        });

        updateInteractiveAreas(adjustedAreas);
      }

      // Update map dimensions through WorldDimensionsManager (direct, synchronous)
      const updateResult = worldDimensions.updateDimensions(finalDimensions, {
        source: 'editor',
        syncBackground: true
      });

      if (updateResult.isValid) {
        // Also update SharedMapSystem for persistence compatibility
        await sharedMap.updateWorldDimensions(finalDimensions);
        message.success(`Map size updated to ${finalDimensions.width}×${finalDimensions.height}`);
      } else {
        message.error('Failed to update map dimensions: ' + updateResult.errors.join(', '));
      }

    } catch (error) {
      logger.error('Failed to update map size', error);
      message.error('Failed to update map size');
    }
  }, [mapData.interactiveAreas, updateInteractiveAreas, sharedMap, worldDimensions]);

  // Handle preset selection
  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const presetData = MAP_SIZE_PRESETS[preset as keyof typeof MAP_SIZE_PRESETS];
      setCustomMapSize({ width: presetData.width, height: presetData.height });
      handleMapSizeChange({ width: presetData.width, height: presetData.height });
    }
  }, [handleMapSizeChange]);

  // Handle custom size input
  const handleCustomSizeChange = useCallback((field: 'width' | 'height', value: number) => {
    const newSize = { ...customMapSize, [field]: value };
    setCustomMapSize(newSize);
  }, [customMapSize]);

  // Apply custom size
  const applyCustomSize = useCallback(() => {
    handleMapSizeChange(customMapSize);
  }, [customMapSize, handleMapSizeChange]);

  // Fetch background image dimensions from current map data
  const handleFetchBackgroundDimensions = useCallback(() => {
    logger.info('FETCHING BACKGROUND IMAGE DIMENSIONS');
    if (mapData.backgroundImageDimensions) {
      setBackgroundImageDimensions(mapData.backgroundImageDimensions);
      message.success(`Background image dimensions: ${mapData.backgroundImageDimensions.width}×${mapData.backgroundImageDimensions.height}`);
      logger.info('BACKGROUND IMAGE DIMENSIONS FETCHED', mapData.backgroundImageDimensions);
    } else {
      message.warning('No background image dimensions available');
      logger.warn('NO BACKGROUND IMAGE DIMENSIONS FOUND');
    }
  }, [mapData]);

  // Apply background image dimensions to map size
  const handleApplyBackgroundSize = useCallback(async () => {
    if (!backgroundImageDimensions) {
      message.warning('Please fetch background image dimensions first');
      return;
    }

    logger.info('APPLYING BACKGROUND IMAGE DIMENSIONS TO MAP', backgroundImageDimensions);
    setIsApplyingBackgroundSize(true);
    try {
      await handleMapSizeChange(backgroundImageDimensions);
      setCustomMapSize(backgroundImageDimensions);
      message.success(`Map resized to ${backgroundImageDimensions.width}×${backgroundImageDimensions.height}`);
      logger.info('MAP SIZE APPLIED FROM BACKGROUND DIMENSIONS', backgroundImageDimensions);
    } catch (error) {
      logger.error('FAILED TO APPLY BACKGROUND SIZE', error);
      message.error('Failed to apply background dimensions');
    } finally {
      setIsApplyingBackgroundSize(false);
    }
  }, [backgroundImageDimensions, handleMapSizeChange]);

  // Handle background image upload
  const handleImageUpload = useCallback((file: File) => {
    logger.info('BACKGROUND IMAGE UPLOAD INITIATED', { fileName: file.name, size: file.size });
    console.log('[SettingsTab] Upload button clicked, file:', file.name);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      logger.error('INVALID FILE TYPE', { type: file.type });
      message.error('Invalid file type. Please use JPG, PNG, GIF, or WebP images.');
      return Upload.LIST_IGNORE;
    }

    // Check file size (limit to 5MB to prevent localStorage quota issues)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      logger.error('FILE TOO LARGE', { size: file.size });
      message.error(`Image file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use an image smaller than 5MB.`);
      return Upload.LIST_IGNORE;
    }

    // Return a Promise that processes the image
    return new Promise<void>((resolve) => {
      logger.info('BACKGROUND IMAGE PROCESSING STARTED', { fileName: file.name });
      try {
        // Create a canvas to resize the image if needed
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          logger.error('CANVAS NOT SUPPORTED');
          message.error('Canvas not supported in this browser');
          resolve();
          return;
        }

        const img = new window.Image();
        img.onload = async () => {
          logger.info('BACKGROUND IMAGE LOADED', { width: img.width, height: img.height });

          // Calculate optimal size to keep under localStorage limits
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxDimension = 2048; // Maximum dimension to keep file size reasonable

          if (img.width > maxDimension || img.height > maxDimension) {
            const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
            targetWidth = Math.floor(img.width * scale);
            targetHeight = Math.floor(img.height * scale);
            logger.info('RESIZING IMAGE FOR STORAGE', { original: { width: img.width, height: img.height }, target: { width: targetWidth, height: targetHeight } });
          }

          // Set canvas size and draw image
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to base64 with quality optimization
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality to reduce size
          logger.info('IMAGE DATA URL CREATED', { size: imageDataUrl.length });

          // Check if the optimized image is still too large
          const estimatedSizeInMB = imageDataUrl.length / 1024 / 1024;
          if (estimatedSizeInMB > 3) { // Conservative limit for localStorage
            logger.error('OPTIMIZED IMAGE STILL TOO LARGE', { sizeMB: estimatedSizeInMB });
            message.error(`Image is still too large after optimization (${estimatedSizeInMB.toFixed(1)}MB). Please use a smaller image.`);
            resolve();
            return;
          }

          // Save background image to SharedMapSystem
          try {
            logger.info('SAVING BACKGROUND IMAGE TO MAP');

            // Update background dimensions in WorldDimensionsManager first
            const backgroundDimensions = { width: img.width, height: img.height };
            const backgroundValidation = worldDimensions.updateBackgroundDimensions(backgroundDimensions, {
              source: 'background',
              skipPersistence: false
            });

            if (!backgroundValidation.isValid) {
              message.error('Invalid background image dimensions: ' + backgroundValidation.errors.join(', '));
              resolve();
              return;
            }

            // Update map data with background image (use validated dimensions)
            await sharedMap.updateMapData({
              backgroundImage: imageDataUrl,
              backgroundImageDimensions: backgroundValidation.dimensions
            });

            logger.info('BACKGROUND IMAGE SAVED TO MAP DATA');
            // Store background dimensions in state for manual controls
            setBackgroundImageDimensions(backgroundValidation.dimensions);
            
            // Automatically resize map to match image dimensions
            logger.info('AUTO-RESIZING MAP TO IMAGE DIMENSIONS', { 
              imageDimensions: backgroundValidation.dimensions,
              previousMapSize: worldDimensions.worldDimensions
            });
            
            await handleMapSizeChange(backgroundValidation.dimensions);
            setCustomMapSize(backgroundValidation.dimensions);
            
            message.success(`Map automatically resized to ${backgroundValidation.dimensions.width}×${backgroundValidation.dimensions.height} to match background image`);
            resolve();

          } catch (error) {
            logger.error('FAILED TO SAVE BACKGROUND IMAGE', error);
            if (error instanceof Error && error.message.includes('QuotaExceededError')) {
              message.error('Storage quota exceeded. Please use a smaller image or clear browser data.');
            } else {
              message.error('Failed to save background image. Please try a smaller image.');
            }
            resolve();
          }
        };

        img.onerror = (error) => {
          logger.error('FAILED TO LOAD IMAGE', error);
          message.error('Failed to load image. Please check the file format.');
          resolve();
        };

        // Read file as data URL
        const reader = new FileReader();
        logger.info('READING FILE AS DATA URL');
        reader.onload = (e) => {
          logger.info('FILE READER LOADED');
          const result = e.target?.result as string;
          if (result) {
            logger.info('SETTING IMAGE SOURCE');
            img.src = result;
          }
        };

        reader.onerror = (error) => {
          logger.error('FILE READER ERROR', error);
          message.error('Failed to read image file');
          resolve();
        };

        reader.readAsDataURL(file);
      } catch (error) {
        logger.error('IMAGE UPLOAD ERROR', error);
        message.error('Failed to upload image');
        resolve();
      }
    });
  }, [handleMapSizeChange, sharedMap, worldDimensions]);

  // Handle reset to default map
  const handleResetToDefault = useCallback(async () => {
    // Use a direct confirmation instead of Modal.confirm to avoid context issues
    const confirmed = window.confirm(
      'Reset to Default Map\n\n' +
      'This will reset the entire map to the default Zep-style layout with background image.\n\n' +
      'WARNING: All current map data, areas, and customizations will be lost.\n\n' +
      'Are you sure you want to continue?'
    );

    if (confirmed) {
      try {
        // Removed: Non-critical resetting to default map log.

        // Clear all map-related localStorage using correct keys
        localStorage.removeItem('stargety_shared_map_data');
        localStorage.removeItem('stargety_map_backup');
        localStorage.removeItem('stargety_map_settings');
        localStorage.removeItem('stargety_map_history');

        // Removed: Non-critical storage cleared/reloading log.

        // Show success message before reload
        message.success('Map reset initiated. Reloading page...');

        // Small delay to show message, then reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } catch (error) {
        logger.error('FAILED TO RESET TO DEFAULT MAP', error);
        message.error('Failed to reset map. Please try again.');
      }
    }
  }, []);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Map Data Management */}
      
        <MapDataManager       
          onError={(error) => {
            logger.error('Map operation error', error);
          }}
        />
      

      {/* Map Size Settings */}
      <Card
        title={
          <Space>
            <span>Map Size Configuration</span>
            <Tooltip title="Configure the dimensions of your virtual world. Larger maps provide more space but may impact performance.">
              <InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} />
            </Tooltip>
          </Space>
        }
        size="small"
      >
        <Form layout="vertical">
     
          {/* Preset Selection */}
          <Form.Item label="Size Presets">
            <Select
              value={selectedPreset}
              onChange={handlePresetChange}
              style={{ width: '100%' }}
            >
              {Object.entries(MAP_SIZE_PRESETS).map(([key, preset]) => (
                <Option key={key} value={key}>
                  {preset.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Custom Size Inputs */}
          {selectedPreset === 'custom' && (
            <Form.Item label="Custom Dimensions">
              <Row gutter={12} align="middle">
                <Col span={8}>
                  <InputNumber
                    placeholder="Width"
                    value={customMapSize.width}
                    onChange={(value) => handleCustomSizeChange('width', value || 0)}
                    min={MAP_SIZE_LIMITS.min.width}
                    max={MAP_SIZE_LIMITS.max.width}
                    style={{ width: '100%' }}
                    addonAfter="px"
                  />
                </Col>
                <Col span={2} style={{ textAlign: 'center' }}>
                  ×
                </Col>
                <Col span={8}>
                  <InputNumber
                    placeholder="Height"
                    value={customMapSize.height}
                    onChange={(value) => handleCustomSizeChange('height', value || 0)}
                    min={MAP_SIZE_LIMITS.min.height}
                    max={MAP_SIZE_LIMITS.max.height}
                    style={{ width: '100%' }}
                    addonAfter="px"
                  />
                </Col>
                <Col span={6}>
                  <Button
                    type="primary"
                    onClick={applyCustomSize}
                    icon={<ExpandOutlined />}
                    style={{ width: '100%' }}
                  >
                    Apply
                  </Button>
                </Col>
              </Row>
            </Form.Item>
          )}

          {/* Background Image Upload */}
          <Form.Item label="Background Image">
            <Space>
              <Upload
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
                multiple={false}
                openFileDialogOnClick={true}
                action="javascript:void(0);"
              >
                <Button icon={<UploadOutlined />}>
                  Upload Background Image
                </Button>
              </Upload>

              <Button
                onClick={handleResetToDefault}
                type="default"
                danger
              >
                Reset
              </Button>
            </Space>

            {/* Background Image Dimension Controls */}
            <Space style={{ marginTop: '12px', width: '100%' }} direction="vertical">
              <Space>
                <Button
                  onClick={handleFetchBackgroundDimensions}
                  type="dashed"
                >
                  📏 Fetch Background Size
                </Button>
                {backgroundImageDimensions && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {backgroundImageDimensions.width}×{backgroundImageDimensions.height}
                  </span>
                )}
              </Space>
              
              {backgroundImageDimensions && (
                <Button
                  onClick={handleApplyBackgroundSize}
                  type="primary"
                  loading={isApplyingBackgroundSize}
                  style={{ width: '100%' }}
                >
                  ✓ Apply Background Dimensions to Map
                </Button>
              )}
            </Space>

            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Supported formats: JPG, PNG, GIF. The map can be automatically resized to match the image dimensions.
              <br />
              Use "Fetch Background Size" to manually retrieve current background image dimensions.
              <br />
              Use "Reset to Default Map" to restore the original Zep-style background and layout.
            </div>
          </Form.Item>
        </Form>
      </Card>

      {/* Grid Settings */}
      <Card title="Grid Settings" size="small">
        <Form layout="vertical">
          <Form.Item label="Show Grid">
            <Switch
              checked={gridConfig.visible}
              onChange={(checked) => onGridConfigChange({ visible: checked })}
            />
          </Form.Item>

          <Form.Item label={`Grid Pattern & Size`}>
            <Select
              value={gridConfig.pattern}
              onChange={(patternId) => {
                const pattern = GRID_PATTERNS.find(p => p.id === patternId);
                if (pattern) {
                  onGridConfigChange({
                    pattern: pattern.id as GridConfig['pattern'],
                    spacing: pattern.size
                  });
                }
              }}
              style={{ width: '100%' }}
              optionLabelProp="label"
            >
              {GRID_PATTERNS.map((pattern) => (
                <Select.Option
                  key={pattern.id}
                  value={pattern.id}
                  label={pattern.name}
                >
                  <Space>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        border: '1px solid #d9d9d9',
                        borderRadius: 4,
                        backgroundImage: `url(${pattern.thumbnail})`,
                        backgroundSize: 'cover',
                        backgroundRepeat: 'repeat',
                        imageRendering: 'pixelated'
                      }}
                    />
                    <span>
                      {pattern.name} ({pattern.size}px)
                    </span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={`Grid Opacity: ${gridConfig.opacity}%`}>
            <Slider
              min={10}
              max={100}
              value={gridConfig.opacity}
              onChange={(value) => onGridConfigChange({ opacity: value })}
              marks={{
                10: '10%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%'
              }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Animated GIF Settings */}
      <Card
        title={
          <Space>
            Animated GIF Settings
            {gifSettings.stats.showWarning && (
              <Badge status="warning" text={`${gifSettings.stats.totalGifs} GIFs`} />
            )}
            {gifSettings.stats.limitReached && (
              <Badge status="error" text="Limit Reached" />
            )}
          </Space>
        }
        size="small"
      >
        <Form layout="vertical">
          {/* Performance Warning */}
          {gifSettings.stats.showWarning && !gifSettings.stats.limitReached && (
            <Alert
              message="Performance Warning"
              description={`You have ${gifSettings.stats.totalGifs} animated GIFs on the map. Consider reducing the number for better performance.`}
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Limit Reached Error */}
          {gifSettings.stats.limitReached && (
            <Alert
              message="GIF Limit Reached"
              description={`Maximum of ${gifSettings.settings.maxGifsLimit} animated GIFs allowed. Remove some GIFs before adding more.`}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Enable/Disable All Animations */}
          <Form.Item
            label={
              <Space>
                Enable Animations
                <Tooltip title="Toggle all GIF animations on/off globally">
                  <InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <Switch
              checked={gifSettings.settings.enabled}
              onChange={gifSettings.toggleEnabled}
            />
          </Form.Item>

          {/* Max GIFs Warning Threshold */}
          <Form.Item
            label={
              <Space>
                Performance Warning Threshold
                <Tooltip title="Show warning when this many GIFs are on the map">
                  <InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber
              min={1}
              max={gifSettings.settings.maxGifsLimit}
              value={gifSettings.settings.maxGifsWarningThreshold}
              onChange={(value) =>
                gifSettings.updateSettings({ maxGifsWarningThreshold: value || 5 })
              }
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* Max GIFs Limit */}
          <Form.Item
            label={
              <Space>
                Maximum GIFs Allowed
                <Tooltip title="Hard limit on number of animated GIFs">
                  <InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber
              min={1}
              max={50}
              value={gifSettings.settings.maxGifsLimit}
              onChange={(value) =>
                gifSettings.updateSettings({ maxGifsLimit: value || 10 })
              }
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* Auto-pause on Overload */}
          <Form.Item
            label={
              <Space>
                Auto-Pause on Overload
                <Tooltip title="Automatically pause GIFs when too many are active">
                  <InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} />
                </Tooltip>
              </Space>
            }
          >
            <Switch
              checked={gifSettings.settings.autoPauseOnOverload}
              onChange={(checked) =>
                gifSettings.updateSettings({ autoPauseOnOverload: checked })
              }
            />
          </Form.Item>

          {/* Reset to Defaults */}
          <Form.Item>
            <Button onClick={gifSettings.resetToDefaults} type="default">
              Reset to Defaults
            </Button>
          </Form.Item>

          {/* Stats Display */}
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--color-bg-container)',
            borderRadius: 4,
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <strong>Current Stats:</strong>
              <br />
              Total GIFs: {gifSettings.stats.totalGifs} / {gifSettings.settings.maxGifsLimit}
              <br />
              Playing: {gifSettings.stats.playingGifs}
              <br />
              Status: {gifSettings.stats.limitReached ? '🔴 Limit Reached' : gifSettings.stats.showWarning ? '⚠️ Warning' : '✅ Normal'}
            </div>
          </div>
        </Form>
      </Card>
    </Space>
  );
};

