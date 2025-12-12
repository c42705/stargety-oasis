import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, Row, Col, Switch, Divider, Alert, Tag } from 'antd';
import {
  SaveOutlined, VideoCameraOutlined, BellOutlined, LinkOutlined, FileTextOutlined,
  StopOutlined, ThunderboltOutlined, SwapOutlined
} from '@ant-design/icons';
import {
  InteractiveArea,
  InteractiveAreaActionType,
  JitsiActionConfig,
  AlertActionConfig,
  UrlActionConfig,
  ModalActionConfig,
  CollectibleActionConfig,
  SwitchActionConfig,
  sanitizeJitsiRoomName,
  getColorForActionType,
} from '../shared/MapDataContext';

const { TextArea } = Input;
const { Option } = Select;

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
  // Collectible config
  collectibleEffectType: 'speed_boost' | 'invincibility' | 'score' | 'custom';
  collectibleEffectValue: number;
  collectibleEffectDuration: number;
  collectibleConsumable: boolean;
  collectibleRespawnTime: number;
  // Switch config
  switchTargetIds: string;
  switchInitialState: boolean;
  switchToggleMode: 'visibility' | 'collision' | 'both';
}

/** Action types with their display properties */
const ACTION_TYPES: { value: InteractiveAreaActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'impassable', label: 'Collision (Impassable)', icon: <StopOutlined />, description: 'Blocks player movement' },
  { value: 'none', label: 'No Action', icon: null, description: 'Visual only, no interaction' },
  { value: 'jitsi', label: 'Video Conference (Jitsi)', icon: <VideoCameraOutlined />, description: 'Auto-join video call' },
  { value: 'alert', label: 'Show Alert', icon: <BellOutlined />, description: 'Display notification message' },
  { value: 'url', label: 'Open URL', icon: <LinkOutlined />, description: 'Navigate to a web link' },
  { value: 'modal', label: 'Show Modal', icon: <FileTextOutlined />, description: 'Display popup content' },
  { value: 'collectible', label: 'Collectible', icon: <ThunderboltOutlined />, description: 'Pickup with effects' },
  { value: 'switch', label: 'Switch/Toggle', icon: <SwapOutlined />, description: 'Toggle other elements' },
];

export const AreaFormModal: React.FC<AreaFormModalProps> = ({
  isOpen, onClose, onSave, editingArea, title
}) => {
  const [form] = Form.useForm<FormData>();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<InteractiveAreaActionType>('impassable');

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      const jitsiConfig = editingArea?.actionConfig as JitsiActionConfig | undefined;
      const alertConfig = editingArea?.actionConfig as AlertActionConfig | undefined;
      const urlConfig = editingArea?.actionConfig as UrlActionConfig | undefined;
      const modalConfig = editingArea?.actionConfig as ModalActionConfig | undefined;
      const collectibleConfig = editingArea?.actionConfig as CollectibleActionConfig | undefined;
      const switchConfig = editingArea?.actionConfig as SwitchActionConfig | undefined;

      const currentActionType = editingArea?.actionType || 'impassable';
      setActionType(currentActionType);

      form.setFieldsValue({
        name: editingArea?.name || '',
        description: editingArea?.description || '',
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
        collectibleEffectType: collectibleConfig?.effectType || 'speed_boost',
        collectibleEffectValue: collectibleConfig?.effectValue ?? 30,
        collectibleEffectDuration: collectibleConfig?.effectDuration ?? 30,
        collectibleConsumable: collectibleConfig?.consumable ?? true,
        collectibleRespawnTime: collectibleConfig?.respawnTime ?? 60,
        switchTargetIds: switchConfig?.targetIds?.join(', ') || '',
        switchInitialState: switchConfig?.initialState ?? true,
        switchToggleMode: switchConfig?.toggleMode || 'visibility',
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
      case 'collectible':
        return {
          effectType: values.collectibleEffectType,
          effectValue: values.collectibleEffectValue,
          effectDuration: values.collectibleEffectDuration,
          consumable: values.collectibleConsumable,
          respawnTime: values.collectibleRespawnTime,
        };
      case 'switch':
        return {
          targetIds: values.switchTargetIds.split(',').map(s => s.trim()).filter(Boolean),
          initialState: values.switchInitialState,
          toggleMode: values.switchToggleMode,
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (values: FormData) => {
    setLoading(true);
    try {
      const areaData: Partial<InteractiveArea> = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        // Color is auto-derived from actionType
        color: getColorForActionType(values.actionType),
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
  const currentColor = getColorForActionType(actionType);

  return (
    <Modal
      title={title || (editingArea ? 'Edit Area' : 'Create New Area')}
      open={isOpen}
      onCancel={handleCancel}
      width={650}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ actionType: 'impassable' }}>
        <Form.Item
          label="Area Name"
          name="name"
          rules={[
            { required: true, message: 'Area name is required' },
            { min: 2, message: 'Area name must be at least 2 characters' }
          ]}
        >
          <Input placeholder="Enter area name" />
        </Form.Item>

        <Form.Item label="Description (optional)" name="description">
          <TextArea rows={2} placeholder="Enter area description" />
        </Form.Item>

        <Form.Item label="Action Type" name="actionType" required>
          <Select placeholder="Select action type" onChange={handleActionTypeChange}>
            {ACTION_TYPES.map(a => (
              <Option key={a.value} value={a.value}>
                <Space>
                  {a.icon}
                  <span>{a.label}</span>
                  <Tag color={getColorForActionType(a.value)} style={{ marginLeft: 8 }}>{a.description}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Color preview */}
        <Alert
          type="info"
          showIcon
          message={<span>Area Color: <Tag color={currentColor}>{currentColor}</Tag> (auto-derived from action type)</span>}
          style={{ marginBottom: 16 }}
        />

        <Divider>Action Configuration</Divider>

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

        {/* Collectible Config */}
        {actionType === 'collectible' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="collectibleEffectType" label="Effect Type" rules={[{ required: true }]}>
                  <Select>
                    <Option value="speed_boost">Speed Boost</Option>
                    <Option value="invincibility">Invincibility</Option>
                    <Option value="score">Score Points</Option>
                    <Option value="custom">Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="collectibleEffectValue" label="Effect Value (%)" rules={[{ required: true }]}>
                  <Input type="number" placeholder="30" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="collectibleEffectDuration" label="Duration (seconds)">
                  <Input type="number" placeholder="30" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="collectibleRespawnTime" label="Respawn Time (seconds)">
                  <Input type="number" placeholder="60" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="collectibleConsumable" valuePropName="checked" label="Consumable (disappears after pickup)">
              <Switch />
            </Form.Item>
          </>
        )}

        {/* Switch Config */}
        {actionType === 'switch' && (
          <>
            <Form.Item
              name="switchTargetIds"
              label="Target IDs (comma-separated)"
              rules={[{ required: true }]}
              tooltip="Enter the IDs of areas or assets to toggle, separated by commas"
            >
              <Input placeholder="area-1, asset-2, area-3" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="switchToggleMode" label="Toggle Mode">
                  <Select>
                    <Option value="visibility">Visibility Only</Option>
                    <Option value="collision">Collision Only</Option>
                    <Option value="both">Both</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="switchInitialState" valuePropName="checked" label="Targets Initially Visible">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* Impassable - no extra config needed */}
        {actionType === 'impassable' && (
          <Alert type="warning" showIcon message="This area will block player movement." style={{ marginBottom: 16 }} />
        )}

        {/* None - no extra config needed */}
        {actionType === 'none' && (
          <Alert type="info" showIcon message="This area is visual only - no interaction." style={{ marginBottom: 16 }} />
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
