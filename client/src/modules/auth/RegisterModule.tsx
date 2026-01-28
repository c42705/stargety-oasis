/**
 * User Registration Module
 * Handles new user registration with validation
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space, Divider, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { logger } from '../../shared/logger';
import magicalBg from '../../assets/magical_bg.png';

interface RegisterModuleProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const RegisterModule: React.FC<RegisterModuleProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { register, isLoading } = useAuth();
  const [form] = Form.useForm();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: FormData) => {
    setError('');

    // Validate passwords match
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const success = await register(values.username, values.email, values.password);

      if (success) {
        setSuccess(true);
        form.resetFields();
        logger.info('Registration successful', { username: values.username });

        // Show success toast
        message.success({
          content: 'Account created successfully! Now you can login.',
          duration: 3,
        });

        // Show success message and redirect after 2 seconds
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration');
      logger.error('Registration error', { error: err });
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `linear-gradient(35deg, #667eea 0%, #764ba2 100%), url(${magicalBg})`,
        backgroundBlendMode: 'overlay',
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        padding: '0.5rem'
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <Card
            style={{
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              background: 'rgba(32, 32, 32, 0.27)',
              backdropFilter: 'blur(25px)'
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                <Typography.Title level={3} style={{ margin: 0 }}>Registration Successful!</Typography.Title>
                <Typography.Text type="secondary">Your account has been created.</Typography.Text>
                <Typography.Text type="secondary" style={{ display: 'block' }}>You can now log in with your credentials.</Typography.Text>
              </div>
              <Button type="primary" block size="large" onClick={onSwitchToLogin}>
                Go to Login
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(35deg, #667eea 0%, #764ba2 100%), url(${magicalBg})`,
      backgroundBlendMode: 'overlay',
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat, no-repeat',
      padding: '0.5rem'
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <Card
          style={{
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            background: 'rgba(32, 32, 32, 0.27)',
            backdropFilter: 'blur(25px)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div style={{ textAlign: 'center', marginBottom: '1rem', padding: '1rem 0' }}>
              <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                Create Account
              </Typography.Title>
              <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                Join Stargety Oasis
              </Typography.Text>
            </div>

            {error && <Alert message={error} type="error" showIcon />}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please enter a username' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                  { max: 20, message: 'Username must be at most 20 characters' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Choose a username"
                  disabled={isLoading}
                />
              </Form.Item>

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
                  disabled={isLoading}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter a password' },
                  { min: 8, message: 'Password must be at least 8 characters' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                rules={[
                  { required: true, message: 'Please confirm your password' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isLoading}
                style={{ width: '100%' }}
              >
                Create Account
              </Button>
            </Form>

            <Divider>Already have an account?</Divider>

            <Button onClick={onSwitchToLogin} style={{ width: '100%' }} size="large">
              Sign In
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

