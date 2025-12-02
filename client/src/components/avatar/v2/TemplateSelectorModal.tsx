/**
 * Template Selector Modal
 * UI for browsing and selecting default sprite sheet templates
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import React, { useState, useMemo } from 'react';
import { Modal, Input, Tabs, Card, Row, Col, Typography, Space, Tag, Empty, Badge } from 'antd';
import { SearchOutlined, StarOutlined, FireOutlined } from '@ant-design/icons';
import { DefaultSpriteSheets, DefaultSpriteSheetTemplate, TemplateCategory } from './DefaultSpriteSheets';

const { Search } = Input;
const { Text, Paragraph } = Typography;
const { TabPane } = Tabs;

export interface TemplateSelectorModalProps {
  /** Whether modal is visible */
  visible: boolean;
  
  /** Callback when modal is closed */
  onClose: () => void;
  
  /** Callback when template is selected */
  onSelect: (template: DefaultSpriteSheetTemplate) => void;
  
  /** Currently selected template ID (optional) */
  selectedTemplateId?: string;
}

/**
 * Template Selector Modal Component
 */
export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedTemplateId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all' | 'featured'>('all');
  
  /**
   * Get filtered templates based on search and category
   */
  const filteredTemplates = useMemo(() => {
    let templates: DefaultSpriteSheetTemplate[] = [];
    
    // Filter by category
    if (activeCategory === 'all') {
      templates = DefaultSpriteSheets.getAllTemplates();
    } else if (activeCategory === 'featured') {
      templates = DefaultSpriteSheets.getFeaturedTemplates();
    } else {
      templates = DefaultSpriteSheets.getTemplatesByCategory(activeCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      templates = DefaultSpriteSheets.searchTemplates(searchQuery);
    }
    
    return templates;
  }, [searchQuery, activeCategory]);
  
  /**
   * Handle template selection
   */
  const handleSelectTemplate = (template: DefaultSpriteSheetTemplate) => {
    DefaultSpriteSheets.incrementPopularity(template.id);
    onSelect(template);
    onClose();
  };
  
  /**
   * Render a single template card
   */
  const renderTemplateCard = (template: DefaultSpriteSheetTemplate) => {
    const isSelected = template.id === selectedTemplateId;
    
    return (
      <Card
        key={template.id}
        hoverable
        onClick={() => handleSelectTemplate(template)}
        style={{
          borderColor: isSelected ? '#1890ff' : undefined,
          borderWidth: isSelected ? 2 : 1
        }}
        cover={
          <div
            style={{
              height: 120,
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt={template.name}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : (
              <Text type="secondary">Preview</Text>
            )}
            
            {template.featured && (
              <Badge
                count={<StarOutlined style={{ color: '#faad14' }} />}
                style={{ position: 'absolute', top: 8, right: 8 }}
              />
            )}
            
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(24, 144, 255, 0.1)',
                  border: '2px solid #1890ff',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
        }
      >
        <Card.Meta
          title={
            <Space>
              {template.name}
              {template.popularity > 100 && (
                <FireOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
              )}
            </Space>
          }
          description={
            <div>
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ marginBottom: 8, fontSize: 12 }}
              >
                {template.description}
              </Paragraph>
              <Space size={4} wrap>
                {template.tags.slice(0, 3).map(tag => (
                  <Tag key={tag} style={{ fontSize: 10, margin: 0 }}>
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>
          }
        />
      </Card>
    );
  };
  
  /**
   * Render templates grid
   */
  const renderTemplatesGrid = () => {
    if (filteredTemplates.length === 0) {
      return (
        <Empty
          description={
            searchQuery
              ? `No templates found for "${searchQuery}"`
              : 'No templates available in this category'
          }
        />
      );
    }
    
    return (
      <Row gutter={[16, 16]}>
        {filteredTemplates.map(template => (
          <Col key={template.id} xs={24} sm={12} md={8} lg={6}>
            {renderTemplateCard(template)}
          </Col>
        ))}
      </Row>
    );
  };
  
  return (
    <Modal
      title="Select Character Template"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
    >
      {/* Search Bar */}
      <Search
        placeholder="Search templates..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      
      {/* Category Tabs */}
      <Tabs
        activeKey={activeCategory}
        onChange={(key) => setActiveCategory(key as TemplateCategory | 'all' | 'featured')}
        style={{ marginBottom: 16 }}
      >
        <TabPane tab="All Templates" key="all" />
        <TabPane
          tab={
            <Space>
              <StarOutlined />
              Featured
            </Space>
          }
          key="featured"
        />
        {DefaultSpriteSheets.getCategories().map(category => (
          <TabPane
            tab={DefaultSpriteSheets.getCategoryName(category)}
            key={category}
          />
        ))}
      </Tabs>
      
      {/* Category Description */}
      {activeCategory !== 'all' && activeCategory !== 'featured' && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {DefaultSpriteSheets.getCategoryDescription(activeCategory)}
        </Paragraph>
      )}
      
      {/* Templates Grid */}
      {renderTemplatesGrid()}
    </Modal>
  );
};

