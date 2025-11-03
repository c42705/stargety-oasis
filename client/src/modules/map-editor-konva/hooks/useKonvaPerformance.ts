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
  avgFps: number;
  frameTime: number;
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
    avgFps: 60,
    frameTime: 16.67,
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
      shapeCount: shapes?.length || 0,
    }));
  }, [enabled, shapes?.length]);

  // ==========================================================================
  // PERFORMANCE WARNINGS
  // ==========================================================================

  useEffect(() => {
    if (!enabled) return;

    const newWarnings: PerformanceWarning[] = [];
    const shapeCount = shapes?.length || 0;

    // Shape count warnings
    if (shapeCount >= PERFORMANCE.SHAPE_LIMIT) {
      newWarnings.push({
        type: 'shape_count',
        message: `Shape limit reached (${shapeCount}/${PERFORMANCE.SHAPE_LIMIT}). Performance may be degraded.`,
        severity: 'high',
      });
    } else if (shapeCount >= PERFORMANCE.SHAPE_WARNING) {
      newWarnings.push({
        type: 'shape_count',
        message: `High shape count (${shapeCount}). Consider optimizing.`,
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
  }, [enabled, shapes?.length, metrics.fps]);

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Check if performance is good
   */
  const isPerformanceGood = useCallback((): boolean => {
    return (
      metrics.fps >= PERFORMANCE.FPS_TARGET &&
      (shapes?.length || 0) < PERFORMANCE.SHAPE_WARNING
    );
  }, [metrics.fps, shapes?.length]);

  /**
   * Reset metrics
   */
  const reset = useCallback(() => {
    setMetrics({
      fps: 60,
      avgFps: 60,
      frameTime: 0,
      shapeCount: shapes?.length || 0,
      renderTime: 0,
    });
    setWarnings([]);
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
  }, [shapes?.length]);

  /**
   * Start monitoring (alias for startRenderTiming)
   */
  const startMonitoring = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  /**
   * Stop monitoring (alias for endRenderTiming)
   */
  const stopMonitoring = useCallback(() => {
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
    // Direct metrics (as per type definition)
    fps: metrics.fps,
    avgFps: metrics.avgFps,
    frameTime: metrics.frameTime,
    warnings,
    metrics,

    // State
    isPerformanceGood: isPerformanceGood(),

    // Actions
    reset,
    startMonitoring,
    stopMonitoring,
  };
}

