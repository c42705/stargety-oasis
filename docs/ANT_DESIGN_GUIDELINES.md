# Ant Design Usage Guidelines

## Overview

This document provides comprehensive guidelines for using Ant Design components in the Stargety Oasis application, including the new theme system that supports multiple themes with real-time switching.

## Theme System

### Available Themes

The application supports four built-in themes:

1. **Light Theme** - Clean, bright interface with light backgrounds
2. **Dark Theme** - Current dark theme with blue accents (default)
3. **Stargety Oasis** - Branded theme with custom colors and gradients
4. **Ant Design Default** - Pure Ant Design theme without custom overrides

### Theme Architecture

The theme system is built on three core components:

#### 1. Theme Definitions (`src/theme/theme-system.ts`)
Each theme includes:
- **Ant Design Configuration**: Token overrides and algorithm selection
- **CSS Variables**: Custom properties for consistent styling
- **Preview Colors**: For theme selector UI
- **Metadata**: Name, description, and ID

#### 2. Theme Context (`src/shared/ThemeContext.tsx`)
Provides:
- Real-time theme switching
- Theme persistence in localStorage
- CSS variable application
- Theme-aware utilities

#### 3. Settings Integration (`src/shared/SettingsContext.tsx`)
- Theme preference storage
- Integration with user profile settings
- Synchronization with theme context

### Using the Theme System

#### Basic Theme Usage

```tsx
import { useTheme, useThemeAware } from '../shared/ThemeContext';

const MyComponent: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();
  const { isDark, colors } = useThemeAware();

  return (
    <div style={{
      backgroundColor: colors['--color-bg-primary'],
      color: colors['--color-text-primary']
    }}>
      Current theme: {currentTheme.name}
    </div>
  );
};
```

#### Theme-Aware Styling

```tsx
// Using CSS variables (recommended)
const styles = {
  container: {
    backgroundColor: 'var(--color-bg-secondary)',
    borderColor: 'var(--color-border-light)',
    color: 'var(--color-text-primary)'
  }
};

// Using theme context
const { colors } = useThemeAware();
const dynamicStyles = {
  backgroundColor: colors['--color-bg-secondary'],
  color: colors['--color-text-primary']
};
```

#### Creating Custom Themes

```tsx
import { registerTheme, ThemeDefinition } from '../theme/theme-system';

const customTheme: ThemeDefinition = {
  id: 'custom',
  name: 'Custom Theme',
  description: 'My custom theme',
  preview: {
    primary: '#ff6b6b',
    background: '#2c2c2c',
    surface: '#3c3c3c',
    text: '#ffffff'
  },
  antdConfig: {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#ff6b6b',
      // ... other tokens
    }
  },
  cssVariables: {
    '--color-primary': '#ff6b6b',
    '--color-bg-primary': '#2c2c2c',
    // ... other variables
  }
};

// Register the theme
registerTheme(customTheme);
```

### Theme Selector Component

The theme selector is integrated into the MyProfileTab component:

```tsx
const themeOptions = availableThemes.map(theme => ({
  value: theme.id,
  label: (
    <Space>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: theme.preview.primary,
          border: '1px solid var(--color-border)',
        }}
      />
      {theme.name}
    </Space>
  ),
}));

<Select
  value={currentTheme.id}
  onChange={handleThemeChange}
  options={themeOptions}
  placeholder="Select theme"
/>
```

## Component Usage Patterns

### 1. Cards
Use `Card` for grouped content sections with theme-aware styling:

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
Use `Form` with proper validation and theme integration:

```tsx
<Form layout="vertical" size="small">
  <Form.Item
    name="fieldName"
    label="Field Label"
    rules={[{ required: true, message: 'Field is required' }]}
  >
    <Input
      placeholder="Enter value..."
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)'
      }}
    />
  </Form.Item>
</Form>
```

### 3. Buttons
Use consistent button styling with theme variables:

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

## CSS Variables Reference

### Color Variables
- `--color-primary`: Primary brand color
- `--color-accent`: Accent color for highlights
- `--color-success`: Success state color
- `--color-warning`: Warning state color
- `--color-error`: Error state color

### Background Variables
- `--color-bg-primary`: Main background color
- `--color-bg-secondary`: Secondary background color
- `--color-bg-tertiary`: Tertiary background color
- `--color-bg-elevated`: Elevated surface color

### Text Variables
- `--color-text-primary`: Primary text color
- `--color-text-secondary`: Secondary text color
- `--color-text-muted`: Muted text color

### Border Variables
- `--color-border`: Default border color
- `--color-border-light`: Light border color
- `--color-border-dark`: Dark border color

## Best Practices

### 1. Theme Consistency
- Always use CSS variables for colors
- Test components with all available themes
- Ensure proper contrast ratios for accessibility

### 2. Performance
- Use theme context sparingly in render functions
- Prefer CSS variables over theme context for styling
- Memoize theme-dependent calculations

### 3. Accessibility
- Maintain WCAG contrast requirements across all themes
- Test with screen readers in different themes
- Provide meaningful color alternatives

### 4. Extensibility
- Use the theme registration system for new themes
- Follow the established theme interface
- Document custom theme variables

## Migration Guidelines

When migrating components to support the new theme system:

1. Replace hardcoded colors with CSS variables
2. Test with all available themes
3. Update component documentation
4. Verify accessibility compliance
5. Add theme-aware examples

## Troubleshooting

### Common Issues

1. **Theme not applying**: Ensure ThemeProvider wraps your component tree
2. **CSS variables not working**: Check if variables are properly defined in theme
3. **Performance issues**: Avoid excessive theme context usage in render loops

### Debug Tools

```tsx
// Debug current theme
const { currentTheme } = useTheme();
console.log('Current theme:', currentTheme);

// Debug CSS variables
const value = getCSSVariable('--color-primary');
console.log('Primary color:', value);
```

## Resources

- [Ant Design Documentation](https://ant.design/docs/react/introduce)
- [Ant Design Theming](https://ant.design/docs/react/customize-theme)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

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
