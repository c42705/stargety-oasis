import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, message, Popconfirm, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ExportOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons';
import { jitsiRoomMappingService } from '../shared/JitsiRoomMappingService';

const { Text, Title } = Typography;

interface RoomMapping {
  areaId: string;
  jitsiRoomName: string;
  displayName?: string;
  isCustom: boolean;
}

interface JitsiRoomMappingEditorProps {
  className?: string;
  onMappingChange?: () => void;
}

export const JitsiRoomMappingEditor: React.FC<JitsiRoomMappingEditorProps> = ({
  className = '',
  onMappingChange,
}) => {
  const [mappings, setMappings] = useState<RoomMapping[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RoomMapping | null>(null);
  const [editForm, setEditForm] = useState({ areaId: '', jitsiRoomName: '', displayName: '' });
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Load mappings on mount
  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = () => {
    const allMappings = jitsiRoomMappingService.getAllMappings();
    const mappingList: RoomMapping[] = allMappings.map((data) => ({
      areaId: data.areaId,
      jitsiRoomName: data.jitsiRoomName,
      displayName: data.displayName,
      isCustom: data.isCustom || false,
    }));
    setMappings(mappingList);
  };

  const handleEdit = (mapping: RoomMapping) => {
    setEditingMapping(mapping);
    setEditForm({
      areaId: mapping.areaId,
      jitsiRoomName: mapping.jitsiRoomName,
      displayName: mapping.displayName || '',
    });
    setIsEditModalVisible(true);
  };

  const handleAdd = () => {
    setEditingMapping(null);
    setEditForm({ areaId: '', jitsiRoomName: '', displayName: '' });
    setIsEditModalVisible(true);
  };

  const handleSave = () => {
    if (!editForm.areaId.trim()) {
      message.error('Area ID is required');
      return;
    }

    if (!editForm.jitsiRoomName.trim()) {
      message.error('Jitsi Room Name is required');
      return;
    }

    try {
      jitsiRoomMappingService.setJitsiRoomForArea(
        editForm.areaId.trim(),
        editForm.jitsiRoomName.trim(),
        editForm.displayName.trim() || undefined
      );
      
      message.success(editingMapping ? 'Mapping updated successfully' : 'Mapping added successfully');
      setIsEditModalVisible(false);
      loadMappings();
      onMappingChange?.();
    } catch (error) {
      message.error('Failed to save mapping');
      console.error('Error saving mapping:', error);
    }
  };

  const handleDelete = (areaId: string) => {
    try {
      jitsiRoomMappingService.removeMappingForArea(areaId);
      message.success('Mapping deleted successfully');
      loadMappings();
      onMappingChange?.();
    } catch (error) {
      message.error('Failed to delete mapping');
      console.error('Error deleting mapping:', error);
    }
  };

  const handleClearAll = () => {
    try {
      jitsiRoomMappingService.clearAllMappings();
      message.success('All mappings cleared successfully');
      loadMappings();
      onMappingChange?.();
    } catch (error) {
      message.error('Failed to clear mappings');
      console.error('Error clearing mappings:', error);
    }
  };

  const handleExport = () => {
    try {
      const exportData = jitsiRoomMappingService.exportMappings();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jitsi-room-mappings-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('Mappings exported successfully');
    } catch (error) {
      message.error('Failed to export mappings');
      console.error('Error exporting mappings:', error);
    }
  };

  const handleImport = () => {
    try {
      const success = jitsiRoomMappingService.importMappings(importJson);
      if (success) {
        message.success('Mappings imported successfully');
        setIsImportModalVisible(false);
        setImportJson('');
        loadMappings();
        onMappingChange?.();
      } else {
        message.error('Invalid JSON format');
      }
    } catch (error) {
      message.error('Failed to import mappings');
      console.error('Error importing mappings:', error);
    }
  };

  const columns = [
    {
      title: 'Area ID',
      dataIndex: 'areaId',
      key: 'areaId',
      width: '25%',
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Jitsi Room Name',
      dataIndex: 'jitsiRoomName',
      key: 'jitsiRoomName',
      width: '30%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      width: '25%',
      render: (text: string) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'isCustom',
      key: 'isCustom',
      width: '10%',
      render: (isCustom: boolean) => (
        <Tag color={isCustom ? 'blue' : 'default'}>
          {isCustom ? 'Custom' : 'Auto'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_: any, record: RoomMapping) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this mapping?"
            description="The area will use auto-generated room names."
            onConfirm={() => handleDelete(record.areaId)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={`jitsi-room-mapping-editor ${className}`}>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>Jitsi Room Mappings</Title>
            <Tag color="blue">{mappings.length} mapping{mappings.length !== 1 ? 's' : ''}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={loadMappings}
              title="Refresh"
            />
            <Button
              size="small"
              icon={<ImportOutlined />}
              onClick={() => setIsImportModalVisible(true)}
            >
              Import
            </Button>
            <Button
              size="small"
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={mappings.length === 0}
            >
              Export
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Add Mapping
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={mappings}
          rowKey="areaId"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} mappings` }}
          size="small"
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Auto-generated room names use format: stargety-[area-id]
          </Text>
          <Popconfirm
            title="Clear all mappings?"
            description="All areas will use auto-generated room names."
            onConfirm={handleClearAll}
            okText="Clear All"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" disabled={mappings.length === 0}>
              Clear All Mappings
            </Button>
          </Popconfirm>
        </div>
      </Card>

      {/* Edit/Add Modal */}
      <Modal
        title={editingMapping ? 'Edit Room Mapping' : 'Add Room Mapping'}
        open={isEditModalVisible}
        onOk={handleSave}
        onCancel={() => setIsEditModalVisible(false)}
        okText="Save"
        cancelText="Cancel"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Area ID *</Text>
            <Input
              placeholder="e.g., meeting-room"
              value={editForm.areaId}
              onChange={(e) => setEditForm({ ...editForm, areaId: e.target.value })}
              disabled={!!editingMapping}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              The unique identifier for the interactive area
            </Text>
          </div>

          <div>
            <Text strong>Jitsi Room Name *</Text>
            <Input
              placeholder="e.g., my-custom-room"
              value={editForm.jitsiRoomName}
              onChange={(e) => setEditForm({ ...editForm, jitsiRoomName: e.target.value })}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              The Jitsi room name (alphanumeric, hyphens, underscores only)
            </Text>
          </div>

          <div>
            <Text strong>Display Name (Optional)</Text>
            <Input
              placeholder="e.g., Main Conference Room"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              A friendly name for the room (for display purposes)
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Room Mappings"
        open={isImportModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setIsImportModalVisible(false);
          setImportJson('');
        }}
        okText="Import"
        cancelText="Cancel"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Text>Paste the exported JSON data below:</Text>
          <Input.TextArea
            rows={10}
            placeholder='{"area-id": {"jitsiRoomName": "room-name", "displayName": "Display Name", "isCustom": true}}'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          <Text type="warning" style={{ fontSize: '11px' }}>
            ⚠️ Warning: This will overwrite existing mappings with the same area IDs
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default JitsiRoomMappingEditor;

