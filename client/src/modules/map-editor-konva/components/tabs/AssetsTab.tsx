import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Image, message, Card, Typography, Space, Button, List, Checkbox } from 'antd';
import { PlusOutlined, EnvironmentOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';

const { Text } = Typography;

type FileType = File;

interface AssetItem {
  id: string;
  fileName: string;
  imageData: string;
  width: number;
  height: number;
  uploadedAt: number;
}

interface AssetsTabProps {
  onAssetUpload?: (file: UploadFile) => void;
  onPlaceAsset?: (fileData: string, fileName: string, width: number, height: number) => void;
}

const ASSETS_STORAGE_KEY = 'map_editor_uploaded_assets';

const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export const AssetsTab: React.FC<AssetsTabProps> = ({ onAssetUpload, onPlaceAsset }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [savedAssets, setSavedAssets] = useState<AssetItem[]>([]);
  const [autoPlace, setAutoPlace] = useState(true); // Auto-place uploaded images on map

  // Debug log whenever savedAssets changes
  useEffect(() => {
    console.log('[AssetsTab] savedAssets state changed:', {
      count: savedAssets.length,
      assets: savedAssets.map(a => ({ id: a.id, fileName: a.fileName }))
    });
  }, [savedAssets]);

  // Load saved assets from localStorage on mount
  // TODO: Migrate to database storage in the future
  useEffect(() => {
    console.log('[AssetsTab] Component mounted, loading assets from localStorage...');
    console.log('[AssetsTab] Storage key:', ASSETS_STORAGE_KEY);

    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      console.log('[AssetsTab] Raw localStorage data:', saved ? `${saved.substring(0, 100)}...` : 'null');

      if (saved) {
        const assets = JSON.parse(saved) as AssetItem[];
        console.log(`[AssetsTab] Successfully parsed ${assets.length} assets from localStorage:`,
          assets.map(a => ({ id: a.id, fileName: a.fileName, size: `${a.width}x${a.height}` }))
        );
        setSavedAssets(assets);
        console.log('[AssetsTab] State updated with loaded assets');
      } else {
        console.log('[AssetsTab] No saved assets found in localStorage (key does not exist or is null)');
      }
    } catch (error) {
      console.error('[AssetsTab] Failed to load saved assets:', error);
      console.error('[AssetsTab] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }, []);

  // Save asset to library
  // TODO: Migrate to database storage in the future
  const saveAssetToLibrary = useCallback((imageData: string, fileName: string, width: number, height: number) => {
    const newAsset: AssetItem = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      fileName,
      imageData,
      width,
      height,
      uploadedAt: Date.now(),
    };

    setSavedAssets(prev => {
      const updatedAssets = [...prev, newAsset];

      try {
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
        console.log(`[AssetsTab] Saved asset "${fileName}" to library. Total assets: ${updatedAssets.length}`);
      } catch (error) {
        console.error('[AssetsTab] Failed to save asset to library:', error);
        message.error('Failed to save asset to library. Storage quota may be exceeded.');
      }

      return updatedAssets;
    });
  }, []);

  // Delete asset from library
  // TODO: Migrate to database storage in the future
  const deleteAssetFromLibrary = useCallback((assetId: string) => {
    setSavedAssets(prev => {
      const updatedAssets = prev.filter(a => a.id !== assetId);

      try {
        localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
        console.log(`[AssetsTab] Deleted asset ${assetId}. Remaining assets: ${updatedAssets.length}`);
        message.success('Asset removed from library');
      } catch (error) {
        console.error('[AssetsTab] Failed to delete asset from library:', error);
      }

      return updatedAssets;
    });
  }, []);

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

  return (
    <div className="editor-tab-content">
      {/* Asset Library - Always Visible */}
      <Card
        title={`Asset Library (${savedAssets.length})`}
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

