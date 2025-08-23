import React, { useState } from 'react';
import { Hash, Lock, Plus, Circle } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [selectedDM, setSelectedDM] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'channels' | 'dms' | 'people'>('channels');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Circle size={10} className="status-online" fill="currentColor" />;
      case 'busy': return <Circle size={10} className="status-busy" fill="currentColor" />;
      case 'away': return <Circle size={10} className="status-away" fill="currentColor" />;
      case 'offline': return <Circle size={10} className="status-offline" fill="currentColor" />;
      default: return <Circle size={10} className="status-offline" fill="currentColor" />;
    }
  };

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

  const getStatusText = (status: string, lastSeen?: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'busy': return 'Busy';
      case 'away': return 'Away';
      case 'offline': return lastSeen ? `Last seen ${lastSeen}` : 'Offline';
      default: return 'Unknown';
    }
  };

  const filteredMembers = mockTeamMembers.filter(member => {
    const matchesSearch = member.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = mockTeamMembers.filter(m => m.status === 'online').length;
  const totalCount = mockTeamMembers.length;

  return (
    <div className="people-tab">
      {/* Section Navigation */}
      <div className="section-navigation">
        <button
          className={`section-btn ${activeSection === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveSection('channels')}
        >
          Channels
        </button>
        <button
          className={`section-btn ${activeSection === 'dms' ? 'active' : ''}`}
          onClick={() => setActiveSection('dms')}
        >
          Messages
        </button>
        <button
          className={`section-btn ${activeSection === 'people' ? 'active' : ''}`}
          onClick={() => setActiveSection('people')}
        >
          People
        </button>
      </div>

      {/* Channels Section */}
      {activeSection === 'channels' && (
        <div className="channels-section">
          <div className="section-header">
            <h4>Channels</h4>
            <button className="add-button" title="Add Channel">
              <Plus size={14} />
            </button>
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
                    {channel.type === 'private' ? <Lock size={14} /> : <Hash size={14} />}
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
      )}

      {/* Direct Messages Section */}
      {activeSection === 'dms' && (
        <div className="direct-messages-section">
          <div className="section-header">
            <h4>Direct Messages</h4>
            <button className="add-button" title="New Message">
              <Plus size={14} />
            </button>
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
      )}

      {/* People Section */}
      {activeSection === 'people' && (
        <>
          {/* Header with stats */}
          <div className="people-header">
            <div className="people-stats">
              <span className="online-count">{onlineCount} online</span>
              <span className="total-count">of {totalCount} members</span>
            </div>
          </div>

      {/* Search and Filter */}
      <div className="people-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="status-filter">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* People List */}
      <div className="people-list">
        {filteredMembers.map((member) => (
          <div key={member.id} className="person-item">
            <div className="person-avatar">
              <div className="avatar-circle">
                {member.displayName.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="status-indicator">
                {getStatusIcon(member.status)}
              </span>
            </div>
            
            <div className="person-info">
              <div className="person-header">
                <span className="person-name">{member.displayName}</span>
                {member.isAdmin && (
                  <span className="admin-badge-mini">Admin</span>
                )}
              </div>
              <div className="person-role">{member.role}</div>
              <div className="person-status">
                {getStatusText(member.status, member.lastSeen)}
              </div>
              {member.location && (
                <div className="person-location">
                  📍 {member.location}
                </div>
              )}
            </div>
            
            <div className="person-actions">
              <button className="action-btn" title="Send Message">
                💬
              </button>
              <button className="action-btn" title="Start Call">
                📞
              </button>
              <button className="action-btn" title="More Options">
                ⋯
              </button>
            </div>
          </div>
        ))}
      </div>

          {/* Quick Actions */}
          <div className="people-quick-actions">
            <button className="quick-action-btn">
              <span className="action-icon">👥</span>
              <span>Invite People</span>
            </button>
            <button className="quick-action-btn">
              <span className="action-icon">📋</span>
              <span>Manage Team</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PeopleTab;
