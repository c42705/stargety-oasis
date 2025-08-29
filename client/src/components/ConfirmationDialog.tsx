import React, { useEffect } from 'react';
import { Modal, App } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  const { modal } = App.useApp();

  useEffect(() => {
    if (isOpen) {
      const getIcon = () => {
        switch (type) {
          case 'danger':
            return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
          case 'warning':
            return <WarningOutlined style={{ color: '#faad14' }} />;
          case 'info':
            return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
          default:
            return <WarningOutlined style={{ color: '#faad14' }} />;
        }
      };

      console.log('[ConfirmationDialog] open', { title, message, type });
      modal.confirm({
        title,
        icon: getIcon(),
        content: message,
        okText: confirmText,
        cancelText,
        okType: type === 'danger' ? 'danger' : 'primary',
        onOk: () => {
          console.log('[ConfirmationDialog] confirmed');
          onConfirm();
          onClose();
        },
        onCancel: () => {
          console.log('[ConfirmationDialog] cancelled');
          onClose();
        },
        centered: true,
        maskClosable: true,
        width: 400,
      });
    }
  }, [isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type, modal]);

  // Return null since Modal.confirm() handles the rendering
  return null;
};
