import React, { useState } from 'react';
import { List, Input, Button, Space, Typography, Badge, Avatar, Dropdown, Tabs } from 'antd';
import { SearchOutlined, MessageOutlined, PhoneOutlined, MoreOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
import { Hash, Lock } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount: number;
  unreadCount?: number;
  isActive?: boolean;
}

interface DirectMessage {
  id: string;
  username: string;
  displayName: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  unreadCount?: number;
  lastMessage?: string;
  timestamp?: string;
}

interface TeamMember {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  avatar?: string;
  location?: string;
  timezone?: string;
  lastSeen?: string;
  isAdmin?: boolean;
}

// Mock data for channels
const mockChannels: Channel[] = [
  { id: 'general', name: 'general', type: 'public', memberCount: 3, unreadCount: 0, isActive: true },
  { id: 'random', name: 'random', type: 'public', memberCount: 2, unreadCount: 0 },
  { id: 'development', name: 'development', type: 'public', memberCount: 7, unreadCount: 2 },
  { id: 'design', name: 'design', type: 'public', memberCount: 1, unreadCount: 0 },
  { id: 'marketing', name: 'marketing', type: 'private', memberCount: 4, unreadCount: 1 },
  { id: 'leadership', name: 'leadership', type: 'private', memberCount: 3, unreadCount: 0 }
];

// Mock data for direct messages
const mockDirectMessages: DirectMessage[] = [
  {
    id: 'alice',
    username: 'alice.johnson',
    displayName: 'Alice Johnson',
    status: 'online',
    unreadCount: 2,
    lastMessage: 'Hey, can we discuss the project?',
    timestamp: '2 min ago'
  },
  {
    id: 'bob',
    username: 'bob.smith',
    displayName: 'Bob Smith',
    status: 'busy',
    unreadCount: 0,
    lastMessage: 'Thanks for the update!',
    timestamp: '1 hour ago'
  },
  {
    id: 'charlie',
    username: 'charlie.davis',
    displayName: 'Charlie Davis',
    status: 'away',
    unreadCount: 1,
    lastMessage: 'I\'ll be back in 30 minutes',
    timestamp: '3 hours ago'
  }
];

// Mock data for team members
const mockTeamMembers: TeamMember[] = [
  {
    id: 'alice',
    username: 'alice.johnson',
    displayName: 'Alice Johnson',
    role: 'Product Manager',
    status: 'online',
    location: 'New York, NY',
    timezone: 'EST',
    isAdmin: false
  },
  {
    id: 'bob',
    username: 'bob.smith',
    displayName: 'Bob Smith',
    role: 'Senior Developer',
    status: 'busy',
    location: 'San Francisco, CA',
    timezone: 'PST',
    isAdmin: false
  },
  {
    id: 'charlie',
    username: 'charlie.davis',
    displayName: 'Charlie Davis',
    role: 'UX Designer',
    status: 'away',
    location: 'Austin, TX',
    timezone: 'CST',
    lastSeen: '30 minutes ago',
    isAdmin: false
  },
  {
    id: 'diana',
    username: 'diana.wilson',
    displayName: 'Diana Wilson',
    role: 'DevOps Engineer',
    status: 'offline',
    location: 'Seattle, WA',
    timezone: 'PST',
    lastSeen: '2 hours ago',
    isAdmin: false
  },
  {
    id: 'admin',
    username: 'admin',
    displayName: 'System Administrator',
    role: 'Administrator',
    status: 'online',
    location: 'Remote',
    timezone: 'UTC',
    isAdmin: true
  },
  {
    id: 'emma',
    username: 'emma.brown',
    displayName: 'Emma Brown',
    role: 'Marketing Specialist',
    status: 'online',
    location: 'Chicago, IL',
    timezone: 'CST',
    isAdmin: false
  }
];

