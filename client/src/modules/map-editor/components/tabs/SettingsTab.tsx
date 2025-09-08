import React, { useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Space,
  Switch,
  Slider,
  Input,
  Form,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Tooltip,
  message,
  Upload,
  Modal
} from 'antd';
import { UploadOutlined, InfoCircleOutlined, ExpandOutlined } from '@ant-design/icons';
import { GridConfig } from '../../types/editor.types';
import { MapDataManager } from '../../../../components/MapDataManager';
import { useMapData } from '../../../../shared/MapDataContext';
import { useSharedMap } from '../../../../shared/useSharedMap';

const { Title } = Typography;
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
  max: { width: 4000, height: 3000 }
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
  const { mapData, updateInteractiveAreas, updateImpassableAreas } = useMapData();
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });
  const [customMapSize, setCustomMapSize] = useState({
    width: mapData.worldDimensions.width,
    height: mapData.worldDimensions.height
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageResizeOption, setImageResizeOption] = useState<'fit' | 'stretch' | 'custom'>('fit');

  // Determine current preset based on map dimensions
  React.useEffect(() => {
    const currentDimensions = mapData.worldDimensions;
    const preset = Object.entries(MAP_SIZE_PRESETS).find(([key, value]) =>
      key !== 'custom' && value.width === currentDimensions.width && value.height === currentDimensions.height
    );
    setSelectedPreset(preset ? preset[0] : 'custom');
    setCustomMapSize(currentDimensions);
  }, [mapData.worldDimensions]);

  // Handle map size changes
  const handleMapSizeChange = useCallback(async (newDimensions: { width: number; height: number }) => {
    try {
      // Validate dimensions
      if (newDimensions.width < MAP_SIZE_LIMITS.min.width ||
          newDimensions.height < MAP_SIZE_LIMITS.min.height ||
          newDimensions.width > MAP_SIZE_LIMITS.max.width ||
          newDimensions.height > MAP_SIZE_LIMITS.max.height) {
        message.error(`Map size must be between ${MAP_SIZE_LIMITS.min.width}×${MAP_SIZE_LIMITS.min.height} and ${MAP_SIZE_LIMITS.max.width}×${MAP_SIZE_LIMITS.max.height}`);
        return;
      }

      // Check if areas will be outside new boundaries
      const areasOutsideBounds = mapData.interactiveAreas.filter(area =>
        area.x + area.width > newDimensions.width || area.y + area.height > newDimensions.height
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
          if (area.x + area.width > newDimensions.width || area.y + area.height > newDimensions.height) {
            return {
              ...area,
              x: Math.min(area.x, newDimensions.width - area.width),
              y: Math.min(area.y, newDimensions.height - area.height),
              width: Math.min(area.width, newDimensions.width - area.x),
              height: Math.min(area.height, newDimensions.height - area.y)
            };
          }
          return area;
        });

        updateInteractiveAreas(adjustedAreas);
      }

      // Update map dimensions through SharedMapSystem
      await sharedMap.updateWorldDimensions(newDimensions);
      message.success(`Map size updated to ${newDimensions.width}×${newDimensions.height}`);

    } catch (error) {
      console.error('Failed to update map size:', error);
      message.error('Failed to update map size');
    }
  }, [mapData.interactiveAreas, updateInteractiveAreas]);

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

  // Handle background image upload
  const handleImageUpload = useCallback(async (file: File) => {
    console.log('🖼️ BACKGROUND IMAGE UPLOAD STARTED:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    // Check file size (limit to 5MB to prevent localStorage quota issues)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      console.error('❌ FILE TOO LARGE:', file.size, 'bytes');
      message.error(`Image file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use an image smaller than 5MB.`);
      return false;
    }

    try {
      // Create a canvas to resize the image if needed
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        message.error('Canvas not supported in this browser');
        return false;
      }

      const img = new Image();
      img.onload = async () => {
        console.log('🖼️ IMAGE LOADED:', {
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });

        // Calculate optimal size to keep under localStorage limits
        let targetWidth = img.width;
        let targetHeight = img.height;
        const maxDimension = 2048; // Maximum dimension to keep file size reasonable

        if (img.width > maxDimension || img.height > maxDimension) {
          const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
          targetWidth = Math.floor(img.width * scale);
          targetHeight = Math.floor(img.height * scale);
          console.log('🖼️ RESIZING IMAGE FOR STORAGE:', {
            original: { width: img.width, height: img.height },
            target: { width: targetWidth, height: targetHeight },
            scale: scale
          });
        }

        // Set canvas size and draw image
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert to base64 with quality optimization
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality to reduce size
        console.log('🖼️ OPTIMIZED IMAGE DATA URL LENGTH:', imageDataUrl.length);

        // Check if the optimized image is still too large
        const estimatedSizeInMB = imageDataUrl.length / 1024 / 1024;
        if (estimatedSizeInMB > 3) { // Conservative limit for localStorage
          console.error('❌ OPTIMIZED IMAGE STILL TOO LARGE:', estimatedSizeInMB, 'MB');
          message.error(`Image is still too large after optimization (${estimatedSizeInMB.toFixed(1)}MB). Please use a smaller image.`);
          return;
        }

        // Set background image in local state
        setBackgroundImage(imageDataUrl);

        // Save background image to SharedMapSystem
        try {
          console.log('🖼️ SAVING BACKGROUND IMAGE TO SHARED MAP SYSTEM');

          // Update map data with background image (use original dimensions for scaling)
          await sharedMap.updateMapData({
            backgroundImage: imageDataUrl,
            backgroundImageDimensions: {
              width: img.width, // Original dimensions for proper scaling
              height: img.height
            }
          });

          console.log('🖼️ BACKGROUND IMAGE SAVED TO SHARED MAP SYSTEM');

          // Show modal with resize options
          Modal.confirm({
            title: 'Background Image Detected',
            content: (
              <div>
                <p>Image dimensions: {img.width}×{img.height}</p>
                <p>Current map size: {mapData.worldDimensions.width}×{mapData.worldDimensions.height}</p>
                {targetWidth !== img.width && (
                  <p style={{ color: '#1890ff', fontSize: '12px' }}>
                    Note: Image was optimized for storage ({targetWidth}×{targetHeight})
                  </p>
                )}
                <p>How would you like to handle the image?</p>
              </div>
            ),
            okText: 'Resize Map to Image',
            cancelText: 'Keep Current Size',
            onOk: async () => {
              console.log('🖼️ USER CHOSE TO RESIZE MAP TO IMAGE');
              await handleMapSizeChange({ width: img.width, height: img.height });
              message.success('Map resized to match background image');
            },
            onCancel: () => {
              console.log('🖼️ USER CHOSE TO KEEP CURRENT MAP SIZE');
              message.info('Background image added without resizing map');
            }
          });

        } catch (error) {
          console.error('❌ FAILED TO SAVE BACKGROUND IMAGE:', error);
          if (error instanceof Error && error.message.includes('QuotaExceededError')) {
            message.error('Storage quota exceeded. Please use a smaller image or clear browser data.');
          } else {
            message.error('Failed to save background image. Please try a smaller image.');
          }
        }
      };

      img.onerror = (error) => {
        console.error('❌ FAILED TO LOAD IMAGE:', error);
        message.error('Failed to load image. Please check the file format.');
      };

      // Read file as data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('🖼️ FILE READER LOADED');
        const result = e.target?.result as string;
        if (result) {
          img.src = result;
        }
      };

      reader.onerror = (error) => {
        console.error('❌ FILE READER ERROR:', error);
        message.error('Failed to read image file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ IMAGE UPLOAD ERROR:', error);
      message.error('Failed to upload image');
    }

    return false; // Prevent default upload
  }, [mapData.worldDimensions, handleMapSizeChange, sharedMap]);

  // Handle reset to default map
  const handleResetToDefault = useCallback(async () => {
    Modal.confirm({
      title: 'Reset to Default Map',
      content: (
        <div>
          <p>This will reset the entire map to the default Zep-style layout with background image.</p>
          <p><strong>Warning:</strong> All current map data, areas, and customizations will be lost.</p>
          <p>Are you sure you want to continue?</p>
        </div>
      ),
      okText: 'Yes, Reset Map',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        try {
          console.log('🔄 RESETTING TO DEFAULT MAP');

          // Clear localStorage to force recreation of default map
          localStorage.removeItem('stargety_map_data');
          localStorage.removeItem('stargety_map_history');
          localStorage.removeItem('stargety_map_backup');

          // Reload the page to reinitialize with default map
          window.location.reload();

        } catch (error) {
          console.error('❌ FAILED TO RESET TO DEFAULT MAP:', error);
          message.error('Failed to reset map. Please try again.');
        }
      }
    });
  }, []);
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Map Data Management */}
      <Card title="Map Data Management" size="small">
        <MapDataManager
          onMapLoaded={() => {
            console.log('Map loaded successfully');
          }}
          onMapSaved={() => {
            console.log('Map saved successfully');
          }}
          onError={(error) => {
            console.error('Map operation error:', error);
          }}
        />
      </Card>

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
          {/* Current Map Size Display */}
          <Form.Item>
            <div style={{
              background: 'var(--color-bg-secondary)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--color-border-light)'
            }}>
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <div>
                    <strong>Current Size:</strong>
                    <div style={{ fontSize: '18px', color: 'var(--color-accent)' }}>
                      {mapData.worldDimensions.width} × {mapData.worldDimensions.height} px
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <strong>Aspect Ratio:</strong>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      {(mapData.worldDimensions.width / mapData.worldDimensions.height).toFixed(2)}:1
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Form.Item>

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
                Reset to Default Map
              </Button>
            </Space>
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Supported formats: JPG, PNG, GIF. The map can be automatically resized to match the image dimensions.
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

          <Form.Item label={`Grid Spacing: ${gridConfig.spacing}px`}>
            <Slider
              min={10}
              max={100}
              value={gridConfig.spacing}
              onChange={(value) => onGridConfigChange({ spacing: value })}
              marks={{
                10: '10px',
                25: '25px',
                50: '50px',
                75: '75px',
                100: '100px'
              }}
            />
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

          <Form.Item label="Grid Color">
            <Input
              type="color"
              value={gridConfig.color}
              onChange={(e) => onGridConfigChange({ color: e.target.value })}
              style={{ width: '100px' }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Editor Settings */}
      <Card title="Editor Settings" size="small">
        <Form layout="vertical">
          <Form.Item label="Preview Mode">
            <Switch
              checked={previewMode}
              onChange={onPreviewModeChange}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
};
