/**
 * Map History Manager
 *
 * Manages change history for undo/redo functionality.
 * Tracks all map modifications with before/after states.
 */

import { MapChange } from './types';

/**
 * MapHistoryManager - Handles undo/redo history for map changes
 */
export class MapHistoryManager {
  private changeHistory: MapChange[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Record a change for undo/redo functionality
   */
  recordChange(change: MapChange): void {
    this.changeHistory.push(change);

    // Limit history size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  /**
   * Get the full change history
   */
  getChangeHistory(): MapChange[] {
    return [...this.changeHistory];
  }

  /**
   * Clear all change history
   */
  clearHistory(): void {
    this.changeHistory = [];
  }

  /**
   * Get the last N changes
   */
  getRecentChanges(count: number): MapChange[] {
    return this.changeHistory.slice(-count);
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.changeHistory.length;
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.changeHistory.length === 0;
  }

  /**
   * Get the most recent change (for potential undo)
   */
  getLastChange(): MapChange | null {
    if (this.changeHistory.length === 0) {
      return null;
    }
    return this.changeHistory[this.changeHistory.length - 1];
  }

  /**
   * Remove and return the most recent change (for undo operation)
   */
  popLastChange(): MapChange | null {
    return this.changeHistory.pop() || null;
  }

  /**
   * Create a change record helper
   */
  static createChange(
    type: MapChange['type'],
    elementType: MapChange['elementType'],
    before: unknown,
    after: unknown,
    userId = 'current_user'
  ): MapChange {
    return {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      elementType,
      before,
      after,
      timestamp: new Date(),
      userId,
    };
  }
}

