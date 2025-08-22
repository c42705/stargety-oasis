import React, { useState } from 'react';
import './PanelTabs.css';

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
  },
  {
    id: 'diana',
    username: 'diana.wilson',
    displayName: 'Diana Wilson',
    status: 'offline',
    unreadCount: 0,
    lastMessage: 'Good night everyone!',
    timestamp: 'Yesterday'
  }
];

export const ChannelsTab: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedDM, setSelectedDM] = useState<string>('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'busy': return '🔴';
      case 'away': return '🟡';
      case 'offline': return '⚫';
      default: return '⚫';
    }
  };

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedDM('');
  };

  const handleDMClick = (dmId: string) => {
    setSelectedDM(dmId);
    setSelectedChannel('');
  };

  return (
    <div className="channels-tab">
      {/* Channels Section */}
      <div className="channels-section">
        <div className="section-header">
          <h4>Channels</h4>
          <button className="add-button" title="Add Channel">+</button>
        </div>
        
        <div className="channels-list">
          {mockChannels.map((channel) => (
            <div
              key={channel.id}
              className={`channel-item ${selectedChannel === channel.id ? 'selected' : ''}`}
              onClick={() => handleChannelClick(channel.id)}
            >
              <div className="channel-info">
                <span className="channel-icon">
                  {channel.type === 'private' ? '🔒' : '#'}
                </span>
                <span className="channel-name">{channel.name}</span>
                <span className="member-count">{channel.memberCount}</span>
              </div>
              {channel.unreadCount && channel.unreadCount > 0 && (
                <span className="unread-badge">{channel.unreadCount}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Direct Messages Section */}
      <div className="direct-messages-section">
        <div className="section-header">
          <h4>Direct Messages</h4>
          <button className="add-button" title="New Message">+</button>
        </div>
        
        <div className="dm-list">
          {mockDirectMessages.map((dm) => (
            <div
              key={dm.id}
              className={`dm-item ${selectedDM === dm.id ? 'selected' : ''}`}
              onClick={() => handleDMClick(dm.id)}
            >
              <div className="dm-avatar">
                <div className="avatar-circle">
                  {dm.displayName.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="status-indicator">
                  {getStatusIcon(dm.status)}
                </span>
              </div>
              
              <div className="dm-info">
                <div className="dm-header">
                  <span className="dm-name">{dm.displayName}</span>
                  {dm.timestamp && (
                    <span className="dm-timestamp">{dm.timestamp}</span>
                  )}
                </div>
                {dm.lastMessage && (
                  <div className="dm-preview">{dm.lastMessage}</div>
                )}
              </div>
              
              {dm.unreadCount && dm.unreadCount > 0 && (
                <span className="unread-badge">{dm.unreadCount}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-button">
          <span className="action-icon">💬</span>
          <span>Start Conversation</span>
        </button>
        <button className="action-button">
          <span className="action-icon">📞</span>
          <span>Start Call</span>
        </button>
      </div>
    </div>
  );
};

export default ChannelsTab;
