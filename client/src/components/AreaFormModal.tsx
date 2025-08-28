import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, ColorPicker, Row, Col, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { InteractiveArea } from '../shared/MapDataContext';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (areaData: Partial<InteractiveArea>) => void;
  editingArea?: InteractiveArea | null;
  title?: string;
}

interface FormData {
  name: string;
  description: string;
  type: InteractiveArea['type'];
  color: string;
}

const AREA_TYPES: { value: InteractiveArea['type']; label: string }[] = [
  { value: 'meeting-room', label: 'Meeting Room' },
  { value: 'presentation-hall', label: 'Presentation Hall' },
  { value: 'coffee-corner', label: 'Coffee Corner' },
  { value: 'game-zone', label: 'Game Zone' },
  { value: 'custom', label: 'Custom Area' }
];

const DEFAULT_COLORS = [
  '#4A90E2', // Blue
  '#9B59B6', // Purple
  '#D2691E', // Orange
  '#E74C3C', // Red
  '#27AE60', // Green
  '#F39C12', // Yellow
  '#34495E', // Dark Blue
  '#E67E22'  // Dark Orange
];

export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingArea,
  title
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      if (editingArea) {
        form.setFieldsValue({
          name: editingArea.name,
          description: editingArea.description,
          type: editingArea.type,
          color: editingArea.color
        });
      } else {
        form.setFieldsValue({
          name: '',
          description: '',
          type: 'custom',
          color: '#4A90E2'
        });
      }
    }
  }, [isOpen, editingArea, form]);

  const handleSubmit = async (values: FormData) => {
    setLoading(true);

    try {
      const areaData: Partial<InteractiveArea> = {
        name: values.name.trim(),
        description: values.description.trim(),
        type: values.type,
        color: values.color
      };

      // If editing, include the ID
      if (editingArea) {
        areaData.id = editingArea.id;
      }

      onSave(areaData);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={title || (editingArea ? 'Edit Area' : 'Create New Area')}
      open={isOpen}
      onCancel={handleCancel}
      width={600}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          description: '',
          type: 'custom',
          color: '#4A90E2'
        }}
      >
        <Form.Item
          label="Room Name"
          name="name"
          rules={[
            { required: true, message: 'Room name is required' },
            { min: 2, message: 'Room name must be at least 2 characters' }
          ]}
        >
          <Input placeholder="Enter room name" />
        </Form.Item>



        <Form.Item
          label="Description"
          name="description"
          rules={[
            { required: true, message: 'Description is required' },
            { min: 5, message: 'Description must be at least 5 characters' }
          ]}
        >
          <TextArea
            rows={3}
            placeholder="Enter area description"
          />
        </Form.Item>

        <Form.Item
          label="Area Type"
          name="type"
        >
          <Select placeholder="Select area type">
            {AREA_TYPES.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Area Color"
          name="color"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">Choose from preset colors:</Text>
            <Row gutter={[8, 8]}>
              {DEFAULT_COLORS.map(color => (
                <Col key={color}>
                  <Button
                    style={{
                      backgroundColor: color,
                      borderColor: color,
                      width: 40,
                      height: 40,
                      padding: 0
                    }}
                    onClick={() => form.setFieldValue('color', color)}
                  />
                </Col>
              ))}
            </Row>
            <Text type="secondary">Or pick a custom color:</Text>
            <ColorPicker
              value={form.getFieldValue('color')}
              onChange={(color) => form.setFieldValue('color', color.toHexString())}
              showText
            />
          </Space>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
            >
              {editingArea ? 'Update Area' : 'Create Area'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
