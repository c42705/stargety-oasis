import React, { useState } from 'react';
import { Modal, Tabs, Image, Upload, Card, message, Row, Col, Typography, Space } from 'antd';
import type { UploadProps, UploadFile, GetProp } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import AvatarPreview from './AvatarPreview';
import { ASSET_DIMENSIONS, AvatarConfig, DEFAULT_AVATAR_CONFIG, LayerId, fileToDataUrl } from './avatarTypes';
type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

interface AssetOption {
  key: string;
  src: string; // URL to server-hosted asset
  label?: string;
}

interface AvatarCustomizerModalProps {
  open: boolean;
  initialConfig?: AvatarConfig;
  onOk: (config: AvatarConfig) => void;
  onCancel: () => void;
}

const placeholderAssets: Record<LayerId, AssetOption[]> = {
  base: [
    { key: 'base-1', src: 'https://placehold.co/128x128/f4c2a1/ffffff.png?text=👤' },
    { key: 'base-2', src: 'https://placehold.co/128x128/d4a574/ffffff.png?text=👤' },
    { key: 'base-3', src: 'https://placehold.co/128x128/8b4513/ffffff.png?text=👤' },
  ],
  hair: [
    { key: 'hair-1', src: 'https://placehold.co/128x128/8b4513/ffffff.png?text=💇' },
    { key: 'hair-2', src: 'https://placehold.co/128x128/ffd700/000000.png?text=💇' },
    { key: 'hair-3', src: 'https://placehold.co/128x128/000000/ffffff.png?text=💇' },
  ],
  accessories: [
    { key: 'acc-1', src: 'https://placehold.co/128x128/ff69b4/ffffff.png?text=👓' },
    { key: 'acc-2', src: 'https://placehold.co/128x128/ffd700/000000.png?text=👑' },
    { key: 'acc-3', src: 'https://placehold.co/128x128/32cd32/ffffff.png?text=🎩' },
  ],
  clothes: [
    { key: 'clo-1', src: 'https://placehold.co/128x128/1e90ff/ffffff.png?text=👔' },
    { key: 'clo-2', src: 'https://placehold.co/128x128/32cd32/ffffff.png?text=👕' },
    { key: 'clo-3', src: 'https://placehold.co/128x128/ff4500/ffffff.png?text=🧥' },
  ],
};

const TabTitle: React.FC<{ title: string; dims: { width: number; height: number } }>=({title,dims})=> (
  
    <span>{title}</span>    
  
);

const gridCardStyle: React.CSSProperties = {
  width: 88,
  height: 88,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const AssetGrid: React.FC<{
  options: AssetOption[];
  onPick: (src: string) => void;
  showNoneOption?: boolean;
  onPickNone?: () => void;
}> = ({ options, onPick, showNoneOption = false, onPickNone }) => {
  return (
    <Row gutter={[8,8]}>
      {showNoneOption && (
        <Col key="none">
          <Card
            hoverable
            size="small"
            style={{
              ...gridCardStyle,
              borderColor: '#d9d9d9',
              borderStyle: 'dashed'
            }}
            onClick={onPickNone}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 72,
              color: '#ffffff4b'
            }}>
              <CloseOutlined style={{ fontSize: 24, marginBottom: 4 }} />
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>None</Typography.Text>
            </div>
          </Card>
        </Col>
      )}
      {options.map((opt) => (
        <Col key={opt.key}>
          <Card hoverable size="small" style={gridCardStyle} onClick={() => onPick(opt.src)}>
            <Image src={opt.src} preview={false} width={72} height={72} style={{ imageRendering: 'pixelated' }}/>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

const getBase64 = (file: FileType): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const CroppableUpload: React.FC<{ layer: LayerId; onPicked: (dataUrl: string) => void }> = ({ layer, onPicked }) => {
  const dims = ASSET_DIMENSIONS[layer];
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const beforeUpload = async (file: FileType) => {
    try {
      // Convert cropped file to data URL and validate
      const dataUrl = await fileToDataUrl(file);
      onPicked(dataUrl);
      message.success('Image cropped and loaded successfully');
    } catch (err: any) {
      message.error(err.message || 'Upload failed');
    }
    return false; // Prevent automatic upload
  };

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  return (
    <div style={{ marginTop: 8 }}>
      <Typography.Text style={{ display: 'block', marginBottom: 8 }}>
        Upload Custom ({dims.width}x{dims.height}px)
      </Typography.Text>
      <ImgCrop
        rotationSlider
        aspect={dims.width / dims.height}
        quality={1}
        modalTitle="Crop Avatar Image"
        modalOk="Apply Crop"
      >
        <Upload
          listType="picture-card"
          fileList={fileList}
          onPreview={handlePreview}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          accept="image/*"
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
    </div>
  );
};

const normalizeConfig = (initial?: AvatarConfig): AvatarConfig => ({
  ...DEFAULT_AVATAR_CONFIG,
  ...(initial || {}),
});

const updateLayer = (config: AvatarConfig, layer: LayerId, src: string | null, enabled: boolean = true): AvatarConfig => ({
  ...config,
  [layer]: { enabled, src },
});

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({ open, initialConfig, onOk, onCancel }) => {
  const [config, setConfig] = useState<AvatarConfig>(normalizeConfig(initialConfig));

  // ensure state resets when opened with different initialConfig
  React.useEffect(() => {
    if (open) setConfig(normalizeConfig(initialConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConfig?.base?.src, initialConfig?.hair?.src, initialConfig?.clothes?.src, initialConfig?.accessories?.src]);

  const pick = (layer: LayerId, src: string) => setConfig((c) => updateLayer(c, layer, src, true));
  const pickUpload = (layer: LayerId) => (dataUrl: string) => setConfig((c) => updateLayer(c, layer, dataUrl, true));
  const pickNone = (layer: LayerId) => () => setConfig((c) => updateLayer(c, layer, null, false));

  const tabs = (
    <Tabs
      tabPosition="top"
      items={(
        [
          { key: 'base', title: 'Base Character' as const },
          { key: 'hair', title: 'Hair Styles' as const },
          { key: 'clothes', title: 'Clothes' as const },
          { key: 'accessories', title: 'Accessories' as const },          
        ] as { key: LayerId; title: string }[]
      ).map(({ key, title }) => ({
        key,
        label: <TabTitle title={title} dims={ASSET_DIMENSIONS[key]} />,
        children: (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <AssetGrid
              options={placeholderAssets[key]}
              onPick={(src)=>pick(key, src)}
              showNoneOption={key !== 'base'} // Show "None" for all layers except base
              onPickNone={pickNone(key)}
            />
            <CroppableUpload layer={key} onPicked={pickUpload(key)} />
          </Space>
        )
      }))}
    />
  );

  return (
    <Modal
      title="Character Customization"
      open={open}
      onOk={() => onOk({ ...config, updatedAt: new Date().toISOString() })}
      onCancel={onCancel}
      width={600}
      okText="Save Changes"
      cancelText="Cancel"
      
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AvatarPreview
          config={config}
        />
        <Card size="small" >
          {tabs}
        </Card>
      </div>
    </Modal>
  );
};

export default AvatarCustomizerModal;

