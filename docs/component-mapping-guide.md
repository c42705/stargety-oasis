# Component Mapping Guide: Custom Components → Ant Design

## Overview

This document provides detailed mapping from current custom components to Ant Design equivalents, including implementation notes and migration strategies.

## Completed Migrations ✅

### AreaFormModal.tsx
**Status**: ✅ COMPLETED
**Migration**: Custom modal → `Modal` + `Form` + `Input` + `Select` + `ColorPicker`
**Key Changes**:
- Replaced custom form validation with Ant Design Form rules
- Used ColorPicker component for color selection
- Implemented proper form state management
- Removed 245 lines of custom CSS

## Tier 1 - Foundation Components

### 1. ConfirmationDialog.tsx + .css
**Current**: Custom modal with overlay and buttons
**Target**: `Modal` with confirm/cancel actions
**Ant Design Components**: `Modal.confirm()` or `Modal` + `Button`
**Implementation**:
```typescript
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

Modal.confirm({
  title: 'Confirm Action',
  icon: <ExclamationCircleOutlined />,
  content: 'Are you sure you want to proceed?',
  onOk: handleConfirm,
  onCancel: handleCancel,
});
```
**Complexity**: Low
**Estimated Time**: 30 minutes

### 2. App.tsx Header Section
**Current**: Custom header with navigation and user info
**Target**: `Layout.Header` + `Space` + `Button` + `Avatar` + `Dropdown`
**Ant Design Components**: `Layout`, `Space`, `Button`, `Avatar`, `Dropdown`, `Badge`
**Implementation**:
```typescript
import { Layout, Space, Button, Avatar, Dropdown, Badge } from 'antd';
import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';

<Layout.Header>
  <Space>
    <h1>Stargety Oasis</h1>
    <Space>
      <span>Welcome, {user.displayName}</span>
      <Badge status="success" text="Online" />
      <Dropdown menu={{ items: userMenuItems }}>
        <Avatar icon={<UserOutlined />} />
      </Dropdown>
    </Space>
  </Space>
</Layout.Header>
```
**Complexity**: Medium
**Estimated Time**: 45 minutes

### 3. Basic Button Standardization
**Current**: Custom `.btn`, `.btn-primary`, `.btn-secondary` classes
**Target**: `Button` with variants
**Ant Design Components**: `Button`
**Implementation**:
```typescript
// Replace custom buttons throughout the app
<Button type="primary">Primary Action</Button>
<Button type="default">Secondary Action</Button>
<Button type="text">Text Button</Button>
<Button danger>Delete</Button>
```
**Complexity**: Low
**Estimated Time**: 2 hours (global replacement)

## Tier 2 - Core Features

### 4. LoginModule.tsx + .css
**Current**: Custom login form with gradient background
**Target**: `Card` + `Form` + `Input` + `Button`
**Ant Design Components**: `Card`, `Form`, `Input`, `Button`, `Space`, `Divider`
**Implementation**:
```typescript
import { Card, Form, Input, Button, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

<Card title="Welcome to Stargety Oasis" style={{ maxWidth: 400 }}>
  <Form onFinish={handleLogin}>
    <Form.Item name="username" rules={[{ required: true }]}>
      <Input prefix={<UserOutlined />} placeholder="Username" />
    </Form.Item>
    <Form.Item name="password" rules={[{ required: true }]}>
      <Input.Password prefix={<LockOutlined />} placeholder="Password" />
    </Form.Item>
    <Button type="primary" htmlType="submit" block>
      Login
    </Button>
  </Form>
</Card>
```
**Complexity**: Medium
**Estimated Time**: 1.5 hours

