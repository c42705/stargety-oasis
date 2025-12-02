/**
 * Map Event Emitter
 *
 * Simple event emitter for map system events.
 */

import { MapEventType, MapEventCallback } from './types';
import { logger } from '../logger';

/**
 * MapEventEmitter - Handles event subscription and emission
 */
export class MapEventEmitter {
  private eventListeners: Map<MapEventType, MapEventCallback[]> = new Map();

  /**
   * Subscribe to an event
   */
  on(eventType: MapEventType, callback: MapEventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: MapEventType, callback: MapEventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit(eventType: MapEventType, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`[MapEventEmitter] Error in event listener for ${eventType}`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners for an event type
   */
  clearListeners(eventType?: MapEventType): void {
    if (eventType) {
      this.eventListeners.delete(eventType);
    } else {
      this.eventListeners.clear();
    }
  }
}

