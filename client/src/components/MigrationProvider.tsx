/**
 * Migration Provider - React component for managing architectural migration
 * 
 * This component should be placed high in the component tree to ensure
 * migration completes before other components that depend on WorldDimensionsManager.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Spin, Alert, Button, Progress } from 'antd';
import { useMigration, UseMigrationReturn } from '../shared/useMigration';

interface MigrationContextType extends UseMigrationReturn {
  // Additional context methods can be added here
}

const MigrationContext = createContext<MigrationContextType | null>(null);

export interface MigrationProviderProps {
  children: ReactNode;
  showMigrationUI?: boolean;
  enableAutoMigration?: boolean;
  onMigrationComplete?: () => void;
  onMigrationError?: (error: string) => void;
}

export function MigrationProvider({
  children,
  showMigrationUI = true,
  enableAutoMigration = true,
  onMigrationComplete,
  onMigrationError
}: MigrationProviderProps) {
  const migration = useMigration({
    autoMigrate: enableAutoMigration,
    enableLogging: true,
    validateData: true,
    preserveHistory: true,
    onMigrationComplete,
    onMigrationError
  });

  const {
    migrationStatus,
    isMigrating,
    isMigrationNeeded,
    error,
    startMigration,
    rollbackMigration
  } = migration;

  // Show migration UI if enabled and migration is needed or in progress
  if (showMigrationUI && (isMigrating || isMigrationNeeded || error)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          {isMigrating && (
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
              <h2 style={{ marginTop: '20px' }}>Upgrading Architecture...</h2>
              <p>Migrating to improved dimension management system</p>
              
              {migrationStatus && (
                <div style={{ marginTop: '20px' }}>
                  <Progress
                    percent={Math.round(
                      (migrationStatus.migratedComponents.length / 
                       (migrationStatus.migratedComponents.length + migrationStatus.pendingComponents.length)) * 100
                    )}
                    status="active"
                  />
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                    Completed: {migrationStatus.migratedComponents.join(', ')}
                  </div>
                  {migrationStatus.pendingComponents.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Pending: {migrationStatus.pendingComponents.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isMigrationNeeded && !isMigrating && (
            <div style={{ textAlign: 'center' }}>
              <Alert
                message="Architecture Update Required"
                description="The application needs to upgrade to a new dimension management system for better performance and stability."
                type="info"
                showIcon
                style={{ marginBottom: '20px' }}
              />
              <Button 
                type="primary" 
                size="large"
                onClick={() => startMigration()}
              >
                Start Upgrade
              </Button>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center' }}>
              <Alert
                message="Migration Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: '20px' }}
                action={
                  <div>
                    <Button 
                      size="small" 
                      onClick={() => startMigration()}
                      style={{ marginRight: '8px' }}
                    >
                      Retry
                    </Button>
                    <Button 
                      size="small" 
                      onClick={rollbackMigration}
                      danger
                    >
                      Rollback
                    </Button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Migration complete or not needed, render children
  return (
    <MigrationContext.Provider value={migration}>
      {children}
    </MigrationContext.Provider>
  );
}

/**
 * Hook to access migration context
 */
export function useMigrationContext(): MigrationContextType {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigrationContext must be used within a MigrationProvider');
  }
  return context;
}

/**
 * Higher-order component that ensures migration is complete before rendering
 */
export function withMigrationGuard<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function MigrationGuardedComponent(props: P) {
    const { migrationStatus, isMigrating, error } = useMigrationContext();

    if (isMigrating) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Migration Error"
          description={error}
          type="error"
          showIcon
        />
      );
    }

    if (!migrationStatus?.isComplete) {
      return (
        <Alert
          message="Migration Required"
          description="Please complete the migration process before using this component."
          type="warning"
          showIcon
        />
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Migration Status Display Component
 */
export function MigrationStatusDisplay() {
  const { migrationStatus, isMigrating, error } = useMigrationContext();

  if (!migrationStatus && !isMigrating && !error) {
    return null;
  }

  return (
    <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>
      {isMigrating && <span>🔄 Migration in progress...</span>}
      {error && <span style={{ color: '#ff4d4f' }}>❌ Migration error: {error}</span>}
      {migrationStatus?.isComplete && <span style={{ color: '#52c41a' }}>✅ Migration complete</span>}
    </div>
  );
}
