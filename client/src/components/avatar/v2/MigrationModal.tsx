/**
 * Migration Modal
 * UI for migrating old layer-based characters to V2 sprite-sheet system
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import React, { useState } from 'react';
import { Modal, Button, Alert, List, Progress, Space, Typography, Divider } from 'antd';
import { 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { MigrationDetector } from './MigrationDetector';
import { MigrationConverter, MigrationResult } from './MigrationConverter';

const { Title, Text, Paragraph } = Typography;

export interface MigrationModalProps {
  /** Username to migrate characters for */
  username: string;
  
  /** Whether modal is visible */
  visible: boolean;
  
  /** Callback when modal is closed */
  onClose: () => void;
  
  /** Callback when migration is complete */
  onMigrationComplete?: (result: MigrationResult) => void;
}

type MigrationStep = 'detection' | 'confirmation' | 'migrating' | 'complete' | 'error';

/**
 * Migration Modal Component
 */
export const MigrationModal: React.FC<MigrationModalProps> = ({
  username,
  visible,
  onClose,
  onMigrationComplete
}) => {
  const [step, setStep] = useState<MigrationStep>('detection');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Detect old characters on mount
  const detection = MigrationDetector.detectOldCharacters(username);
  
  /**
   * Handle migration start
   */
  const handleMigrate = async () => {
    setStep('migrating');
    setProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Perform migration
      const result = await MigrationConverter.migrateAllCharacters(username);
      
      clearInterval(progressInterval);
      setProgress(100);
      setMigrationResult(result);
      
      if (result.success) {
        setStep('complete');
        onMigrationComplete?.(result);
      } else {
        setStep('error');
      }
    } catch (error) {
      setStep('error');
      setMigrationResult({
        success: false,
        totalAttempted: detection.slotsToMigrate.length,
        successCount: 0,
        failureCount: detection.slotsToMigrate.length,
        characterResults: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };
  
  /**
   * Handle cleanup (delete old data)
   */
  const handleCleanup = () => {
    Modal.confirm({
      title: 'Delete Old Character Data?',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            This will permanently delete your old character data from localStorage.
          </Paragraph>
          <Paragraph strong>
            This action cannot be undone!
          </Paragraph>
          <Paragraph>
            Your migrated characters in the new system will not be affected.
          </Paragraph>
        </div>
      ),
      okText: 'Delete Old Data',
      okType: 'danger',
      cancelText: 'Keep Old Data',
      onOk: () => {
        const cleanupResult = MigrationConverter.completeMigration(username);
        
        if (cleanupResult.success) {
          Modal.success({
            title: 'Cleanup Complete',
            content: 'Old character data has been deleted.'
          });
          onClose();
        } else {
          Modal.error({
            title: 'Cleanup Failed',
            content: (
              <div>
                <Paragraph>Failed to delete old character data:</Paragraph>
                <ul>
                  {cleanupResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )
          });
        }
      }
    });
  };
  
  /**
   * Render detection/confirmation step
   */
  const renderConfirmation = () => (
    <div>
      <Alert
        message="Character Migration Required"
        description="We've upgraded the avatar system! Your characters need to be migrated to the new format."
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Title level={5}>What will happen:</Title>
      <List
        size="small"
        dataSource={[
          '✓ Character names will be preserved',
          '✓ Default sprite sheets will be assigned',
          '✓ You can customize them later in Avatar Builder',
          '✓ Old character data will be kept until you confirm deletion'
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
        style={{ marginBottom: 16 }}
      />
      
      <Title level={5}>Characters to migrate:</Title>
      <List
        size="small"
        bordered
        dataSource={detection.oldCharacters.filter(char => 
          detection.slotsToMigrate.includes(char.slotNumber)
        )}
        renderItem={char => (
          <List.Item>
            <Space>
              <Text strong>Slot {char.slotNumber}:</Text>
              <Text>"{char.name}"</Text>
            </Space>
          </List.Item>
        )}
      />
      
      {detection.alreadyMigratedSlots.length > 0 && (
        <>
          <Divider />
          <Alert
            message={`${detection.alreadyMigratedSlots.length} slot(s) already migrated`}
            description={`Slots ${detection.alreadyMigratedSlots.join(', ')} already have V2 characters and will be skipped.`}
            type="success"
            showIcon
          />
        </>
      )}
    </div>
  );
  
  /**
   * Render migration in progress
   */
  const renderMigrating = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Title level={4}>Migrating Characters...</Title>
      <Progress 
        percent={progress} 
        status="active"
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
      />
      <Paragraph style={{ marginTop: 16 }}>
        Please wait while we migrate your characters to the new system.
      </Paragraph>
    </div>
  );
  
  /**
   * Render migration complete
   */
  const renderComplete = () => (
    <div>
      <Alert
        message="Migration Complete!"
        description={`Successfully migrated ${migrationResult?.successCount} character(s).`}
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Title level={5}>Migrated Characters:</Title>
      <List
        size="small"
        bordered
        dataSource={migrationResult?.characterResults.filter(r => r.success) || []}
        renderItem={result => (
          <List.Item>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>Slot {result.slotNumber}:</Text>
              <Text>"{result.characterName}"</Text>
            </Space>
          </List.Item>
        )}
        style={{ marginBottom: 16 }}
      />
      
      <Alert
        message="What's Next?"
        description={
          <div>
            <Paragraph>
              Your characters now use the new system with default sprite sheets.
            </Paragraph>
            <Paragraph>
              You can customize them in the Avatar Builder to upload your own sprite sheets.
            </Paragraph>
            <Paragraph strong>
              Your old character data is still saved. You can delete it now or keep it as backup.
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
  
  /**
   * Render migration error
   */
  const renderError = () => (
    <div>
      <Alert
        message="Migration Failed"
        description={`Failed to migrate ${migrationResult?.failureCount} character(s).`}
        type="error"
        icon={<CloseCircleOutlined />}
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {migrationResult && migrationResult.errors.length > 0 && (
        <>
          <Title level={5}>Errors:</Title>
          <List
            size="small"
            bordered
            dataSource={migrationResult.errors}
            renderItem={error => (
              <List.Item>
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text>{error}</Text>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );
  
  /**
   * Get modal footer buttons based on step
   */
  const getFooter = () => {
    switch (step) {
      case 'detection':
      case 'confirmation':
        return [
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="migrate" type="primary" onClick={handleMigrate}>
            Migrate All Characters
          </Button>
        ];
      
      case 'migrating':
        return null; // No buttons during migration
      
      case 'complete':
        return [
          <Button key="cleanup" danger onClick={handleCleanup}>
            Delete Old Data
          </Button>,
          <Button key="close" type="primary" onClick={onClose}>
            Done
          </Button>
        ];
      
      case 'error':
        return [
          <Button key="close" type="primary" onClick={onClose}>
            Close
          </Button>
        ];
      
      default:
        return null;
    }
  };
  
  return (
    <Modal
      title="Migrate Characters to New System"
      open={visible}
      onCancel={onClose}
      footer={getFooter()}
      width={600}
      closable={step !== 'migrating'}
      maskClosable={false}
    >
      {(step === 'detection' || step === 'confirmation') && renderConfirmation()}
      {step === 'migrating' && renderMigrating()}
      {step === 'complete' && renderComplete()}
      {step === 'error' && renderError()}
    </Modal>
  );
};

