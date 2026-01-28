/**
 * User Registration Module
 * Handles new user registration with validation
 */

import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Space, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { logger } from '../../shared/logger';

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
      <Card style={{ maxWidth: 400, margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <h2>Registration Successful!</h2>
            <p>Your account has been created.</p>
            <p>You can now log in with your credentials.</p>
          </div>
          <Button type="primary" block onClick={onSwitchToLogin}>
            Go to Login
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 400, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ textAlign: 'center' }}>
          <h2>Create Account</h2>
          <p>Join Stargety Oasis</p>
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
            block
            size="large"
            loading={isLoading}
          >
            Create Account
          </Button>
        </Form>

        <Divider>Already have an account?</Divider>

        <Button block onClick={onSwitchToLogin}>
          Sign In
        </Button>
      </Space>
    </Card>
  );
};

