/**
 * Cache Utilities for localStorage with TTL-based invalidation
 * 
 * Provides a consistent pattern for caching API data in localStorage
 * with automatic expiration based on configurable TTL values.
 * 
 * PostgreSQL is the primary source of truth; localStorage is only a cache.
 * 
 * @version 1.0.0
 * @date 2025-12-11
 */

import { logger } from './logger';

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  /** Character data: 5 minutes */
  CHARACTER: 5 * 60 * 1000,
  /** Map data: 1 hour */
  MAP: 60 * 60 * 1000,
  /** Settings: 30 minutes */
  SETTINGS: 30 * 60 * 1000,
  /** Editor preferences: 1 hour */
  EDITOR_PREFS: 60 * 60 * 1000,
  /** Assets: 24 hours */
  ASSETS: 24 * 60 * 60 * 1000,
} as const;

/**
 * Cached data wrapper with timestamp
 */
export interface CachedData<T> {
  data: T;
  timestamp: number;
  version?: number;
}

/**
 * Check if cached data is still valid based on TTL
 */
export function isCacheValid<T>(cached: CachedData<T> | null, ttl: number): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttl;
}

/**
 * Get cached data from localStorage
 * Returns null if cache is missing, expired, or invalid
 */
export function getCachedData<T>(key: string, ttl: number): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedData<T> = JSON.parse(stored);
    
    if (!isCacheValid(cached, ttl)) {
      logger.debug('CACHE_EXPIRED', { key, age: Date.now() - cached.timestamp, ttl });
      localStorage.removeItem(key);
      return null;
    }

    logger.debug('CACHE_HIT', { key, age: Date.now() - cached.timestamp });
    return cached.data;
  } catch (error) {
    logger.warn('CACHE_READ_ERROR', { key, error });
    return null;
  }
}

/**
 * Set cached data in localStorage with timestamp
 */
export function setCachedData<T>(key: string, data: T, version?: number): void {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version,
    };
    localStorage.setItem(key, JSON.stringify(cached));
    logger.debug('CACHE_SET', { key, version });
  } catch (error) {
    logger.warn('CACHE_WRITE_ERROR', { key, error });
  }
}

/**
 * Invalidate (remove) cached data
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key);
    logger.debug('CACHE_INVALIDATED', { key });
  } catch (error) {
    logger.warn('CACHE_INVALIDATE_ERROR', { key, error });
  }
}

/**
 * Invalidate all caches matching a prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    logger.debug('CACHE_PREFIX_INVALIDATED', { prefix, count: keysToRemove.length });
  } catch (error) {
    logger.warn('CACHE_PREFIX_INVALIDATE_ERROR', { prefix, error });
  }
}

/**
 * Cache key generators for consistent key naming
 */
export const CacheKeys = {
  character: (userId: string, slotNumber: number) => 
    `cache_character_${userId}_slot_${slotNumber}`,
  activeCharacter: (userId: string) => 
    `cache_active_character_${userId}`,
  characterSlots: (userId: string) => 
    `cache_character_slots_${userId}`,
  map: (roomId: string) => 
    `cache_map_${roomId}`,
  settings: (userId: string) => 
    `cache_settings_${userId}`,
  editorPrefs: (userId: string) => 
    `cache_editor_prefs_${userId}`,
  assets: (roomId: string) => 
    `cache_assets_${roomId}`,
};