export const PeopleTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedDM, setSelectedDM] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'channels' | 'dms' | 'people'>('channels');

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedDM('');
    // TODO: Integrate with ChatModule to switch channels
  };

  const handleDMClick = (dmId: string) => {
    setSelectedDM(dmId);
    setSelectedChannel('');
    // TODO: Integrate with ChatModule to switch to DM
  };

  const filteredMembers = mockTeamMembers.filter(member => {
    const matchesSearch = member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const onlineCount = mockTeamMembers.filter(m => m.status === 'online').length;
  const totalCount = mockTeamMembers.length;

  const handleCallMember = (memberId: string) => {
    console.log('Calling member:', memberId);
    // TODO: Integrate with video calling system
  };

  const handleMemberAction = (memberId: string, action: string) => {
    console.log('Member action:', action, 'for member:', memberId);
    // TODO: Implement member actions
  };

  const tabItems = [
    {
      key: 'channels',
      label: 'Channels',
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Typography.Title level={5} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Channels
            </Typography.Title>
            <Button
              size="small"
              icon={<PlusOutlined />}
              title="Add Channel"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <List
            dataSource={mockChannels}
            renderItem={(channel) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedChannel === channel.id ? 'var(--color-bg-tertiary)' : 'transparent',
                  borderRadius: '4px',
                  padding: '8px 12px'
                }}
                onClick={() => handleChannelClick(channel.id)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ color: 'var(--color-text-secondary)' }}>
                      {channel.type === 'private' ? <Lock size={14} /> : <Hash size={14} />}
                    </div>
                  }
                  title={
                    <Space>
                      <Typography.Text style={{ color: 'var(--color-text-primary)' }}>
                        {channel.name}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                        {channel.memberCount}
                      </Typography.Text>
                    </Space>
                  }
                />
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <Badge count={channel.unreadCount} size="small" />
                )}
              </List.Item>
            )}
          />
        </div>
      )
    },
    {
      key: 'dms',
      label: 'Messages',
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Typography.Title level={5} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
              Direct Messages
            </Typography.Title>
            <Button
              size="small"
              icon={<PlusOutlined />}
              title="New Message"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <List
            dataSource={mockDirectMessages}
            renderItem={(dm) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedDM === dm.id ? 'var(--color-bg-tertiary)' : 'transparent',
                  borderRadius: '4px',
                  padding: '8px 12px'
                }}
                onClick={() => handleDMClick(dm.id)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      dot
                      status={dm.status === 'online' ? 'success' :
                             dm.status === 'busy' ? 'error' :
                             dm.status === 'away' ? 'warning' : 'default'}
                      offset={[-8, 8]}
                    >
                      <Avatar size="small" icon={<UserOutlined />}>
                        {dm.displayName.charAt(0)}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Typography.Text style={{ color: 'var(--color-text-primary)' }}>
                      {dm.displayName}
                    </Typography.Text>
                  }
                  description={
                    dm.lastMessage && (
                      <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                        {dm.lastMessage}
                      </Typography.Text>
                    )
                  }
                />
                {dm.unreadCount && dm.unreadCount > 0 && (
                  <Badge count={dm.unreadCount} size="small" />
                )}
              </List.Item>
            )}
          />
        </div>
      )
    },
    {
      key: 'people',
      label: 'People',
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Input
              placeholder="Search people..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              {onlineCount} of {totalCount} online
            </Typography.Text>
          </div>
          <List
            dataSource={filteredMembers}
            renderItem={(member) => (
              <List.Item
                style={{ padding: '8px 12px' }}
                actions={[
                  <Button
                    key="message"
                    size="small"
                    icon={<MessageOutlined />}
                    type="text"
                    onClick={() => handleDMClick(member.id)}
                  />,
                  <Button
                    key="call"
                    size="small"
                    icon={<PhoneOutlined />}
                    type="text"
                    onClick={() => handleCallMember(member.id)}
                  />,
                  <Dropdown
                    key="more"
                    menu={{
                      items: [
                        { key: 'profile', label: 'View Profile' },
                        { key: 'mention', label: 'Mention in Channel' },
                        { key: 'copy', label: 'Copy Username' }
                      ],
                      onClick: ({ key }) => handleMemberAction(member.id, key)
                    }}
                    trigger={['click']}
                  >
                    <Button size="small" icon={<MoreOutlined />} type="text" />
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge
                      dot
                      status={member.status === 'online' ? 'success' :
                             member.status === 'busy' ? 'error' :
                             member.status === 'away' ? 'warning' : 'default'}
                      offset={[-8, 8]}
                    >
                      <Avatar icon={<UserOutlined />}>
                        {member.displayName.charAt(0)}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Space>
                      <Typography.Text style={{ color: 'var(--color-text-primary)' }}>
                        {member.displayName}
                      </Typography.Text>
                      {member.isAdmin && (
                        <Badge
                          count="Admin"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            fontSize: '10px'
                          }}
                        />
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
                        {member.role}
                      </Typography.Text>
                      {member.location && (
                        <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                          {member.location}
                        </Typography.Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )
    }
  ];

  return (
    <div style={{ height: '100%', backgroundColor: 'var(--color-bg-primary)' }}>
      <Tabs
        activeKey={activeSection}
        onChange={(key) => setActiveSection(key as 'channels' | 'dms' | 'people')}
        items={tabItems}
        style={{ height: '100%' }}
        tabBarStyle={{
          backgroundColor: 'var(--color-bg-secondary)',
          margin: 0,
          padding: '0 16px'
        }}
      />
    </div>
  );
};

export default PeopleTab;
