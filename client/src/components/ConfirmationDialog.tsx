import React, { useEffect } from 'react';
import { App } from 'antd';
import { ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  content?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  showUndoWarning?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  content,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  showUndoWarning = true
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

      // Build content with optional undo warning
      const finalContent = (() => {
        if (content) return content;

        const messageContent = message || '';
        if (!showUndoWarning) return messageContent;

        return (
          <div>
            <div style={{ marginBottom: showUndoWarning ? 12 : 0 }}>
              {messageContent}
            </div>
            {showUndoWarning && (
              <div style={{ fontSize: 12, color: '#faad14', fontStyle: 'italic' }}>
                This action cannot be undone.
              </div>
            )}
          </div>
        );
      })();

      modal.confirm({
        title,
        icon: getIcon(),
        content: finalContent,
        okText: confirmText,
        cancelText,
        okType: type === 'danger' ? 'danger' : 'primary',
        onOk: () => {
          onConfirm();
          onClose();
        },
        onCancel: () => {
          onClose();
        },
        centered: true,
        maskClosable: true,
        width: 400,
      });
    }
  }, [isOpen, onClose, onConfirm, title, message, content, showUndoWarning, confirmText, cancelText, type, modal]);

  // Return null since Modal.confirm() handles the rendering
  return null;
};
