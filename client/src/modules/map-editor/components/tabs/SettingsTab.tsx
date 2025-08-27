import React from 'react';
import {
  Card,
  Typography,
  Space,
  Switch,
  Slider,
  Input,
  Form
} from 'antd';
import { GridConfig } from '../../types/editor.types';
import { MapDataManager } from '../../../../components/MapDataManager';

const { Title } = Typography;

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
