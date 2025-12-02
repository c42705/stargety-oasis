import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Radio, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { Shield, Square, Pentagon } from 'lucide-react';
import { ImpassableArea } from '../shared/MapDataContext';
import { logger } from '../shared/logger';
const { Text } = Typography;

interface CollisionAreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (areaData: Partial<ImpassableArea> & { drawingMode?: 'rectangle' | 'polygon' }) => void;
  editingArea?: ImpassableArea | null;
  title?: string;
}

interface FormData {
  name: string;
  drawingMode: 'rectangle' | 'polygon';
}

export const CollisionAreaFormModal: React.FC<CollisionAreaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingArea,
  title
}) => {
  const [form] = Form.useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingArea) {
      // Edit mode: only name is editable; drawing mode is derived from existing type
      form.setFieldsValue({
        name: editingArea.name || '',
        drawingMode: editingArea.type === 'impassable-polygon' ? 'polygon' : 'rectangle',
      });
    } else {
      // Create mode: reset to defaults
      form.setFieldsValue({
        name: '',
        drawingMode: 'polygon',
      });
    }
  }, [isOpen, editingArea, form]);

  /**
   * handleSubmit - builds areaData for collision drawing or editing
   *
   * Create mode:
   *   - includes drawingMode, type, and color to be used by drawing handlers
   *   - optional name is trimmed and omitted if blank
   *
   * Edit mode:
   *   - only updates the name field, leaving geometry/type/color untouched
   */
  const handleSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      if (editingArea) {
        const updates: Partial<ImpassableArea> = {
          name: values.name && values.name.trim() ? values.name.trim() : undefined,
        };

        logger.info('[CollisionAreaFormModal] Submitting collision area name update', {
          areaId: editingArea.id,
          updates,
        });

        await onSave(updates as any);
      } else {
        const areaData: Partial<ImpassableArea> & { drawingMode?: 'rectangle' | 'polygon' } = {
          name: values.name && values.name.trim() ? values.name.trim() : undefined,
          drawingMode: values.drawingMode,
          type: values.drawingMode === 'polygon' ? 'impassable-polygon' : 'rectangle',
          color: 'rgba(128,0,0,0.65)',
        };

        logger.info('[CollisionAreaFormModal] Submitting new collision area config', { values, areaData });

        await onSave(areaData);
      }

      form.resetFields();
    } catch (error) {
      logger.error('COLLISION_AREA_FORM_SUBMIT_FAILED', {
        error,
        hasEditingArea: !!editingArea,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} color="#ef4444" />
          {title || (editingArea ? 'Edit Collision Area' : 'Create New Collision Area')}
        </div>
      }
      open={isOpen}
      onCancel={handleCancel}
      width={500}
      footer={null}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Collision areas prevent players from moving through specific regions of the map.
          {editingArea
            ? 'You can rename existing areas here; geometry and type will stay the same.'
            : 'After creating the area properties, you\'ll be able to draw the area boundaries on the canvas.'}
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          drawingMode: 'polygon'
        }}
      >
        {!editingArea && (
          <Form.Item
            label="Drawing Mode"
            name="drawingMode"
            help="Choose how you want to draw the collision area"
            rules={[{ required: true, message: 'Please select a drawing mode' }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="polygon">
                  <Space>
                    <Pentagon size={16} />
                    <span><strong>Polygon</strong> - Click to add vertices, double-click to complete</span>
                  </Space>
                </Radio>
                <Radio value="rectangle">
                  <Space>
                    <Square size={16} />
                    <span><strong>Rectangle</strong> - Click and drag to create a rectangular area</span>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        )}

        <Form.Item
          label="Area Name (Optional)"
          name="name"
          help="Give this collision area a descriptive name for easier identification"
        >
          <Input
            placeholder="e.g., Wall, Building, Obstacle"
            maxLength={50}
          />
        </Form.Item>

        {!editingArea && (
          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.drawingMode !== currentValues.drawingMode}>
            {({ getFieldValue }) => {
              const drawingMode = getFieldValue('drawingMode');
              return (
                <div style={{
                  background: '#fff7e6',
                  border: '1px solid #ffd591',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 16
                }}>
                  <Text style={{ fontSize: 12, color: '#d46b08' }}>
                    <strong>Next Step:</strong> After clicking "Create Area", you'll enter drawing mode where you can{' '}
                    {drawingMode === 'polygon'
                      ? 'click to add vertices and double-click to complete the polygon.'
                      : 'click and drag on the canvas to define the rectangular collision area.'}
                  </Text>
                </div>
              );
            }}
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button
            onClick={handleCancel}
            style={{ marginRight: 8 }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
          >
            {editingArea ? 'Update Area' : 'Create Area'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
