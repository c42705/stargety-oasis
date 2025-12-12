import React, { useEffect, useRef } from 'react';
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

  // Use refs to avoid re-triggering the effect when callbacks change
  const onCloseRef = useRef(onClose);
  const onConfirmRef = useRef(onConfirm);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onCloseRef.current = onClose;
    onConfirmRef.current = onConfirm;
  }, [onClose, onConfirm]);

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
          onConfirmRef.current();
          onCloseRef.current();
        },
        onCancel: () => {
          onCloseRef.current();
        },
        centered: true,
        maskClosable: true,
        width: 400,
      });
    }
  // Only trigger when isOpen changes, or when display props change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, title, message, content, showUndoWarning, confirmText, cancelText, type, modal]);

  // Return null since Modal.confirm() handles the rendering
  return null;
};