### 5. SlidingPanel.tsx + .css
**Current**: Custom sliding sidebar with tabs
**Target**: `Drawer` + `Tabs` or `Layout.Sider` + `Tabs`
**Ant Design Components**: `Drawer`, `Tabs`, `Layout.Sider`
**Implementation**:
```typescript
import { Drawer, Tabs } from 'antd';
import { MessageSquare, Users, User } from 'lucide-react';

<Drawer
  title="Panel"
  placement="right"
  open={isPanelOpen}
  onClose={onClose}
  width={480}
>
  <Tabs
    items={[
      { key: 'chat', label: 'Chat', icon: <MessageSquare />, children: <ChatModule /> },
      { key: 'people', label: 'People', icon: <Users />, children: <PeopleTab /> },
      { key: 'profile', label: 'Profile', icon: <User />, children: <MyProfileTab /> }
    ]}
  />
</Drawer>
```
**Complexity**: High
**Estimated Time**: 3 hours

### 6. ChatModule.tsx + .css
**Current**: Custom chat interface with message list and input
**Target**: `List` + `Input` + `Avatar` + `Badge`
**Ant Design Components**: `List`, `Input`, `Avatar`, `Badge`, `Space`, `Button`
**Implementation**:
```typescript
import { List, Input, Avatar, Badge, Space, Button } from 'antd';
import { SendOutlined, SmileOutlined } from '@ant-design/icons';

// Message list
<List
  dataSource={messages}
  renderItem={(message) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Avatar>{message.user.charAt(0)}</Avatar>}
        title={message.user}
        description={message.text}
      />
    </List.Item>
  )}
/>

// Input area
<Space.Compact style={{ width: '100%' }}>
  <Input
    placeholder="Type a message..."
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onPressEnter={sendMessage}
  />
  <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} />
</Space.Compact>
```
**Complexity**: Medium
**Estimated Time**: 2 hours

### 7. SaveStatusIndicator.tsx + .css
**Current**: Custom status indicator with icons and text
**Target**: `Alert` + `Badge` + `Spin`
**Ant Design Components**: `Alert`, `Badge`, `Spin`, `Typography`
**Implementation**:
```typescript
import { Alert, Badge, Spin, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const statusConfig = {
  saved: { status: 'success', icon: <CheckCircleOutlined />, text: 'All changes saved' },
  saving: { status: 'processing', icon: <Spin size="small" />, text: 'Saving...' },
  error: { status: 'error', icon: <ExclamationCircleOutlined />, text: 'Save failed' }
};

<Badge status={statusConfig[status].status} text={statusConfig[status].text} />
```
**Complexity**: Low
**Estimated Time**: 30 minutes

## Tier 3 - Advanced Features

### 8. MyProfileTab.tsx + PanelTabs.css
**Current**: Custom profile form with preferences
**Target**: `Form` + `Switch` + `Select` + `Input` + `Card`
**Ant Design Components**: `Form`, `Switch`, `Select`, `Input`, `Card`, `Divider`, `Space`
**Implementation**:
```typescript
import { Form, Switch, Select, Input, Card, Divider, Space, Button } from 'antd';

<Card title="My Profile">
  <Form layout="vertical">
    <Form.Item label="Display Name" name="displayName">
      <Input />
    </Form.Item>
    <Form.Item label="Status" name="status">
      <Select>
        <Select.Option value="online">Online</Select.Option>
        <Select.Option value="busy">Busy</Select.Option>
        <Select.Option value="away">Away</Select.Option>
      </Select>
    </Form.Item>
    <Form.Item label="Notifications" name="notifications" valuePropName="checked">
      <Switch />
    </Form.Item>
  </Form>
</Card>
```
**Complexity**: Medium
**Estimated Time**: 1.5 hours

