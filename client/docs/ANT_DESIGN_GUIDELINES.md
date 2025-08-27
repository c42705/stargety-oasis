# Ant Design Usage Guidelines

## Overview

This document provides guidelines for using Ant Design components in the Stargety Oasis application. Following these guidelines ensures consistency, maintainability, and optimal performance.

## Theme Configuration

The application uses a custom dark theme configured in `src/theme/antd-theme.ts`. All components should respect the CSS variables defined in the theme:

```typescript
// Use CSS variables for consistent theming
style={{
  backgroundColor: 'var(--color-bg-secondary)',
  borderColor: 'var(--color-border-light)',
  color: 'var(--color-text-primary)'
}}
```

## Component Usage Patterns

### 1. Cards
Use `Card` for grouped content sections:

```tsx
<Card 
  title="Section Title"
  size="small"
  style={{ 
    backgroundColor: 'var(--color-bg-secondary)', 
    borderColor: 'var(--color-border-light)' 
  }}
>
  Content here
</Card>
```

### 2. Forms
Use `Form` with proper validation:

```tsx
<Form layout="vertical" size="small">
  <Form.Item
    name="fieldName"
    label="Field Label"
    rules={[{ required: true, message: 'Field is required' }]}
  >
    <Input placeholder="Enter value..." />
  </Form.Item>
</Form>
```

### 3. Lists
Use `List` for data display:

```tsx
<List
  dataSource={items}
  renderItem={(item) => (
    <List.Item>
      <List.Item.Meta
        avatar={<Avatar icon={<UserOutlined />} />}
        title={item.title}
        description={item.description}
      />
    </List.Item>
  )}
/>
```

### 4. Buttons
Use consistent button styling:

```tsx
<Button
  type="primary"
  icon={<SaveOutlined />}
  style={{
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)'
  }}
>
  Save
</Button>
```

### 5. Modals and Drawers
Use `Drawer` for side panels and `Modal` for dialogs:

```tsx
<Drawer
  title="Panel Title"
  placement="right"
  onClose={onClose}
  open={isOpen}
  width={480}
  styles={{
    body: { padding: 0 },
    header: { 
      backgroundColor: 'var(--color-bg-tertiary)',
      borderBottom: '1px solid var(--color-border-light)'
    }
  }}
>
  Content here
</Drawer>
```

## Migrated Components

The following components have been successfully migrated to Ant Design:

### Core Components
- ✅ **ConfirmationDialog** → `Modal.confirm()`
- ✅ **App Header** → `Layout.Header` + `Space` + `Button` + `Typography`
- ✅ **SlidingPanel** → `Drawer` + `Tabs`
- ✅ **SaveStatusIndicator** → `Card` + `Button` + `Switch` + `Alert`

### Module Components
- ✅ **LoginModule** → `Card` + `Form` + `Input` + `Button` + `Collapse`
- ✅ **ChatModule** → `List` + `Input` + `Avatar` + `Badge` + `Popover`
- ✅ **MyProfileTab** → `Card` + `Form` + `Switch` + `Select` + `Avatar`
- ✅ **PeopleTab** → `List` + `Input` + `Tabs` + `Avatar` + `Dropdown`

## Best Practices

### 1. Consistent Sizing
- Use `size="small"` for compact interfaces
- Use `size="large"` for prominent actions
- Default size for standard components

### 2. Color Usage
- Always use CSS variables for colors
- Respect the dark theme configuration
- Use semantic colors (success, warning, error)

### 3. Spacing
- Use `Space` component for consistent spacing
- Use `direction="vertical"` for stacked elements
- Use `size` prop for consistent gaps

### 4. Icons
- Prefer Ant Design icons over Lucide React when available
- Use consistent icon sizes (16px for small, 20px for medium)
- Always provide meaningful `title` attributes

### 5. Accessibility
- Always provide proper `aria-label` attributes
- Use semantic HTML structure
- Ensure keyboard navigation works properly

## Performance Considerations

### 1. Bundle Size
- Import only needed components: `import { Button } from 'antd'`
- Avoid importing entire Ant Design library
- Use tree-shaking to eliminate unused code

### 2. Rendering
- Use `React.memo()` for expensive components
- Implement proper `key` props for lists
- Avoid inline styles when possible

## Migration Checklist

When migrating a component to Ant Design:

- [ ] Replace custom CSS with Ant Design components
- [ ] Update imports to use Ant Design components
- [ ] Apply consistent theming with CSS variables
- [ ] Test functionality and visual appearance
- [ ] Remove old CSS files
- [ ] Update component documentation
- [ ] Verify accessibility compliance
- [ ] Test responsive behavior

## Common Patterns

### Status Indicators
```tsx
<Badge 
  status={isOnline ? 'success' : 'default'} 
  text={isOnline ? 'Online' : 'Offline'} 
/>
```

### Loading States
```tsx
<Button loading={isLoading} type="primary">
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

### Conditional Rendering
```tsx
{error && (
  <Alert
    message={error}
    type="error"
    showIcon
    style={{ marginBottom: '16px' }}
  />
)}
```

## Resources

- [Ant Design Documentation](https://ant.design/docs/react/introduce)
- [Ant Design Components](https://ant.design/components/overview)
- [Ant Design Icons](https://ant.design/components/icon)
- [Theme Customization](https://ant.design/docs/react/customize-theme)

## Support

For questions about Ant Design usage in this project, refer to:
1. This guidelines document
2. Existing migrated components as examples
3. Ant Design official documentation
4. Team code reviews and discussions
