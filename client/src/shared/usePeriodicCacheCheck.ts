/**
 * usePeriodicCacheCheck Hook
 * 
 * Validates map cache every 5 minutes during active gameplay.
 * Alerts user and forces refresh if cache expires.
 * 
 * Usage:
 * const { isCacheValid, lastCheckTime } = usePeriodicCacheCheck(roomId);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapCacheValidator } from './MapCacheValidator';
import { logger } from './logger';
import { message } from 'antd';

const PERIODIC_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface PeriodicCacheCheckResult {
  isCacheValid: boolean;
  lastCheckTime: number | null;
  cacheAge: number; // milliseconds
  timeUntilExpiry: number; // seconds
}

export const usePeriodicCacheCheck = (roomId: string): PeriodicCacheCheckResult => {
  const [isCacheValid, setIsCacheValid] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [cacheAge, setCacheAge] = useState(0);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAlertedRef = useRef(false);

  const performCheck = useCallback(() => {
    const result = MapCacheValidator.validateCache(roomId);
    const ageSeconds = MapCacheValidator.getCacheAgeSeconds(roomId);
    const timeLeft = MapCacheValidator.getTimeUntilExpiry(roomId);

    setIsCacheValid(result.isValid);
    setLastCheckTime(Date.now());
    setCacheAge(result.age);
    setTimeUntilExpiry(timeLeft);

    logger.debug('PERIODIC_CACHE_CHECK', {
      roomId,
      isValid: result.isValid,
      age: ageSeconds,
      timeLeft,
    });

    // Alert user if cache expired
    if (result.isStale && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      logger.warn('CACHE_EXPIRED_ALERT', { roomId });
      message.warning({
        content: 'Map cache expired. Refreshing from server...',
        duration: 3,
      });

      // Trigger refresh by dispatching custom event
      window.dispatchEvent(
        new CustomEvent('mapCacheExpired', { detail: { roomId } })
      );
    }

    // Reset alert flag if cache becomes valid again
    if (result.isValid) {
      hasAlertedRef.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    // Perform initial check
    performCheck();

    // Set up periodic checks
    intervalRef.current = setInterval(performCheck, PERIODIC_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [roomId, performCheck]);

  return {
    isCacheValid,
    lastCheckTime,
    cacheAge,
    timeUntilExpiry,
  };
};

