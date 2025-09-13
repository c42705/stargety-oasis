/**
 * Tests for usePanControls hook
 * 
 * This test suite verifies the pan functionality works correctly
 * across all supported activation methods.
 */

import { renderHook, act } from '@testing-library/react';
import { usePanControls } from '../usePanControls';
import { MapEditorCameraControls } from '../useMapEditorCamera';

// Mock camera controls
const mockCameraControls: Partial<MapEditorCameraControls> = {
  startPan: jest.fn(),
  updatePan: jest.fn(),
  endPan: jest.fn(),
  cameraState: {
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
    isPanning: false,
    canZoomIn: true,
    canZoomOut: true
  }
};

// Mock canvas element
const mockCanvasElement = {
  style: { cursor: 'default' }
} as HTMLElement;

describe('usePanControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    expect(result.current.state.isPanning).toBe(false);
    expect(result.current.state.panMethod).toBe('none');
    expect(result.current.state.isSpaceKeyDown).toBe(false);
    expect(result.current.state.canPanWithSpace).toBe(false);
    expect(result.current.state.canPanWithMiddleMouse).toBe(true);
    expect(result.current.state.canPanWithTool).toBe(false);
  });

  it('should detect Space key pan activation', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Simulate Space key down
    act(() => {
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);
    });

    expect(result.current.state.isSpaceKeyDown).toBe(true);
    expect(result.current.state.canPanWithSpace).toBe(true);

    // Test mouse event with Space key down
    const mouseEvent = new MouseEvent('mousedown', { button: 0 });
    const panMethod = result.current.actions.shouldStartPan(mouseEvent);
    expect(panMethod).toBe('space-drag');
  });

  it('should detect middle mouse pan activation', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    const mouseEvent = new MouseEvent('mousedown', { button: 1 }); // Middle mouse
    const panMethod = result.current.actions.shouldStartPan(mouseEvent);
    expect(panMethod).toBe('middle-mouse');
  });

  it('should detect pan tool activation', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'pan'
      })
    );

    expect(result.current.state.canPanWithTool).toBe(true);
    expect(result.current.state.canPanWithMiddleMouse).toBe(false); // Disabled in pan mode

    const mouseEvent = new MouseEvent('mousedown', { button: 0 }); // Left mouse
    const panMethod = result.current.actions.shouldStartPan(mouseEvent);
    expect(panMethod).toBe('tool-mode');
  });

  it('should start and end panning correctly', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Start panning
    act(() => {
      result.current.startPan('space-drag', 100, 200);
    });

    expect(result.current.state.isPanning).toBe(true);
    expect(result.current.state.panMethod).toBe('space-drag');
    expect(mockCameraControls.startPan).toHaveBeenCalledWith(100, 200);

    // End panning
    act(() => {
      result.current.endPan();
    });

    expect(result.current.state.isPanning).toBe(false);
    expect(result.current.state.panMethod).toBe('none');
    expect(mockCameraControls.endPan).toHaveBeenCalled();
  });

  it('should update pan position', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Start panning first
    act(() => {
      result.current.startPan('middle-mouse', 100, 200);
    });

    // Update pan position
    act(() => {
      result.current.updatePan(150, 250);
    });

    expect(mockCameraControls.updatePan).toHaveBeenCalledWith(150, 250);
  });

  it('should handle cursor updates correctly', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Test default cursor
    act(() => {
      result.current.actions.updateCursor();
    });
    expect(mockCanvasElement.style.cursor).toBe('default');

    // Test grab cursor when Space is down
    act(() => {
      const event = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(event);
    });
    expect(mockCanvasElement.style.cursor).toBe('grab');

    // Test grabbing cursor when panning
    act(() => {
      result.current.startPan('space-drag', 100, 200);
    });
    expect(mockCanvasElement.style.cursor).toBe('grabbing');
  });

  it('should end Space pan when Space key is released', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Start Space pan
    act(() => {
      const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(keydownEvent);
      result.current.startPan('space-drag', 100, 200);
    });

    expect(result.current.state.isPanning).toBe(true);

    // Release Space key
    act(() => {
      const keyupEvent = new KeyboardEvent('keyup', { code: 'Space' });
      window.dispatchEvent(keyupEvent);
    });

    expect(result.current.state.isPanning).toBe(false);
    expect(result.current.state.isSpaceKeyDown).toBe(false);
    expect(mockCameraControls.endPan).toHaveBeenCalled();
  });

  it('should not start panning when already panning', () => {
    const { result } = renderHook(() =>
      usePanControls({
        cameraControls: mockCameraControls as MapEditorCameraControls,
        canvasElement: mockCanvasElement,
        currentTool: 'select'
      })
    );

    // Start panning
    act(() => {
      result.current.startPan('space-drag', 100, 200);
    });

    // Try to start another pan
    const mouseEvent = new MouseEvent('mousedown', { button: 1 });
    const panMethod = result.current.actions.shouldStartPan(mouseEvent);
    expect(panMethod).toBe('none');
  });
});
