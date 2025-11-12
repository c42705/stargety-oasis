import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Image, message, Card, Typography, Space, Button, Tooltip, List, Checkbox } from 'antd';
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

  // Load saved assets from localStorage on mount
  // TODO: Migrate to database storage in the future
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) {
        const assets = JSON.parse(saved) as AssetItem[];
        console.log(`[AssetsTab] Loaded ${assets.length} assets from localStorage`);
        setSavedAssets(assets);
      } else {
        console.log('[AssetsTab] No saved assets found in localStorage');
      }
    } catch (error) {
      console.error('[AssetsTab] Failed to load saved assets:', error);
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

  const handlePlaceAsset = useCallback(async (file: UploadFile) => {
    try {
      let imageData: string;

      if (file.url) {
        imageData = file.url;
      } else if (file.preview) {
        imageData = file.preview;
      } else if (file.originFileObj) {
        imageData = await getBase64(file.originFileObj as FileType);
      } else {
        message.error('Unable to load image data');
        return;
      }

      // Load image to get dimensions
      const img = new window.Image();
      img.onload = () => {
        console.log(`[AssetsTab] Image loaded: ${file.name} (${img.width}x${img.height})`);

        // Save to library
        saveAssetToLibrary(imageData, file.name, img.width, img.height);

        // Place on map if auto-place is enabled
        if (autoPlace) {
          console.log(`[AssetsTab] Auto-placing asset on map: ${file.name}`);
          onPlaceAsset?.(imageData, file.name, img.width, img.height);
          message.success(`Uploaded and placed "${file.name}" on map`);
        } else {
          message.success(`Uploaded "${file.name}" to library`);
        }
      };
      img.onerror = () => {
        console.error(`[AssetsTab] Failed to load image: ${file.name}`);
        message.error('Failed to load image');
      };
      img.src = imageData;
    } catch (error) {
      console.error('[AssetsTab] Failed to place asset on map:', error);
      message.error('Failed to place asset on map');
    }
  }, [onPlaceAsset, saveAssetToLibrary, autoPlace]);

  // Place saved asset from library
  const handlePlaceSavedAsset = useCallback((asset: AssetItem) => {
    console.log(`[AssetsTab] Placing saved asset on map: ${asset.fileName}`);
    onPlaceAsset?.(asset.imageData, asset.fileName, asset.width, asset.height);
    message.success(`Placed "${asset.fileName}" on map`);
  }, [onPlaceAsset]);

  const beforeUpload = useCallback((file: File) => {
    // Validate file type
    const isValidType = file.type === 'image/png' || file.type === 'image/gif';
    if (!isValidType) {
      message.error('You can only upload PNG or GIF files!');
      return Upload.LIST_IGNORE;
    }

    // Validate file size (2MB max)
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Image must be smaller than 2MB!');
      return Upload.LIST_IGNORE;
    }

    return false; // Prevent auto upload
  }, []);

  const handleChange: UploadProps['onChange'] = useCallback((info: Parameters<NonNullable<UploadProps['onChange']>>[0]) => {
    const newFileList = info.fileList;
    setFileList(newFileList);
    onAssetUpload?.(newFileList[newFileList.length - 1]);
  }, [onAssetUpload]);

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  return (
    <div className="editor-tab-content">
      <Card
        title="Custom Assets"
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Upload custom images (.png or .gif) to place on your map. Max size: 800x800px, 2MB.
          </Text>

          <Checkbox
            checked={autoPlace}
            onChange={(e) => setAutoPlace(e.target.checked)}
          >
            <Text style={{ fontSize: '12px' }}>Automatically place on map after upload</Text>
          </Checkbox>

          <ImgCrop
            rotationSlider
            aspectSlider
            showReset
            quality={1}
            modalTitle="Crop Image"
            modalOk="Crop & Upload"
            maxZoom={3}
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onPreview={handlePreview}
              onChange={handleChange}
              beforeUpload={beforeUpload}
              accept=".png,.gif"
              multiple
              itemRender={(originNode, file) => (
                <div style={{ position: 'relative' }}>
                  {originNode}
                  {file.status === 'done' && (
                    <Tooltip title="Place on Map">
                      <Button
                        type="primary"
                        size="small"
                        icon={<EnvironmentOutlined />}
                        onClick={() => handlePlaceAsset(file)}
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 10,
                        }}
                      >
                        Place
                      </Button>
                    </Tooltip>
                  )}
                </div>
              )}
            >
              {fileList.length >= 8 ? null : uploadButton}
            </Upload>
          </ImgCrop>

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
        </Space>
      </Card>

      {/* Asset Library */}
      {savedAssets.length > 0 && (
        <Card
          title={`Asset Library (${savedAssets.length})`}
          size="small"
          extra={
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Click buttons to place or delete
            </Text>
          }
        >
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
            dataSource={savedAssets}
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
                          objectFit: 'contain',
                          backgroundColor: '#f5f5f5',
                          padding: '8px',
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
                      <Text type="secondary" style={{ fontSize: '11px' }}>
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
                      Place
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteAssetFromLibrary(asset.id)}
                    >
                      Delete
                    </Button>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

