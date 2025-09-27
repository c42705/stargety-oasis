/**
 * Migration Manager - Handles transition from old event-driven architecture to new WorldDimensionsManager
 * 
 * This system ensures backward compatibility during the architectural transition
 * and provides migration utilities for existing data and components.
 */

import { worldDimensionsManager, Dimensions } from './WorldDimensionsManager';
import { SharedMapSystem } from './SharedMapSystem';

export interface MigrationStatus {
  isComplete: boolean;
  migratedComponents: string[];
  pendingComponents: string[];
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

export interface MigrationOptions {
  enableLogging?: boolean;
  validateData?: boolean;
  preserveHistory?: boolean;
  skipBackup?: boolean;
}

export class MigrationManager {
  private static instance: MigrationManager;
  private migrationStatus: MigrationStatus;
  private sharedMapSystem: SharedMapSystem;

  private constructor() {
    this.sharedMapSystem = SharedMapSystem.getInstance();
    this.migrationStatus = {
      isComplete: false,
      migratedComponents: [],
      pendingComponents: [
        'SharedMapSystem',
        'WorldModule',
        'MapEditorModule',
        'SettingsTab',
        'LocalStorage'
      ],
      errors: [],
      startTime: new Date()
    };
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Perform complete migration from old to new architecture
   */
  public async performMigration(options: MigrationOptions = {}): Promise<MigrationStatus> {
    const { enableLogging = true, validateData = true, preserveHistory = true } = options;

    if (enableLogging) {
    }

    try {
      // Step 1: Backup existing data
      if (!options.skipBackup) {
        await this.backupExistingData();
        this.markComponentMigrated('DataBackup');
      }

      // Step 2: Initialize WorldDimensionsManager with existing data
      await this.initializeWorldDimensionsManager();
      this.markComponentMigrated('WorldDimensionsManager');

      // Step 3: Migrate SharedMapSystem integration
      await this.migrateSharedMapSystem();
      this.markComponentMigrated('SharedMapSystem');

      // Step 4: Validate data consistency
      if (validateData) {
        await this.validateDataConsistency();
        this.markComponentMigrated('DataValidation');
      }

      // Step 5: Clean up legacy event listeners (optional)
      await this.cleanupLegacyEventListeners();
      this.markComponentMigrated('LegacyCleanup');

      this.migrationStatus.isComplete = true;
      this.migrationStatus.endTime = new Date();

      if (enableLogging) {
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
      this.migrationStatus.errors.push(errorMessage);
      
      if (enableLogging) {
        console.error('❌ MIGRATION: Failed to complete migration', error);
      }
    }

    return this.migrationStatus;
  }

  /**
   * Backup existing localStorage data before migration
   */
  private async backupExistingData(): Promise<void> {
    try {
      const existingData = localStorage.getItem('mapData');
      if (existingData) {
        const backupKey = `mapData_backup_${Date.now()}`;
        localStorage.setItem(backupKey, existingData);
      }
    } catch (error) {
      throw new Error(`Failed to backup existing data: ${error}`);
    }
  }

  /**
   * Initialize WorldDimensionsManager with existing SharedMapSystem data
   */
  private async initializeWorldDimensionsManager(): Promise<void> {
    try {
      const mapData = this.sharedMapSystem.getMapData();
      if (mapData && mapData.worldDimensions) {
        // Initialize WorldDimensionsManager with existing dimensions
        const initResult = worldDimensionsManager.updateDimensions(mapData.worldDimensions, {
          source: 'migration',
          syncBackground: true,
          skipPersistence: false
        });

        if (!initResult.isValid) {
          throw new Error('Failed to initialize WorldDimensionsManager: ' + initResult.errors.join(', '));
        }

      }
    } catch (error) {
      throw new Error(`Failed to initialize WorldDimensionsManager: ${error}`);
    }
  }

  /**
   * Migrate SharedMapSystem to use WorldDimensionsManager
   */
  private async migrateSharedMapSystem(): Promise<void> {
    try {
      // SharedMapSystem integration is already updated in the previous task
      // This step validates that the integration is working correctly
      const effectiveDimensions = this.sharedMapSystem.getEffectiveDimensions();
      const managerDimensions = worldDimensionsManager.getEffectiveDimensions();

      // Verify dimensions are synchronized
      if (effectiveDimensions.width !== managerDimensions.width || 
          effectiveDimensions.height !== managerDimensions.height) {
        console.warn('⚠️ MIGRATION: Dimension mismatch detected, synchronizing...', {
          sharedMapSystem: effectiveDimensions,
          worldDimensionsManager: managerDimensions
        });

        // Force synchronization
        await this.sharedMapSystem.updateWorldDimensions(managerDimensions, 'migration');
      }

    } catch (error) {
      throw new Error(`Failed to migrate SharedMapSystem: ${error}`);
    }
  }

  /**
   * Validate data consistency across all systems
   */
  private async validateDataConsistency(): Promise<void> {
    try {
      const sharedMapDimensions = this.sharedMapSystem.getEffectiveDimensions();
      const managerDimensions = worldDimensionsManager.getEffectiveDimensions();
      const managerState = worldDimensionsManager.getState();

      // Check dimension consistency
      if (sharedMapDimensions.width !== managerDimensions.width || 
          sharedMapDimensions.height !== managerDimensions.height) {
        throw new Error('Dimension consistency validation failed');
      }

      // Check state validity
      if (!managerState.worldDimensions || !managerState.effectiveDimensions) {
        throw new Error('WorldDimensionsManager state validation failed');
      }

    } catch (error) {
      throw new Error(`Data consistency validation failed: ${error}`);
    }
  }

  /**
   * Clean up legacy event listeners (optional step)
   */
  private async cleanupLegacyEventListeners(): Promise<void> {
    try {
      // This is a placeholder for future cleanup of legacy event listeners
      // Currently, we maintain backward compatibility by keeping some events
    } catch (error) {
      throw new Error(`Failed to cleanup legacy event listeners: ${error}`);
    }
  }

  /**
   * Mark a component as successfully migrated
   */
  private markComponentMigrated(componentName: string): void {
    const index = this.migrationStatus.pendingComponents.indexOf(componentName);
    if (index > -1) {
      this.migrationStatus.pendingComponents.splice(index, 1);
      this.migrationStatus.migratedComponents.push(componentName);
    }
  }

  /**
   * Get current migration status
   */
  public getMigrationStatus(): MigrationStatus {
    return { ...this.migrationStatus };
  }

  /**
   * Check if migration is needed
   */
  public isMigrationNeeded(): boolean {
    try {
      // Check if WorldDimensionsManager is properly initialized
      const state = worldDimensionsManager.getState();
      return !state.worldDimensions || this.migrationStatus.pendingComponents.length > 0;
    } catch {
      return true;
    }
  }

  /**
   * Rollback migration (emergency use only)
   */
  public async rollbackMigration(): Promise<void> {
    try {
      // Find the most recent backup
      const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('mapData_backup_'));
      if (backupKeys.length === 0) {
        throw new Error('No backup data found for rollback');
      }

      const latestBackup = backupKeys.sort().pop();
      if (latestBackup) {
        const backupData = localStorage.getItem(latestBackup);
        if (backupData) {
          localStorage.setItem('mapData', backupData);
        }
      }
    } catch (error) {
      console.error('❌ MIGRATION: Rollback failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const migrationManager = MigrationManager.getInstance();
