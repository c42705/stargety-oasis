import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Steps, Button, message, Space, Typography, Card, Upload, Progress } from 'antd';
import {
  SaveOutlined,
  InboxOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { GridOverlayComponent } from './GridOverlayComponent';
import { FrameSelectionTools } from './FrameSelectionTools';
import { FramePreviewSystem } from './FramePreviewSystem';
import { SpriteSheetProcessor } from './SpriteSheetProcessor';
import { FrameDetectionAlgorithms } from './FrameDetectionAlgorithms';
import { 
  SpriteSheetDefinition, 
  FrameDefinition, 
  AnimationMapping, 
  GridLayout,
  AnimationCategory,
  REQUIRED_ANIMATIONS
} from './AvatarBuilderTypes';

const { Step } = Steps;
const { Title, Text } = Typography;
const { Dragger } = Upload;

export interface AvatarBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  onSave?: (definition: SpriteSheetDefinition) => void;
}

interface BuilderState {
  currentStep: number;
  spriteSheetDefinition: Partial<SpriteSheetDefinition>;
  uploadProgress: number;
  isProcessing: boolean;
  validationErrors: string[];
}

/**
 * Main Avatar Builder Modal - Step-by-step wizard interface
 */
export const AvatarBuilderModal: React.FC<AvatarBuilderModalProps> = ({
  visible,
  onClose,
  username,
  onSave
}) => {
  const [builderState, setBuilderState] = useState<BuilderState>({
    currentStep: 0,
    spriteSheetDefinition: {},
    uploadProgress: 0,
    isProcessing: false,
    validationErrors: []
  });

  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>([]);
  const [gridLayout, setGridLayout] = useState<GridLayout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setBuilderState({
        currentStep: 0,
        spriteSheetDefinition: {},
        uploadProgress: 0,
        isProcessing: false,
        validationErrors: []
      });
      setSelectedFrameIds([]);
      setGridLayout(null);
    }
  }, [visible]);

  // Step 1: Upload sprite sheet
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
        name: `${username}_avatar_${Date.now()}`,
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
        createdBy: username
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
  }, [username]);

  // Step 2: Generate frames from grid
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
        sourceRect: {
          x,
          y,
          width: gridLayout.frameWidth,
          height: gridLayout.frameHeight
        },
        outputRect: {
          x,
          y,
          width: gridLayout.frameWidth,
          height: gridLayout.frameHeight
        },
        transform: {
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          flipX: false,
          flipY: false
        },
        metadata: {
          isEmpty: false,
          hasTransparency: false,
          tags: []
        },
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

  // Step 3: Create default animations
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
        sequence: {
          frameIds: [frames[1].id], // Middle frame for idle
          frameRate: 1,
          loop: true,
          pingPong: false
        },
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
        sequence: {
          frameIds: frames.slice(0, 3).map(f => f.id), // First row
          frameRate: 8,
          loop: true,
          pingPong: false
        },
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
        sequence: {
          frameIds: frames.slice(3, 6).map(f => f.id), // Second row
          frameRate: 8,
          loop: true,
          pingPong: false
        },
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
        sequence: {
          frameIds: frames.slice(6, 9).map(f => f.id), // Third row
          frameRate: 8,
          loop: true,
          pingPong: false
        },
        priority: 2,
        interruptible: true,
        transitions: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Walk right reuses walk left frames (will be flipped)
      animations.push({
        id: 'walk_right',
        category: AnimationCategory.WALK_RIGHT,
        name: 'Walk Right',
        sequence: {
          frameIds: frames.slice(3, 6).map(f => f.id), // Reuse left frames
          frameRate: 8,
          loop: true,
          pingPong: false
        },
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

  // Validate and save
  const handleSave = useCallback(() => {
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
      id: `avatar_${username}_${Date.now()}`
    };

    onSave?.(completeDefinition);
    message.success('Avatar saved successfully!');
    onClose();
  }, [builderState, username, onSave, onClose, setBuilderState]);

  // Upload props
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

  const steps = [
    {
      title: 'Upload',
      content: (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Title level={4}>Upload Your Sprite Sheet</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Upload a PNG, GIF, or WebP file containing your character sprites
            </Text>
            
            <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to this area to upload</p>
              <p className="ant-upload-hint">
                Support for PNG, GIF, and WebP formats. Maximum file size: 10MB
              </p>
            </Dragger>

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
            console.log('Frame selected:', frameIndex, frameRect);
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
    <Modal
      title="Avatar Builder"
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      destroyOnHidden
    >
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
        <Card size="small" style={{ marginBottom: 16, borderColor: '#ff4d4f' }}>
          <Title level={5} style={{ color: '#ff4d4f', margin: 0 }}>Validation Errors:</Title>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            {builderState.validationErrors.map((error, index) => (
              <li key={index} style={{ color: '#ff4d4f' }}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          
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
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              Save Avatar
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};
