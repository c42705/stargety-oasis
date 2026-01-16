import React, { useState, useCallback, useMemo } from 'react';
import {
  List,
  Typography,
  Space,
  Button,
  Input,
  Badge,
  Card,
  Dropdown,
  Tag,
  Tooltip,
  Layout,
  Modal,
  Form,
  Segmented
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  TagOutlined,
  LockOutlined,
  GlobalOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { ChatRoom, User } from '../../../types/chat';
import { useTheme } from '../../../shared/ThemeContext';

const { Text, Title } = Typography;
const { Search } = Input;
const { Header, Content } = Layout;

interface ChatRoomListProps {
  rooms: ChatRoom[];
  currentUser: User;
  currentRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  onRoomCreate: (roomData: Partial<ChatRoom>) => void;
  onRoomUpdate: (roomId: string, roomData: Partial<ChatRoom>) => void;
  onRoomDelete: (roomId: string) => void;
  onRoomLeave: (roomId: string) => void;
  className?: string;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  currentUser,
  currentRoomId,
  onRoomSelect,
  onRoomCreate,
  onRoomUpdate,
  onRoomDelete,
  onRoomLeave,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(false);

  // Filter rooms based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    
    const query = searchQuery.toLowerCase();
    return rooms.filter(room => 
      room.name.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [rooms, searchQuery]);

  // Get room icon based on room type
  const getRoomIcon = (room: ChatRoom) => {
    if (room.isPrivate) {
      return <LockOutlined style={{ color: '#faad14' }} />;
    }
    if (room.tags?.includes('general')) {
      return <TagOutlined style={{ color: '#1890ff' }} />;
    }
    if (room.tags?.includes('team')) {
      return <TeamOutlined style={{ color: '#52c41a' }} />;
    }
    return <GlobalOutlined style={{ color: '#722ed1' }} />;
  };

  // Get room type label
  const getRoomTypeLabel = (room: ChatRoom) => {
    if (room.isPrivate) return 'Private';
    if (room.tags?.includes('general')) return 'General';
    if (room.tags?.includes('team')) return 'Team';
    return 'Public';
  };

  // Get room type color
  const getRoomTypeColor = (room: ChatRoom) => {
    if (room.isPrivate) return 'orange';
    if (room.tags?.includes('general')) return 'blue';
    if (room.tags?.includes('team')) return 'green';
    return 'purple';
  };

  // Handle room creation
  const handleCreateRoom = useCallback(() => {
    if (!newRoomName.trim()) return;

    const newRoom: Partial<ChatRoom> = {
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || undefined,
      isPrivate: newRoomIsPrivate,
      tags: [],
      createdBy: currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onRoomCreate(newRoom);
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomIsPrivate(false);
    setShowCreateModal(false);
  }, [newRoomName, newRoomDescription, newRoomIsPrivate, currentUser, onRoomCreate]);

  // Handle room actions
  const handleRoomActions = useCallback((room: ChatRoom): MenuProps['items'] => {
    const isAdmin = room.createdBy === currentUser.id;
    const isMember = room.members?.some(member => member.id === currentUser.id);

    const menuItems: MenuProps['items'] = [
      {
        key: 'select',
        icon: <UserOutlined />,
        label: 'Join Room',
        disabled: isMember,
        onClick: () => onRoomSelect(room.id)
      },
      ...(isMember ? [
        {
          key: 'leave',
          icon: <UserOutlined />,
          label: 'Leave Room',
          onClick: () => onRoomLeave(room.id)
        }
      ] : []),
      ...(isAdmin ? [
        {
          type: 'divider' as const,
          key: 'divider-1'
        },
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: 'Edit Room',
          onClick: () => {
            // Would open edit modal
            console.log('Edit room:', room.id);
          }
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Delete Room',
          danger: true,
          onClick: () => onRoomDelete(room.id)
        }
      ] : [])
    ];

    return menuItems;
  }, [currentUser, onRoomSelect, onRoomLeave, onRoomDelete]);

  // Get online members count
  const getOnlineMembersCount = (room: ChatRoom) => {
    return room.members?.filter(member => member.online).length || 0;
  };

  // Get total members count
  const getTotalMembersCount = (room: ChatRoom) => {
    return room.members?.length || 0;
  };

  const { currentTheme } = useTheme();

  return (
    <Layout className={`chat-room-list ${className}`} style={{ width: '100%', height: '100%' }}>
      {/* Header */}
      <Header style={{
        padding: '16px',
        backgroundColor: currentTheme.cssVariables['--color-bg-secondary'],
        borderBottom: `1px solid ${currentTheme.cssVariables['--color-border-light']}`
      }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              Chat Rooms
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              size="small"
            >
              Create Room
            </Button>
          </Space>

          {/* Search */}
          <Search
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />

          {/* Room Stats */}
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} •
            {rooms.filter(r => r.isPrivate).length} private •
            {rooms.filter(r => !r.isPrivate).length} public
          </Text>
        </Space>
      </Header>

      {/* Room List */}
      <Content style={{ overflow: 'auto', backgroundColor: currentTheme.cssVariables['--color-bg-primary'] }}>
        <List
          dataSource={filteredRooms}
          renderItem={(room) => {
            const isSelected = room.id === currentRoomId;
            const isMember = room.members?.some(member => member.id === currentUser.id);
            const onlineCount = getOnlineMembersCount(room);
            const totalCount = getTotalMembersCount(room);

            return (
              <List.Item
                key={room.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${currentTheme.cssVariables['--color-border-light']}`,
                  backgroundColor: isSelected ? currentTheme.cssVariables['--color-bg-secondary'] : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onRoomSelect(room.id)}
              >
                <Space style={{ width: '100%' }} size="middle">
                  {/* Room Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {getRoomIcon(room)}
                  </div>

                  {/* Room Info */}
                  <Space direction="vertical" style={{ flex: 1, minWidth: 0 }} size={0}>
                    <Space size="small">
                      <Text
                        strong
                        style={{
                          fontSize: '14px',
                          color: isSelected ? currentTheme.cssVariables['--color-accent'] : currentTheme.cssVariables['--color-text-primary']
                        }}
                      >
                        {room.name}
                      </Text>
                      <Tag
                        color={getRoomTypeColor(room)}
                        style={{ fontSize: '10px' }}
                      >
                        {getRoomTypeLabel(room)}
                      </Tag>
                      {room.isPrivate && (
                        <Tooltip title="Private room">
                          <LockOutlined style={{ fontSize: '10px' }} />
                        </Tooltip>
                      )}
                    </Space>

                    {/* Room Description */}
                    {room.description && (
                      <Text
                        type="secondary"
                        style={{ fontSize: '12px' }}
                      >
                        {room.description}
                      </Text>
                    )}

                    {/* Room Tags */}
                    {room.tags && room.tags.length > 0 && (
                      <Space size={4} wrap>
                        {room.tags.slice(0, 3).map(tag => (
                          <Tag key={tag} style={{ fontSize: '10px' }}>
                            #{tag}
                          </Tag>
                        ))}
                        {room.tags.length > 3 && (
                          <Text type="secondary" style={{ fontSize: '10px' }}>
                            +{room.tags.length - 3} more
                          </Text>
                        )}
                      </Space>
                    )}

                    {/* Member Count */}
                    <Space size="small">
                      <Badge
                        count={onlineCount}
                        overflowCount={999}
                        style={{ backgroundColor: currentTheme.cssVariables['--color-success'] }}
                      />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {totalCount} member{totalCount !== 1 ? 's' : ''}
                      </Text>
                    </Space>
                  </Space>

                  {/* Room Actions */}
                  <div style={{ flexShrink: 0 }}>
                    <Dropdown
                      menu={{
                        items: handleRoomActions(room)
                      }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                      />
                    </Dropdown>
                  </div>
                </Space>
              </List.Item>
            );
          }}
        />
      </Content>

      {/* Create Room Modal */}
      <Modal
        title="Create New Chat Room"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          setNewRoomName('');
          setNewRoomDescription('');
          setNewRoomIsPrivate(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowCreateModal(false);
              setNewRoomName('');
              setNewRoomDescription('');
              setNewRoomIsPrivate(false);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleCreateRoom}
            disabled={!newRoomName.trim()}
          >
            Create Room
          </Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Room Name" required>
            <Input
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name..."
              maxLength={50}
            />
          </Form.Item>

          <Form.Item label="Description (Optional)">
            <Input.TextArea
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Enter room description..."
              rows={2}
              maxLength={200}
            />
          </Form.Item>

          <Form.Item label="Privacy">
            <Segmented
              value={newRoomIsPrivate ? 'private' : 'public'}
              onChange={(value) => setNewRoomIsPrivate(value === 'private')}
              options={[
                { label: 'Public', value: 'public' },
                { label: 'Private', value: 'private' }
              ]}
              block
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};