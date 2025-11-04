/**
 * Feature Flags Configuration
 * 
 * Controls the gradual rollout of the Konva map editor.
 */

/**
 * Feature flag for Konva editor
 */
export interface FeatureFlags {
  /** Enable Konva editor (vs Fabric.js) */
  USE_KONVA_EDITOR: boolean;
  /** Rollout percentage (0-100) */
  KONVA_ROLLOUT_PERCENTAGE: number;
  /** Enable side-by-side comparison view */
  ENABLE_COMPARISON_VIEW: boolean;
  /** Enable performance monitoring */
  ENABLE_PERFORMANCE_MONITORING: boolean;
  /** Enable debug overlay */
  ENABLE_DEBUG_OVERLAY: boolean;
}

/**
 * Default feature flags
 *
 * NOTE: Konva editor is now the production default (USE_KONVA_EDITOR: true)
 * The toggle switch in MapEditorPage allows switching back to Fabric.js if needed.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  USE_KONVA_EDITOR: true,  // Changed to true - Konva is now the default editor
  KONVA_ROLLOUT_PERCENTAGE: 100,  // 100% rollout
  ENABLE_COMPARISON_VIEW: false,
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_DEBUG_OVERLAY: false,
};

/**
 * Get feature flags from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
  // Check environment variables
  const useKonva = process.env.REACT_APP_USE_KONVA_EDITOR === 'true';
  const rolloutPercentage = parseInt(process.env.REACT_APP_KONVA_ROLLOUT_PERCENTAGE || '0', 10);
  const enableComparison = process.env.REACT_APP_ENABLE_COMPARISON_VIEW === 'true';
  const enableMonitoring = process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING !== 'false';
  const enableDebug = process.env.REACT_APP_ENABLE_DEBUG_OVERLAY === 'true';

  // Check localStorage override (for testing)
  const localOverride = localStorage.getItem('featureFlags');
  if (localOverride) {
    try {
      return JSON.parse(localOverride);
    } catch (e) {
      console.warn('Invalid feature flags in localStorage');
    }
  }

  return {
    USE_KONVA_EDITOR: useKonva,
    KONVA_ROLLOUT_PERCENTAGE: Math.min(100, Math.max(0, rolloutPercentage)),
    ENABLE_COMPARISON_VIEW: enableComparison,
    ENABLE_PERFORMANCE_MONITORING: enableMonitoring,
    ENABLE_DEBUG_OVERLAY: enableDebug,
  };
}

/**
 * Check if user should get Konva editor based on rollout percentage
 */
export function shouldUseKonvaEditor(userId?: string): boolean {
  const flags = getFeatureFlags();

  // If explicitly enabled, use Konva
  if (flags.USE_KONVA_EDITOR) {
    return true;
  }

  // If rollout percentage is 0, use Fabric.js
  if (flags.KONVA_ROLLOUT_PERCENTAGE === 0) {
    return false;
  }

  // If rollout percentage is 100, use Konva
  if (flags.KONVA_ROLLOUT_PERCENTAGE === 100) {
    return true;
  }

  // Use deterministic hash of userId to assign to rollout group
  if (userId) {
    const hash = hashString(userId);
    const bucket = hash % 100;
    return bucket < flags.KONVA_ROLLOUT_PERCENTAGE;
  }

  // Fallback to random assignment (for anonymous users)
  return Math.random() * 100 < flags.KONVA_ROLLOUT_PERCENTAGE;
}

/**
 * Simple string hash function for deterministic rollout
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Set feature flags override (for testing)
 */
export function setFeatureFlagsOverride(flags: Partial<FeatureFlags>): void {
  const current = getFeatureFlags();
  const updated = { ...current, ...flags };
  localStorage.setItem('featureFlags', JSON.stringify(updated));
  console.log('Feature flags updated:', updated);
}

/**
 * Clear feature flags override
 */
export function clearFeatureFlagsOverride(): void {
  localStorage.removeItem('featureFlags');
  console.log('Feature flags override cleared');
}

/**
 * Get current rollout stage based on percentage
 */
export function getRolloutStage(): string {
  const flags = getFeatureFlags();
  const percentage = flags.KONVA_ROLLOUT_PERCENTAGE;

  if (percentage === 0) return 'Not Started';
  if (percentage <= 10) return 'Stage 1: 10% Rollout';
  if (percentage <= 25) return 'Stage 2: 25% Rollout';
  if (percentage <= 50) return 'Stage 3: 50% Rollout';
  if (percentage < 100) return 'Stage 4: Partial Rollout';
  return 'Stage 5: 100% Rollout';
}

