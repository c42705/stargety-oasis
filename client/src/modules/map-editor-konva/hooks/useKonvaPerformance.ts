/**
 * Konva Map Editor - Performance Monitoring Hook
 * 
 * Monitors and tracks performance metrics for the editor.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Shape, UseKonvaPerformanceParams, UseKonvaPerformanceReturn } from '../types';
import { PERFORMANCE } from '../constants/konvaConstants';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fps: number;
  shapeCount: number;
  renderTime: number;
  memoryUsage?: number;
}

/**
 * Performance warning
 */
export interface PerformanceWarning {
  type: 'shape_count' | 'fps' | 'memory';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Hook for performance monitoring
 * 
 * Tracks FPS, shape count, render time, and provides performance warnings.
 * 
 * @example
 * ```typescript
 * const {
 *   metrics,
 *   warnings,
 *   isPerformanceGood,
 *   resetMetrics,
 * } = useKonvaPerformance({
 *   shapes,
 *   enabled: true,
 * });
 * ```
 */
export function useKonvaPerformance(
  params: UseKonvaPerformanceParams
): UseKonvaPerformanceReturn {
  const {
    shapes,
    enabled = true,
  } = params;

  // State
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    shapeCount: 0,
    renderTime: 0,
  });
  const [warnings, setWarnings] = useState<PerformanceWarning[]>([]);

  // Refs for FPS calculation
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const renderStartRef = useRef(0);

  // ==========================================================================
  // FPS TRACKING
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const updateFPS = () => {
      frameCountRef.current++;

      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      // Update FPS every second
      if (elapsed >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsed);

        setMetrics((prev) => ({
          ...prev,
          fps,
        }));

        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(updateFPS);
    };

    animationFrameId = requestAnimationFrame(updateFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  // ==========================================================================
  // SHAPE COUNT TRACKING
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    setMetrics((prev) => ({
      ...prev,
      shapeCount: shapes.length,
    }));
  }, [enabled, shapes.length]);

  // ==========================================================================
  // PERFORMANCE WARNINGS
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    const newWarnings: PerformanceWarning[] = [];

    // Shape count warnings
    if (shapes.length >= PERFORMANCE.SHAPE_LIMIT) {
      newWarnings.push({
        type: 'shape_count',
        message: `Shape limit reached (${shapes.length}/${PERFORMANCE.SHAPE_LIMIT}). Performance may be degraded.`,
        severity: 'high',
      });
    } else if (shapes.length >= PERFORMANCE.SHAPE_WARNING) {
      newWarnings.push({
        type: 'shape_count',
        message: `High shape count (${shapes.length}). Consider optimizing.`,
        severity: 'medium',
      });
    }

    // FPS warnings
    if (metrics.fps < PERFORMANCE.FPS_WARNING) {
      newWarnings.push({
        type: 'fps',
        message: `Low FPS (${metrics.fps}). Performance is degraded.`,
        severity: 'high',
      });
    } else if (metrics.fps < PERFORMANCE.FPS_TARGET) {
      newWarnings.push({
        type: 'fps',
        message: `FPS below target (${metrics.fps}/${PERFORMANCE.FPS_TARGET}).`,
        severity: 'medium',
      });
    }

    setWarnings(newWarnings);
  }, [enabled, shapes.length, metrics.fps]);

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Check if performance is good
   */
  const isPerformanceGood = useCallback((): boolean => {
    return (
      metrics.fps >= PERFORMANCE.FPS_TARGET &&
      shapes.length < PERFORMANCE.SHAPE_WARNING
    );
  }, [metrics.fps, shapes.length]);

  /**
   * Reset metrics
   */
  const resetMetrics = useCallback(() => {
    setMetrics({
      fps: 60,
      shapeCount: shapes.length,
      renderTime: 0,
    });
    setWarnings([]);
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
  }, [shapes.length]);

  /**
   * Start render timing
   */
  const startRenderTiming = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  /**
   * End render timing
   */
  const endRenderTiming = useCallback(() => {
    const renderTime = performance.now() - renderStartRef.current;
    setMetrics((prev) => ({
      ...prev,
      renderTime,
    }));
  }, []);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Metrics
    metrics,
    warnings,

    // State
    isPerformanceGood: isPerformanceGood(),
    hasWarnings: warnings.length > 0,

    // Actions
    resetMetrics,
    startRenderTiming,
    endRenderTiming,
  };
}

