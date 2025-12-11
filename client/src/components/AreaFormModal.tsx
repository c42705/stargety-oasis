import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, ColorPicker, Row, Col, Typography, Switch, Divider, Alert } from 'antd';
import { SaveOutlined, VideoCameraOutlined, BellOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  InteractiveArea,
  InteractiveAreaActionType,
  JitsiActionConfig,
  AlertActionConfig,
  UrlActionConfig,
  ModalActionConfig,
  sanitizeJitsiRoomName,
} from '../shared/MapDataContext';

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
  actionType: InteractiveAreaActionType;
  // Jitsi config
  jitsiAutoJoin: boolean;
  jitsiAutoLeave: boolean;
  // Alert config
  alertMessage: string;
  alertType: 'info' | 'success' | 'warning' | 'error';
  // URL config
  urlValue: string;
  urlOpenMode: 'newTab' | 'embedded' | 'sameTab';
  // Modal config
  modalTitle: string;
  modalContent: string;
  modalShowOnEntry: boolean;
}

const AREA_TYPES: { value: InteractiveArea['type']; label: string }[] = [
  { value: 'meeting-room', label: 'Meeting Room' },
  { value: 'presentation-hall', label: 'Presentation Hall' },
  { value: 'coffee-corner', label: 'Coffee Corner' },
  { value: 'game-zone', label: 'Game Zone' },
  { value: 'custom', label: 'Custom Area' }
];

const ACTION_TYPES: { value: InteractiveAreaActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'No Action', icon: null },
  { value: 'jitsi', label: 'Video Conference (Jitsi)', icon: <VideoCameraOutlined /> },
  { value: 'alert', label: 'Show Alert', icon: <BellOutlined /> },
  { value: 'url', label: 'Open URL', icon: <LinkOutlined /> },
  { value: 'modal', label: 'Show Modal', icon: <FileTextOutlined /> },
];

const DEFAULT_COLORS = [
  '#4A90E2', '#9B59B6', '#D2691E', '#E74C3C', '#27AE60', '#F39C12', '#34495E', '#E67E22'
];

export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen, onClose, onSave, editingArea, title
}) => {
  const [form] = Form.useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<InteractiveAreaActionType>('none');

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      const jitsiConfig = editingArea?.actionConfig as JitsiActionConfig | undefined;
      const alertConfig = editingArea?.actionConfig as AlertActionConfig | undefined;
      const urlConfig = editingArea?.actionConfig as UrlActionConfig | undefined;
      const modalConfig = editingArea?.actionConfig as ModalActionConfig | undefined;

      const currentActionType = editingArea?.actionType || 'none';
      setActionType(currentActionType);

      form.setFieldsValue({
        name: editingArea?.name || '',
        description: editingArea?.description || '',
        type: editingArea?.type || 'custom',
        color: editingArea?.color || '#4A90E2',
        actionType: currentActionType,
        jitsiAutoJoin: jitsiConfig?.autoJoinOnEntry ?? true,
        jitsiAutoLeave: jitsiConfig?.autoLeaveOnExit ?? true,
        alertMessage: alertConfig?.message || '',
        alertType: alertConfig?.alertType || 'info',
        urlValue: urlConfig?.url || '',
        urlOpenMode: urlConfig?.openMode || 'newTab',
        modalTitle: modalConfig?.title || '',
        modalContent: modalConfig?.content || '',
        modalShowOnEntry: modalConfig?.showOnEntry ?? true,
      });
    }
  }, [isOpen, editingArea, form]);

  // Build action config based on action type
  const buildActionConfig = (values: FormData): InteractiveArea['actionConfig'] => {
    switch (values.actionType) {
      case 'jitsi':
        return { autoJoinOnEntry: values.jitsiAutoJoin, autoLeaveOnExit: values.jitsiAutoLeave };
      case 'alert':
        return { message: values.alertMessage, alertType: values.alertType, duration: 5000 };
      case 'url':
        return { url: values.urlValue, openMode: values.urlOpenMode };
      case 'modal':
        return { title: values.modalTitle, content: values.modalContent, showOnEntry: values.modalShowOnEntry, showOnClick: true };
      default:
        return null;
    }
  };

  const handleSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const areaData: Partial<InteractiveArea> = {
        name: values.name.trim(),
        description: values.description.trim(),
        type: values.type,
        color: values.color,
        actionType: values.actionType,
        actionConfig: buildActionConfig(values),
      };
      if (editingArea) areaData.id = editingArea.id;
      onSave(areaData);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => { form.resetFields(); onClose(); };
  const handleActionTypeChange = (value: InteractiveAreaActionType) => setActionType(value);
  const currentName = Form.useWatch('name', form) || '';
  const jitsiRoomPreview = actionType === 'jitsi' && currentName ? sanitizeJitsiRoomName(currentName) : '';

  return (
    <Modal
      title={title || (editingArea ? 'Edit Area' : 'Create New Area')}
      open={isOpen}
      onCancel={handleCancel}
      width={650}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
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

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Area Type" name="type">
              <Select placeholder="Select area type">
                {AREA_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Area Color" name="color">
              <ColorPicker onChange={(c) => form.setFieldValue('color', c.toHexString())} showText />
            </Form.Item>
          </Col>
        </Row>

        <Divider>Action Configuration</Divider>

        <Form.Item label="Action Type" name="actionType">
          <Select placeholder="Select action" onChange={handleActionTypeChange}>
            {ACTION_TYPES.map(a => (
              <Option key={a.value} value={a.value}>
                <Space>{a.icon}{a.label}</Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Jitsi Config */}
        {actionType === 'jitsi' && (
          <>
            {jitsiRoomPreview && (
              <Alert type="info" showIcon message={`Jitsi Room: ${jitsiRoomPreview}`} style={{ marginBottom: 16 }} />
            )}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="jitsiAutoJoin" valuePropName="checked" label="Auto-join on entry">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="jitsiAutoLeave" valuePropName="checked" label="Auto-leave on exit">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* Alert Config */}
        {actionType === 'alert' && (
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="alertMessage" label="Alert Message" rules={[{ required: true }]}>
                <Input placeholder="Enter alert message" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="alertType" label="Alert Type">
                <Select>
                  <Option value="info">Info</Option>
                  <Option value="success">Success</Option>
                  <Option value="warning">Warning</Option>
                  <Option value="error">Error</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* URL Config */}
        {actionType === 'url' && (
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="urlValue" label="URL" rules={[{ required: true, type: 'url' }]}>
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="urlOpenMode" label="Open Mode">
                <Select>
                  <Option value="newTab">New Tab</Option>
                  <Option value="embedded">Embedded</Option>
                  <Option value="sameTab">Same Tab</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Modal Config */}
        {actionType === 'modal' && (
          <>
            <Form.Item name="modalTitle" label="Modal Title" rules={[{ required: true }]}>
              <Input placeholder="Enter modal title" />
            </Form.Item>
            <Form.Item name="modalContent" label="Modal Content" rules={[{ required: true }]}>
              <TextArea rows={3} placeholder="Enter modal content (supports markdown)" />
            </Form.Item>
            <Form.Item name="modalShowOnEntry" valuePropName="checked" label="Show on area entry">
              <Switch />
            </Form.Item>
          </>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              {editingArea ? 'Update Area' : 'Create Area'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
