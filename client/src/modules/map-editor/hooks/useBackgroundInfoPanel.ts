import { useState, useCallback, useEffect } from 'react';

export interface BackgroundInfoState {
  loadingStatus: 'loading' | 'loaded' | 'failed' | 'none';
  isVisible: boolean;
  lastUpdated: Date;
}

export interface UseBackgroundInfoPanelReturn {
  // Panel state
  isPanelVisible: boolean;
  backgroundLoadingStatus: 'loading' | 'loaded' | 'failed' | 'none';
  backgroundVisible: boolean;
  
  // Panel actions
  showPanel: () => void;
  hidePanel: () => void;
  togglePanel: () => void;
  
  // Background status updates
  setBackgroundLoadingStatus: (status: 'loading' | 'loaded' | 'failed' | 'none') => void;
  setBackgroundVisible: (visible: boolean) => void;
  
  // Utility
  resetPanel: () => void;
}

interface UseBackgroundInfoPanelConfig {
  initiallyVisible?: boolean;
  persistState?: boolean;
  storageKey?: string;
}

const DEFAULT_CONFIG: UseBackgroundInfoPanelConfig = {
  initiallyVisible: false,
  persistState: true,
  storageKey: 'map-editor-background-info-panel'
};

export const useBackgroundInfoPanel = (
  config: UseBackgroundInfoPanelConfig = {}
): UseBackgroundInfoPanelReturn => {
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize panel visibility from localStorage if persistence is enabled
  const getInitialVisibility = (): boolean => {
    if (finalConfig.persistState && finalConfig.storageKey) {
      try {
        const stored = localStorage.getItem(finalConfig.storageKey);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load background info panel state from localStorage:', error);
      }
    }
    return finalConfig.initiallyVisible || false;
  };

  // Panel state
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(getInitialVisibility);
  const [backgroundLoadingStatus, setBackgroundLoadingStatusState] = useState<'loading' | 'loaded' | 'failed' | 'none'>('none');
  const [backgroundVisible, setBackgroundVisibleState] = useState<boolean>(false);

  // Persist panel visibility to localStorage
  useEffect(() => {
    if (finalConfig.persistState && finalConfig.storageKey) {
      try {
        localStorage.setItem(finalConfig.storageKey, JSON.stringify(isPanelVisible));
      } catch (error) {
        console.warn('Failed to save background info panel state to localStorage:', error);
      }
    }
  }, [isPanelVisible, finalConfig.persistState, finalConfig.storageKey]);

  // Panel visibility actions
  const showPanel = useCallback(() => {
    setIsPanelVisible(true);
  }, []);

  const hidePanel = useCallback(() => {
    setIsPanelVisible(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelVisible(prev => !prev);
  }, []);

  // Background status actions
  const setBackgroundLoadingStatus = useCallback((status: 'loading' | 'loaded' | 'failed' | 'none') => {
    setBackgroundLoadingStatusState(status);
    
    // Auto-show panel when background starts loading (optional behavior)
    if (status === 'loading' && !isPanelVisible) {
      // Uncomment the line below if you want the panel to auto-show when loading starts
      // setIsPanelVisible(true);
    }
  }, [isPanelVisible]);

  const setBackgroundVisible = useCallback((visible: boolean) => {
    setBackgroundVisibleState(visible);
  }, []);

  // Reset panel to default state
  const resetPanel = useCallback(() => {
    setBackgroundLoadingStatusState('none');
    setBackgroundVisibleState(false);
    setIsPanelVisible(finalConfig.initiallyVisible || false);
  }, [finalConfig.initiallyVisible]);

  return {
    // Panel state
    isPanelVisible,
    backgroundLoadingStatus,
    backgroundVisible,
    
    // Panel actions
    showPanel,
    hidePanel,
    togglePanel,
    
    // Background status updates
    setBackgroundLoadingStatus,
    setBackgroundVisible,
    
    // Utility
    resetPanel
  };
};

// Helper hook for integration with existing background loading systems
export const useBackgroundInfoIntegration = () => {
  const backgroundInfo = useBackgroundInfoPanel({
    initiallyVisible: false,
    persistState: true
  });

  // Helper function to update status based on background loading events
  const handleBackgroundLoadingStart = useCallback(() => {
    backgroundInfo.setBackgroundLoadingStatus('loading');
    backgroundInfo.setBackgroundVisible(false);
  }, [backgroundInfo]);

  const handleBackgroundLoadingSuccess = useCallback(() => {
    backgroundInfo.setBackgroundLoadingStatus('loaded');
    backgroundInfo.setBackgroundVisible(true);
  }, [backgroundInfo]);

  const handleBackgroundLoadingError = useCallback(() => {
    backgroundInfo.setBackgroundLoadingStatus('failed');
    backgroundInfo.setBackgroundVisible(false);
  }, [backgroundInfo]);

  const handleBackgroundRemoved = useCallback(() => {
    backgroundInfo.setBackgroundLoadingStatus('none');
    backgroundInfo.setBackgroundVisible(false);
  }, [backgroundInfo]);

  const handleBackgroundVisibilityChange = useCallback((visible: boolean) => {
    backgroundInfo.setBackgroundVisible(visible);
  }, [backgroundInfo]);

  return {
    ...backgroundInfo,
    
    // Integration helpers
    handleBackgroundLoadingStart,
    handleBackgroundLoadingSuccess,
    handleBackgroundLoadingError,
    handleBackgroundRemoved,
    handleBackgroundVisibilityChange
  };
};
