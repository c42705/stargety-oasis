import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { VideoCommunicationPanel } from '../VideoCommunicationPanel';
import { useSettings } from '../../shared/SettingsContext';
import { useAuth } from '../../shared/AuthContext';
import { useEventBus } from '../../shared/EventBusContext';

// Mock the dependencies
jest.mock('../../shared/SettingsContext');
jest.mock('../../shared/AuthContext');
jest.mock('../../shared/EventBusContext');
jest.mock('../../modules/video-call/VideoCallModule');

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseEventBus = useEventBus as jest.MockedFunction<typeof useEventBus>;
const mockVideoCallModule = require('../../modules/video-call/VideoCallModule').VideoCallModule as jest.Mock;

describe('VideoCommunicationPanel', () => {
  const mockSettings = {
    jitsiServerUrl: 'https://meet.stargety.com',
    theme: 'light',
    editorPrefs: {}
  };

  const mockUser = {
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockEventBus = {
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    publish: jest.fn(),
    unsubscribe: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSettings.mockReturnValue({ settings: mockSettings });
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockUseEventBus.mockReturnValue(mockEventBus);
    mockVideoCallModule.mockImplementation(({ roomId, userName, serverUrl, hideToolbar }) => (
      <div data-testid="video-call-module">
        <div data-testid="room-id">{roomId}</div>
        <div data-testid="user-name">{userName}</div>
        <div data-testid="server-url">{serverUrl}</div>
        <div data-testid="hide-toolbar">{hideToolbar ? 'hidden' : 'visible'}</div>
      </div>
    ));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render idle state when not in an area', () => {
    render(<VideoCommunicationPanel />);

    expect(screen.getByText('Walk into a meeting area to join a video call')).toBeInTheDocument();
    expect(screen.getByText('Meeting areas are highlighted on the map')).toBeInTheDocument();
    expect(screen.getByText('Sticky Mode')).toBeInTheDocument();
  });

  test('should render VideoCallModule when in an area', () => {
    const { rerender } = render(<VideoCommunicationPanel />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    rerender(<VideoCommunicationPanel />);

    expect(screen.getByTestId('video-call-module')).toBeInTheDocument();
    expect(screen.getByTestId('room-id')).toHaveTextContent('test-room');
    expect(screen.getByTestId('user-name')).toHaveTextContent('testuser');
    expect(screen.getByTestId('server-url')).toHaveTextContent('https://meet.stargety.com');
    expect(screen.getByTestId('hide-toolbar')).toHaveTextContent('hidden');
  });

  test('should handle jitsi:leave event correctly', async () => {
    const { rerender } = render(<VideoCommunicationPanel />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    rerender(<VideoCommunicationPanel />);

    // Should show video call module
    expect(screen.getByTestId('video-call-module')).toBeInTheDocument();

    // Simulate leaving the area
    act(() => {
      mockEventBus.subscribe.mock.calls[1][1]({
        areaName: 'Test Meeting Room'
      });
    });

    // Should go back to idle state
    await waitFor(() => {
      expect(screen.getByText('Walk into a meeting area to join a video call')).toBeInTheDocument();
    });
  });

  test('should handle room change callback', () => {
    const mockRoomChange = jest.fn();
    
    render(<VideoCommunicationPanel onRoomChange={mockRoomChange} />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'new-room',
        areaName: 'New Meeting Room'
      });
    });

    expect(mockRoomChange).toHaveBeenCalledWith('new-room');
  });

  test('should handle sticky mode modal when leaving area with sticky mode enabled', async () => {
    const { rerender } = render(<VideoCommunicationPanel />);

    // Enable sticky mode
    const stickySwitch = screen.getByText('Sticky Mode').previousElementSibling;
    if (stickySwitch) {
      act(() => {
        stickySwitch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    rerender(<VideoCommunicationPanel />);

    // Simulate leaving the area
    act(() => {
      mockEventBus.subscribe.mock.calls[1][1]({
        areaName: 'Test Meeting Room'
      });
    });

    // Should show sticky mode modal
    await waitFor(() => {
      expect(screen.getByText('Continue Call?')).toBeInTheDocument();
      expect(screen.getByText('You\'ve left the interactive area, but you\'re still in the video call.')).toBeInTheDocument();
    });
  });

  test('should clear timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = render(<VideoCommunicationPanel />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test('should handle debounce correctly for rapid area transitions', () => {
    jest.useFakeTimers();
    
    const { rerender } = render(<VideoCommunicationPanel />);

    // Simulate rapid area transitions
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'room-1',
        areaName: 'Area 1'
      });
    });

    // Fast transition to another area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'room-2',
        areaName: 'Area 2'
      });
    });

    // Fast transition to another area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'room-3',
        areaName: 'Area 3'
      });
    });

    // Advance timers to see final state
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should show the last room
    expect(screen.getByTestId('room-id')).toHaveTextContent('room-3');
    
    jest.useRealTimers();
  });

  test('should use default Jitsi server URL when not configured', () => {
    mockUseSettings.mockReturnValue({ 
      settings: { 
        jitsiServerUrl: undefined, 
        theme: 'light', 
        editorPrefs: {} 
      } 
    });

    const { rerender } = render(<VideoCommunicationPanel />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    rerender(<VideoCommunicationPanel />);

    expect(screen.getByTestId('server-url')).toHaveTextContent('meet.stargety.com');
  });

  test('should not render video call when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { rerender } = render(<VideoCommunicationPanel />);

    // Simulate entering a Jitsi area
    act(() => {
      mockEventBus.subscribe.mock.calls[0][1]({
        roomName: 'test-room',
        areaName: 'Test Meeting Room'
      });
    });

    rerender(<VideoCommunicationPanel />);

    // Should still show idle state when no user
    expect(screen.getByText('Walk into a meeting area to join a video call')).toBeInTheDocument();
  });

  test('should handle missing event bus gracefully', () => {
    mockUseEventBus.mockReturnValue(null as any);

    expect(() => {
      render(<VideoCommunicationPanel />);
    }).not.toThrow();
  });

  test('should log mount/unmount events', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    const { unmount } = render(<VideoCommunicationPanel />);
    
    expect(consoleSpy).toHaveBeenCalledWith('🎬 VideoCommunicationPanel MOUNTED');
    
    unmount();
    
    expect(consoleSpy).toHaveBeenCalledWith('🔴 VideoCommunicationPanel UNMOUNTING');
    
    consoleSpy.mockRestore();
  });
});