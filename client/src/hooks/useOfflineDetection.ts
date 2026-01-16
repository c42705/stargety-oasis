/**
 * useOfflineDetection Hook
 * 
 * Detects when the application goes offline/online and provides
 * callbacks for handling offline scenarios.
 */

import { useEffect, useState, useCallback } from 'react';
import { logger } from '../shared/logger';

interface UseOfflineDetectionOptions {
  onOffline?: () => void;
  onOnline?: () => void;
}

interface UseOfflineDetectionResult {
  isOnline: boolean;
  isOffline: boolean;
}

/**
 * Hook to detect online/offline status
 * Listens to window online/offline events
 */
export const useOfflineDetection = ({
  onOffline,
  onOnline,
}: UseOfflineDetectionOptions = {}): UseOfflineDetectionResult => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const handleOnline = useCallback(() => {
    logger.info('Application is now online');
    setIsOnline(true);
    onOnline?.();
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    logger.warn('Application is now offline');
    setIsOnline(false);
    onOffline?.();
  }, [onOffline]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
  };
};

