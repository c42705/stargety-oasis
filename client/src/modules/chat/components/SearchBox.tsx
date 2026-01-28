import React, { useState, useCallback } from 'react';
import { Input, Button, Space, Dropdown, Menu, DatePicker, Select } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface SearchBoxProps {
  onSearch: (params: {
    query: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    fileType?: string;
  }) => void;
  onClear?: () => void;
  loading?: boolean;
  users?: Array<{ id: string; username: string }>;
  fileTypes?: Array<{ label: string; value: string }>;
}

const FILE_TYPE_OPTIONS = [
  { label: 'All Files', value: '' },
  { label: 'Images', value: 'image/*' },
  { label: 'PDF', value: 'application/pdf' },
  { label: 'Documents', value: 'application/*' },
  { label: 'Text', value: 'text/*' },
];

export const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  onClear,
  loading = false,
  users = [],
  fileTypes = FILE_TYPE_OPTIONS
}) => {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    const params: any = {
      query: query.trim(),
    };

    if (selectedUserId) {
      params.userId = selectedUserId;
    }

    if (dateRange) {
      params.startDate = dateRange[0].toDate();
      params.endDate = dateRange[1].toDate();
    }

    if (selectedFileType) {
      params.fileType = selectedFileType;
    }

    onSearch(params);
  }, [query, selectedUserId, dateRange, selectedFileType, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedUserId(undefined);
    setDateRange(null);
    setSelectedFileType(undefined);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const hasActiveFilters = selectedUserId || dateRange || selectedFileType;

  const filterMenu = (
    <Menu style={{ padding: 16, minWidth: 300 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Filter by User</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select user"
          allowClear
          value={selectedUserId}
          onChange={setSelectedUserId}
          options={users.map(user => ({
            label: user.username,
            value: user.id,
          }))}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Date Range</div>
        <RangePicker
          style={{ width: '100%' }}
          value={dateRange}
          onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>File Type</div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select file type"
          allowClear
          value={selectedFileType}
          onChange={setSelectedFileType}
          options={fileTypes}
        />
      </div>

      <Button
        type="primary"
        block
        onClick={() => setShowFilters(false)}
      >
        Apply Filters
      </Button>
    </Menu>
  );

  return (
    <div className="search-box">
      <Space.Compact style={{ width: '100%' }}>
        <Input
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          prefix={<SearchOutlined />}
          allowClear
          disabled={loading}
        />
        <Dropdown
          overlay={filterMenu}
          trigger={['click']}
          visible={showFilters}
          onVisibleChange={setShowFilters}
        >
          <Button
            icon={<FilterOutlined />}
            type={hasActiveFilters ? 'primary' : 'default'}
          >
            Filters
          </Button>
        </Dropdown>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={loading}
          disabled={!query.trim()}
        >
          Search
        </Button>
        {(query || hasActiveFilters) && (
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        )}
      </Space.Compact>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div style={{ marginTop: 8 }}>
          <Space size={4} wrap>
            {selectedUserId && (
              <span style={{ fontSize: 12, color: '#1890ff' }}>
                User: {users.find(u => u.id === selectedUserId)?.username}
              </span>
            )}
            {dateRange && (
              <span style={{ fontSize: 12, color: '#1890ff' }}>
                {dateRange[0].format('MMM D')} - {dateRange[1].format('MMM D')}
              </span>
            )}
            {selectedFileType && (
              <span style={{ fontSize: 12, color: '#1890ff' }}>
                Type: {fileTypes.find(t => t.value === selectedFileType)?.label}
              </span>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
