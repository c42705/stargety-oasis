import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Image, message, Card, Typography, Space, Button, Tooltip, List } from 'antd';
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

  // Load saved assets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) {
        const assets = JSON.parse(saved) as AssetItem[];
        setSavedAssets(assets);
      }
    } catch (error) {
      console.error('Failed to load saved assets:', error);
    }
  }, []);

  // Save asset to library
  const saveAssetToLibrary = useCallback((imageData: string, fileName: string, width: number, height: number) => {
    const newAsset: AssetItem = {
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      imageData,
      width,
      height,
      uploadedAt: Date.now(),
    };

    const updatedAssets = [...savedAssets, newAsset];
    setSavedAssets(updatedAssets);

    try {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
    } catch (error) {
      console.error('Failed to save asset to library:', error);
      message.error('Failed to save asset to library. Storage quota may be exceeded.');
    }
  }, [savedAssets]);

  // Delete asset from library
  const deleteAssetFromLibrary = useCallback((assetId: string) => {
    const updatedAssets = savedAssets.filter(a => a.id !== assetId);
    setSavedAssets(updatedAssets);

    try {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
      message.success('Asset removed from library');
    } catch (error) {
      console.error('Failed to delete asset from library:', error);
    }
  }, [savedAssets]);

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
        // Save to library
        saveAssetToLibrary(imageData, file.name, img.width, img.height);

        // Place on map
        onPlaceAsset?.(imageData, file.name, img.width, img.height);
        message.success(`Placed "${file.name}" on map`);
      };
      img.onerror = () => {
        message.error('Failed to load image');
      };
      img.src = imageData;
    } catch (error) {
      message.error('Failed to place asset on map');
    }
  }, [onPlaceAsset, saveAssetToLibrary]);

  // Place saved asset from library
  const handlePlaceSavedAsset = useCallback((asset: AssetItem) => {
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
          title="Asset Library"
          size="small"
        >
          <List
            grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 4, xl: 5, xxl: 6 }}
            dataSource={savedAssets}
            renderItem={(asset) => (
              <List.Item>
                <Card
                  hoverable
                  size="small"
                  cover={
                    <img
                      alt={asset.fileName}
                      src={asset.imageData}
                      style={{
                        width: '100%',
                        height: 80,
                        objectFit: 'cover',
                      }}
                    />
                  }
                  actions={[
                    <Tooltip key="place" title="Place on Map">
                      <Button
                        type="text"
                        size="small"
                        icon={<EnvironmentOutlined />}
                        onClick={() => handlePlaceSavedAsset(asset)}
                      />
                    </Tooltip>,
                    <Tooltip key="delete" title="Remove from Library">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteAssetFromLibrary(asset.id)}
                      />
                    </Tooltip>,
                  ]}
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
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};
