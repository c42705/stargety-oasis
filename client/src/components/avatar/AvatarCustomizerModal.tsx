import React, { useState } from 'react';
import { Modal, Tabs, Image, Upload, Card, message, Row, Col, Typography, Space } from 'antd';
import type { UploadProps } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import AvatarPreview from './AvatarPreview';
import { ASSET_DIMENSIONS, AvatarConfig, DEFAULT_AVATAR_CONFIG, LayerId, validatePngDimensions, fileToDataUrl } from './avatarTypes';

const { Dragger } = Upload;

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
    { key: 'base-1', src: 'https://placehold.co/128x128/2b2e3b/ffffff.png?text=Base+1' },
    { key: 'base-2', src: 'https://placehold.co/128x128/3b2e2e/ffffff.png?text=Base+2' },
  ],
  hair: [
    { key: 'hair-1', src: 'https://placehold.co/128x128/000000/ffffff.png?text=Hair+1' },
    { key: 'hair-2', src: 'https://placehold.co/128x128/222222/ffffff.png?text=Hair+2' },
  ],
  accessories: [
    { key: 'acc-1', src: 'https://placehold.co/128x128/ff69b4/ffffff.png?text=Glasses' },
    { key: 'acc-2', src: 'https://placehold.co/128x128/ffd700/000000.png?text=Hat' },
  ],
  clothes: [
    { key: 'clo-1', src: 'https://placehold.co/128x128/1e90ff/ffffff.png?text=Jacket' },
    { key: 'clo-2', src: 'https://placehold.co/128x128/32cd32/ffffff.png?text=Shirt' },
  ],
};

const TabTitle: React.FC<{ title: string; dims: { width: number; height: number } }>=({title,dims})=> (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <span>{title}</span>
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dims.width}x{dims.height}px PNG</Typography.Text>
  </div>
);

const gridCardStyle: React.CSSProperties = {
  width: 88,
  height: 88,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-bg-tertiary)',
  borderColor: 'var(--color-border-light)'
};

const AssetGrid: React.FC<{ options: AssetOption[]; onPick: (src: string) => void }>=({ options, onPick })=> {
  return (
    <Row gutter={[8,8]}>
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

const UploadDragger: React.FC<{ layer: LayerId; onPicked: (dataUrl: string) => void }>=({ layer, onPicked })=> {
  const dims = ASSET_DIMENSIONS[layer];
  const props: UploadProps = {
    multiple: false,
    accept: 'image/png',
    beforeUpload: async (file) => {
      try {
        await validatePngDimensions(file, dims);
        const dataUrl = await fileToDataUrl(file);
        onPicked(dataUrl);
        message.success('Image validated and loaded');
      } catch (err: any) {
        message.error(err.message || 'Validation failed');
      }
      return Upload.LIST_IGNORE; // prevent automatic upload
    },
    itemRender: () => null,
    showUploadList: false,
  };
  return (
    <div style={{ marginTop: 8 }}>
      <Typography.Text>Upload Custom ({dims.width}x{dims.height}px PNG)</Typography.Text>
      <Dragger {...props} style={{ background: 'var(--color-bg-tertiary)' }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Click or drag PNG to this area</p>
        <p className="ant-upload-hint">We will validate dimensions and preview it instantly</p>
      </Dragger>
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

  const tabs = (
    <Tabs
      tabPosition="top"
      items={(
        [
          { key: 'base', title: 'Base Character' as const },
          { key: 'hair', title: 'Hair Styles' as const },
          { key: 'accessories', title: 'Accessories' as const },
          { key: 'clothes', title: 'Clothes' as const },
        ] as { key: LayerId; title: string }[]
      ).map(({ key, title }) => ({
        key,
        label: <TabTitle title={title} dims={ASSET_DIMENSIONS[key]} />,
        children: (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <AssetGrid options={placeholderAssets[key]} onPick={(src)=>pick(key, src)} />
            <UploadDragger layer={key} onPicked={pickUpload(key)} />
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
      width={900}
      okText="Save Changes"
      cancelText="Cancel"
      styles={{ body: { background: 'var(--color-bg-secondary)' } }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 16 }}>
        <AvatarPreview
          config={config}
          onToggleLayer={(layer, enabled)=> setConfig((c)=> ({...c, [layer]: { ...((c as any)[layer]||{}), enabled }} as AvatarConfig))}
        />
        <Card size="small" bordered style={{ background: 'var(--color-bg-secondary)' }}>
          {tabs}
        </Card>
      </div>
    </Modal>
  );
};

export default AvatarCustomizerModal;

