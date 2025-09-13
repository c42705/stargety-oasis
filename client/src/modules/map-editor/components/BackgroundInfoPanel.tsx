import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Descriptions, Badge, Typography, Space, Tooltip } from 'antd';
import { 
  CloseOutlined, 
  InfoCircleOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { useSharedMap } from '../../../shared/useSharedMap';

const { Text, Title } = Typography;

interface BackgroundInfoPanelProps {
  isVisible: boolean;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundLoadingStatus: 'loading' | 'loaded' | 'failed' | 'none';
  backgroundVisible: boolean;
}

interface BackgroundMetadata {
  name: string;
  url: string;
  dimensions: { width: number; height: number } | null;
  format: string;
  fileSize: string;
  lastModified: string;
  loadingStatus: string;
  visibilityStatus: string;
}

export const BackgroundInfoPanel: React.FC<BackgroundInfoPanelProps> = ({
  isVisible,
  onClose,
  canvasWidth,
  canvasHeight,
  backgroundLoadingStatus,
  backgroundVisible
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const sharedMap = useSharedMap();

  // Extract background metadata
  const backgroundMetadata: BackgroundMetadata = useMemo(() => {
    const mapData = sharedMap.mapData;
    const backgroundImage = mapData?.backgroundImage;
    
    if (!backgroundImage) {
      return {
        name: 'No background image',
        url: 'N/A',
        dimensions: null,
        format: 'N/A',
        fileSize: 'N/A',
        lastModified: 'N/A',
        loadingStatus: 'No background',
        visibilityStatus: 'Hidden'
      };
    }

    // Extract filename from URL or path
    const urlParts = backgroundImage.split('/');
    const filename = urlParts[urlParts.length - 1] || 'Unknown';
    
    // Determine format from URL
    const formatMatch = backgroundImage.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
    const format = formatMatch ? formatMatch[1].toUpperCase() : 'Unknown';
    
    // Get dimensions from map data
    const dimensions = mapData?.backgroundImageDimensions || null;
    
    // Determine loading status
    const getLoadingStatus = () => {
      switch (backgroundLoadingStatus) {
        case 'loading': return 'Loading...';
        case 'loaded': return 'Successfully loaded';
        case 'failed': return 'Failed to load';
        case 'none': return 'No background';
        default: return 'Unknown';
      }
    };

    // Determine visibility status
    const getVisibilityStatus = () => {
      if (backgroundLoadingStatus === 'loaded' && backgroundVisible) {
        return 'Visible';
      } else if (backgroundLoadingStatus === 'loaded' && !backgroundVisible) {
        return 'Hidden';
      } else if (backgroundLoadingStatus === 'loading') {
        return 'Loading...';
      } else {
        return 'Not available';
      }
    };

    // Estimate file size (rough approximation for display purposes)
    const estimateFileSize = () => {
      if (dimensions && backgroundLoadingStatus === 'loaded') {
        const pixels = dimensions.width * dimensions.height;
        const estimatedBytes = pixels * 3; // Rough estimate for RGB
        if (estimatedBytes > 1024 * 1024) {
          return `~${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
        } else if (estimatedBytes > 1024) {
          return `~${(estimatedBytes / 1024).toFixed(1)} KB`;
        } else {
          return `~${estimatedBytes} bytes`;
        }
      }
      return 'Unknown';
    };

    return {
      name: filename,
      url: backgroundImage,
      dimensions,
      format,
      fileSize: estimateFileSize(),
      lastModified: mapData?.lastModified ? new Date(mapData.lastModified).toLocaleString() : 'Unknown',
      loadingStatus: getLoadingStatus(),
      visibilityStatus: getVisibilityStatus()
    };
  }, [sharedMap.mapData, backgroundLoadingStatus, backgroundVisible]);

  // Status badge color based on loading status
  const getStatusBadgeStatus = () => {
    switch (backgroundLoadingStatus) {
      case 'loaded': return 'success';
      case 'loading': return 'processing';
      case 'failed': return 'error';
      case 'none': return 'default';
      default: return 'default';
    }
  };

  // Visibility icon based on status
  const getVisibilityIcon = () => {
    return backgroundVisible ? <EyeOutlined /> : <EyeInvisibleOutlined />;
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        maxWidth: 400,
        minWidth: 300,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: 8,
      }}
    >
      <Card
        size="small"
        style={{
          
        }}
        title={
          <Space>
            <InfoCircleOutlined />
            <Text strong>Background Info</Text>
            <Badge status={getStatusBadgeStatus()} text={backgroundMetadata.loadingStatus} />
          </Space>
        }
        extra={
          <Space>
            <Tooltip title={isExpanded ? 'Collapse' : 'Expand'}>
              <Button
                type="text"
                size="small"
                icon={isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={() => setIsExpanded(!isExpanded)}
              />
            </Tooltip>
            <Tooltip title="Close panel">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={onClose}
              />
            </Tooltip>
          </Space>
        }
      >
        {isExpanded && (
          <Descriptions
            size="small"
            column={1}
            bordered
            style={{ fontSize: '12px' }}
          >
            <Descriptions.Item 
              label={
                <Space>
                  <Text strong>Image Name</Text>
                </Space>
              }
            >
              <Text code style={{ fontSize: '11px' }}>
                {backgroundMetadata.name}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>File Path/URL</Text>}
            >
              <Tooltip title={backgroundMetadata.url}>
                <Text 
                  code 
                  style={{ 
                    fontSize: '11px',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}
                >
                  {backgroundMetadata.url}
                </Text>
              </Tooltip>
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>Image Dimensions</Text>}
            >
              <Text>
                {backgroundMetadata.dimensions 
                  ? `${backgroundMetadata.dimensions.width} × ${backgroundMetadata.dimensions.height} px`
                  : 'Unknown'
                }
              </Text>
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>Canvas Dimensions</Text>}
            >
              <Text>{canvasWidth} × {canvasHeight} px</Text>
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>Format</Text>}
            >
              <Badge color="blue" text={backgroundMetadata.format} />
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>Estimated Size</Text>}
            >
              <Text>{backgroundMetadata.fileSize}</Text>
            </Descriptions.Item>

            <Descriptions.Item 
              label={
                <Space>
                  <Text strong>Visibility</Text>
                  {getVisibilityIcon()}
                </Space>
              }
            >
              <Badge 
                status={backgroundVisible ? 'success' : 'default'} 
                text={backgroundMetadata.visibilityStatus} 
              />
            </Descriptions.Item>

            <Descriptions.Item 
              label={<Text strong>Last Modified</Text>}
            >
              <Text style={{ fontSize: '11px' }}>
                {backgroundMetadata.lastModified}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        )}

        {!isExpanded && (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              <Text strong>Status:</Text>
              <Badge status={getStatusBadgeStatus()} text={backgroundMetadata.loadingStatus} />
            </Space>
            <Space>
              <Text strong>Visibility:</Text>
              {getVisibilityIcon()}
              <Text>{backgroundMetadata.visibilityStatus}</Text>
            </Space>
            <Space>
              <Text strong>Dimensions:</Text>
              <Text>
                {backgroundMetadata.dimensions 
                  ? `${backgroundMetadata.dimensions.width} × ${backgroundMetadata.dimensions.height}`
                  : 'Unknown'
                }
              </Text>
            </Space>
          </Space>
        )}
      </Card>
    </div>
  );
};
