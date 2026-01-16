/**
 * Map Cache Validator - Validates cache freshness based on environment
 * 
 * Freshness thresholds:
 * - Development: 1 minute (60,000 ms)
 * - Production: 5 minutes (300,000 ms)
 * 
 * Tracks cache staleness and provides validation results.
 */

import { logger } from './logger';
import { MapCacheManager, CacheMetadata } from './MapCacheManager';

export interface CacheValidationResult {
  isValid: boolean;
  isFresh: boolean;
  isStale: boolean;
  age: number; // milliseconds
  threshold: number; // milliseconds
  metadata: CacheMetadata | null;
  reason?: string;
}

export class MapCacheValidator {
  /**
   * Get cache freshness threshold based on environment
   */
  static getFreshnessThreshold(): number {
    const isDev = process.env.NODE_ENV === 'development';
    const devThreshold = parseInt(process.env.REACT_APP_CACHE_FRESHNESS_DEV_MS || '60000', 10);
    const prodThreshold = parseInt(process.env.REACT_APP_CACHE_FRESHNESS_PROD_MS || '300000', 10);

    return isDev ? devThreshold : prodThreshold;
  }

  /**
   * Validate cache freshness for a room
   */
  static validateCache(roomId: string): CacheValidationResult {
    const metadata = MapCacheManager.getMapCacheMetadata(roomId);
    const threshold = this.getFreshnessThreshold();

    if (!metadata) {
      return {
        isValid: false,
        isFresh: false,
        isStale: false,
        age: Infinity,
        threshold,
        metadata: null,
        reason: 'No cache found',
      };
    }

    const age = Date.now() - metadata.clientCachedAt;
    const isFresh = age < threshold;
    const isStale = age >= threshold;

    logger.debug('CACHE_VALIDATION', {
      roomId,
      age,
      threshold,
      isFresh,
      isStale,
    });

    return {
      isValid: isFresh,
      isFresh,
      isStale,
      age,
      threshold,
      metadata,
      reason: isFresh ? 'Cache is fresh' : 'Cache is stale',
    };
  }

  /**
   * Check if cache needs refresh (stale or missing)
   */
  static needsRefresh(roomId: string): boolean {
    const result = this.validateCache(roomId);
    return !result.isValid;
  }

  /**
   * Get cache age in seconds (for display)
   */
  static getCacheAgeSeconds(roomId: string): number {
    const metadata = MapCacheManager.getMapCacheMetadata(roomId);
    if (!metadata) return -1;

    const ageMs = Date.now() - metadata.clientCachedAt;
    return Math.floor(ageMs / 1000);
  }

  /**
   * Get time until cache expires (in seconds)
   */
  static getTimeUntilExpiry(roomId: string): number {
    const result = this.validateCache(roomId);
    if (result.isValid) {
      const timeLeft = result.threshold - result.age;
      return Math.ceil(timeLeft / 1000);
    }
    return 0;
  }

  /**
   * Check if cache version matches server version
   */
  static isCacheVersionValid(roomId: string, serverCacheVersion: number): boolean {
    const metadata = MapCacheManager.getMapCacheMetadata(roomId);
    if (!metadata) return false;

    return metadata.cacheVersion === serverCacheVersion;
  }

  /**
   * Get validation summary for logging
   */
  static getValidationSummary(roomId: string): string {
    const result = this.validateCache(roomId);
    const ageSeconds = Math.floor(result.age / 1000);
    const thresholdSeconds = Math.floor(result.threshold / 1000);

    return `Cache ${result.isValid ? 'VALID' : 'INVALID'} (${ageSeconds}s / ${thresholdSeconds}s)`;
  }
}

