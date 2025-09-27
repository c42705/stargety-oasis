import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Tabs, Image, Upload, Card, message, Row, Col, Typography, Space, Button, Steps, Progress, Alert } from 'antd';
import type { UploadProps, UploadFile, GetProp } from 'antd';
import { PlusOutlined, CloseOutlined, BuildOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import AvatarPreview from './AvatarPreview';
import { GridOverlayComponent } from './GridOverlayComponent';
import { FrameSelectionTools } from './FrameSelectionTools';
import { FramePreviewSystem } from './FramePreviewSystem';
import { SpriteSheetProcessor } from './SpriteSheetProcessor';
import { FrameDetectionAlgorithms } from './FrameDetectionAlgorithms';
import { AvatarBuilderStorage } from './AvatarBuilderStorage';
import { UserGuidanceSystem } from './UserGuidanceSystem';
import { useModalRegistration } from '../../shared/ModalStateManager';
import {
  SpriteSheetDefinition,
  FrameDefinition,
  AnimationMapping,
  GridLayout,
  AnimationCategory,
  REQUIRED_ANIMATIONS
} from './AvatarBuilderTypes';
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
    { key: 'terra-branford', src: '/terra-branford.gif', label: 'Terra Branford' },
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Image src={opt.src} preview={false} width={72} height={72} style={{ imageRendering: 'pixelated' }}/>
              {opt.label && (
                <Typography.Text style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.2 }}>
                  {opt.label}
                </Typography.Text>
              )}
            </div>
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

