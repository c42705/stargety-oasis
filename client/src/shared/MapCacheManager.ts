/**
 * Map Cache Manager - Specialized cache management for map data synchronization
 * 
 * Handles:
 * - Storing/retrieving map data with timestamps
 * - Cache validation with freshness thresholds
 * - Complete map package caching (map + avatars + assets)
 * - Cache invalidation on edits
 * 
 * Database is the source of truth; localStorage is performance cache only.
 */

import { logger } from './logger';

export interface MapCacheData {
  mapData: any;
  avatars: any[];
  assets: any[];
  metadata: {
    version: number;
    cachedAt: string;
    updatedAt: string;
    cacheVersion: number;
    totalPackageSize: number;
  };
  timestamp: number; // Client-side cache timestamp
}

export interface CacheMetadata {
  version: number;
  cachedAt: string;
  updatedAt: string;
  cacheVersion: number;
  totalPackageSize: number;
  clientCachedAt: number; // When client cached this
}

const STORAGE_PREFIX = 'map_cache_';
const METADATA_SUFFIX = '_metadata';
const MAX_CACHE_SIZE = 8 * 1024 * 1024; // 8MB

export class MapCacheManager {
  /**
   * Get cache key for a room
   */
  static getCacheKey(roomId: string): string {
    return `${STORAGE_PREFIX}${roomId}`;
  }

  /**
   * Get metadata cache key for a room
   */
  static getMetadataKey(roomId: string): string {
    return `${STORAGE_PREFIX}${roomId}${METADATA_SUFFIX}`;
  }

  /**
   * Store complete map package in cache
   */
  static setMapCache(roomId: string, data: MapCacheData): boolean {
    try {
      const key = this.getCacheKey(roomId);
      const metadataKey = this.getMetadataKey(roomId);

      // Check size before storing
      const dataStr = JSON.stringify(data);
      const sizeInBytes = new Blob([dataStr]).size;

      if (sizeInBytes > MAX_CACHE_SIZE) {
        logger.warn('MAP_CACHE_SIZE_EXCEEDED', { roomId, size: sizeInBytes, max: MAX_CACHE_SIZE });
        return false;
      }

      // Store data
      localStorage.setItem(key, dataStr);

      // Store metadata separately for quick validation
      const metadata: CacheMetadata = {
        ...data.metadata,
        clientCachedAt: Date.now(),
      };
      localStorage.setItem(metadataKey, JSON.stringify(metadata));

      logger.info('MAP_CACHE_SET', { roomId, size: sizeInBytes });
      return true;
    } catch (error) {
      logger.error('MAP_CACHE_SET_ERROR', { roomId, error });
      return false;
    }
  }

  /**
   * Get cached map data
   */
  static getMapCache(roomId: string): MapCacheData | null {
    try {
      const key = this.getCacheKey(roomId);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as MapCacheData;
    } catch (error) {
      logger.warn('MAP_CACHE_GET_ERROR', { roomId, error });
      return null;
    }
  }

  /**
   * Get cached metadata only (fast validation)
   */
  static getMapCacheMetadata(roomId: string): CacheMetadata | null {
    try {
      const key = this.getMetadataKey(roomId);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as CacheMetadata;
    } catch (error) {
      logger.warn('MAP_CACHE_METADATA_GET_ERROR', { roomId, error });
      return null;
    }
  }

  /**
   * Invalidate map cache
   */
  static invalidateMapCache(roomId: string): void {
    try {
      const key = this.getCacheKey(roomId);
      const metadataKey = this.getMetadataKey(roomId);

      localStorage.removeItem(key);
      localStorage.removeItem(metadataKey);

      logger.info('MAP_CACHE_INVALIDATED', { roomId });
    } catch (error) {
      logger.error('MAP_CACHE_INVALIDATE_ERROR', { roomId, error });
    }
  }

  /**
   * Clear all map caches
   */
  static clearAllMapCaches(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      logger.info('ALL_MAP_CACHES_CLEARED', { count: keysToRemove.length });
    } catch (error) {
      logger.error('CLEAR_ALL_MAP_CACHES_ERROR', { error });
    }
  }
}