### 9. PeopleTab.tsx
**Current**: Custom people directory with search and actions
**Target**: `List` + `Search` + `Avatar` + `Button` + `Badge`
**Ant Design Components**: `List`, `Input.Search`, `Avatar`, `Button`, `Badge`, `Space`, `Dropdown`
**Implementation**:
```typescript
import { List, Input, Avatar, Button, Badge, Space, Dropdown } from 'antd';
import { MoreOutlined, MessageOutlined, PhoneOutlined } from '@ant-design/icons';

<Space direction="vertical" style={{ width: '100%' }}>
  <Input.Search placeholder="Search people..." onSearch={handleSearch} />
  <List
    dataSource={people}
    renderItem={(person) => (
      <List.Item
        actions={[
          <Button type="text" icon={<MessageOutlined />} />,
          <Button type="text" icon={<PhoneOutlined />} />,
          <Dropdown menu={{ items: moreActions }}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        ]}
      >
        <List.Item.Meta
          avatar={<Badge status={person.status}><Avatar>{person.name.charAt(0)}</Avatar></Badge>}
          title={person.name}
          description={person.role}
        />
      </List.Item>
    )}
  />
</Space>
```
**Complexity**: Medium
**Estimated Time**: 2 hours

### 10. VideoServiceModal.tsx + .css
**Current**: Custom modal for video service selection
**Target**: `Modal` + `Card` + `Button` + `Radio`
**Ant Design Components**: `Modal`, `Card`, `Button`, `Radio`, `Space`
**Implementation**:
```typescript
import { Modal, Card, Button, Radio, Space } from 'antd';

<Modal title="Select Video Service" open={isOpen} onCancel={onClose} footer={null}>
  <Radio.Group value={selectedService} onChange={handleServiceChange}>
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card hoverable>
        <Radio value="jitsi">
          <Space>
            <span>Jitsi Meet</span>
            <Button type="primary">Join Meeting</Button>
          </Space>
        </Radio>
      </Card>
      <Card hoverable>
        <Radio value="ringcentral">
          <Space>
            <span>RingCentral</span>
            <Button type="primary">Join Meeting</Button>
          </Space>
        </Radio>
      </Card>
    </Space>
  </Radio.Group>
</Modal>
```
**Complexity**: Medium
**Estimated Time**: 1 hour

## Tier 4 - Specialized Components

### 11. MapEditorPage.tsx + .css
**Current**: Complex map editor layout with toolbar and canvas
**Target**: `Layout` + `Toolbar` + `Sider` + `Tabs`
**Ant Design Components**: `Layout`, `Space`, `Button`, `Tabs`, `Tooltip`, `Divider`
**Implementation**: Complex - requires careful integration with Fabric.js
**Complexity**: Very High
**Estimated Time**: 4-6 hours

### 12. MapDataManager.tsx + .css
**Current**: Map data import/export interface
**Target**: `Card` + `Upload` + `Button` + `Progress`
**Ant Design Components**: `Card`, `Upload`, `Button`, `Progress`, `Alert`
**Complexity**: Medium
**Estimated Time**: 1.5 hours

## Migration Checklist Template

For each component migration:
- [ ] Identify current UI framework usage
- [ ] Map to equivalent Ant Design components  
- [ ] Implement using Ant Design components and patterns
- [ ] Test functionality thoroughly
- [ ] Verify visual consistency and responsive behavior
- [ ] Remove old custom CSS files
- [ ] Update TypeScript definitions if needed
- [ ] Test in Docker environment
- [ ] Update documentation

## Common Patterns and Best Practices

### Form Handling
```typescript
// Use Form.useForm() for form state management
const [form] = Form.useForm();

// Use Form.Item with rules for validation
<Form.Item name="field" rules={[{ required: true, message: 'Required!' }]}>
  <Input />
</Form.Item>
```

### Icon Usage
```typescript
// Replace Lucide React icons with Ant Design icons where possible
import { UserOutlined, SettingOutlined } from '@ant-design/icons';

// Keep Lucide React for icons not available in Ant Design
import { MessageCircle } from 'lucide-react';
```

### Spacing and Layout
```typescript
// Use Space component for consistent spacing
<Space size="middle">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</Space>

// Use Layout components for page structure
<Layout>
  <Layout.Header />
  <Layout.Content />
  <Layout.Footer />
</Layout>
```

## Next Steps

1. Begin with Tier 1 components (foundation)
2. Test each migration thoroughly before proceeding
3. Update this document with actual implementation notes
4. Create reusable component patterns for consistency