// Avatar Builder state interface
interface BuilderState {
  currentStep: number;
  spriteSheetDefinition: Partial<SpriteSheetDefinition>;
  uploadProgress: number;
  isProcessing: boolean;
  validationErrors: string[];
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({ open, initialConfig, onOk, onCancel }) => {
  const [config, setConfig] = useState<AvatarConfig>(normalizeConfig(initialConfig));

  // Register this modal with the global modal state system
  useModalRegistration('avatar-customizer-modal', open, {
    type: 'modal',
    priority: 100,
    blockBackground: true
  });

  // Avatar Builder state
  const [builderState, setBuilderState] = useState<BuilderState>({
    currentStep: 0,
    spriteSheetDefinition: {},
    uploadProgress: 0,
    isProcessing: false,
    validationErrors: []
  });
  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [gridLayout, setGridLayout] = useState<GridLayout | null>(null);
  const [activeTab, setActiveTab] = useState<string>('base');

  // ensure state resets when opened with different initialConfig
  React.useEffect(() => {
    if (open) setConfig(normalizeConfig(initialConfig));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConfig?.base?.src, initialConfig?.hair?.src, initialConfig?.clothes?.src, initialConfig?.accessories?.src]);

  const pick = (layer: LayerId, src: string) => setConfig((c) => updateLayer(c, layer, src, true));
  const pickUpload = (layer: LayerId) => (dataUrl: string) => setConfig((c) => updateLayer(c, layer, dataUrl, true));
  const pickNone = (layer: LayerId) => () => setConfig((c) => updateLayer(c, layer, null, false));

  // Reset Avatar Builder state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setBuilderState({
        currentStep: 0,
        spriteSheetDefinition: {},
        uploadProgress: 0,
        isProcessing: false,
        validationErrors: []
      });
      setSelectedFrameIds([]);
      setGridLayout(null);
      setActiveTab('base');
    }
  }, [open]);

  // Avatar Builder file upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    setBuilderState(prev => ({ ...prev, isProcessing: true, uploadProgress: 0 }));

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setBuilderState(prev => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90)
        }));
      }, 100);

      // Load and process image
      const loadResult = await SpriteSheetProcessor.loadImage(file);

      clearInterval(progressInterval);
      setBuilderState(prev => ({ ...prev, uploadProgress: 100 }));

      if (!loadResult.success || !loadResult.data) {
        message.error(loadResult.error || 'Failed to load image');
        setBuilderState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      const img = loadResult.data;
      const metadata = SpriteSheetProcessor.extractMetadata(img, file);

      // Auto-detect frames
      const detectionResult = await FrameDetectionAlgorithms.detectFrames(img);

      const spriteSheetDefinition: Partial<SpriteSheetDefinition> = {
        name: `custom_avatar_${Date.now()}`,
        source: {
          id: `source_${Date.now()}`,
          name: file.name,
          originalFile: file,
          imageData: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          }),
          originalDimensions: metadata.originalDimensions,
          format: file.type,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        },
        frames: [],
        animations: [],
        defaultSettings: {
          frameRate: 8,
          loop: true,
          category: AnimationCategory.IDLE
        },
        validation: {
          isValid: false,
          errors: [],
          warnings: [],
          lastValidated: new Date().toISOString()
        },
        exportSettings: {
          format: 'png',
          quality: 1.0,
          optimization: true,
          includeMetadata: true
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'player' // TODO: Get actual username
      };

      setBuilderState(prev => ({
        ...prev,
        spriteSheetDefinition,
        isProcessing: false,
        currentStep: 1
      }));

      // Auto-suggest grid if detection was successful
      if (detectionResult.success && detectionResult.data?.suggestions && detectionResult.data.suggestions.length > 0) {
        const bestSuggestion = detectionResult.data.suggestions[0];
        setGridLayout({
          columns: bestSuggestion.columns,
          rows: bestSuggestion.rows,
          frameWidth: bestSuggestion.frameWidth,
          frameHeight: bestSuggestion.frameHeight,
          spacing: { x: 0, y: 0 },
          margin: { x: 0, y: 0 }
        });

        message.success(`Auto-detected ${bestSuggestion.columns}×${bestSuggestion.rows} grid layout`);
      }

    } catch (error) {
      message.error('Failed to process uploaded file');
      setBuilderState(prev => ({ ...prev, isProcessing: false }));
    }
  }, []);

  // Generate frames from grid
  const generateFramesFromGrid = useCallback(() => {
    if (!gridLayout || !builderState.spriteSheetDefinition.source) return;

    const frames: FrameDefinition[] = [];
    const totalFrames = gridLayout.columns * gridLayout.rows;

    for (let i = 0; i < totalFrames; i++) {
      const col = i % gridLayout.columns;
      const row = Math.floor(i / gridLayout.columns);

      const x = gridLayout.margin.x + col * (gridLayout.frameWidth + gridLayout.spacing.x);
      const y = gridLayout.margin.y + row * (gridLayout.frameHeight + gridLayout.spacing.y);

      const frame: FrameDefinition = {
        id: `frame_${i}`,
        name: `Frame ${i + 1}`,
        sourceRect: { x, y, width: gridLayout.frameWidth, height: gridLayout.frameHeight },
        outputRect: { x, y, width: gridLayout.frameWidth, height: gridLayout.frameHeight },
        transform: { rotation: 0, scaleX: 1, scaleY: 1, flipX: false, flipY: false },
        metadata: { isEmpty: false, hasTransparency: false, tags: [] },
        animationProperties: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      frames.push(frame);
    }

    setBuilderState(prev => ({
      ...prev,
      spriteSheetDefinition: {
        ...prev.spriteSheetDefinition,
        frames,
        gridLayout
      },
      currentStep: 2
    }));

    message.success(`Generated ${frames.length} frames`);
  }, [gridLayout, builderState.spriteSheetDefinition.source]);

  // Create default animations
  const createDefaultAnimations = useCallback(() => {
    const { frames } = builderState.spriteSheetDefinition;
    if (!frames || frames.length < 4) {
      message.error('Need at least 4 frames to create default animations');
      return;
    }

    const animations: AnimationMapping[] = [
      {
        id: 'idle',
        category: AnimationCategory.IDLE,
        name: 'Idle',
        sequence: { frameIds: [frames[1].id], frameRate: 1, loop: true, pingPong: false },
        priority: 1,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'walk_down',
        category: AnimationCategory.WALK_DOWN,
        name: 'Walk Down',
        sequence: { frameIds: frames.slice(0, 3).map(f => f.id), frameRate: 8, loop: true, pingPong: false },
        priority: 2,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Add more animations if we have enough frames
    if (frames.length >= 6) {
      animations.push({
        id: 'walk_left',
        category: AnimationCategory.WALK_LEFT,
        name: 'Walk Left',
        sequence: { frameIds: frames.slice(3, 6).map(f => f.id), frameRate: 8, loop: true, pingPong: false },
        priority: 2,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (frames.length >= 9) {
      animations.push({
        id: 'walk_up',
        category: AnimationCategory.WALK_UP,
        name: 'Walk Up',
        sequence: { frameIds: frames.slice(6, 9).map(f => f.id), frameRate: 8, loop: true, pingPong: false },
        priority: 2,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      animations.push({
        id: 'walk_right',
        category: AnimationCategory.WALK_RIGHT,
        name: 'Walk Right',
        sequence: { frameIds: frames.slice(3, 6).map(f => f.id), frameRate: 8, loop: true, pingPong: false },
        priority: 2,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setBuilderState(prev => ({
      ...prev,
      spriteSheetDefinition: {
        ...prev.spriteSheetDefinition,
        animations
      },
      currentStep: 3
    }));

    message.success(`Created ${animations.length} default animations`);
  }, [builderState.spriteSheetDefinition, setBuilderState]);

  // Handle Avatar Builder save
  const handleAvatarBuilderSave = useCallback(() => {
    const { spriteSheetDefinition } = builderState;

    // Validation
    const errors: string[] = [];

    if (!spriteSheetDefinition.source) {
      errors.push('No sprite sheet uploaded');
    }

    if (!spriteSheetDefinition.frames || spriteSheetDefinition.frames.length === 0) {
      errors.push('No frames defined');
    }

    if (!spriteSheetDefinition.animations || spriteSheetDefinition.animations.length === 0) {
      errors.push('No animations defined');
    }

    // Check required animations
    const requiredMissing = REQUIRED_ANIMATIONS.filter(category =>
      !spriteSheetDefinition.animations?.some(anim => anim.category === category)
    );

    if (requiredMissing.length > 0) {
      errors.push(`Missing required animations: ${requiredMissing.join(', ')}`);
    }

    if (errors.length > 0) {
      setBuilderState(prev => ({ ...prev, validationErrors: errors }));
      message.error('Please fix validation errors before saving');
      return;
    }

    // Save
    const completeDefinition: SpriteSheetDefinition = {
      ...spriteSheetDefinition as SpriteSheetDefinition,
      id: `avatar_player_${Date.now()}`
    };

    const saveResult = AvatarBuilderStorage.saveCharacterDefinition('player', completeDefinition);
    if (saveResult.success) {
      message.success('Custom avatar saved successfully!');
      // Reset builder state
      setBuilderState({
        currentStep: 0,
        spriteSheetDefinition: {},
        uploadProgress: 0,
        isProcessing: false,
        validationErrors: []
      });
      setActiveTab('base'); // Switch back to base tab
    } else {
      message.error(saveResult.error || 'Failed to save avatar');
    }
  }, [builderState]);

  // Upload props for Avatar Builder
  const uploadProps: UploadProps = {
    name: 'spritesheet',
    multiple: false,
    accept: 'image/png,image/gif,image/webp',
    beforeUpload: (file) => {
      handleFileUpload(file);
      return false; // Prevent default upload
    },
    showUploadList: false
  };

  // Avatar Builder step content
  const getAvatarBuilderStepContent = () => {
    const { Step } = Steps;

    const steps = [
      {
        title: 'Upload',
        content: (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Typography.Title level={4}>Upload Your Sprite Sheet</Typography.Title>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Upload a PNG, GIF, or WebP file containing your character sprites
              </Typography.Text>

              <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                <p className="ant-upload-hint">
                  Support for PNG, GIF, and WebP formats. Maximum file size: 10MB
                </p>
              </Upload.Dragger>

              {builderState.isProcessing && (
                <Progress percent={builderState.uploadProgress} status="active" />
              )}
            </div>
          </Card>
        )
      },
      {
        title: 'Define Frames',
        content: builderState.spriteSheetDefinition.source && (
          <GridOverlayComponent
            imageData={builderState.spriteSheetDefinition.source.imageData}
            imageDimensions={builderState.spriteSheetDefinition.source.originalDimensions}
            onGridChange={setGridLayout}
            onFrameSelect={(frameIndex, frameRect) => {
            }}
            selectedFrames={[]}
            initialGrid={gridLayout || undefined}
          />
        )
      },
      {
        title: 'Edit Frames',
        content: builderState.spriteSheetDefinition.frames && builderState.spriteSheetDefinition.source && (
          <FrameSelectionTools
            imageData={builderState.spriteSheetDefinition.source.imageData}
            imageDimensions={builderState.spriteSheetDefinition.source.originalDimensions}
            frames={builderState.spriteSheetDefinition.frames}
            selectedFrameIds={selectedFrameIds}
            onFrameUpdate={(frameId, updates) => {
              setBuilderState(prev => ({
                ...prev,
                spriteSheetDefinition: {
                  ...prev.spriteSheetDefinition,
                  frames: prev.spriteSheetDefinition.frames?.map(frame =>
                    frame.id === frameId ? { ...frame, ...updates } : frame
                  )
                }
              }));
            }}
            onFrameCreate={(frame) => {
              const newFrame = { ...frame, id: `frame_${Date.now()}` };
              setBuilderState(prev => ({
                ...prev,
                spriteSheetDefinition: {
                  ...prev.spriteSheetDefinition,
                  frames: [...(prev.spriteSheetDefinition.frames || []), newFrame]
                }
              }));
            }}
            onFrameDelete={(frameId) => {
              setBuilderState(prev => ({
                ...prev,
                spriteSheetDefinition: {
                  ...prev.spriteSheetDefinition,
                  frames: prev.spriteSheetDefinition.frames?.filter(frame => frame.id !== frameId)
                }
              }));
            }}
            onSelectionChange={setSelectedFrameIds}
          />
        )
      },
      {
        title: 'Preview',
        content: builderState.spriteSheetDefinition.frames && builderState.spriteSheetDefinition.source && (
          <FramePreviewSystem
            frames={builderState.spriteSheetDefinition.frames}
            selectedFrameIds={selectedFrameIds}
            animations={builderState.spriteSheetDefinition.animations || []}
            imageData={builderState.spriteSheetDefinition.source.imageData}
            onFrameSelect={(frameId) => setSelectedFrameIds([frameId])}
          />
        )
      }
    ];

    return (
      <div>
        <Steps current={builderState.currentStep} style={{ marginBottom: 24 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <div style={{ minHeight: 400, marginBottom: 24 }}>
          {steps[builderState.currentStep]?.content}
        </div>

        {/* Validation Errors */}
        {builderState.validationErrors.length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {builderState.validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* Step Navigation */}
        <div style={{ textAlign: 'right' }}>
          <Space>
            {builderState.currentStep > 0 && (
              <Button onClick={() => setBuilderState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))}>
                Previous
              </Button>
            )}

            {builderState.currentStep === 1 && gridLayout && (
              <Button type="primary" onClick={generateFramesFromGrid}>
                Generate Frames
              </Button>
            )}

            {builderState.currentStep === 2 && builderState.spriteSheetDefinition.frames && (
              <Button type="primary" onClick={createDefaultAnimations}>
                Create Animations
              </Button>
            )}

            {builderState.currentStep === 3 && (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleAvatarBuilderSave}>
                Save Avatar
              </Button>
            )}
          </Space>
        </div>
      </div>
    );
  };

  const tabs = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      tabPosition="top"
      items={[
        // Existing tabs
        ...(
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
        })),
        // Integrated Avatar Builder tab
        {
          key: 'avatar-builder',
          label: (
            <Space>
              <BuildOutlined />
              <span>Avatar Builder</span>
            </Space>
          ),
          children: (
            <div>
              <UserGuidanceSystem
                currentStep={builderState.currentStep}
                isFirstTime={false}
              />
              {getAvatarBuilderStepContent()}
            </div>
          )
        }
      ]}
    />
  );

  return (
    <Modal
      title="Character Customization"
      open={open}
      onOk={() => onOk({ ...config, updatedAt: new Date().toISOString() })}
      onCancel={onCancel}
      width={1200} // Increased width to accommodate Avatar Builder
      okText="Save Changes"
      cancelText="Cancel"
      style={{ top: 20 }} // Adjust top position for larger modal
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Show avatar preview only for traditional customization tabs */}
        {activeTab !== 'avatar-builder' && (
          <AvatarPreview
            config={config}
          />
        )}

        <Card size="small">
          {tabs}
        </Card>
      </div>
    </Modal>
  );
};

export default AvatarCustomizerModal;

