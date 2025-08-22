import React, { useState } from 'react';
import './PanelTabs.css';

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'busy': return '🔴';
      case 'away': return '🟡';
      case 'offline': return '⚫';
      default: return '⚫';
    }
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
    </div>
  );
};

export default PeopleTab;
