/**
 * PropertiesTab Component
 *
 * Selection-driven properties panel that shows properties for the currently selected object.
 * Displays different property editors based on the type of selected object:
 * - Interactive Area: name, description, actionType, actionConfig
 * - Collision Area: name, color
 * - Asset: name, position, size, rotation
 * - Empty state when nothing selected
 */

import React from 'react';
import { Empty, Typography, Card, Form, Input, Select, Divider, Space, Button, Tag } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { InteractiveArea, ImpassableArea, InteractiveAreaActionType } from '../../../../shared/MapDataContext';
import { getColorForActionType } from '../../../../shared/MapDataContext';
import type { Shape } from '../../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

// Action type options for dropdown
const ACTION_TYPE_OPTIONS: { value: InteractiveAreaActionType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No action' },
  { value: 'impassable', label: 'Impassable', description: 'Blocks player movement' },
  { value: 'jitsi', label: 'Jitsi Room', description: 'Video conference room' },
  { value: 'alert', label: 'Alert', description: 'Show notification message' },
  { value: 'url', label: 'URL', description: 'Open a web link' },
  { value: 'modal', label: 'Modal', description: 'Show popup content' },
  { value: 'collectible', label: 'Collectible', description: 'Pickup item with effects' },
  { value: 'switch', label: 'Switch', description: 'Toggle other objects' },
];

interface PropertiesTabProps {
  selectedIds: string[];
  shapes: Shape[];
  areas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  onEditArea?: (area: InteractiveArea) => void;
  onDeleteArea?: (area: InteractiveArea) => void;
  onEditCollisionArea?: (area: ImpassableArea) => void;
  onDeleteCollisionArea?: (area: ImpassableArea) => void;
  onUpdateArea?: (areaId: string, updates: Partial<InteractiveArea>) => void;
  onUpdateShape?: (shapeId: string, updates: Partial<Shape>) => void;
}

export const PropertiesTab: React.FC<PropertiesTabProps> = ({
  selectedIds,
  shapes,
  areas,
  impassableAreas,
  onEditArea,
  onDeleteArea,
  onEditCollisionArea,
  onDeleteCollisionArea,
  onUpdateArea,
}) => {
  // Empty state - nothing selected
  if (selectedIds.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size="small">
            <Text type="secondary">No object selected</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Select an object on the canvas or in the Layers panel to edit its properties
            </Text>
          </Space>
        }
      />
    );
  }

  // Multi-selection state
  if (selectedIds.length > 1) {
    return (
      <Card size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5} style={{ margin: 0 }}>Multiple Selection</Title>
          <Text type="secondary">{selectedIds.length} objects selected</Text>
          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Multi-object editing coming soon. Select a single object to edit properties.
          </Text>
        </Space>
      </Card>
    );
  }

  // Single selection - find the selected object
  const selectedId = selectedIds[0];
  const selectedShape = shapes.find(s => s.id === selectedId);
  const selectedArea = areas.find(a => a.id === selectedId);
  const selectedCollisionArea = impassableAreas.find(a => a.id === selectedId);

  // Interactive Area selected
  if (selectedArea) {
    const actionColor = getColorForActionType(selectedArea.actionType || 'none');
    return (
      <Card size="small" title={<Space><EditOutlined /> Interactive Area</Space>}>
        <Form layout="vertical" size="small" style={{ marginBottom: 0 }}>
          {/* Name */}
          <Form.Item label="Name" style={{ marginBottom: 8 }}>
            <Input
              value={selectedArea.name}
              onChange={(e) => onUpdateArea?.(selectedArea.id, { name: e.target.value })}
              placeholder="Area name"
            />
          </Form.Item>

          {/* Description */}
          <Form.Item label="Description" style={{ marginBottom: 8 }}>
            <TextArea
              value={selectedArea.description || ''}
              onChange={(e) => onUpdateArea?.(selectedArea.id, { description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </Form.Item>

          {/* Action Type with color indicator */}
          <Form.Item label="Action Type" style={{ marginBottom: 8 }}>
            <Select
              value={selectedArea.actionType || 'none'}
              onChange={(value: InteractiveAreaActionType) => {
                // Update both actionType and auto-derive color
                onUpdateArea?.(selectedArea.id, {
                  actionType: value,
                  color: getColorForActionType(value),
                });
              }}
              style={{ width: '100%' }}
              optionLabelProp="label"
            >
              {ACTION_TYPE_OPTIONS.map(option => (
                <Select.Option key={option.value} value={option.value} label={option.label}>
                  <Space>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: getColorForActionType(option.value),
                        borderRadius: 2
                      }}
                    />
                    <span>{option.label}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>- {option.description}</Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Position info (read-only) */}
          <Form.Item label="Position" style={{ marginBottom: 8 }}>
            <Space>
              <Tag>X: {selectedArea.x}</Tag>
              <Tag>Y: {selectedArea.y}</Tag>
              <Tag>W: {selectedArea.width}</Tag>
              <Tag>H: {selectedArea.height}</Tag>
            </Space>
          </Form.Item>

          {/* Color indicator */}
          <Form.Item label="Color" style={{ marginBottom: 8 }}>
            <Space>
              <div
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: actionColor,
                  borderRadius: 4,
                  border: '1px solid #d9d9d9'
                }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>Auto-derived from action type</Text>
            </Space>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '8px 0' }} />
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEditArea?.(selectedArea)}>
            Advanced
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteArea?.(selectedArea)}>
            Delete
          </Button>
        </Space>
      </Card>
    );
  }

  // Collision Area selected
  if (selectedCollisionArea) {
    return (
      <Card size="small" title={<Space><EditOutlined /> Collision Area</Space>}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text strong>Name:</Text>
            <Text style={{ marginLeft: 8 }}>{selectedCollisionArea.name}</Text>
          </div>
          <div>
            <Text strong>Type:</Text>
            <Text style={{ marginLeft: 8 }}>Impassable (blocks movement)</Text>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => onEditCollisionArea?.(selectedCollisionArea)}>
              Edit
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteCollisionArea?.(selectedCollisionArea)}>
              Delete
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  // Asset or other shape selected
  if (selectedShape) {
    return (
      <Card size="small" title={<Space><EditOutlined /> {selectedShape.category || 'Object'}</Space>}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text strong>Name:</Text>
            <Text style={{ marginLeft: 8 }}>{selectedShape.name || 'Unnamed'}</Text>
          </div>
          <div>
            <Text strong>Type:</Text>
            <Text style={{ marginLeft: 8 }}>{selectedShape.geometry.type}</Text>
          </div>
        </Space>
      </Card>
    );
  }

  return <Empty description="Object not found" />;
};

