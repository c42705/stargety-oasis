/**
 * Texture Cache with LRU Eviction
 * Manages texture caching with memory limits and automatic eviction
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import { PerformanceMonitor } from './PerformanceMonitor';

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  /** Cache key */
  key: string;
  
  /** Cached value */
  value: T;
  
  /** Last access timestamp */
  lastAccess: number;
  
  /** Access count */
  accessCount: number;
  
  /** Estimated memory size (bytes) */
  memorySize: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries */
  size: number;
  
  /** Total memory usage (bytes) */
  memoryUsage: number;
  
  /** Cache hits */
  hits: number;
  
  /** Cache misses */
  misses: number;
  
  /** Hit rate (0-1) */
  hitRate: number;
  
  /** Eviction count */
  evictions: number;
}

/**
 * LRU Cache with memory limits
 */
export class TextureCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxEntries: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number = 0;
  
  // Statistics
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  
  constructor(
    maxEntries: number = 50,
    maxMemoryMB: number = 100
  ) {
    this.maxEntries = maxEntries;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024; // Convert MB to bytes
  }
  
  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Update access time and count
      entry.lastAccess = Date.now();
      entry.accessCount++;
      this.hits++;
      
      return entry.value;
    }
    
    this.misses++;
    return null;
  }
  
  /**
   * Set value in cache
   */
  set(key: string, value: T, memorySize: number = 0): void {
    // Check if entry already exists
    const existing = this.cache.get(key);
    if (existing) {
      // Update existing entry
      this.currentMemoryBytes -= existing.memorySize;
      existing.value = value;
      existing.lastAccess = Date.now();
      existing.accessCount++;
      existing.memorySize = memorySize;
      this.currentMemoryBytes += memorySize;
      return;
    }
    
    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      lastAccess: Date.now(),
      accessCount: 1,
      memorySize
    };
    
    // Check if we need to evict
    while (
      (this.cache.size >= this.maxEntries || 
       this.currentMemoryBytes + memorySize > this.maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }
    
    // Add to cache
    this.cache.set(key, entry);
    this.currentMemoryBytes += memorySize;
  }
  
  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.memorySize;
      return this.cache.delete(key);
    }
    return false;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
  }
  
  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get all values
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(e => e.value);
  }
  
  /**
   * Get all entries
   */
  entries(): CacheEntry<T>[] {
    return Array.from(this.cache.values());
  }
  
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryBytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    // Find least recently used entry
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    });
    
    // Evict oldest entry
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentMemoryBytes -= entry.memorySize;
        this.cache.delete(oldestKey);
        this.evictions++;
        
        PerformanceMonitor.measureSync('TextureCache.evict', () => {
          // Eviction is already done, just tracking
        }, { key: oldestKey, memorySize: entry.memorySize });
      }
    }
  }
  
  /**
   * Print cache report
   */
  printReport(): void {
    const stats = this.getStats();
    
    console.group('📦 Texture Cache Report');
    console.log('Size:', stats.size, '/', this.maxEntries);
    console.log('Memory:', this.formatBytes(stats.memoryUsage), '/', this.formatBytes(this.maxMemoryBytes));
    console.log('Hits:', stats.hits);
    console.log('Misses:', stats.misses);
    console.log('Hit Rate:', (stats.hitRate * 100).toFixed(2) + '%');
    console.log('Evictions:', stats.evictions);
    
    if (this.cache.size > 0) {
      console.log('\nTop 10 Most Accessed:');
      const sorted = Array.from(this.cache.values())
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, 10);
      
      console.table(
        sorted.map(e => ({
          Key: e.key,
          'Access Count': e.accessCount,
          'Memory': this.formatBytes(e.memorySize),
          'Last Access': new Date(e.lastAccess).toLocaleTimeString()
        }))
      );
    }
    
    console.groupEnd();
  }
  
  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

