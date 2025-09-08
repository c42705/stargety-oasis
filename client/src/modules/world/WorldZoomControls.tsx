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
 * Zoom controls specifically designed for the WorldModule Phaser.js game
 * Positioned in the lower right corner of the map view
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
  return (
    <div 
      className={`world-zoom-controls ${className}`}
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 1000,
        background: 'var(--color-bg-secondary)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(var(--color-bg-secondary-rgb), 0.9)'
      }}
    >
      <Space direction="vertical" size="small">
        {/* Zoom In Button */}
        <Tooltip title="Zoom In" placement="left">
          <Button
            type="text"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => {
              console.log('🔘 ZOOM IN BUTTON CLICKED');
              onZoomIn();
            }}
            disabled={!canZoomIn}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          />
        </Tooltip>

        {/* Zoom Out Button */}
        <Tooltip title="Zoom Out" placement="left">
          <Button
            type="text"
            icon={<MinusOutlined />}
            size="small"
            onClick={() => {
              console.log('🔘 ZOOM OUT BUTTON CLICKED');
              onZoomOut();
            }}
            disabled={!canZoomOut}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          />
        </Tooltip>

        {/* Reset Zoom Button */}
        <Tooltip title="Reset Zoom & Center" placement="left">
          <Button
            type="text"
            icon={<ExpandOutlined />}
            size="small"
            onClick={() => {
              console.log('🔘 RESET ZOOM BUTTON CLICKED');
              onResetZoom();
            }}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          />
        </Tooltip>

        {/* Camera Follow Toggle Button */}
        <Tooltip title={isCameraFollowing ? "Disable Camera Follow" : "Enable Camera Follow"} placement="left">
          <Button
            type="text"
            icon={isCameraFollowing ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            size="small"
            onClick={() => {
              console.log('🔘 CAMERA FOLLOW TOGGLE CLICKED');
              onToggleCameraFollow();
            }}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCameraFollowing ? 'var(--color-accent)' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '6px',
              backgroundColor: isCameraFollowing ? 'rgba(var(--color-accent-rgb), 0.1)' : 'var(--color-bg-tertiary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isCameraFollowing ? 'rgba(var(--color-accent-rgb), 0.1)' : 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = isCameraFollowing ? 'var(--color-accent)' : 'var(--color-text-primary)';
            }}
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default WorldZoomControls;
