/**
 * Map Store Test Component
 * 
 * This component tests the new Zustand map store to ensure it works correctly
 * before we start migrating the existing components.
 */

import React, { useEffect } from 'react';
import { Button, Card, Space, Typography, Spin, Alert } from 'antd';
import { useMapStore } from './useMapStore';
import { useMapStoreInit } from './useMapStoreInit';

const { Title, Text } = Typography;

export const MapStoreTest: React.FC = () => {
  const { 
    mapData, 
    isLoading, 
    error, 
    saveMap, 
    resetMap,
    addInteractiveArea,
    getMapStatistics
  } = useMapStore();

  // Initialize the store
  const { isInitialized } = useMapStoreInit({ autoLoad: true, source: 'test' });

  const handleAddTestArea = () => {
    addInteractiveArea({
      id: `test-area-${Date.now()}`,
      name: 'Test Area',
      type: 'custom',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      color: '#FF6B6B',
      description: 'Test area created by store test'
    });
  };

  const handleSave = async () => {
    try {
      await saveMap();
      console.log('✅ Test save completed');
    } catch (error) {
      console.error('❌ Test save failed:', error);
    }
  };

  const handleReset = async () => {
    try {
      await resetMap();
      console.log('✅ Test reset completed');
    } catch (error) {
      console.error('❌ Test reset failed:', error);
    }
  };

  const statistics = getMapStatistics();

  if (isLoading) {
    return (
      <Card>
        <Spin size="large" />
        <Text>Loading map store...</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert type="error" message="Store Error" description={error} />
      </Card>
    );
  }

  return (
    <Card title="Map Store Test" style={{ margin: 20 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>Store Status</Title>
          <Text>Initialized: {isInitialized ? '✅' : '❌'}</Text><br />
          <Text>Has Map Data: {mapData ? '✅' : '❌'}</Text><br />
          <Text>Loading: {isLoading ? '⏳' : '✅'}</Text><br />
          <Text>Error: {error || 'None'}</Text>
        </div>

        {mapData && (
          <div>
            <Title level={4}>Map Data</Title>
            <Text>Version: {mapData.version}</Text><br />
            <Text>Interactive Areas: {mapData.interactiveAreas.length}</Text><br />
            <Text>Collision Areas: {mapData.impassableAreas.length}</Text><br />
            <Text>World Size: {mapData.worldDimensions.width} × {mapData.worldDimensions.height}</Text><br />
            <Text>Background Image: {mapData.backgroundImage ? '✅' : '❌'}</Text><br />
            <Text>Last Modified: {mapData.lastModified.toLocaleString()}</Text>
          </div>
        )}

        {statistics && (
          <div>
            <Title level={4}>Statistics</Title>
            <pre>{JSON.stringify(statistics, null, 2)}</pre>
          </div>
        )}

        <Space>
          <Button type="primary" onClick={handleAddTestArea}>
            Add Test Area
          </Button>
          <Button onClick={handleSave}>
            Save Map
          </Button>
          <Button danger onClick={handleReset}>
            Reset to Default
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
