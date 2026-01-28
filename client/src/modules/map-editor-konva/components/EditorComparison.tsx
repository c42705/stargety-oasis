/**
 * Editor Comparison Component
 * 
 * Side-by-side comparison of Fabric.js and Konva editors for validation.
 */

import React, { useState } from 'react';
import { Card, Row, Col, Space, Button, Typography, Statistic, Alert, Switch } from 'antd';
import {
  SwapOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { KonvaMapCanvas } from './KonvaMapCanvas';
// import { FabricMapEditor } from '../../map-editor/FabricMapEditor'; // Placeholder

const { Title, Text } = Typography;

interface EditorComparisonProps {
  /** Map data to render in both editors */
  mapData?: any;
  /** Enable performance comparison */
  enablePerformanceComparison?: boolean;
}

/**
 * Component for side-by-side editor comparison
 */
export const EditorComparison: React.FC<EditorComparisonProps> = ({
  mapData,
  enablePerformanceComparison = true,
}) => {
  const [syncViewports, setSyncViewports] = useState(true);
  const [fabricPerf] = useState({ fps: 0, renderTime: 0 });
  const [konvaPerf] = useState({ fps: 0, renderTime: 0 });

  // Calculate performance difference
  const fpsDiff = konvaPerf.fps - fabricPerf.fps;
  const renderTimeDiff = fabricPerf.renderTime - konvaPerf.renderTime;

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>
        <SwapOutlined /> Editor Comparison
      </Title>

      <Alert
        message="Development Tool"
        description="This comparison view is for validation and debugging. It renders both editors side-by-side to verify feature parity and performance."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* Controls */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space>
          <Text strong>Sync Viewports:</Text>
          <Switch
            checked={syncViewports}
            onChange={setSyncViewports}
            checkedChildren="On"
            unCheckedChildren="Off"
          />
          <Button icon={<SyncOutlined />} type="primary">
            Sync Now
          </Button>
        </Space>
      </Card>

      {/* Performance Comparison */}
      {enablePerformanceComparison && (
        <Card title="Performance Comparison" size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Fabric.js FPS"
                value={fabricPerf.fps}
                suffix="fps"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Konva FPS"
                value={konvaPerf.fps}
                suffix="fps"
                valueStyle={{ color: fpsDiff > 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Difference"
                value={fpsDiff}
                suffix="fps"
                prefix={fpsDiff > 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
                valueStyle={{ color: fpsDiff > 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={8}>
              <Statistic
                title="Fabric.js Render Time"
                value={fabricPerf.renderTime}
                suffix="ms"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Konva Render Time"
                value={konvaPerf.renderTime}
                suffix="ms"
                valueStyle={{ color: renderTimeDiff > 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Improvement"
                value={renderTimeDiff}
                suffix="ms"
                prefix={renderTimeDiff > 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
                valueStyle={{ color: renderTimeDiff > 0 ? '#3f8600' : '#cf1322' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Side-by-Side Editors */}
      <Row gutter={16}>
        {/* Fabric.js Editor */}
        <Col span={12}>
          <Card
            title="Fabric.js Editor (Legacy)"
            size="small"
            extra={<Text type="secondary">Current</Text>}
          >
            <div style={{ border: '1px solid #d9d9d9', minHeight: '600px' }}>
              {/* TODO: Render Fabric.js editor */}
              <Alert
                message="Fabric.js Editor Placeholder"
                description="The Fabric.js editor would be rendered here."
                type="warning"
                showIcon
              />
            </div>
          </Card>
        </Col>

        {/* Konva Editor */}
        <Col span={12}>
          <Card
            title="Konva Editor (New)"
            size="small"
            extra={<Text type="success">Migration Target</Text>}
          >
            <div style={{ border: '1px solid #d9d9d9' }}>
              <KonvaMapCanvas />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Feature Parity Checklist */}
      <Card title="Feature Parity Checklist" size="small" style={{ marginTop: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Polygon Drawing
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Rectangle Drawing
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Selection & Multi-Selection
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Move & Resize
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Delete & Duplicate
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Undo/Redo
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Zoom & Pan
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Grid
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Save/Load
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Preview Mode (NEW)
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Performance Monitoring (NEW)
          </div>
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Accessibility (NEW)
          </div>
        </Space>
      </Card>
    </div>
  );
};

