/**
 * Password Recovery Module
 * Handles password reset flow: email -> token -> new password
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space, Steps, Typography, StepProps, List } from 'antd';
import { MailOutlined, LockOutlined, CheckCircleOutlined, BellOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { logger } from '../../shared/logger';

interface PasswordRecoveryModuleProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

type RecoveryStep = 'email' | 'token' | 'password' | 'success';

export const PasswordRecoveryModule: React.FC<PasswordRecoveryModuleProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { requestPasswordReset, resetPassword } = useAuth();
  const [emailForm] = Form.useForm();
  const [tokenForm] = Form.useForm();
  const [step, setStep] = useState<RecoveryStep>('email');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestReset = async (values: { email: string }) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email);
      if (result.success) {
        setStep('token');
        logger.info('Password reset requested');
      } else {
        setError(result.error || 'Failed to request password reset');
      }
    } catch (err) {
      setError('An error occurred');
      logger.error('Password reset request error', { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (values: { token: string; newPassword: string; confirmPassword: string }) => {
    setError('');

    if (values.newPassword !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(values.token, values.newPassword);
      if (result.success) {
        setStep('success');
        logger.info('Password reset successfully');
      } else {
        setError(result.error || 'Invalid or expired reset token');
      }
    } catch (err) {
      setError('An error occurred');
      logger.error('Password reset error', { error: err });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: StepProps[] = [
    { title: 'Email', status: step === 'email' ? 'process' : 'finish' as const },
    { title: 'Token', status: step === 'token' ? 'process' : step === 'password' || step === 'success' ? 'finish' : 'wait' as const },
    { title: 'Password', status: step === 'password' ? 'process' : step === 'success' ? 'finish' : 'wait' as const },
  ];

  if (step === 'success') {
    return (
      <Card style={{ maxWidth: 400, margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Typography.Title level={2} style={{ margin: 0 }}>Password Reset Successful!</Typography.Title>
            <Typography.Paragraph>Your password has been updated.</Typography.Paragraph>
            <Typography.Paragraph>You can now log in with your new password.</Typography.Paragraph>
          </div>
          <Button type="primary" block size="large" onClick={onSwitchToLogin}>
            Go to Login
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 500, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ textAlign: 'center' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>Reset Password</Typography.Title>
        </div>

        <Steps current={step === 'email' ? 0 : step === 'token' ? 1 : 2} items={steps} />

        {error && <Alert message={error} type="error" showIcon />}

        {step === 'email' && (
          <Form
            form={emailForm}
            layout="vertical"
            onFinish={handleRequestReset}
            autoComplete="off"
          >
            <Typography.Paragraph>
              Enter your email address and we'll send you a reset token via ntfy.sh
            </Typography.Paragraph>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="your@email.com"
                disabled={isSubmitting}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isSubmitting}
            >
              Send Reset Token
            </Button>
          </Form>
        )}

        {step === 'token' && (
          <Form
            form={tokenForm}
            layout="vertical"
            onFinish={handleResetPassword}
            autoComplete="off"
          >
            {/* Instructions Alert */}
            <Alert
              message="🔔 Check your ntfy.sh notification"
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
                      title: 'Look for your reset token',
                      content: 'Check the notification message for a long token string',
                    },
                    {
                      key: '3',
                      title: 'Copy and paste it below',
                      content: 'Paste the token in the "Reset Token" field',
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
              icon={<BellOutlined />}
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              name="token"
              label="Reset Token"
              rules={[{ required: true, message: 'Please enter the reset token' }]}
            >
              <Input
                placeholder="Paste your reset token here"
                disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="At least 8 characters"
                disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              rules={[{ required: true, message: 'Please confirm your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                disabled={isSubmitting}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isSubmitting}
            >
              Reset Password
            </Button>
          </Form>
        )}

        <Button block onClick={onSwitchToLogin}>
          Back to Login
        </Button>
      </Space>
    </Card>
  );
};

