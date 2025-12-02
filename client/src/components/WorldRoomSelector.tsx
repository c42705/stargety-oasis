import React from 'react';
import { Select, Space, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { WORLD_ROOMS, WorldRoomId } from '../shared/WorldRoomContext';

interface WorldRoomSelectorProps {
  value: WorldRoomId;
  onChange: (value: WorldRoomId) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

/**
 * WorldRoomSelector - Dropdown for selecting world room
 * 
 * Options:
 * - Stargety-Oasis-1 (default)
 * - Stargety-Oasis-2
 * - Stargety-Oasis-3
 */
export const WorldRoomSelector: React.FC<WorldRoomSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}) => {
  const options = WORLD_ROOMS.map(room => ({
    value: room.id,
    label: room.label,
  }));

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {showLabel && (
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          <GlobalOutlined style={{ marginRight: 4 }} />
          World Room
        </Typography.Text>
      )}
      <Select
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
        style={{ width: '100%' }}
        placeholder="Select a world room"
      />
    </Space>
  );
};

export default WorldRoomSelector;

