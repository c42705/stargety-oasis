import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { Shield } from 'lucide-react';
import { ImpassableArea } from '../shared/MapDataContext';
const { Text } = Typography;

interface CollisionAreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (areaData: Partial<ImpassableArea>) => void;
  editingArea?: ImpassableArea | null;
  title?: string;
}

interface FormData {
  name: string;
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
    if (isOpen) {
      if (editingArea) {
        form.setFieldsValue({
          name: editingArea.name || ''
        });
      } else {
        form.resetFields();
      }
    }
  }, [isOpen, editingArea, form]);

  const handleSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    try {
      const areaData: Partial<ImpassableArea> = {
        name: values.name.trim() || undefined
      };

      await onSave(areaData);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save collision area:', error);
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
          After creating the area properties, you'll be able to draw the area boundaries on the canvas.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: ''
        }}
      >
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

        <div style={{ 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          borderRadius: 6, 
          padding: 12, 
          marginBottom: 16 
        }}>
          <Text style={{ fontSize: 12, color: '#d46b08' }}>
            <strong>Next Step:</strong> After clicking "Create Area", you'll enter drawing mode where you can 
            click and drag on the canvas to define the collision area boundaries.
          </Text>
        </div>

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
