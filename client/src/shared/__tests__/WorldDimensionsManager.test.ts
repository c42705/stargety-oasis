/**
 * WorldDimensionsManager Test Suite
 * 
 * Comprehensive tests for the new dimension management system
 */

import { worldDimensionsManager, WorldDimensionsManager } from '../WorldDimensionsManager';

describe('WorldDimensionsManager', () => {
  let manager: WorldDimensionsManager;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (WorldDimensionsManager as any).instance = null;
    manager = WorldDimensionsManager.getInstance();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up subscriptions
    manager.clearAllSubscriptions();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WorldDimensionsManager.getInstance();
      const instance2 = WorldDimensionsManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return the same instance as the exported singleton', () => {
      expect(manager).toBe(worldDimensionsManager);
    });
  });

  describe('Dimension Updates', () => {
    it('should update world dimensions successfully', () => {
      const dimensions = { width: 1000, height: 800 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });

      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual(dimensions);
      expect(result.scaled).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimum dimensions', () => {
      const dimensions = { width: 200, height: 150 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Width must be at least 400px');
      expect(result.errors).toContain('Height must be at least 300px');
    });

    it('should scale down large dimensions', () => {
      const dimensions = { width: 15000, height: 12000 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });

      expect(result.isValid).toBe(true);
      expect(result.scaled).toBe(true);
      expect(result.dimensions.width).toBeLessThan(dimensions.width);
      expect(result.dimensions.height).toBeLessThan(dimensions.height);
      expect(result.dimensions.width).toBeLessThanOrEqual(10000);
      expect(result.dimensions.height).toBeLessThanOrEqual(10000);
    });

    it('should maintain aspect ratio when scaling', () => {
      const dimensions = { width: 16000, height: 9000 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });

      expect(result.isValid).toBe(true);
      expect(result.scaled).toBe(true);
      
      const originalRatio = dimensions.width / dimensions.height;
      const scaledRatio = result.dimensions.width / result.dimensions.height;
      expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01);
    });
  });

  describe('Background Dimensions', () => {
    it('should update background dimensions successfully', () => {
      const dimensions = { width: 1200, height: 900 };
      const result = manager.updateBackgroundDimensions(dimensions, { source: 'background' });

      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual(dimensions);
    });

    it('should sync background with world dimensions when enabled', () => {
      const worldDimensions = { width: 1000, height: 800 };
      const backgroundDimensions = { width: 1200, height: 900 };

      manager.updateDimensions(worldDimensions, { source: 'test' });
      const result = manager.updateBackgroundDimensions(backgroundDimensions, { 
        source: 'background',
        syncWithWorld: true 
      });

      expect(result.isValid).toBe(true);
      const state = manager.getState();
      expect(state.worldDimensions).toEqual(result.dimensions);
    });
  });

  describe('Canvas Dimensions', () => {
    it('should update canvas dimensions successfully', () => {
      const dimensions = { width: 800, height: 600 };
      const result = manager.updateCanvasDimensions(dimensions, { source: 'canvas' });

      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual(dimensions);
    });

    it('should not affect world dimensions when updating canvas', () => {
      const worldDimensions = { width: 1000, height: 800 };
      const canvasDimensions = { width: 800, height: 600 };

      manager.updateDimensions(worldDimensions, { source: 'test' });
      const initialState = manager.getState();

      manager.updateCanvasDimensions(canvasDimensions, { source: 'canvas' });
      const finalState = manager.getState();

      expect(finalState.worldDimensions).toEqual(initialState.worldDimensions);
      expect(finalState.canvasDimensions).toEqual(canvasDimensions);
    });
  });

  describe('Effective Dimensions', () => {
    it('should prioritize background dimensions over world dimensions', () => {
      const worldDimensions = { width: 1000, height: 800 };
      const backgroundDimensions = { width: 1200, height: 900 };

      manager.updateDimensions(worldDimensions, { source: 'test' });
      manager.updateBackgroundDimensions(backgroundDimensions, { source: 'background' });

      const effectiveDimensions = manager.getEffectiveDimensions();
      expect(effectiveDimensions).toEqual(backgroundDimensions);
    });

    it('should fall back to world dimensions when no background', () => {
      const worldDimensions = { width: 1000, height: 800 };
      manager.updateDimensions(worldDimensions, { source: 'test' });

      const effectiveDimensions = manager.getEffectiveDimensions();
      expect(effectiveDimensions).toEqual(worldDimensions);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers of dimension changes', () => {
      const callback = jest.fn();
      manager.subscribe(callback);

      const dimensions = { width: 1000, height: 800 };
      manager.updateDimensions(dimensions, { source: 'test' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          worldDimensions: dimensions,
          source: 'test'
        })
      );
    });

    it('should allow unsubscribing', () => {
      const callback = jest.fn();
      const unsubscribe = manager.subscribe(callback);

      unsubscribe();

      const dimensions = { width: 1000, height: 800 };
      manager.updateDimensions(dimensions, { source: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      manager.subscribe(callback1);
      manager.subscribe(callback2);

      const dimensions = { width: 1000, height: 800 };
      manager.updateDimensions(dimensions, { source: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Persistence', () => {
    it('should persist state to localStorage', () => {
      const dimensions = { width: 1000, height: 800 };
      manager.updateDimensions(dimensions, { source: 'test' });

      const stored = localStorage.getItem('worldDimensionsState');
      expect(stored).toBeTruthy();
      
      const parsedState = JSON.parse(stored!);
      expect(parsedState.worldDimensions).toEqual(dimensions);
    });

    it('should load state from localStorage on initialization', () => {
      const dimensions = { width: 1000, height: 800 };
      const state = {
        worldDimensions: dimensions,
        backgroundDimensions: null,
        canvasDimensions: null,
        effectiveDimensions: dimensions,
        source: 'test',
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('worldDimensionsState', JSON.stringify(state));

      // Create new instance to test loading
      (WorldDimensionsManager as any).instance = null;
      const newManager = WorldDimensionsManager.getInstance();
      
      expect(newManager.getState().worldDimensions).toEqual(dimensions);
    });

    it('should skip persistence when requested', () => {
      const dimensions = { width: 1000, height: 800 };
      manager.updateDimensions(dimensions, { 
        source: 'test',
        skipPersistence: true 
      });

      const stored = localStorage.getItem('worldDimensionsState');
      expect(stored).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid dimension objects', () => {
      const result = manager.updateDimensions(null as any, { source: 'test' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid dimensions object');
    });

    it('should handle non-numeric dimensions', () => {
      const dimensions = { width: 'invalid' as any, height: 600 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Width must be a positive number');
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const dimensions = { width: 1000, height: 800 };
      const result = manager.updateDimensions(dimensions, { source: 'test' });

      // Should still succeed despite persistence failure
      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual(dimensions);

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });
  });
});
