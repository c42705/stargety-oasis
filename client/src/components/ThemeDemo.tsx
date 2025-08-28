import React from 'react';
import { Card, Button, Space, Typography, Tag, Alert } from 'antd';
import { useTheme, useThemeAware } from '../shared/ThemeContext';

const { Title, Text } = Typography;

export const ThemeDemo: React.FC = () => {
  const { currentTheme, availableThemes, setTheme } = useTheme();
  const { isDark, colors } = useThemeAware();

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card
        title="Theme System Demo"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border-light)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Current Theme Info */}
          <div>
            <Title level={4} style={{ color: 'var(--color-text-primary)' }}>
              Current Theme: {currentTheme.name}
            </Title>
            <Text type="secondary">{currentTheme.description}</Text>
            <br />
            <Tag color={isDark ? 'blue' : 'orange'}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Tag>
          </div>

          {/* Theme Switcher */}
          <div>
            <Title level={5} style={{ color: 'var(--color-text-primary)' }}>
              Switch Theme:
            </Title>
            <Space wrap>
              {availableThemes.map((theme) => (
                <Button
                  key={theme.id}
                  type={currentTheme.id === theme.id ? 'primary' : 'default'}
                  onClick={() => setTheme(theme.id)}
                  style={{
                    backgroundColor: currentTheme.id === theme.id 
                      ? 'var(--color-accent)' 
                      : 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border)',
                    color: currentTheme.id === theme.id 
                      ? 'white' 
                      : 'var(--color-text-primary)'
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: theme.preview.primary,
                      display: 'inline-block',
                      marginRight: 8,
                    }}
                  />
                  {theme.name}
                </Button>
              ))}
            </Space>
          </div>

          {/* Color Palette Demo */}
          <div>
            <Title level={5} style={{ color: 'var(--color-text-primary)' }}>
              Color Palette:
            </Title>
            <Space wrap>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                />
                <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Primary
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--color-accent)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                />
                <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Accent
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--color-success)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                />
                <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Success
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--color-warning)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                />
                <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Warning
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'var(--color-error)',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                />
                <Text style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Error
                </Text>
              </div>
            </Space>
          </div>

          {/* Component Examples */}
          <div>
            <Title level={5} style={{ color: 'var(--color-text-primary)' }}>
              Component Examples:
            </Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Success Alert"
                description="This is a success alert with theme-aware styling."
                type="success"
                showIcon
              />
              <Alert
                message="Warning Alert"
                description="This is a warning alert with theme-aware styling."
                type="warning"
                showIcon
              />
              <Alert
                message="Error Alert"
                description="This is an error alert with theme-aware styling."
                type="error"
                showIcon
              />
            </Space>
          </div>

          {/* CSS Variables Display */}
          <div>
            <Title level={5} style={{ color: 'var(--color-text-primary)' }}>
              CSS Variables (Sample):
            </Title>
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              backgroundColor: 'var(--color-bg-tertiary)',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid var(--color-border)'
            }}>
              <div>--color-primary: {colors['--color-primary']}</div>
              <div>--color-bg-primary: {colors['--color-bg-primary']}</div>
              <div>--color-text-primary: {colors['--color-text-primary']}</div>
              <div>--color-border: {colors['--color-border']}</div>
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ThemeDemo;
