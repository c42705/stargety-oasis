/**
 * Migration Hook - React hook for managing architectural migration
 * 
 * This hook provides a React-friendly interface for the migration process
 * and ensures the migration runs at the appropriate time in the application lifecycle.
 */

import { useState, useEffect, useCallback } from 'react';
import { migrationManager, MigrationStatus, MigrationOptions } from './MigrationManager';

export interface UseMigrationOptions extends MigrationOptions {
  autoMigrate?: boolean;
  onMigrationComplete?: (status: MigrationStatus) => void;
  onMigrationError?: (error: string) => void;
}

export interface UseMigrationReturn {
  migrationStatus: MigrationStatus | null;
  isMigrating: boolean;
  isMigrationNeeded: boolean;
  startMigration: (options?: MigrationOptions) => Promise<void>;
  rollbackMigration: () => Promise<void>;
  error: string | null;
}

export function useMigration(options: UseMigrationOptions = {}): UseMigrationReturn {
  const {
    autoMigrate = true,
    onMigrationComplete,
    onMigrationError,
    ...migrationOptions
  } = options;

  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMigrationNeeded, setIsMigrationNeeded] = useState(false);

  // Check if migration is needed
  useEffect(() => {
    const checkMigrationNeeded = () => {
      try {
        const needed = migrationManager.isMigrationNeeded();
        setIsMigrationNeeded(needed);
        
        if (needed && autoMigrate) {
          console.log('🔄 MIGRATION: Auto-migration triggered');
          startMigration(migrationOptions);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check migration status';
        setError(errorMessage);
        onMigrationError?.(errorMessage);
      }
    };

    checkMigrationNeeded();
  }, [autoMigrate, migrationOptions, onMigrationError]);

  // Start migration process
  const startMigration = useCallback(async (customOptions?: MigrationOptions) => {
    if (isMigrating) {
      console.warn('⚠️ MIGRATION: Migration already in progress');
      return;
    }

    setIsMigrating(true);
    setError(null);

    try {
      console.log('🚀 MIGRATION: Starting migration process');
      
      const finalOptions = { ...migrationOptions, ...customOptions };
      const status = await migrationManager.performMigration(finalOptions);
      
      setMigrationStatus(status);
      setIsMigrationNeeded(false);

      if (status.isComplete) {
        console.log('✅ MIGRATION: Migration completed successfully');
        onMigrationComplete?.(status);
      } else {
        const errorMessage = 'Migration completed with errors: ' + status.errors.join(', ');
        setError(errorMessage);
        onMigrationError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      setError(errorMessage);
      onMigrationError?.(errorMessage);
      console.error('❌ MIGRATION: Migration failed', err);
    } finally {
      setIsMigrating(false);
    }
  }, [isMigrating, migrationOptions, onMigrationComplete, onMigrationError]);

  // Rollback migration
  const rollbackMigration = useCallback(async () => {
    if (isMigrating) {
      console.warn('⚠️ MIGRATION: Cannot rollback while migration is in progress');
      return;
    }

    setIsMigrating(true);
    setError(null);

    try {
      console.log('🔄 MIGRATION: Starting rollback process');
      await migrationManager.rollbackMigration();
      
      // Reset migration status
      setMigrationStatus(null);
      setIsMigrationNeeded(true);
      
      console.log('✅ MIGRATION: Rollback completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rollback failed';
      setError(errorMessage);
      onMigrationError?.(errorMessage);
      console.error('❌ MIGRATION: Rollback failed', err);
    } finally {
      setIsMigrating(false);
    }
  }, [isMigrating, onMigrationError]);

  return {
    migrationStatus,
    isMigrating,
    isMigrationNeeded,
    startMigration,
    rollbackMigration,
    error
  };
}

/**
 * Migration Status Component Hook
 * Provides a simple way to display migration status in the UI
 */
export function useMigrationStatus() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      try {
        const currentStatus = migrationManager.getMigrationStatus();
        setStatus(currentStatus);
      } catch (err) {
        console.error('Failed to get migration status', err);
      }
    };

    // Update status immediately
    updateStatus();

    // Set up periodic status updates during migration
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Migration Guard Hook
 * Prevents component rendering until migration is complete
 */
export function useMigrationGuard(): { isMigrationComplete: boolean; migrationError: string | null } {
  const { migrationStatus, isMigrating, error } = useMigration({ autoMigrate: true });

  const isMigrationComplete = migrationStatus?.isComplete === true && !isMigrating;

  return {
    isMigrationComplete,
    migrationError: error
  };
}
