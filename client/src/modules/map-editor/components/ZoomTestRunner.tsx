/**
 * Zoom Test Runner Component
 * 
 * Provides a UI for running zoom validation tests and displaying results.
 * This component can be temporarily added to the map editor for testing purposes.
 */

import React, { useState, useCallback } from 'react';
import { Button, Card, Progress, Alert, Collapse, Table, Tag } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as fabric from 'fabric';
import { generateValidationReport, quickValidation, ValidationReport, ZoomTestResult, PerformanceTestResult } from '../utils/testUtils';

const { Panel } = Collapse;

interface ZoomTestRunnerProps {
  canvas: fabric.Canvas | null;
  onTestComplete?: (report: ValidationReport) => void;
}

export const ZoomTestRunner: React.FC<ZoomTestRunnerProps> = ({
  canvas,
  onTestComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [quickTestResult, setQuickTestResult] = useState<boolean | null>(null);

  const runQuickTest = useCallback(async () => {
    if (!canvas) return;

    setIsRunning(true);
    setProgress(0);

    try {
      const result = await quickValidation(canvas);
      setQuickTestResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Quick test failed:', error);
      setQuickTestResult(false);
    } finally {
      setIsRunning(false);
    }
  }, [canvas]);

  const runFullTest = useCallback(async () => {
    if (!canvas) return;

    setIsRunning(true);
    setProgress(0);
    setReport(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 200);

      const validationReport = await generateValidationReport(canvas, 'Map Editor Zoom Validation');
      
      clearInterval(progressInterval);
      setProgress(100);
      setReport(validationReport);
      
      if (onTestComplete) {
        onTestComplete(validationReport);
      }
    } catch (error) {
      console.error('Full test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [canvas, onTestComplete]);

  const getStatusColor = (isValid: boolean, canvasResponsive: boolean) => {
    if (isValid && canvasResponsive) return 'success';
    if (isValid && !canvasResponsive) return 'warning';
    return 'error';
  };

  const getStatusText = (isValid: boolean, canvasResponsive: boolean) => {
    if (isValid && canvasResponsive) return 'Pass';
    if (isValid && !canvasResponsive) return 'Slow';
    return 'Fail';
  };

  const zoomTestColumns = [
    {
      title: 'Zoom Level',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_: any, record: ZoomTestResult) => (
        <Tag color={getStatusColor(record.isValid, record.canvasResponsive)}>
          {getStatusText(record.isValid, record.canvasResponsive)}
        </Tag>
      ),
    },
    {
      title: 'Render Time (ms)',
      dataIndex: 'renderTime',
      key: 'renderTime',
      width: 120,
      render: (time: number) => time.toFixed(2),
    },
    {
      title: 'Objects Visible',
      dataIndex: 'objectsVisible',
      key: 'objectsVisible',
      width: 100,
    },
    {
      title: 'Grid Visible',
      dataIndex: 'gridVisible',
      key: 'gridVisible',
      width: 100,
      render: (visible: boolean) => (
        <Tag color={visible ? 'green' : 'red'}>
          {visible ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => error || '-',
    },
  ];

  const performanceColumns = [
    {
      title: 'Zoom Level',
      dataIndex: 'zoomLevel',
      key: 'zoomLevel',
      width: 100,
      render: (zoom: number) => `${Math.round(zoom * 100)}%`,
    },
    {
      title: 'FPS',
      dataIndex: 'fps',
      key: 'fps',
      width: 80,
      render: (fps: number) => (
        <Tag color={fps >= 30 ? 'green' : fps >= 15 ? 'orange' : 'red'}>
          {fps}
        </Tag>
      ),
    },
    {
      title: 'Render Time (ms)',
      dataIndex: 'renderTime',
      key: 'renderTime',
      width: 120,
      render: (time: number) => time.toFixed(2),
    },
    {
      title: 'Memory (MB)',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      width: 100,
      render: (memory: number) => memory > 0 ? memory.toFixed(1) : 'N/A',
    },
    {
      title: 'Objects',
      dataIndex: 'objectCount',
      key: 'objectCount',
      width: 80,
    },
    {
      title: 'Optimized',
      dataIndex: 'isOptimized',
      key: 'isOptimized',
      width: 100,
      render: (optimized: boolean) => (
        <Tag color={optimized ? 'blue' : 'default'}>
          {optimized ? 'Yes' : 'No'}
        </Tag>
      ),
    },
  ];

  if (!canvas) {
    return (
      <Alert
        message="Canvas Not Available"
        description="Canvas must be initialized before running tests."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Card title="Zoom Validation Test Runner" style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={runQuickTest}
            loading={isRunning}
            style={{ marginRight: '8px' }}
          >
            Quick Test
          </Button>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={runFullTest}
            loading={isRunning}
          >
            Full Validation
          </Button>
        </div>

        {isRunning && (
          <Progress 
            percent={progress} 
            status="active"
            style={{ marginBottom: '16px' }}
          />
        )}

        {quickTestResult !== null && !isRunning && (
          <Alert
            message={quickTestResult ? "Quick Test Passed" : "Quick Test Failed"}
            description={quickTestResult 
              ? "All key zoom levels are working correctly."
              : "One or more zoom levels failed validation."
            }
            type={quickTestResult ? "success" : "error"}
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}
      </Card>

      {report && (
        <Card title="Validation Report">
          <div style={{ marginBottom: '16px' }}>
            <Alert
              message={`Test Summary: ${report.summary.passed}/${report.summary.totalTests} tests passed`}
              description={
                <div>
                  <p>Average render time: {report.summary.averageRenderTime.toFixed(2)}ms</p>
                  <p>Extreme zoom (3.1x+) supported: {report.summary.extremeZoomSupported ? 'Yes' : 'No'}</p>
                  <p>Test completed: {report.timestamp.toLocaleString()}</p>
                </div>
              }
              type={report.summary.failed === 0 ? "success" : "warning"}
              showIcon
            />
          </div>

          <Collapse>
            <Panel header="Zoom Test Results" key="zoom">
              <Table
                dataSource={report.zoomTests}
                columns={zoomTestColumns}
                rowKey={(record) => record.zoomLevel.toString()}
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Panel>

            <Panel header="Performance Test Results" key="performance">
              <Table
                dataSource={report.performanceTests}
                columns={performanceColumns}
                rowKey={(record) => record.zoomLevel.toString()}
                size="small"
                pagination={false}
              />
            </Panel>

            <Panel header="Raw Data" key="raw">
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {JSON.stringify(report, null, 2)}
              </pre>
            </Panel>
          </Collapse>
        </Card>
      )}
    </div>
  );
};

export default ZoomTestRunner;
