import React, { useState, useCallback, useEffect } from 'react';
import { logger } from '../../../shared/logger';
import {
  Card,
  Space,
  Button,
  Row,
  Col,
  Progress,
  Alert,
  Badge,
  Tooltip,
  Modal,
  message,
  Upload
} from 'antd';
import {
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  uploadBackgroundImage,
  setUploadStatus,
  resetUploadStatus,
  saveMap
} from '../../../redux/slices/mapSlice';
import { useMapData } from '../../../shared/MapDataContext';
import { useSharedMap } from '../../../shared/useSharedMap';
import { useWorldDimensions } from '../../../shared/useWorldDimensions';

const { Dragger } = Upload;

interface EnhancedBackgroundUploadProps {
  onUploadComplete?: (dimensions: { width: number; height: number }) => void;
  onError?: (error: string) => void;
}

export const EnhancedBackgroundUpload: React.FC<EnhancedBackgroundUploadProps> = ({
  onUploadComplete,
  onError
}) => {
  const dispatch = useAppDispatch();
  const { mapData } = useMapData();
  const sharedMap = useSharedMap({ source: 'editor' });
  const worldDimensions = useWorldDimensions();
  
  const uploadStatus = useAppSelector((state: any) => state.map.uploadStatus);
  const isSaving = useAppSelector((state: any) => state.map.isLoading);

  // Local state for Apply vs Save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Reset upload status when component unmounts
  useEffect(() => {
    return () => {
      dispatch(resetUploadStatus());
    };
  }, [dispatch]);

  // Handle file upload with progress tracking
  const handleFileUpload = useCallback(async (file: File) => {
    logger.info('ENHANCED BACKGROUND UPLOAD STARTED', { 
      fileName: file.name, 
      size: file.size,
      type: file.type 
    });

    try {
      // Dispatch the upload with progress tracking
      const result = await dispatch(uploadBackgroundImage(file) as any).unwrap();
      
      logger.info('UPLOAD COMPLETED SUCCESSFULLY', { 
        dimensions: result.dimensions 
      });
      
      setHasUnsavedChanges(true);
      
      if (onUploadComplete) {
        onUploadComplete(result.dimensions);
      }
      
      return false; // Prevent default upload behavior
    } catch (error) {
      logger.error('UPLOAD FAILED', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      if (onError) {
        onError(errorMessage);
      } else {
        message.error(errorMessage);
      }
      
      return false; // Prevent default upload behavior
    }
  }, [dispatch, onUploadComplete, onError]);

  // Handle Apply button - immediate re-render without persistence
  const handleApply = useCallback(() => {
    if (!uploadStatus.dimensions || uploadStatus.status !== 'completed') {
      message.warning('Please upload an image first');
      return;
    }

    logger.info('APPLYING BACKGROUND IMAGE FOR IMMEDIATE RENDER', {
      dimensions: uploadStatus.dimensions,
      fileName: uploadStatus.fileName
    });

    // Update the map data immediately for rendering
    sharedMap.updateMapData({
      backgroundImage: mapData.backgroundImage,
      backgroundImageDimensions: uploadStatus.dimensions
    });

    // Update world dimensions to match background
    worldDimensions.updateBackgroundDimensions(uploadStatus.dimensions, {
      source: 'system',
      skipPersistence: true
    });

    message.success('Background applied for immediate rendering');
    setHasUnsavedChanges(false);
  }, [uploadStatus, mapData, sharedMap, worldDimensions]);

  // Handle Save button - with confirmation and persistence
  const handleSave = useCallback(async () => {
    if (!uploadStatus.dimensions || uploadStatus.status !== 'completed') {
      message.warning('Please upload an image first');
      return;
    }

    // Show confirmation dialog
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: 'Save Background Image',
        content: `Save the background image "${uploadStatus.fileName}" (${uploadStatus.dimensions.width}×${uploadStatus.dimensions.height}) to the database?`,
        icon: <SaveOutlined />,
        okText: 'Save',
        cancelText: 'Cancel',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
        okButtonProps: {
          loading: isSaving,
        }
      });
    });

    if (!confirmed) return;

    try {
      logger.info('SAVING BACKGROUND IMAGE TO DATABASE', {
        dimensions: uploadStatus.dimensions,
        fileName: uploadStatus.fileName
      });

      // Save to database
      await dispatch(saveMap()).unwrap();
      
      // Also update shared map with current background
      await sharedMap.updateMapData({
        backgroundImage: mapData.backgroundImage,
        backgroundImageDimensions: uploadStatus.dimensions
      });

      setHasUnsavedChanges(false);
      message.success('Background image saved successfully');
      
      if (onUploadComplete) {
        onUploadComplete(uploadStatus.dimensions);
      }
    } catch (error) {
      logger.error('SAVE FAILED', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save background';
      message.error(errorMessage);
    }
  }, [uploadStatus, mapData, sharedMap, dispatch, isSaving, onUploadComplete]);

  // Reset upload
  const handleReset = useCallback(() => {
    dispatch(resetUploadStatus());
    setHasUnsavedChanges(false);
    message.info('Upload reset');
  }, [dispatch]);

  // Get status icon and color
  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'pending':
      case 'in-progress':
        return <UploadOutlined spin />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <UploadOutlined />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in-progress':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (uploadStatus.status) {
      case 'idle':
        return 'Ready to upload';
      case 'pending':
        return 'Preparing upload...';
      case 'in-progress':
        return 'Uploading...';
      case 'completed':
        return 'Upload completed';
      case 'failed':
        return 'Upload failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <Card
      title={
        <Space>
          <span>Background Image Upload</span>
          {uploadStatus.status !== 'idle' && (
            <Badge 
              status={getStatusColor() as any} 
              text={getStatusText()} 
            />
          )}
        </Space>
      }
      size="small"
      extra={
        uploadStatus.status !== 'idle' && (
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleReset}
            title="Reset upload"
          />
        )
      }
    >
      {/* Upload Area */}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* File Upload */}
        <Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file: any) => handleFileUpload(file)}
          disabled={uploadStatus.status === 'in-progress'}
          style={{
            background: uploadStatus.status === 'in-progress' ? '#f0f0f0' : 'transparent'
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">
            {uploadStatus.status === 'in-progress' 
              ? 'Processing image...' 
              : 'Click or drag image files to upload'
            }
          </p>
          <p className="ant-upload-hint">
            Support for JPG, PNG, GIF, WebP. Max 5MB.
          </p>
        </Dragger>

        {/* Progress Indicator */}
        {uploadStatus.status === 'in-progress' && (
          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Space>
                  <span>{uploadStatus.fileName}</span>
                  <Tooltip title={`${uploadStatus.progress}%`}>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {uploadStatus.progress}%
                    </span>
                  </Tooltip>
                </Space>
                <Progress 
                  percent={uploadStatus.progress} 
                  size="small" 
                  status="active"
                  showInfo={false}
                />
              </div>
            </Space>
          </div>
        )}

        {/* Upload Results */}
        {uploadStatus.status === 'completed' && uploadStatus.dimensions && (
          <Alert
            message="Upload completed successfully"
            description={
              <Space direction="vertical" size="small">
                <div>
                  <strong>File:</strong> {uploadStatus.fileName}
                </div>
                <div>
                  <strong>Dimensions:</strong> {uploadStatus.dimensions.width} × {uploadStatus.dimensions.height} pixels
                </div>
                <div>
                  <strong>Aspect Ratio:</strong> {(uploadStatus.dimensions.width / uploadStatus.dimensions.height).toFixed(2)}:1
                </div>
              </Space>
            }
            type="success"
            showIcon
            action={
              <Button size="small" onClick={handleReset}>
                Upload Another
              </Button>
            }
          />
        )}

        {/* Upload Error */}
        {uploadStatus.status === 'failed' && uploadStatus.error && (
          <Alert
            message="Upload failed"
            description={uploadStatus.error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleReset}>
                Try Again
              </Button>
            }
          />
        )}

        {/* Action Buttons */}
        {uploadStatus.status === 'completed' && (
          <Row gutter={12} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Button
                type="default"
                icon={<EyeOutlined />}
                block
                onClick={handleApply}
                title="Apply background for immediate rendering"
              >
                Apply
              </Button>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                block
                onClick={handleSave}
                loading={isSaving}
                disabled={!hasUnsavedChanges}
                title="Save background to database"
              >
                Save
              </Button>
            </Col>
          </Row>
        )}

        {/* Current Background Info */}
        {mapData.backgroundImage && (
          <div style={{ 
            marginTop: 16, 
            padding: 12,             
            borderRadius: 4,
            fontSize: '12px'
          }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Current Background:</strong>
            </div>
            <div>
              {mapData.backgroundImageDimensions ? (
                `${mapData.backgroundImageDimensions.width} × ${mapData.backgroundImageDimensions.height} pixels`
              ) : (
                <span style={{ color: '#ffffffa8' }}>Dimensions unknown</span>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <Badge 
                status={hasUnsavedChanges ? 'warning' : 'success'} 
                text={hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'} 
              />
            </div>
          </div>
        )}

        {/* Help Text */}
        <div style={{ 
          fontSize: '11px', 
          color: '#666',
          marginTop: 8,
          lineHeight: '1.4'
        }}>
          <strong>How it works:</strong>
          <ul style={{ margin: '4px 0 0 16px' }}>
            <li><strong>Apply:</strong> Shows the new background immediately without saving</li>
            <li><strong>Save:</strong> Persists the background to the database</li>
            <li>Images are automatically optimized for performance</li>
            <li>Map dimensions can be automatically adjusted to match</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};