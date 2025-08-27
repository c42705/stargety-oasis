# Migration Implementation Guide

## Quick Start Checklist

### Before Starting Any Component Migration:

1. **Read the component mapping guide** (`docs/component-mapping-guide.md`)
2. **Check current task status** in the task management system
3. **Create a git branch** for the specific component migration
4. **Test the current component** to understand its behavior
5. **Identify all CSS dependencies** that will be removed

### During Migration:

1. **Follow the component mapping** exactly as specified
2. **Test functionality** after each major change
3. **Maintain TypeScript compatibility** throughout
4. **Keep console output clean** - address warnings immediately
5. **Test responsive behavior** on different screen sizes
6. **Verify accessibility** with screen readers if applicable

### After Migration:

1. **Remove old CSS files** only after confirming the component works
2. **Update imports** in all files that use the component
3. **Test in Docker environment** to ensure production compatibility
4. **Update task status** to COMPLETE
5. **Document any deviations** from the original plan

## Component Migration Template

### Step-by-Step Process:

```typescript
// 1. Import Ant Design components
import { Modal, Form, Input, Button, Space } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

// 2. Replace component structure
const MyComponent: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 3. Implement Ant Design patterns
  const handleSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      await onSave(values);
      form.resetFields();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 4. Return Ant Design JSX
  return (
    <Modal
      title="Component Title"
      open={isOpen}
      onCancel={onClose}
      footer={null}
    >
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Form.Item name="field" rules={[{ required: true }]}>
          <Input placeholder="Enter value" />
        </Form.Item>
        
        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              Save
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

### CSS Removal Process:

```bash
# 1. Confirm component works with Ant Design
npm run build
npm test

# 2. Remove CSS file
rm src/components/MyComponent.css

# 3. Remove CSS import from component
# Remove: import './MyComponent.css';

# 4. Test again
npm run build
```

## Common Migration Patterns

### Form Components:
```typescript
// Old pattern
<form onSubmit={handleSubmit}>
  <div className="form-group">
    <label>Field</label>
    <input value={value} onChange={onChange} />
    {error && <span className="error">{error}</span>}
  </div>
</form>

// New pattern
<Form form={form} onFinish={handleSubmit} layout="vertical">
  <Form.Item name="field" label="Field" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
</Form>
```

### Modal Components:
```typescript
// Old pattern
{isOpen && (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Title</h2>
        <button onClick={onClose}>×</button>
      </div>
      <div className="modal-body">Content</div>
    </div>
  </div>
)}

// New pattern
<Modal title="Title" open={isOpen} onCancel={onClose}>
  Content
</Modal>
```

### Button Components:
```typescript
// Old pattern
<button className="btn btn-primary" onClick={onClick}>
  <Icon size={16} /> Text
</button>

// New pattern
<Button type="primary" icon={<Icon />} onClick={onClick}>
  Text
</Button>
```

## Error Resolution Guide

### Common Issues and Solutions:

**Issue**: TypeScript errors after migration
**Solution**: Update prop types to match Ant Design component APIs

**Issue**: Styling looks different
**Solution**: Use Ant Design theme configuration or custom CSS for specific adjustments

**Issue**: Form validation not working
**Solution**: Ensure Form.Item has proper `name` and `rules` props

**Issue**: Modal not closing properly
**Solution**: Use `onCancel` prop and ensure state management is correct

**Issue**: Icons not displaying
**Solution**: Import icons from `@ant-design/icons` or keep Lucide React for missing icons

## Testing Strategy

### Unit Testing:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

test('component renders and functions correctly', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();
  
  render(<MyComponent isOpen={true} onSave={mockOnSave} onClose={mockOnClose} />);
  
  // Test Ant Design components
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText('Field')).toBeInTheDocument();
  
  // Test functionality
  fireEvent.click(screen.getByText('Save'));
  expect(mockOnSave).toHaveBeenCalled();
});
```

### Integration Testing:
1. Test component within parent components
2. Verify data flow and event handling
3. Test responsive behavior
4. Verify accessibility

### Manual Testing Checklist:
- [ ] Component renders correctly
- [ ] All interactive elements work
- [ ] Form validation functions properly
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility (if applicable)
- [ ] No console errors or warnings
- [ ] Performance is acceptable

## Quality Gates

### Before Marking Task Complete:

1. **Functionality**: All original features work identically
2. **Visual**: Component looks consistent with Ant Design theme
3. **Performance**: No significant performance degradation
4. **Accessibility**: Maintains or improves accessibility
5. **Code Quality**: Clean, readable, and well-typed code
6. **Testing**: All tests pass
7. **Documentation**: Updated if necessary

### Rollback Criteria:

If any of these occur, consider rolling back and reassessing:
- Critical functionality is broken
- Performance degrades significantly
- Accessibility is compromised
- Multiple integration issues arise
- Timeline impact is too severe

## Progress Tracking

### Task Status Updates:
- **NOT_STARTED**: Task is planned but not begun
- **IN_PROGRESS**: Actively working on the task
- **COMPLETE**: Task finished and verified

### Reporting Issues:
When encountering problems:
1. Document the specific issue
2. Note any workarounds attempted
3. Estimate additional time needed
4. Update task description with findings
5. Consider breaking into smaller tasks if needed

## Success Metrics

### Component-Level Success:
- [ ] Zero functional regressions
- [ ] Visual consistency maintained
- [ ] Performance impact minimal
- [ ] Code quality improved
- [ ] CSS bundle size reduced

### Project-Level Success:
- [ ] All components migrated successfully
- [ ] Consistent design language achieved
- [ ] Development velocity improved
- [ ] Maintenance burden reduced
- [ ] Team satisfaction with new system

## Next Steps

1. **Begin with Phase 2 tasks** (Core Infrastructure Migration)
2. **Follow the priority order** established in the migration plan
3. **Update this guide** with lessons learned during migration
4. **Create component-specific notes** for complex migrations
5. **Maintain regular progress reviews** to ensure timeline adherence

## Resources

- [Ant Design Documentation](https://ant.design/)
- [Ant Design Components](https://ant.design/components/overview)
- [Migration Plan](./comprehensive-ant-design-migration-plan.md)
- [Component Mapping Guide](./component-mapping-guide.md)
- [Task Management System](../task-management)
