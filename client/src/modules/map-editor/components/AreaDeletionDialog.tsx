import React from 'react';
import { Modal, Typography, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface AreaDeletionDialogProps {
  isOpen: boolean;
  areaCount: number;
  areaNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const AreaDeletionDialog: React.FC<AreaDeletionDialogProps> = ({
  isOpen,
  areaCount,
  areaNames,
  onConfirm,
  onCancel
}) => {
  const title = areaCount === 1 ? 'Delete Area' : `Delete ${areaCount} Areas`;
  
  const message = areaCount === 1 
    ? `Are you sure you want to delete "${areaNames[0]}"?`
    : `Are you sure you want to delete the following ${areaCount} areas?`;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          {title}
        </Space>
      }
      open={isOpen}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Delete"
      cancelText="Cancel"
      okButtonProps={{ danger: true }}
      width={400}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text>{message}</Text>
        
        {areaCount > 1 && (
          <div style={{ 
            maxHeight: '150px', 
            overflowY: 'auto',
            padding: '8px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            {areaNames.map((name, index) => (
              <div key={index} style={{ padding: '2px 0' }}>
                <Text>• {name}</Text>
              </div>
            ))}
          </div>
        )}
        
        <Text type="warning" style={{ fontSize: '12px' }}>
          This action cannot be undone.
        </Text>
      </Space>
    </Modal>
  );
};
