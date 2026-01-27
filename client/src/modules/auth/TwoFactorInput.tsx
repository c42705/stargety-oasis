/**
 * Two-Factor Authentication Input Component
 * Displays 6-digit code input with auto-submit and countdown timer
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Alert, Space, Statistic, Card, Typography, List } from 'antd';
import { LockOutlined, ReloadOutlined } from '@ant-design/icons';
import { logger } from '../../shared/logger';

interface TwoFactorInputProps {
  onSubmit: (code: string) => Promise<void>;
  isLoading?: boolean;
  onResendCode?: () => Promise<void>;
  expirySeconds?: number;
  topicId?: string;
}

export const TwoFactorInput: React.FC<TwoFactorInputProps> = ({
  onSubmit,
  isLoading = false,
  onResendCode,
  expirySeconds = 300, // 5 minutes default
  topicId,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(expirySeconds);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<any>(null);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setError('Verification code has expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');

    // Auto-submit when 6 digits entered
    if (value.length === 6) {
      handleSubmit(value);
    }
  };

  const handleSubmit = async (submitCode: string = code) => {
    if (submitCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      await onSubmit(submitCode);
    } catch (err) {
      logger.error('2FA submission error', { error: err });
      setError('Invalid verification code. Please try again.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const handleResend = async () => {
    if (!onResendCode) return;

    setIsResending(true);
    try {
      await onResendCode();
      setTimeLeft(expirySeconds);
      setCode('');
      setError('');
      inputRef.current?.focus();
      logger.info('Verification code resent');
    } catch (err) {
      setError('Failed to resend code. Please try again.');
      logger.error('Resend code error', { error: err });
    } finally {
      setIsResending(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 32, marginBottom: 16 }} />
          <Typography.Title level={2} style={{ margin: 0 }}>Two-Factor Authentication</Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            A 6-digit verification code has been sent to your ntfy.sh topic
          </Typography.Paragraph>
        </div>

        {/* Instructions using Alert with List */}
        <Alert
          message="📱 How to get your verification code"
          description={
            <List
              size="small"
              dataSource={[
                {
                  key: '1',
                  title: 'Open ntfy.sh in your browser',
                  content: (
                    <a href="https://ntfy.sh" target="_blank" rel="noopener noreferrer">
                      https://ntfy.sh
                    </a>
                  ),
                },
                {
                  key: '2',
                  title: 'Your unique topic ID',
                  content: topicId ? (
                    <Typography.Paragraph copyable={{ text: topicId }} style={{ margin: 0 }}>
                      <code>{topicId}</code>
                    </Typography.Paragraph>
                  ) : (
                    <Typography.Text type="secondary">
                      Check your email or the confirmation message you received
                    </Typography.Text>
                  ),
                },
                {
                  key: '3',
                  title: 'Subscribe to your topic',
                  content: (
                    <Typography.Paragraph copyable={{ text: `https://ntfy.sh/${topicId || 'your-topic-id'}` }} style={{ margin: 0 }}>
                      Visit: <code>https://ntfy.sh/{topicId || 'your-topic-id'}</code>
                    </Typography.Paragraph>
                  ),
                },
                {
                  key: '4',
                  title: 'Look for the 6-digit code',
                  content: 'Find the verification code in the notification message and enter it below',
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={<strong>{item.title}</strong>}
                    description={item.content}
                  />
                </List.Item>
              )}
            />
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* Tip Alert */}
        <Alert
          message="💡 Tip"
          description="If you don't have your topic ID, you can check the browser console (F12) or contact support. Your topic ID is a unique identifier sent to you during account creation."
          type="warning"
          showIcon
        />

        {error && <Alert message={error} type="error" showIcon />}

        <Input
          ref={inputRef}
          placeholder="000000"
          value={code}
          onChange={handleCodeChange}
          maxLength={6}
          size="large"
          style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
          disabled={isLoading || isExpired}
          autoFocus
        />

        <div style={{ textAlign: 'center' }}>
          <Statistic
            title="Code expires in"
            value={`${minutes}:${seconds.toString().padStart(2, '0')}`}
            valueStyle={{ color: isExpired ? '#ff4d4f' : '#1890ff' }}
          />
        </div>

        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="primary"
            size="large"
            onClick={() => handleSubmit()}
            loading={isLoading}
            disabled={code.length !== 6 || isExpired}
          >
            Verify
          </Button>

          {onResendCode && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResend}
              loading={isResending}
              disabled={isExpired}
            >
              Resend Code
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};

