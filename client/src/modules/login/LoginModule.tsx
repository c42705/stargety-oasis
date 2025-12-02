import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Checkbox, Alert, Collapse, Space, Typography, Divider, Select } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined, BulbOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { WORLD_ROOMS, WorldRoomId } from '../../shared/WorldRoomContext';
import appLogo from '../../assets/app-logo.png';
import magicalBg from '../../assets/magical_bg.png';

interface LoginModuleProps {
  className?: string;
}

interface FormData {
  username: string;
  password: string;
  worldRoomId: WorldRoomId;
  rememberMe: boolean;
}

export const LoginModule: React.FC<LoginModuleProps> = ({ className = '' }) => {
  const { login, isLoading, rememberUsername, setRememberUsername, savedUsername } = useAuth();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string>('');

  // Test accounts for easy access
  const testAccounts = [
    { username: 'admin', password: 'admin123', type: 'Admin User', description: 'Full access to all features including settings' },
    { username: 'john.doe', password: 'user123', type: 'Regular User', description: 'Standard user with chat, video, and world access' },
    { username: 'jane.smith', password: 'user456', type: 'Regular User', description: 'Another standard user for testing collaboration' },
    { username: 'mike.admin', password: 'admin789', type: 'Admin User', description: 'Another admin account for testing admin features' },
  ];

  // Initialize form with saved username
  useEffect(() => {
    if (savedUsername) {
      form.setFieldsValue({ username: savedUsername, rememberMe: rememberUsername });
    }
  }, [savedUsername, rememberUsername, form]);

  // Handle form submission
  const handleSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    setLoginError('');

    try {
      const success = await login(
        values.username.trim(),
        values.password.trim(),
        values.worldRoomId || 'Stargety-Oasis-1'
      );

      if (!success) {
        setLoginError('Invalid username or password. Please try again.');
      }

      // Handle remember username
      setRememberUsername(values.rememberMe || false);
    } catch (error) {
      setLoginError('Login failed. Please try again later.');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick login with test account - auto-submit for faster loading
  const handleQuickLogin = async (testAccount: typeof testAccounts[0]) => {
    form.setFieldsValue({
      username: testAccount.username,
      password: testAccount.password,
      worldRoomId: 'Stargety-Oasis-1',
      rememberMe: rememberUsername
    });
    setLoginError('');

    // Automatically submit the form for faster loading
    try {
      await form.validateFields();
      form.submit();
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

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
      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          background: 'rgba(32, 32, 32, 0.27)',          
          backdropFilter: 'blur(25px)'
        }}
      >
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1rem',
          padding: '1rem 0'
        }}>
          <Space direction="vertical" size="small" align="center">
            <img src={appLogo} alt="Stargety Oasis" width={128} height={128} style={{ borderRadius: 8 }} />
            <Typography.Title level={2} style={{ margin: 0, color: '#667eea' }}>
              Stargety Oasis
            </Typography.Title>
            <Typography.Text type="secondary">
              Your collaborative digital workspace
            </Typography.Text>
          </Space>
        </div>

        {/* Test Accounts Section */}
        <Collapse
          style={{ marginBottom: '1.5rem' }}
          items={[
            {
              key: 'demo-accounts',
              label: (
                <Space>
                  Demo Accounts
                </Space>
              ),
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Typography.Text type="secondary">
                    Quick login with pre-configured test accounts:
                  </Typography.Text>
                  {testAccounts.map((account, index) => (
                    <Card key={index} size="small" style={{ marginBottom: '8px' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography.Text strong>{account.username}</Typography.Text>
                          <Typography.Text
                            type={account.type.includes('Admin') ? 'warning' : 'secondary'}
                            style={{ fontSize: '12px' }}
                          >
                            {account.type}
                          </Typography.Text>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          {account.description}
                        </Typography.Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography.Text code style={{ fontSize: '12px' }}>
                            Password: {account.password}
                          </Typography.Text>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => handleQuickLogin(account)}
                            disabled={isSubmitting || isLoading}
                          >
                            Use Account
                          </Button>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )
            }
          ]}
        />

        {/* Login Form */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            Welcome Back
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem' }}>
            Sign in to access your workspace
          </Typography.Text>

          {/* General Error */}
          {loginError && (
            <Alert
              message={loginError}
              type="error"
              showIcon
              style={{ marginBottom: '1rem' }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              username: savedUsername || '',
              password: '',
              worldRoomId: 'Stargety-Oasis-1' as WorldRoomId,
              rememberMe: rememberUsername
            }}
          >
            {/* Username Field */}
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Username is required' },
                { min: 2, message: 'Username must be at least 2 characters' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your username"
                disabled={isSubmitting || isLoading}
                autoComplete="username"
              />
            </Form.Item>

            {/* Password Field */}
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Password is required' },
                { min: 3, message: 'Password must be at least 3 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                disabled={isSubmitting || isLoading}
                autoComplete="current-password"
              />
            </Form.Item>

            {/* World Room Selector */}
            <Form.Item
              name="worldRoomId"
              label={
                <Space>
                  <GlobalOutlined />
                  <span>World Room</span>
                </Space>
              }
            >
              <Select
                options={WORLD_ROOMS.map(room => ({
                  value: room.id,
                  label: room.label,
                }))}
                disabled={isSubmitting || isLoading}
                placeholder="Select a world room"
              />
            </Form.Item>
            <Typography.Text type="secondary" style={{ fontSize: '12px', marginTop: '-16px', display: 'block', marginBottom: '16px' }}>
              Select which world room to join. Players in the same room can see each other.
            </Typography.Text>

            {/* Remember Username */}
            <Form.Item name="rememberMe" valuePropName="checked">
              <Checkbox disabled={isSubmitting || isLoading}>
                Remember my username
              </Checkbox>
            </Form.Item>

            {/* Submit Button */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting || isLoading}
                icon={<RocketOutlined />}
                size="large"
                style={{ width: '100%' }}
              >
                {isSubmitting || isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>
        </div>

        {/* Footer */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>Demo Mode:</strong> Any username/password combination works, or use the demo accounts above for testing specific features.
            </Typography.Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};
