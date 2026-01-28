import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Button, Space } from 'antd';
import { SendOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface MessageEditorProps {
  initialValue?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  initialValue = '',
  onSave,
  onCancel,
  placeholder = 'Type your message...',
  multiline = true,
  maxLength = 2000,
  autoFocus = true,
  className = ''
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when component mounts
  useEffect(() => {
    if (autoFocus && textAreaRef.current) {
      textAreaRef.current.focus();
      // Note: select() may not be available on all browsers/elements
      if (typeof textAreaRef.current.select === 'function') {
        textAreaRef.current.select();
      }
    }
  }, [autoFocus]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);
    }
  }, [maxLength]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(content.trim());
    } finally {
      setIsSubmitting(false);
    }
  }, [content, onSave]);

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Calculate character count
  const charCount = content.length;
  const charCountExceeded = charCount > maxLength;
  const remainingChars = maxLength - charCount;

  return (
    <div className={`message-editor ${className}`} style={{ width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Text Area */}
        <div style={{ position: 'relative' }}>
          <TextArea
            ref={textAreaRef}
            value={content}
            onChange={handleContentChange}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            autoSize={{ minRows: multiline ? 2 : 1, maxRows: multiline ? 6 : 1 }}
            maxLength={maxLength}
            disabled={isSubmitting}
            style={{
              resize: 'none',
              fontSize: '14px',
              lineHeight: '1.5',
              borderColor: charCountExceeded ? '#ff4d4f' : undefined,
              boxShadow: charCountExceeded ? '0 0 0 2px rgba(255, 77, 79, 0.2)' : undefined
            }}
          />
          
          {/* Character Count */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            fontSize: '11px',
            color: charCountExceeded ? '#ff4d4f' : '#999',
            pointerEvents: 'none'
          }}>
            {charCountExceeded 
              ? `${charCount}/${maxLength}` 
              : remainingChars < 100 
                ? `${remainingChars} left` 
                : ''
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleCancel}
              disabled={isSubmitting}
              size="small"
              title="Cancel"
            >
              Cancel
            </Button>
          </Space>

          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSave}
              disabled={!content.trim() || isSubmitting || charCountExceeded}
              loading={isSubmitting}
              size="small"
              title={content.trim() ? 'Send (Enter)' : 'Type a message...'}
            >
              {content.trim() ? 'Send' : 'Type...'}
            </Button>
          </Space>
        </div>

        {/* Character Count Warning */}
        {charCountExceeded && (
          <div style={{
            color: '#ff4d4f',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>Message exceeds maximum length of {maxLength} characters</span>
          </div>
        )}
      </div>
    </div>
  );
};