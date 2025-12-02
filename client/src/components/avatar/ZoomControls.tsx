import React, { useState, useCallback, useEffect } from 'react';
import { Button, Space, Slider, Tooltip, InputNumber } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';



export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
  minScale: number;
  maxScale: number;
}

export interface ZoomControlsProps {
  zoomState: ZoomState;
  onZoomChange: (newState: ZoomState) => void;
  containerWidth?: number;
  containerHeight?: number;
  contentWidth?: number;
  contentHeight?: number;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  showSlider?: boolean;
  showPercentage?: boolean;
  showFitButtons?: boolean;
  disabled?: boolean;
}

/**
 * Reusable zoom controls component with zoom in/out buttons and percentage indicator
 */
export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomState,
  onZoomChange,
  containerWidth = 800,
  containerHeight = 600,
  contentWidth = 400,
  contentHeight = 400,
  style,
  size = 'middle',
  showSlider = true,
  showPercentage = true,
  showFitButtons = true,
  disabled = false
}) => {
  const [isSliderVisible, setIsSliderVisible] = useState(false);

  // Zoom step amount based on size
  const zoomStep = size === 'small' ? 0.1 : size === 'large' ? 0.5 : 0.25;

  // Calculate zoom percentage
  const zoomPercentage = Math.round(zoomState.scale * 100);

  // Zoom in function
  const zoomIn = useCallback(() => {
    if (disabled) return;
    
    const newScale = Math.min(zoomState.scale + zoomStep, zoomState.maxScale);
    
    // Calculate new offset to keep zoom centered
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    const scaleDiff = newScale - zoomState.scale;
    const newOffsetX = zoomState.offsetX - (centerX * scaleDiff);
    const newOffsetY = zoomState.offsetY - (centerY * scaleDiff);
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, zoomStep, disabled]);

  // Zoom out function
  const zoomOut = useCallback(() => {
    if (disabled) return;
    
    const newScale = Math.max(zoomState.scale - zoomStep, zoomState.minScale);
    
    // Calculate new offset to keep zoom centered
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    const scaleDiff = newScale - zoomState.scale;
    const newOffsetX = zoomState.offsetX - (centerX * scaleDiff);
    const newOffsetY = zoomState.offsetY - (centerY * scaleDiff);
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, zoomStep, disabled]);

  // Fit to container
  const fitToContainer = useCallback(() => {
    if (disabled) return;
    
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, zoomState.maxScale);
    
    // Center the content
    const scaledWidth = contentWidth * newScale;
    const scaledHeight = contentHeight * newScale;
    const newOffsetX = (containerWidth - scaledWidth) / 2;
    const newOffsetY = (containerHeight - scaledHeight) / 2;
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, contentWidth, contentHeight, disabled]);

  // Fit to actual size (100%)
  const fitToActualSize = useCallback(() => {
    if (disabled) return;
    
    const newScale = 1;
    
    // Center the content at 100% scale
    const scaledWidth = contentWidth * newScale;
    const scaledHeight = contentHeight * newScale;
    const newOffsetX = (containerWidth - scaledWidth) / 2;
    const newOffsetY = (containerHeight - scaledHeight) / 2;
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, contentWidth, contentHeight, disabled]);

  // Handle slider change
  const handleSliderChange = useCallback((value: number) => {
    if (disabled) return;
    
    const newScale = value / 100;
    
    // Calculate new offset to keep zoom centered
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    const scaleDiff = newScale - zoomState.scale;
    const newOffsetX = zoomState.offsetX - (centerX * scaleDiff);
    const newOffsetY = zoomState.offsetY - (centerY * scaleDiff);
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, disabled]);

  // Handle percentage input change
  const handlePercentageChange = useCallback((value: number | null) => {
    if (disabled || value === null) return;
    
    const newScale = Math.max(
      zoomState.minScale,
      Math.min(value / 100, zoomState.maxScale)
    );
    
    // Calculate new offset to keep zoom centered
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    const scaleDiff = newScale - zoomState.scale;
    const newOffsetX = zoomState.offsetX - (centerX * scaleDiff);
    const newOffsetY = zoomState.offsetY - (centerY * scaleDiff);
    
    onZoomChange({
      ...zoomState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [zoomState, onZoomChange, containerWidth, containerHeight, disabled]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) return;
      
      // Only handle if no input is focused
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            zoomIn();
            break;
          case '-':
            event.preventDefault();
            zoomOut();
            break;
          case '0':
            event.preventDefault();
            fitToActualSize();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, fitToActualSize, disabled]);

  const canZoomIn = zoomState.scale < zoomState.maxScale;
  const canZoomOut = zoomState.scale > zoomState.minScale;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <Space size="small">
        {/* Zoom Out Button */}
        <Tooltip title="Zoom Out (Ctrl/Cmd + -)">
          <Button
            type="text"
            icon={<ZoomOutOutlined />}
            size={size}
            onClick={zoomOut}
            disabled={disabled || !canZoomOut}
          />
        </Tooltip>

        {/* Zoom Percentage Display/Input */}
        {showPercentage && (
          <div style={{ minWidth: 60 }}>
            <InputNumber
              size={size}
              value={zoomPercentage}
              min={Math.round(zoomState.minScale * 100)}
              max={Math.round(zoomState.maxScale * 100)}
              formatter={(value) => `${value}%`}
              parser={(value) => parseInt(value?.replace('%', '') || '100')}
              onChange={handlePercentageChange}
              disabled={disabled}
              style={{ width: '100%' }}
              controls={false}
            />
          </div>
        )}

        {/* Zoom In Button */}
        <Tooltip title="Zoom In (Ctrl/Cmd + +)">
          <Button
            type="text"
            icon={<ZoomInOutlined />}
            size={size}
            onClick={zoomIn}
            disabled={disabled || !canZoomIn}
          />
        </Tooltip>

        {/* Fit Buttons */}
        {showFitButtons && (
          <>
            <Tooltip title="Fit to Container">
              <Button
                type="text"
                icon={<CompressOutlined />}
                size={size}
                onClick={fitToContainer}
                disabled={disabled}
              />
            </Tooltip>

            <Tooltip title="Actual Size (Ctrl/Cmd + 0)">
              <Button
                type="text"
                icon={<ExpandOutlined />}
                size={size}
                onClick={fitToActualSize}
                disabled={disabled}
              />
            </Tooltip>
          </>
        )}

        {/* Zoom Slider Toggle */}
        {showSlider && (
          <Tooltip title="Show Zoom Slider">
            <Button
              type="text"
              size={size}
              onClick={() => setIsSliderVisible(!isSliderVisible)}
              disabled={disabled}
            >
              {isSliderVisible ? '−' : '+'}
            </Button>
          </Tooltip>
        )}
      </Space>

      {/* Zoom Slider */}
      {showSlider && isSliderVisible && (
        <div style={{ width: 120, marginLeft: 8 }}>
          <Slider
            min={Math.round(zoomState.minScale * 100)}
            max={Math.round(zoomState.maxScale * 100)}
            value={zoomPercentage}
            onChange={handleSliderChange}
            disabled={disabled}
            tooltip={{ formatter: (value) => `${value}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing zoom state
 */
export const useZoomState = (
  initialScale: number = 1,
  minScale: number = 0.1,
  maxScale: number = 5
): [ZoomState, (newState: ZoomState) => void] => {
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: initialScale,
    offsetX: 0,
    offsetY: 0,
    minScale,
    maxScale
  });

  return [zoomState, setZoomState];
};

/**
 * Utility function to apply zoom transform to an element
 */
export const applyZoomTransform = (
  element: HTMLElement | null,
  zoomState: ZoomState
): void => {
  if (!element) return;
  
  element.style.transform = `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px) scale(${zoomState.scale})`;
  element.style.transformOrigin = '0 0';
};

export default ZoomControls;
