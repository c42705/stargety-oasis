/**
 * Test Runner for World Dimensions Architecture
 * 
 * Provides utilities for running and validating the new architecture tests
 */

import { worldDimensionsManager } from '../WorldDimensionsManager';
import { SharedMapSystem } from '../SharedMapSystem';
import { migrationManager } from '../MigrationManager';

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
}

export class ArchitectureTestRunner {
  private results: TestSuite[] = [];

  /**
   * Run all architecture tests
   */
  public async runAllTests(): Promise<TestSuite[]> {

    this.results = [];

    // Run test suites
    await this.runBasicFunctionalityTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runMigrationTests();

    this.printSummary();
    return this.results;
  }

  /**
   * Basic functionality tests
   */
  private async runBasicFunctionalityTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Basic Functionality',
      results: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0
    };

    // Test 1: WorldDimensionsManager initialization
    await this.runTest(suite, 'WorldDimensionsManager Initialization', async () => {
      const state = worldDimensionsManager.getState();
      if (!state.worldDimensions) {
        throw new Error('WorldDimensionsManager not properly initialized');
      }
    });

    // Test 2: Dimension validation
    await this.runTest(suite, 'Dimension Validation', async () => {
      const result = worldDimensionsManager.validateDimensions({ width: 200, height: 150 });
      if (result.isValid) {
        throw new Error('Should reject dimensions below minimum');
      }
    });

    // Test 3: Dimension updates
    await this.runTest(suite, 'Dimension Updates', async () => {
      const dimensions = { width: 1000, height: 800 };
      const result = worldDimensionsManager.updateDimensions(dimensions, { source: 'editor' });
      if (!result.isValid || !result.dimensions) {
        throw new Error('Failed to update valid dimensions');
      }
    });

    // Test 4: Subscription system
    await this.runTest(suite, 'Subscription System', async () => {
      let callbackCalled = false;
      const unsubscribe = worldDimensionsManager.subscribe(() => {
        callbackCalled = true;
      });

      worldDimensionsManager.updateDimensions({ width: 1100, height: 850 }, { source: 'editor' });
      
      if (!callbackCalled) {
        throw new Error('Subscription callback not called');
      }

      unsubscribe();
    });

    this.results.push(suite);
  }

  /**
   * Integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Integration Tests',
      results: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0
    };

    // Test 1: SharedMapSystem integration
    await this.runTest(suite, 'SharedMapSystem Integration', async () => {
      const sharedMapSystem = SharedMapSystem.getInstance();
      await sharedMapSystem.initialize();

      const dimensions = { width: 1200, height: 900 };
      await sharedMapSystem.updateWorldDimensions(dimensions, 'editor');

      const managerDimensions = worldDimensionsManager.getEffectiveDimensions();
      if (managerDimensions.width !== dimensions.width || managerDimensions.height !== dimensions.height) {
        throw new Error('SharedMapSystem and WorldDimensionsManager not synchronized');
      }
    });

    // Test 2: Effective dimensions priority
    await this.runTest(suite, 'Effective Dimensions Priority', async () => {
      const worldDimensions = { width: 1000, height: 800 };
      const backgroundDimensions = { width: 1200, height: 900 };

      worldDimensionsManager.updateDimensions(worldDimensions, { source: 'editor' });
      worldDimensionsManager.updateBackgroundDimensions(backgroundDimensions, { source: 'background' });

      const effectiveDimensions = worldDimensionsManager.getEffectiveDimensions();
      if (effectiveDimensions.width !== backgroundDimensions.width || 
          effectiveDimensions.height !== backgroundDimensions.height) {
        throw new Error('Background dimensions should take priority');
      }
    });

    // Test 3: Persistence
    await this.runTest(suite, 'Persistence', async () => {
      const dimensions = { width: 1300, height: 1000 };
      worldDimensionsManager.updateDimensions(dimensions, { source: 'editor' });

      const stored = localStorage.getItem('worldDimensionsState');
      if (!stored) {
        throw new Error('State not persisted to localStorage');
      }

      const parsedState = JSON.parse(stored);
      if (parsedState.worldDimensions.width !== dimensions.width ||
          parsedState.worldDimensions.height !== dimensions.height) {
        throw new Error('Persisted state does not match current state');
      }
    });

    this.results.push(suite);
  }

  /**
   * Performance tests
   */
  private async runPerformanceTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Performance Tests',
      results: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0
    };

    // Test 1: Rapid updates
    await this.runTest(suite, 'Rapid Updates Performance', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        worldDimensionsManager.updateDimensions(
          { width: 1000 + i, height: 800 + i },
          { source: 'system' }
        );
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 100) {
        throw new Error(`Performance test failed: ${duration}ms > 100ms`);
      }
    });

    // Test 2: Multiple subscribers
    await this.runTest(suite, 'Multiple Subscribers Performance', async () => {
      const callbacks = Array.from({ length: 50 }, () => jest.fn());
      const unsubscribes = callbacks.map(callback => 
        worldDimensionsManager.subscribe(callback)
      );

      const startTime = performance.now();
      worldDimensionsManager.updateDimensions({ width: 1000, height: 800 }, { source: 'editor' });
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      if (duration > 50) {
        throw new Error(`Subscriber notification too slow: ${duration}ms > 50ms`);
      }

      // Clean up
      unsubscribes.forEach(unsubscribe => unsubscribe());
    });

    this.results.push(suite);
  }

  /**
   * Migration tests
   */
  private async runMigrationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: 'Migration Tests',
      results: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0
    };

    // Test 1: Migration execution
    await this.runTest(suite, 'Migration Execution', async () => {
      const status = await migrationManager.performMigration({
        enableLogging: false,
        validateData: true
      });

      if (!status.isComplete) {
        throw new Error('Migration did not complete successfully: ' + status.errors.join(', '));
      }
    });

    // Test 2: Migration status tracking
    await this.runTest(suite, 'Migration Status Tracking', async () => {
      const status = migrationManager.getMigrationStatus();
      
      if (!status.migratedComponents.includes('WorldDimensionsManager')) {
        throw new Error('Migration status not properly tracked');
      }
    });

    this.results.push(suite);
  }

  /**
   * Run a single test
   */
  private async runTest(suite: TestSuite, testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    
    try {
      await testFn();
      const duration = performance.now() - startTime;
      
      suite.results.push({
        testName,
        passed: true,
        duration
      });
      suite.totalPassed++;
      suite.totalDuration += duration;
      
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      suite.results.push({
        testName,
        passed: false,
        error: errorMessage,
        duration
      });
      suite.totalFailed++;
      suite.totalDuration += duration;
      
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    this.results.forEach(suite => {
      
      totalPassed += suite.totalPassed;
      totalFailed += suite.totalFailed;
      totalDuration += suite.totalDuration;
    });

  }
}

// Export singleton instance
export const architectureTestRunner = new ArchitectureTestRunner();
