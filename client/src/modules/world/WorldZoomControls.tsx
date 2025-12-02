import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined, ExpandOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';


interface WorldZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleCameraFollow: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isCameraFollowing: boolean;
  className?: string;
}

/**
 * Simplified zoom controls for WorldModule (using Ant Design styling)
 */
export const WorldZoomControls: React.FC<WorldZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleCameraFollow,
  canZoomIn,
  canZoomOut,
  isCameraFollowing,
  className = ''
}) => {
  const controlStyle = {
    position: 'absolute' as const,
    bottom: '16px',
    right: '16px',
    zIndex: 1000,    
    borderRadius: '8px',
    padding: '8px',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)'
  };

  return (
    <div className={`world-zoom-controls ${className}`} style={controlStyle}>
      <Space direction="vertical" size="small">
        <Tooltip title="Zoom In" placement="left">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={onZoomIn}
            disabled={!canZoomIn}
          />
        </Tooltip>

        <Tooltip title="Zoom Out" placement="left">
          <Button
            type="primary"
            icon={<MinusOutlined />}
            size="small"
            onClick={onZoomOut}
            disabled={!canZoomOut}
          />
        </Tooltip>

        <Tooltip title="Reset Zoom" placement="left">
          <Button
            type="default"
            icon={<ExpandOutlined />}
            size="small"
            onClick={onResetZoom}
          />
        </Tooltip>

        <Tooltip title={isCameraFollowing ? "Disable Camera Follow" : "Enable Camera Follow"} placement="left">
          <Button
            type={isCameraFollowing ? "primary" : "default"}
            icon={isCameraFollowing ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            size="small"
            onClick={onToggleCameraFollow}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default WorldZoomControls;
