/**
 * Integration Test Suite
 * 
 * Tests the complete interaction between WorldDimensionsManager, SharedMapSystem,
 * and React hooks to ensure the new architecture works end-to-end.
 */

import { renderHook, act } from '@testing-library/react';
import { worldDimensionsManager, WorldDimensionsManager } from '../WorldDimensionsManager';
import { SharedMapSystem } from '../SharedMapSystem';
import { useWorldDimensions } from '../useWorldDimensions';
import { migrationManager, MigrationManager } from '../MigrationManager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Integration Tests', () => {
  let sharedMapSystem: SharedMapSystem;

  beforeEach(() => {
    // Reset singletons
    (WorldDimensionsManager as any).instance = null;
    (SharedMapSystem as any).instance = null;
    (MigrationManager as any).instance = null;
    
    // Clear localStorage
    localStorage.clear();
    
    // Initialize systems
    sharedMapSystem = SharedMapSystem.getInstance();
  });

  afterEach(() => {
    // Clean up
    worldDimensionsManager.clearAllSubscriptions();
  });

  describe('WorldDimensionsManager + SharedMapSystem Integration', () => {
    it('should sync dimensions between systems', async () => {
      const dimensions = { width: 1000, height: 800 };

      // Update through WorldDimensionsManager
      const result = worldDimensionsManager.updateDimensions(dimensions, { source: 'test' });
      expect(result.isValid).toBe(true);

      // Check that SharedMapSystem reflects the change
      const effectiveDimensions = sharedMapSystem.getEffectiveDimensions();
      expect(effectiveDimensions).toEqual(dimensions);
    });

    it('should handle SharedMapSystem dimension updates', async () => {
      const dimensions = { width: 1200, height: 900 };

      // Initialize map data first
      await sharedMapSystem.initializeMapData();
      
      // Update through SharedMapSystem
      await sharedMapSystem.updateWorldDimensions(dimensions, 'test');

      // Check that WorldDimensionsManager reflects the change
      const managerDimensions = worldDimensionsManager.getEffectiveDimensions();
      expect(managerDimensions).toEqual(dimensions);
    });

    it('should maintain consistency during background image updates', async () => {
      const worldDimensions = { width: 1000, height: 800 };
      const backgroundDimensions = { width: 1200, height: 900 };

      // Initialize systems
      await sharedMapSystem.initializeMapData();
      worldDimensionsManager.updateDimensions(worldDimensions, { source: 'test' });

      // Update background image through SharedMapSystem
      await sharedMapSystem.updateDimensionsFromBackgroundImage(
        'data:image/png;base64,test',
        backgroundDimensions,
        'upload'
      );

      // Check consistency
      const sharedEffective = sharedMapSystem.getEffectiveDimensions();
      const managerEffective = worldDimensionsManager.getEffectiveDimensions();
      
      expect(sharedEffective).toEqual(managerEffective);
      expect(sharedEffective).toEqual(backgroundDimensions);
    });
  });

  describe('React Hook Integration', () => {
    it('should provide reactive dimension updates', () => {
      const { result } = renderHook(() => useWorldDimensions());

      // Initial state
      expect(result.current.worldDimensions).toBeDefined();
      expect(result.current.effectiveDimensions).toBeDefined();

      // Update dimensions
      act(() => {
        const dimensions = { width: 1000, height: 800 };
        worldDimensionsManager.updateDimensions(dimensions, { source: 'test' });
      });

      // Check that hook reflects the change
      expect(result.current.worldDimensions).toEqual({ width: 1000, height: 800 });
      expect(result.current.effectiveDimensions).toEqual({ width: 1000, height: 800 });
    });

    it('should handle validation through hook', () => {
      const { result } = renderHook(() => useWorldDimensions());

      let validationResult: any;
      act(() => {
        validationResult = result.current.validateDimensions({ width: 200, height: 150 });
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Width must be at least 400px');
    });

    it('should handle dimension updates through hook', () => {
      const { result } = renderHook(() => useWorldDimensions());

      let updateResult: any;
      act(() => {
        updateResult = result.current.updateDimensions(
          { width: 1000, height: 800 },
          { source: 'hook-test' }
        );
      });

      expect(updateResult.isValid).toBe(true);
      expect(result.current.worldDimensions).toEqual({ width: 1000, height: 800 });
    });

    it('should handle subscription cleanup', () => {
      const { unmount } = renderHook(() => useWorldDimensions());

      // Verify subscription is active
      const subscriberCount = (worldDimensionsManager as any).subscribers.size;
      expect(subscriberCount).toBeGreaterThan(0);

      // Unmount hook
      unmount();

      // Verify subscription is cleaned up
      const finalSubscriberCount = (worldDimensionsManager as any).subscribers.size;
      expect(finalSubscriberCount).toBe(subscriberCount - 1);
    });
  });

  describe('Migration Integration', () => {
    it('should perform complete migration successfully', async () => {
      // Set up initial data in SharedMapSystem
      await sharedMapSystem.initializeMapData();
      await sharedMapSystem.updateWorldDimensions({ width: 1000, height: 800 }, 'test');

      // Perform migration
      const migrationStatus = await migrationManager.performMigration({
        enableLogging: false,
        validateData: true
      });

      expect(migrationStatus.isComplete).toBe(true);
      expect(migrationStatus.errors).toHaveLength(0);
      expect(migrationStatus.migratedComponents).toContain('WorldDimensionsManager');
      expect(migrationStatus.migratedComponents).toContain('SharedMapSystem');
    });

    it('should maintain data consistency after migration', async () => {
      const testDimensions = { width: 1200, height: 900 };

      // Set up initial data
      await sharedMapSystem.initializeMapData();
      await sharedMapSystem.updateWorldDimensions(testDimensions, 'test');

      // Perform migration
      await migrationManager.performMigration({ enableLogging: false });

      // Verify data consistency
      const sharedDimensions = sharedMapSystem.getEffectiveDimensions();
      const managerDimensions = worldDimensionsManager.getEffectiveDimensions();

      expect(sharedDimensions).toEqual(testDimensions);
      expect(managerDimensions).toEqual(testDimensions);
      expect(sharedDimensions).toEqual(managerDimensions);
    });

    it('should handle migration rollback', async () => {
      const originalDimensions = { width: 800, height: 600 };

      // Set up initial data and create backup
      await sharedMapSystem.initializeMapData();
      await sharedMapSystem.updateWorldDimensions(originalDimensions, 'test');
      
      // Manually create backup (simulating migration backup)
      const backupKey = `mapData_backup_${Date.now()}`;
      const mapData = sharedMapSystem.getMapData();
      localStorage.setItem(backupKey, JSON.stringify(mapData));

      // Modify data
      await sharedMapSystem.updateWorldDimensions({ width: 1000, height: 800 }, 'test');

      // Perform rollback
      await migrationManager.rollbackMigration();

      // Verify rollback
      const restoredData = sharedMapSystem.getMapData();
      expect(restoredData?.worldDimensions).toEqual(originalDimensions);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle SharedMapSystem errors gracefully', async () => {
      // Mock SharedMapSystem to throw an error
      const originalGetEffectiveDimensions = sharedMapSystem.getEffectiveDimensions;
      sharedMapSystem.getEffectiveDimensions = jest.fn(() => {
        throw new Error('SharedMapSystem error');
      });

      // WorldDimensionsManager should still work
      const result = worldDimensionsManager.updateDimensions(
        { width: 1000, height: 800 },
        { source: 'test' }
      );

      expect(result.isValid).toBe(true);

      // Restore original method
      sharedMapSystem.getEffectiveDimensions = originalGetEffectiveDimensions;
    });

    it('should handle localStorage errors in integration', () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // System should still function
      const result = worldDimensionsManager.updateDimensions(
        { width: 1000, height: 800 },
        { source: 'test' }
      );

      expect(result.isValid).toBe(true);

      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });

    it('should handle React hook errors gracefully', () => {
      // Mock WorldDimensionsManager to throw an error
      const originalGetState = worldDimensionsManager.getState;
      worldDimensionsManager.getState = jest.fn(() => {
        throw new Error('Manager error');
      });

      // Hook should handle the error
      const { result } = renderHook(() => useWorldDimensions());

      // Should provide fallback state
      expect(result.current.worldDimensions).toBeDefined();
      expect(result.current.effectiveDimensions).toBeDefined();

      // Restore original method
      worldDimensionsManager.getState = originalGetState;
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid dimension updates efficiently', () => {
      const startTime = performance.now();
      
      // Perform many rapid updates
      for (let i = 0; i < 100; i++) {
        worldDimensionsManager.updateDimensions(
          { width: 1000 + i, height: 800 + i },
          { source: 'performance-test' }
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple subscribers efficiently', () => {
      const callbacks = Array.from({ length: 50 }, () => jest.fn());
      
      // Subscribe all callbacks
      const unsubscribes = callbacks.map(callback => 
        worldDimensionsManager.subscribe(callback)
      );

      const startTime = performance.now();
      
      // Update dimensions
      worldDimensionsManager.updateDimensions(
        { width: 1000, height: 800 },
        { source: 'performance-test' }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All callbacks should be called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(50);

      // Clean up
      unsubscribes.forEach(unsubscribe => unsubscribe());
    });
  });
});
