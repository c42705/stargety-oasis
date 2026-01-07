import React, { useState, useCallback, useMemo } from 'react';
import { 
  Input, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Card,
  Tag,
  Tooltip,
  Spin
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  FileTextOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  AudioOutlined
} from '@ant-design/icons';
import { Message } from '../../../types/chat';

const { Search: SearchInput } = Input;
const { Option } = Select;
const { Text } = Typography;

interface SearchBoxProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onSearchResults?: (results: Message[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileType?: string;
  authorId?: string;
  hasReactions?: boolean;
  hasAttachments?: boolean;
  messageType?: 'text' | 'file' | 'reaction' | 'thread';
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular' | 'user';
  icon?: React.ReactNode;
  count?: number;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  onSearchResults,
  placeholder = "Search messages...",
  className = '',
  disabled = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  // Mock search suggestions (in real app, these would come from backend)
  const searchSuggestions: SearchSuggestion[] = useMemo(() => [
    { text: 'meeting notes', type: 'popular', icon: <FileTextOutlined />, count: 12 },
    { text: 'project update', type: 'recent', icon: <CalendarOutlined />, count: 5 },
    { text: 'alice', type: 'user', icon: <UserOutlined />, count: 23 },
    { text: 'design feedback', type: 'popular', icon: <TagOutlined />, count: 8 },
    { text: 'deadline', type: 'recent', icon: <CalendarOutlined />, count: 3 }
  ], []);

  // Mock search results (in real app, these would come from backend)
  const mockSearchResults = useCallback((query: string, searchFilters: SearchFilters): Message[] => {
    // This is a mock implementation - in real app, this would be an API call
    return [
      {
        id: '1',
        content: { text: `Found message containing "${query}"` },
        author: { id: 'user1', username: 'Alice', avatar: '', online: true },
        authorId: 'user1',
        roomId: 'general',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 28800000), // 8 hours from now
        type: 'text',
        reactions: [],
        attachments: [],
        isEdited: false,
        threadId: undefined,
        parentId: undefined
      },
      {
        id: '2',
        content: { text: `Another message with "${query}" here` },
        author: { id: 'user2', username: 'Bob', avatar: '', online: true },
        authorId: 'user2',
        roomId: 'general',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 25200000), // 7 hours from now
        type: 'text',
        reactions: [{ id: 'reaction1', emoji: '👍', userId: 'user1', user: { id: 'user1', username: 'Alice', avatar: '', online: true }, createdAt: new Date() }],
        attachments: [],
        isEdited: false,
        threadId: undefined,
        parentId: undefined
      }
    ];
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string = searchQuery) => {
    if (!query.trim() && Object.keys(filters).length === 0) return;

    setIsSearching(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const results = mockSearchResults(query, filters);
      onSearch(query, filters);
      onSearchResults?.(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, filters, onSearch, onSearchResults, mockSearchResults]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    onSearch('', {});
    onSearchResults?.([]);
  }, [onSearch, onSearchResults]);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // Get file type icon
  const getFileTypeIcon = (fileType?: string) => {
    if (!fileType) return null;
    
    switch (fileType) {
      case 'image':
        return <FileImageOutlined style={{ fontSize: '12px', color: '#1890ff' }} />;
      case 'video':
        return <PlayCircleOutlined style={{ fontSize: '12px', color: '#722ed1' }} />;
      case 'audio':
        return <AudioOutlined style={{ fontSize: '12px', color: '#52c41a' }} />;
      case 'document':
        return <FileTextOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />;
      default:
        return <FileTextOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />;
    }
  };

  // Get filter label
  const getFilterLabel = (key: keyof SearchFilters, value: any) => {
    switch (key) {
      case 'dateRange':
        return 'Date Range';
      case 'fileType':
        return getFileTypeIcon(value);
      case 'authorId':
        return `By: ${value}`;
      case 'hasReactions':
        return value ? 'Has Reactions' : 'No Reactions';
      case 'hasAttachments':
        return value ? 'Has Attachments' : 'No Attachments';
      case 'messageType':
        return value?.charAt(0).toUpperCase() + value?.slice(1);
      default:
        return value;
    }
  };

  return (
    <div className={`search-box ${className}`} style={{ width: '100%' }}>
      {/* Main Search Bar */}
      <Card size="small" style={{ marginBottom: '12px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Search Input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                loading={isSearching}
                style={{
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              
              {/* Search Suggestions */}
              {searchQuery && !isSearching && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  marginTop: '4px',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  {searchSuggestions
                    .filter(suggestion => 
                      suggestion.text.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((suggestion, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: 'var(--color-text-primary)'
                        }}
                        onClick={() => {
                          setSearchQuery(suggestion.text);
                          handleSearch(suggestion.text);
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {suggestion.icon}
                        <span>{suggestion.text}</span>
                        {suggestion.count && (
                          <Text type="secondary" style={{ fontSize: '10px' }}>
                            ({suggestion.count})
                          </Text>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => handleSearch()}
              loading={isSearching}
              disabled={disabled}
              style={{
                borderRadius: '6px'
              }}
            />

            {/* Filters Button */}
            <Button
              type="text"
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              disabled={disabled}
              style={{
                borderRadius: '6px',
                color: 'var(--color-text-secondary)'
              }}
            />
          </div>

          {/* Active Filters */}
          {Object.keys(filters).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                
                return (
                  <Tag
                    key={key}
                    closable
                    onClose={() => handleFilterChange(key as keyof SearchFilters, undefined)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {getFilterLabel(key as keyof SearchFilters, value)}
                  </Tag>
                );
              })}
              <Button
                type="text"
                size="small"
                onClick={handleClearFilters}
                style={{ fontSize: '11px', padding: '2px 4px' }}
              >
                Clear All
              </Button>
            </div>
          )}
        </Space>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card 
          size="small" 
          style={{ 
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Date Range Filter */}
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                Date Range
              </Text>
              <Select
                placeholder="Select date range"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('dateRange', value)}
                disabled={disabled}
              >
                <Option value="today">Today</Option>
                <Option value="week">This Week</Option>
                <Option value="month">This Month</Option>
                <Option value="year">This Year</Option>
              </Select>
            </div>

            {/* File Type Filter */}
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                File Type
              </Text>
              <Select
                placeholder="Filter by file type"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('fileType', value)}
                disabled={disabled}
              >
                <Option value="image">Images</Option>
                <Option value="video">Videos</Option>
                <Option value="audio">Audio</Option>
                <Option value="document">Documents</Option>
              </Select>
            </div>

            {/* Message Type Filter */}
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                Message Type
              </Text>
              <Select
                placeholder="Filter by message type"
                style={{ width: '100%' }}
                allowClear
                onChange={(value) => handleFilterChange('messageType', value)}
                disabled={disabled}
              >
                <Option value="text">Text Messages</Option>
                <Option value="file">File Messages</Option>
                <Option value="reaction">Reactions</Option>
                <Option value="thread">Thread Messages</Option>
              </Select>
            </div>

            {/* Advanced Filters */}
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                Advanced Filters
              </Text>
              <Space wrap style={{ width: '100%' }}>
                <Button
                  type={filters.hasReactions ? 'primary' : 'default'}
                  size="small"
                  onClick={() => handleFilterChange('hasReactions', !filters.hasReactions)}
                  disabled={disabled}
                >
                  Has Reactions
                </Button>
                <Button
                  type={filters.hasAttachments ? 'primary' : 'default'}
                  size="small"
                  onClick={() => handleFilterChange('hasAttachments', !filters.hasAttachments)}
                  disabled={disabled}
                >
                  Has Attachments
                </Button>
              </Space>
            </div>

            {/* Search Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => handleSearch()}
                loading={isSearching}
                disabled={disabled}
                size="small"
              >
                Apply Filters
              </Button>
            </div>
          </Space>
        </Card>
      )}
    </div>
  );
};