import React, { useState, useEffect } from 'react';
import { Drawer, Tabs, Typography, Space, FloatButton } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../shared/AuthContext';

export interface PanelTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

interface SlidingPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  tabs: PanelTab[];
  className?: string;
}

export const SlidingPanel: React.FC<SlidingPanelProps> = ({
  isOpen,
  onToggle,
  tabs,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');
  const { user } = useAuth();

  // Set first tab as active when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Convert tabs to Ant Design Tabs format
  const tabItems = tabs.map(tab => ({
    key: tab.id,
    label: (
      <Space>
        {tab.icon}
        {tab.label}
      </Space>
    ),
    children: tab.component
  }));

  return (
    <Drawer
      title={
        <Space direction="vertical" size="small">
          <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Workspace
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
            {user?.displayName}
            {user?.isAdmin && (
              <Typography.Text
                style={{
                  marginLeft: '8px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                Admin
              </Typography.Text>
            )}
          </Typography.Text>
        </Space>
      }
      placement="right"
      onClose={onToggle}
      open={isOpen}
      width={480}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0 },
        header: {
          backgroundColor: 'var(--color-bg-tertiary)',
          borderBottom: '1px solid var(--color-border-light)'
        }
      }}
      className={className}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ height: '100%' }}
        tabBarStyle={{
          backgroundColor: 'var(--color-bg-secondary)',
          margin: 0,
          padding: '0 16px'
        }}
      />
    </Drawer>
  );
};

// Panel Toggle Button Component
interface PanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const PanelToggle: React.FC<PanelToggleProps> = ({
  isOpen,
  onToggle,
  className = ''
}) => {
  // Only render the floating button when the panel is closed
  if (isOpen) {
    return null;
  }

  return (
    <FloatButton
      icon={<MessageCircle size={20} />}
      onClick={onToggle}
      style={{
        right: 24,
        bottom: 24,
        backgroundColor: 'var(--color-accent)',
        borderColor: 'var(--color-accent)'
      }}
      className={className}
    />
  );
};

export default SlidingPanel;
