import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Image, message, Card, Typography, Space, Button, List, Checkbox, Spin } from 'antd';
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined, CloudOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';
import { MapApiService } from '../../../../services/api/MapApiService';
import { logger } from '../../../../shared/logger';

const { Text } = Typography;

type FileType = File;

interface AssetItem {
  id: string;
  fileName: string;
  imageData: string;
  width: number;
  height: number;
  uploadedAt: number;
  isFromApi?: boolean; // Track if asset is from API
  url?: string; // API asset URL
}

interface AssetsTabProps {
  onAssetUpload?: (file: UploadFile) => void;
  onPlaceAsset?: (fileData: string, fileName: string, width: number, height: number) => void;
  roomId?: string;
}

const ASSETS_STORAGE_KEY = 'map_editor_uploaded_assets';
const DEFAULT_ROOM_ID = 'default';

const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const AssetsTab: React.FC<AssetsTabProps> = ({ onAssetUpload, onPlaceAsset, roomId = DEFAULT_ROOM_ID }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [savedAssets, setSavedAssets] = useState<AssetItem[]>([]);
  const [autoPlace, setAutoPlace] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved assets from API (with localStorage fallback)
  useEffect(() => {
    const loadAssets = async () => {
      setIsLoading(true);
      logger.info('LOADING ASSETS', { roomId });

      try {
        // Try API first
        const result = await MapApiService.getAssets(roomId);

        if (result.success && result.data) {
          const apiAssets: AssetItem[] = result.data.map(asset => ({
            id: asset.id,
            fileName: asset.originalName,
            imageData: asset.url, // Use URL for API assets
            width: (asset.metadata as any)?.width || 100,
            height: (asset.metadata as any)?.height || 100,
            uploadedAt: new Date(asset.uploadedAt).getTime(),
            isFromApi: true,
            url: asset.url,
          }));

          logger.info('ASSETS LOADED FROM API', { count: apiAssets.length });
          setSavedAssets(apiAssets);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        logger.warn('API ASSET LOAD FAILED, FALLING BACK TO LOCALSTORAGE', error);
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
        if (saved) {
          const assets = JSON.parse(saved) as AssetItem[];
          logger.info('ASSETS LOADED FROM LOCALSTORAGE', { count: assets.length });
          setSavedAssets(assets);
        }
      } catch (error) {
        logger.error('FAILED TO LOAD ASSETS FROM LOCALSTORAGE', error);
      }

      setIsLoading(false);
    };

    loadAssets();
  }, [roomId]);

  // Save asset to library (API + localStorage fallback)
  const saveAssetToLibrary = useCallback(async (imageData: string, fileName: string, width: number, height: number) => {
    const newAsset: AssetItem = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      fileName,
      imageData,
      width,
      height,
      uploadedAt: Date.now(),
    };

    // Try to upload to API
    try {
      const blob = await fetch(imageData).then(r => r.blob());
      const file = new File([blob], fileName, { type: blob.type });

      const result = await MapApiService.uploadAsset(roomId, file, {
        width: String(width),
        height: String(height)
      });

      if (result.success && result.data) {
        newAsset.id = result.data.id;
        newAsset.isFromApi = true;
        newAsset.url = result.data.url;
        logger.info('ASSET UPLOADED TO API', { id: result.data.id, fileName });
      }
    } catch (error) {
      logger.warn('API UPLOAD FAILED, SAVING TO LOCALSTORAGE', error);
    }

    setSavedAssets(prev => {
      const updatedAssets = [...prev, newAsset];

      // Also save to localStorage as backup
      try {
        const localAssets = updatedAssets.filter(a => !a.isFromApi);
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(localAssets));
      } catch (error) {
        logger.error('FAILED TO SAVE ASSET TO LOCALSTORAGE', error);
        message.error('Failed to save asset to library. Storage quota may be exceeded.');
      }

      return updatedAssets;
    });
  }, [roomId]);

  // Delete asset from library
  const deleteAssetFromLibrary = useCallback(async (assetId: string) => {
    const asset = savedAssets.find(a => a.id === assetId);

    // Try to delete from API if it's an API asset
    if (asset?.isFromApi) {
      try {
        await MapApiService.deleteAsset(roomId, assetId);
        logger.info('ASSET DELETED FROM API', { assetId });
      } catch (error) {
        logger.warn('API DELETE FAILED', error);
      }
    }

    setSavedAssets(prev => {
      const updatedAssets = prev.filter(a => a.id !== assetId);

      try {
        const localAssets = updatedAssets.filter(a => !a.isFromApi);
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(localAssets));
        message.success('Asset removed from library');
      } catch (error) {
        logger.error('FAILED TO DELETE ASSET FROM LOCALSTORAGE', error);
      }

      return updatedAssets;
    });
  }, [roomId, savedAssets]);

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  // Place saved asset from library
  const handlePlaceSavedAsset = useCallback((asset: AssetItem) => {
    console.log(`[AssetsTab] Placing saved asset on map: ${asset.fileName}`);
    onPlaceAsset?.(asset.imageData, asset.fileName, asset.width, asset.height);
    message.success(`Placed "${asset.fileName}" on map`);
  }, [onPlaceAsset]);

  const beforeUpload = useCallback(async (file: File) => {
    console.log('[AssetsTab] beforeUpload called for file:', file.name, 'type:', file.type, 'size:', file.size);

    // Validate file type
    const isValidType = file.type === 'image/png' || file.type === 'image/gif';
    if (!isValidType) {
      console.log('[AssetsTab] File type validation failed:', file.type);
      message.error('You can only upload PNG or GIF files!');
      return Upload.LIST_IGNORE;
    }

    // Validate file size (2MB max)
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      console.log('[AssetsTab] File size validation failed:', file.size);
      message.error('Image must be smaller than 2MB!');
      return Upload.LIST_IGNORE;
    }

    console.log('[AssetsTab] File validation passed, processing file...');

    // Process the file immediately since ImgCrop handles the cropping
    // and we don't want to do an actual HTTP upload
    try {
      const imageData = await getBase64(file);
      console.log('[AssetsTab] File converted to base64, length:', imageData.length);

      // Load image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        console.log(`[AssetsTab] Image loaded in beforeUpload: ${file.name} (${img.width}x${img.height})`);

        // Save to library
        saveAssetToLibrary(imageData, file.name, img.width, img.height);

        // Place on map if auto-place is enabled
        if (autoPlace) {
          console.log(`[AssetsTab] Auto-placing asset on map from beforeUpload: ${file.name}`);
          onPlaceAsset?.(imageData, file.name, img.width, img.height);
          message.success(`Uploaded and placed "${file.name}" on map`);
        } else {
          message.success(`Uploaded "${file.name}" to library`);
        }
      };
      img.onerror = () => {
        console.error(`[AssetsTab] Failed to load image in beforeUpload: ${file.name}`);
        message.error('Failed to load image');
      };
      img.src = imageData;
    } catch (error) {
      console.error('[AssetsTab] Error processing file in beforeUpload:', error);
      message.error('Failed to process image');
    }

    return false; // Prevent auto upload
  }, [saveAssetToLibrary, autoPlace, onPlaceAsset]);

  const handleChange: UploadProps['onChange'] = useCallback((info: Parameters<NonNullable<UploadProps['onChange']>>[0]) => {
    console.log('[AssetsTab] handleChange called:', {
      fileCount: info.fileList.length,
      latestFile: info.fileList[info.fileList.length - 1]?.name,
      latestFileStatus: info.fileList[info.fileList.length - 1]?.status
    });

    const newFileList = info.fileList;
    setFileList(newFileList);

    // Get the latest file
    const latestFile = newFileList[newFileList.length - 1];

    // Call the optional onAssetUpload callback
    onAssetUpload?.(latestFile);

    // Note: File processing is now handled in beforeUpload
    // This ensures it works correctly with ImgCrop
  }, [onAssetUpload]);

  console.log('[AssetsTab] Rendering component. Current state:', {
    savedAssetsCount: savedAssets.length,
    fileListCount: fileList.length,
    autoPlace
  });

  if (isLoading) {
    return (
      <div className="editor-tab-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Spin tip="Loading assets..." />
      </div>
    );
  }

  return (
    <div className="editor-tab-content">
      {/* Asset Library - Always Visible */}
      <Card
        title={
          <Space>
            <span>Asset Library ({savedAssets.length})</span>
            {savedAssets.some(a => a.isFromApi) && <CloudOutlined style={{ color: '#1890ff' }} title="Synced with server" />}
          </Space>
        }
        size="small"
        extra={
          <Checkbox
            checked={autoPlace}
            onChange={(e) => setAutoPlace(e.target.checked)}
          >
            <Text style={{ fontSize: '11px' }}>Auto-place after upload</Text>
          </Checkbox>
        }
      >
        <List
          grid={{ gutter: 12, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 3 }}
          dataSource={savedAssets}
          header={
              <ImgCrop
                rotationSlider
                aspectSlider
                showReset
                quality={1}
                fillColor="transparent"
                modalTitle="Crop Image"
                modalOk="Crop & Upload"
                maxZoom={5}
              >
                <Upload
                  fileList={fileList}
                  onPreview={handlePreview}
                  onChange={handleChange}
                  beforeUpload={beforeUpload}
                  accept=".png,.gif"
                  multiple
                  showUploadList={false}
                >
                  <Card
                    hoverable
                    size="small"
                    style={{
                      width: '100%',
                      cursor: 'pointer'
                    }}
                    styles={{
                      body: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px'
                      }
                    }}
                  >
                    <PlusOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                    <Text strong style={{ fontSize: '14px', marginBottom: 4 }}>
                      Upload Asset
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px', textAlign: 'center' }}>
                      PNG or GIF • Max 2MB
                    </Text>
                  </Card>
                </Upload>
              </ImgCrop>
          }
          renderItem={(asset) => (
            <List.Item>
              <Card
                hoverable
                size="small"
                cover={
                  <div style={{ position: 'relative' }}>
                    <img
                      alt={asset.fileName}
                      src={asset.imageData}
                      style={{
                        width: '100%',
                        height: 100,
                        objectFit: 'contain'                        
                      }}
                    />
                  </div>
                }
              >
                <Card.Meta
                  title={
                    <Text ellipsis style={{ fontSize: '12px' }}>
                      {asset.fileName}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {asset.width}x{asset.height}
                    </Text>
                  }
                />
                <Space style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} size="small">
                  <Button
                    type="primary"
                    size="small"
                    icon={<EnvironmentOutlined />}
                    onClick={() => handlePlaceSavedAsset(asset)}
                  >                   
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteAssetFromLibrary(asset.id)}
                  > 
                  </Button>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>

      {/* Preview Modal */}
      {previewImage && (
        <Image
          wrapperStyle={{ display: 'none' }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(''),
          }}
          src={previewImage}
        />
      )}
    </div>
  );
};

