import React, { useState, useEffect } from 'react';
import { Tour, Button, Typography, Space, Card, Alert, Tooltip } from 'antd';
import type { TourProps } from 'antd';
import { 
  QuestionCircleOutlined, 
  BulbOutlined, 
  InfoCircleOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface UserGuidanceSystemProps {
  currentStep: number;
  isFirstTime?: boolean;
  onTourComplete?: () => void;
  onSkipTour?: () => void;
}

interface GuidanceStep {
  title: string;
  description: string;
  target: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  tips?: string[];
  warnings?: string[];
}

/**
 * Interactive user guidance system with tooltips, help text, and tutorials
 */
export const UserGuidanceSystem: React.FC<UserGuidanceSystemProps> = ({
  currentStep,
  isFirstTime = false,
  onTourComplete,
  onSkipTour
}) => {
  const [tourOpen, setTourOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Tour steps for each stage of the Avatar Builder
  const tourSteps: TourProps['steps'] = [
    {
      title: 'Welcome to Avatar Builder',
      description: 'Create custom character sprites with professional tools. This wizard will guide you through each step.',
      target: () => document.querySelector('.ant-modal-content') as HTMLElement,
      placement: 'bottom'
    },
    {
      title: 'Upload Your Sprite Sheet',
      description: 'Drag and drop your sprite sheet image here. Supported formats: PNG, GIF, WebP. Maximum size: 10MB.',
      target: () => document.querySelector('.ant-upload-drag') as HTMLElement,
      placement: 'top'
    },
    {
      title: 'Grid Detection',
      description: 'The system will automatically detect frame boundaries. You can adjust the grid settings manually if needed.',
      target: () => document.querySelector('.grid-overlay-component') as HTMLElement,
      placement: 'right'
    },
    {
      title: 'Frame Editing Tools',
      description: 'Use these tools to fine-tune frame positions, resize frames, or create new ones manually.',
      target: () => document.querySelector('.frame-selection-tools') as HTMLElement,
      placement: 'left'
    },
    {
      title: 'Animation Preview',
      description: 'Preview your animations in real-time and validate that all required animations are properly configured.',
      target: () => document.querySelector('.frame-preview-system') as HTMLElement,
      placement: 'top'
    }
  ];

  // Step-specific guidance content
  const stepGuidance: Record<number, GuidanceStep> = {
    0: {
      title: 'Upload Your Sprite Sheet',
      description: 'Start by uploading an image file containing your character sprites.',
      target: 'upload-area',
      tips: [
        'Use PNG format for best quality and transparency support',
        'Organize sprites in a grid layout for easier detection',
        'Ensure consistent frame sizes for optimal results',
        'Keep file size under 10MB for best performance'
      ],
      warnings: [
        'GIF files may lose quality during processing',
        'Very large images may take longer to process'
      ]
    },
    1: {
      title: 'Define Frame Boundaries',
      description: 'Adjust the grid to match your sprite layout and define individual frame boundaries.',
      target: 'grid-overlay',
      tips: [
        'Use the auto-detection suggestions as a starting point',
        'Adjust spacing and margins to fit your sprite layout',
        'Click on frames to select and preview them',
        'Use the grid controls to fine-tune the layout'
      ],
      warnings: [
        'Overlapping frames may cause animation issues',
        'Empty frames will be flagged during validation'
      ]
    },
    2: {
      title: 'Edit and Refine Frames',
      description: 'Use professional editing tools to perfect your frame definitions.',
      target: 'frame-tools',
      tips: [
        'Select multiple frames to edit them together',
        'Use resize handles to adjust frame boundaries',
        'Enable snap-to-grid for precise positioning',
        'The undo/redo system tracks all your changes'
      ],
      warnings: [
        'Very small frames (< 16px) may not display properly',
        'Frames outside image bounds will be automatically corrected'
      ]
    },
    3: {
      title: 'Preview and Validate',
      description: 'Test your animations and ensure all required animations are properly configured.',
      target: 'preview-system',
      tips: [
        'Required animations: idle, walk (4 directions)',
        'Adjust frame rates for smooth animation',
        'Use the validation system to catch issues',
        'Preview animations before saving'
      ],
      warnings: [
        'Missing required animations will prevent saving',
        'Very high frame rates may impact game performance'
      ]
    }
  };

  // Start tour for first-time users
  useEffect(() => {
    if (isFirstTime && currentStep === 0) {
      setTourOpen(true);
    }
  }, [isFirstTime, currentStep]);

  // Mark step as completed
  const markStepCompleted = (step: number) => {
    setCompletedSteps(prev => new Set(Array.from(prev).concat(step)));
  };

  // Get current step guidance
  const currentGuidance = stepGuidance[currentStep];

  // Handle tour completion
  const handleTourComplete = () => {
    setTourOpen(false);
    onTourComplete?.();
    localStorage.setItem('avatar_builder_tour_completed', 'true');
  };

  // Handle tour skip
  const handleTourSkip = () => {
    setTourOpen(false);
    onSkipTour?.();
    localStorage.setItem('avatar_builder_tour_skipped', 'true');
  };

  return (
    <>
      {/* Tour Component */}
      <Tour
        open={tourOpen}
        onClose={handleTourSkip}
        onFinish={handleTourComplete}
        steps={tourSteps}
        indicatorsRender={(current, total) => (
          <span style={{ color: '#1890ff' }}>
            {current + 1} / {total}
          </span>
        )}
      />

      {/* Step-specific Guidance Panel */}
      {currentGuidance && (
        <Card 
          size="small" 
          style={{ 
            marginBottom: 16,
            borderLeft: '4px solid #1890ff'
          }}
          title={
            <Space>
              <BulbOutlined style={{ color: '#1890ff' }} />
              <Text strong>{currentGuidance.title}</Text>
              {completedSteps.has(currentStep) && (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
                type="link"
                size="small"
                icon={<QuestionCircleOutlined />}
                onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? 'Hide Help' : 'Show Help'}
              </Button>

              {/* Quick Help Tooltip */}
              <Tooltip
                title={
                  <div style={{ maxWidth: 400 }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong style={{ color: 'white' }}>Keyboard Shortcuts:</Text>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                        <li><kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px' }}>Ctrl/Cmd + Z</kbd> - Undo</li>
                        <li><kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px' }}>Ctrl/Cmd + Y</kbd> - Redo</li>
                        <li><kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px' }}>Delete</kbd> - Delete selected frames</li>
                        <li><kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px' }}>Ctrl/Cmd + A</kbd> - Select all frames</li>
                        <li><kbd style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '2px' }}>Space</kbd> - Play/pause animation</li>
                      </ul>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Text strong style={{ color: 'white' }}>Mouse Controls:</Text>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                        <li><strong>Click</strong> - Select frame</li>
                        <li><strong>Ctrl + Click</strong> - Multi-select</li>
                        <li><strong>Drag</strong> - Move frame</li>
                        <li><strong>Drag handles</strong> - Resize frame</li>
                        <li><strong>Right-click</strong> - Context menu</li>
                      </ul>
                    </div>

                    <div>
                      <Text strong style={{ color: 'white' }}>File Requirements:</Text>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 20, fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                        <li>Formats: PNG, GIF, WebP</li>
                        <li>Max size: 10MB</li>
                        <li>Min dimensions: 32×32px</li>
                        <li>Max dimensions: 4096×4096px</li>
                      </ul>
                    </div>
                  </div>
                }
                placement="bottomLeft"
                trigger="hover"
              >
                <Button
                  type="link"
                  size="small"
                  icon={<QuestionCircleOutlined />}
                  style={{ color: '#666' }}
                >
                  Quick Help
                </Button>
              </Tooltip>

              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => setTourOpen(true)}
              >
                Restart Tour
              </Button>
            </Space>
          }
        >
          <Text type="secondary">{currentGuidance.description}</Text>

          {showHelp && (
            <div style={{ marginTop: 12 }}>
              {/* Tips Section */}
              {currentGuidance.tips && currentGuidance.tips.length > 0 && (
                <Alert
                  message="Tips"
                  description={
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                      {currentGuidance.tips.map((tip, index) => (
                        <li key={index} style={{ marginBottom: 4 }}>
                          <Text>{tip}</Text>
                        </li>
                      ))}
                    </ul>
                  }
                  type="info"
                  icon={<BulbOutlined />}
                  style={{ marginBottom: 8 }}
                  showIcon
                />
              )}

              {/* Warnings Section */}
              {currentGuidance.warnings && currentGuidance.warnings.length > 0 && (
                <Alert
                  message="Important Notes"
                  description={
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                      {currentGuidance.warnings.map((warning, index) => (
                        <li key={index} style={{ marginBottom: 4 }}>
                          <Text>{warning}</Text>
                        </li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  icon={<InfoCircleOutlined />}
                  showIcon
                />
              )}
            </div>
          )}
        </Card>
      )}




      {/* Contextual Help Button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<QuestionCircleOutlined />}
          onClick={() => setTourOpen(true)}
          title="Show guided tour"
        />
      </div>
    </>
  );
};

/**
 * Hook for managing user guidance state
 */
export const useUserGuidance = () => {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('avatar_builder_tour_completed');
    const skipped = localStorage.getItem('avatar_builder_tour_skipped');
    
    setTourCompleted(!!completed);
    setIsFirstTime(!completed && !skipped);
  }, []);

  const markTourCompleted = () => {
    setTourCompleted(true);
    setIsFirstTime(false);
    localStorage.setItem('avatar_builder_tour_completed', 'true');
  };

  const resetTour = () => {
    setTourCompleted(false);
    setIsFirstTime(true);
    localStorage.removeItem('avatar_builder_tour_completed');
    localStorage.removeItem('avatar_builder_tour_skipped');
  };

  return {
    isFirstTime,
    tourCompleted,
    markTourCompleted,
    resetTour
  };
};

/**
 * Validation helper messages
 */
export const ValidationMessages = {
  FRAME_TOO_SMALL: 'Frame is smaller than 16×16 pixels and may not display properly',
  FRAME_TOO_LARGE: 'Frame is larger than 512×512 pixels and may impact performance',
  FRAME_EMPTY: 'Frame appears to be empty or transparent',
  FRAME_OUTSIDE_BOUNDS: 'Frame extends outside the image boundaries',
  ANIMATION_MISSING_FRAMES: 'Animation requires at least 2 frames for smooth playback',
  ANIMATION_HIGH_FRAMERATE: 'Frame rate above 30 FPS may impact game performance',
  REQUIRED_ANIMATION_MISSING: 'Required animation is missing (idle, walk directions)',
  EXPORT_SIZE_WARNING: 'Large sprite sheets may take longer to load in game'
};

/**
 * Success messages for completed actions
 */
export const SuccessMessages = {
  UPLOAD_COMPLETE: 'Sprite sheet uploaded successfully!',
  FRAMES_GENERATED: 'Frames generated from grid layout',
  ANIMATION_CREATED: 'Animation created successfully',
  VALIDATION_PASSED: 'All validations passed - ready to save!',
  EXPORT_COMPLETE: 'Character definition exported successfully',
  SAVE_COMPLETE: 'Avatar saved to your collection'
};
