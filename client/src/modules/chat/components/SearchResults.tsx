import React, { useState, useRef, useEffect } from 'react';
import { List, Typography, Empty, Button, Space, Tag, Divider, Spin } from 'antd';
import { SearchOutlined, CloseOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Message } from '../../../redux/types/chat';
import MessageItem from './MessageItem';

const { Text, Paragraph } = Typography;

interface SearchResultsProps {
  results: Message[];
  query: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onClose?: () => void;
  onMessageClick?: (messageId: string) => void;
  currentUserId?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  loading = false,
  hasMore = false,
  onLoadMore,
  onClose,
  onMessageClick,
  currentUserId = 'current-user'
}) => {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to top when results change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [results]);

  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <mark key={index} style={{ backgroundColor: '#fffb8f', padding: '0 2px' }}>
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const toggleExpand = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatMessageDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getMessagePreview = (message: Message) => {
    const text = message.content.text || '';
    const maxLength = 200;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  };

  if (loading && results.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Searching for "{query}"...</Text>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text>No results found for "{query}"</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Try different keywords or filters
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="search-results" ref={listRef} style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        backgroundColor: '#fff',
        zIndex: 1
      }}>
        <Space>
          <SearchOutlined />
          <Text strong>
            {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
          </Text>
        </Space>
        {onClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        )}
      </div>

      {/* Results List */}
      <List
        dataSource={results}
        renderItem={(message, index) => {
          const isExpanded = expandedMessages.has(message.id);
          const preview = getMessagePreview(message);
          
          return (
            <div key={message.id}>
              <List.Item
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? '#f5f5f5' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => {
                  if (onMessageClick) {
                    onMessageClick(message.id);
                  } else {
                    toggleExpand(message.id);
                  }
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {index + 1}
                      </div>
                    </div>
                  }
                  title={
                    <Space size={4}>
                      <Text strong>{message.authorId || 'Unknown'}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        • {formatMessageDate(message.createdAt)}
                      </Text>
                      {message.attachments && message.attachments.length > 0 && (
                        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                          {message.attachments.length} file{message.attachments.length > 1 ? 's' : ''}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph
                        ellipsis={{ rows: isExpanded ? undefined : 2, expandable: false }}
                        style={{ marginBottom: 4 }}
                      >
                        {highlightText(preview, query)}
                      </Paragraph>
                      <Button
                        type="text"
                        size="small"
                        icon={isExpanded ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(message.id);
                        }}
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </Button>
                    </div>
                  }
                />
              </List.Item>
              {index < results.length - 1 && <Divider style={{ margin: 0 }} />}
            </div>
          );
        }}
      />

      {/* Load More */}
      {hasMore && (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <Button
            type="link"
            onClick={onLoadMore}
            loading={loading}
          >
            Load more results
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
