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
  Tooltip
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

const { Text, Title } = Typography;
const { Search } = Input;

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

  return (
    <div className={`chat-room-list ${className}`} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid var(--color-border-light)',
        backgroundColor: 'var(--color-bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
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
        </div>

        {/* Search */}
        <Search
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          prefix={<SearchOutlined />}
          allowClear
          style={{ marginBottom: '8px' }}
        />

        {/* Room Stats */}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''} • 
          {rooms.filter(r => r.isPrivate).length} private • 
          {rooms.filter(r => !r.isPrivate).length} public
        </Text>
      </div>

      {/* Room List */}
      <List
        dataSource={filteredRooms}
        style={{ height: 'calc(100% - 120px)', overflow: 'auto' }}
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
                borderBottom: '1px solid var(--color-border-light)',
                backgroundColor: isSelected ? 'var(--color-bg-secondary)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => onRoomSelect(room.id)}
            >
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Room Icon */}
                <div style={{ flexShrink: 0 }}>
                  {getRoomIcon(room)}
                </div>

                {/* Room Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Text
                      strong
                      style={{ 
                        fontSize: '14px',
                        color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)'
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
                        <LockOutlined style={{ fontSize: '10px', color: '#faad14' }} />
                      </Tooltip>
                    )}
                  </div>

                  {/* Room Description */}
                  {room.description && (
                    <Text 
                      type="secondary" 
                      style={{ fontSize: '12px', marginBottom: '4px' }}
                    >
                      {room.description}
                    </Text>
                  )}

                  {/* Room Tags */}
                  {room.tags && room.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
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
                    </div>
                  )}

                  {/* Member Count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Badge 
                      count={onlineCount}
                      overflowCount={999}
                      style={{ backgroundColor: '#52c41a' }}
                    />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {totalCount} member{totalCount !== 1 ? 's' : ''}
                    </Text>
                  </div>
                </div>

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
                      style={{ 
                        color: 'var(--color-text-secondary)',
                        fontSize: '12px'
                      }}
                    />
                  </Dropdown>
                </div>
              </div>
            </List.Item>
          );
        }}
      />

      {/* Create Room Modal */}
      {showCreateModal && (
        <Card
          title="Create New Chat Room"
          style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Room Name *
              </label>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name..."
                maxLength={50}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Description (Optional)
              </label>
              <Input.TextArea
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="Enter room description..."
                rows={2}
                maxLength={200}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500' }}>
                Privacy
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type={newRoomIsPrivate ? 'default' : 'primary'}
                  onClick={() => setNewRoomIsPrivate(false)}
                  size="small"
                >
                  Public
                </Button>
                <Button
                  type={newRoomIsPrivate ? 'primary' : 'default'}
                  onClick={() => setNewRoomIsPrivate(true)}
                  size="small"
                >
                  Private
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoomName('');
                  setNewRoomDescription('');
                  setNewRoomIsPrivate(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
              >
                Create Room
              </Button>
            </div>
          </Space>
        </Card>
      )}
    </div>
  );
};