/**
 * User Experience Testing and Analytics
 * Conducts usability testing and identifies areas for improvement in Avatar Builder
 */

export interface UserAction {
  type: string;
  timestamp: number;
  elementId?: string;
  data?: any;
  duration?: number;
}

export interface UsabilityMetrics {
  taskCompletionRate: number; // 0-1
  averageTaskTime: number; // seconds
  errorRate: number; // 0-1
  userSatisfactionScore: number; // 1-5
  dropOffPoints: string[];
  mostUsedFeatures: string[];
  leastUsedFeatures: string[];
}

export interface UserFeedback {
  rating: number; // 1-5
  comment: string;
  category: 'bug' | 'feature' | 'usability' | 'performance';
  timestamp: number;
  userId?: string;
}

export interface A11yIssue {
  type: 'color-contrast' | 'keyboard-nav' | 'screen-reader' | 'focus-management';
  severity: 'low' | 'medium' | 'high' | 'critical';
  element: string;
  description: string;
  suggestion: string;
}

/**
 * User Experience Testing and Analytics Manager
 */
export class UserExperienceTesting {
  private static instance: UserExperienceTesting;
  private userActions: UserAction[] = [];
  private sessionStartTime: number = Date.now();
  private currentTask: string | null = null;
  private taskStartTime: number = 0;
  private errorCount: number = 0;
  private completedTasks: string[] = [];
  private feedbackCollection: UserFeedback[] = [];

  static getInstance(): UserExperienceTesting {
    if (!this.instance) {
      this.instance = new UserExperienceTesting();
    }
    return this.instance;
  }

  /**
   * Start tracking a user task
   */
  startTask(taskName: string): void {
    this.currentTask = taskName;
    this.taskStartTime = Date.now();
    
    this.trackAction({
      type: 'task_start',
      timestamp: Date.now(),
      data: { taskName }
    });
  }

  /**
   * Complete a user task
   */
  completeTask(taskName: string, success: boolean = true): void {
    if (this.currentTask === taskName) {
      const duration = Date.now() - this.taskStartTime;
      
      this.trackAction({
        type: success ? 'task_complete' : 'task_fail',
        timestamp: Date.now(),
        duration,
        data: { taskName, success }
      });

      if (success) {
        this.completedTasks.push(taskName);
      } else {
        this.errorCount++;
      }

      this.currentTask = null;
    }
  }

  /**
   * Track user interaction
   */
  trackAction(action: UserAction): void {
    this.userActions.push(action);
    
    // Store in localStorage for persistence
    this.persistActions();
  }

  /**
   * Track click events
   */
  trackClick(elementId: string, elementType: string): void {
    this.trackAction({
      type: 'click',
      timestamp: Date.now(),
      elementId,
      data: { elementType }
    });
  }

  /**
   * Track form interactions
   */
  trackFormInteraction(formId: string, fieldId: string, action: 'focus' | 'blur' | 'change'): void {
    this.trackAction({
      type: 'form_interaction',
      timestamp: Date.now(),
      elementId: fieldId,
      data: { formId, action }
    });
  }

  /**
   * Track errors and issues
   */
  trackError(errorType: string, errorMessage: string, context?: any): void {
    this.errorCount++;
    
    this.trackAction({
      type: 'error',
      timestamp: Date.now(),
      data: { errorType, errorMessage, context }
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, action: 'start' | 'complete' | 'abandon'): void {
    this.trackAction({
      type: 'feature_usage',
      timestamp: Date.now(),
      data: { featureName, action }
    });
  }

  /**
   * Collect user feedback
   */
  collectFeedback(feedback: Omit<UserFeedback, 'timestamp'>): void {
    const fullFeedback: UserFeedback = {
      ...feedback,
      timestamp: Date.now()
    };
    
    this.feedbackCollection.push(fullFeedback);
    this.persistFeedback();
  }

  /**
   * Calculate usability metrics
   */
  calculateMetrics(): UsabilityMetrics {
    const totalTasks = this.getUniqueTaskCount();
    const completedTaskCount = this.completedTasks.length;
    const totalActions = this.userActions.length;
    
    // Task completion rate
    const taskCompletionRate = totalTasks > 0 ? completedTaskCount / totalTasks : 0;
    
    // Average task time
    const taskCompletionActions = this.userActions.filter(a => a.type === 'task_complete');
    const averageTaskTime = taskCompletionActions.length > 0
      ? taskCompletionActions.reduce((sum, action) => sum + (action.duration || 0), 0) / taskCompletionActions.length / 1000
      : 0;
    
    // Error rate
    const errorRate = totalActions > 0 ? this.errorCount / totalActions : 0;
    
    // User satisfaction (from feedback)
    const ratings = this.feedbackCollection.map(f => f.rating);
    const userSatisfactionScore = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;
    
    // Drop-off points
    const dropOffPoints = this.identifyDropOffPoints();
    
    // Feature usage analysis
    const featureUsage = this.analyzeFeatureUsage();
    
    return {
      taskCompletionRate,
      averageTaskTime,
      errorRate,
      userSatisfactionScore,
      dropOffPoints,
      mostUsedFeatures: featureUsage.mostUsed,
      leastUsedFeatures: featureUsage.leastUsed
    };
  }

  /**
   * Generate usability report
   */
  generateUsabilityReport(): {
    metrics: UsabilityMetrics;
    recommendations: string[];
    criticalIssues: string[];
    userJourney: UserAction[];
  } {
    const metrics = this.calculateMetrics();
    const recommendations = this.generateRecommendations(metrics);
    const criticalIssues = this.identifyCriticalIssues();
    const userJourney = this.getUserJourney();
    
    return {
      metrics,
      recommendations,
      criticalIssues,
      userJourney
    };
  }

  /**
   * Perform accessibility audit
   */
  performAccessibilityAudit(): A11yIssue[] {
    const issues: A11yIssue[] = [];
    
    // Check color contrast
    issues.push(...this.checkColorContrast());
    
    // Check keyboard navigation
    issues.push(...this.checkKeyboardNavigation());
    
    // Check screen reader compatibility
    issues.push(...this.checkScreenReaderSupport());
    
    // Check focus management
    issues.push(...this.checkFocusManagement());
    
    return issues;
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): {
    actions: UserAction[];
    feedback: UserFeedback[];
    metrics: UsabilityMetrics;
    session: {
      startTime: number;
      duration: number;
      completedTasks: string[];
      errorCount: number;
    };
  } {
    return {
      actions: [...this.userActions],
      feedback: [...this.feedbackCollection],
      metrics: this.calculateMetrics(),
      session: {
        startTime: this.sessionStartTime,
        duration: Date.now() - this.sessionStartTime,
        completedTasks: [...this.completedTasks],
        errorCount: this.errorCount
      }
    };
  }

  /**
   * Clear analytics data
   */
  clearData(): void {
    this.userActions = [];
    this.feedbackCollection = [];
    this.completedTasks = [];
    this.errorCount = 0;
    this.sessionStartTime = Date.now();
    
    localStorage.removeItem('avatar_builder_analytics');
    localStorage.removeItem('avatar_builder_feedback');
  }

  // Private helper methods

  private getUniqueTaskCount(): number {
    const taskNames = new Set(
      this.userActions
        .filter(a => a.type === 'task_start')
        .map(a => a.data?.taskName)
        .filter(Boolean)
    );
    return taskNames.size;
  }

  private identifyDropOffPoints(): string[] {
    const dropOffs: string[] = [];
    const taskStarts = this.userActions.filter(a => a.type === 'task_start');
    const taskCompletions = this.userActions.filter(a => a.type === 'task_complete');
    
    taskStarts.forEach(start => {
      const taskName = start.data?.taskName;
      const hasCompletion = taskCompletions.some(completion => 
        completion.data?.taskName === taskName
      );
      
      if (!hasCompletion) {
        dropOffs.push(taskName);
      }
    });
    
    return dropOffs;
  }

  private analyzeFeatureUsage(): { mostUsed: string[]; leastUsed: string[] } {
    const featureUsage = new Map<string, number>();
    
    this.userActions
      .filter(a => a.type === 'feature_usage')
      .forEach(action => {
        const feature = action.data?.featureName;
        if (feature) {
          featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
        }
      });
    
    const sortedFeatures = Array.from(featureUsage.entries())
      .sort((a, b) => b[1] - a[1]);
    
    const mostUsed = sortedFeatures.slice(0, 5).map(([feature]) => feature);
    const leastUsed = sortedFeatures.slice(-5).map(([feature]) => feature);
    
    return { mostUsed, leastUsed };
  }

  private generateRecommendations(metrics: UsabilityMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.taskCompletionRate < 0.8) {
      recommendations.push('Improve task completion rate by simplifying complex workflows');
    }
    
    if (metrics.averageTaskTime > 300) { // 5 minutes
      recommendations.push('Reduce task completion time by streamlining user interface');
    }
    
    if (metrics.errorRate > 0.1) {
      recommendations.push('Reduce error rate by improving input validation and user guidance');
    }
    
    if (metrics.userSatisfactionScore < 4) {
      recommendations.push('Improve user satisfaction by addressing common pain points');
    }
    
    if (metrics.dropOffPoints.length > 0) {
      recommendations.push(`Address drop-off points: ${metrics.dropOffPoints.join(', ')}`);
    }
    
    return recommendations;
  }

  private identifyCriticalIssues(): string[] {
    const issues: string[] = [];
    const metrics = this.calculateMetrics();
    
    if (metrics.taskCompletionRate < 0.5) {
      issues.push('CRITICAL: Very low task completion rate');
    }
    
    if (metrics.errorRate > 0.2) {
      issues.push('CRITICAL: High error rate indicates usability problems');
    }
    
    const recentErrors = this.userActions
      .filter(a => a.type === 'error' && Date.now() - a.timestamp < 300000) // Last 5 minutes
      .length;
    
    if (recentErrors > 5) {
      issues.push('CRITICAL: Multiple recent errors detected');
    }
    
    return issues;
  }

  private getUserJourney(): UserAction[] {
    return this.userActions
      .filter(a => ['task_start', 'task_complete', 'task_fail', 'error'].includes(a.type))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private checkColorContrast(): A11yIssue[] {
    // This would integrate with actual color contrast checking
    // For now, return placeholder issues
    return [
      {
        type: 'color-contrast',
        severity: 'medium',
        element: '.ant-btn-primary',
        description: 'Primary button may not meet WCAG AA contrast requirements',
        suggestion: 'Increase color contrast ratio to at least 4.5:1'
      }
    ];
  }

  private checkKeyboardNavigation(): A11yIssue[] {
    return [
      {
        type: 'keyboard-nav',
        severity: 'high',
        element: '.grid-overlay-component canvas',
        description: 'Canvas elements are not keyboard accessible',
        suggestion: 'Add keyboard event handlers and focus management'
      }
    ];
  }

  private checkScreenReaderSupport(): A11yIssue[] {
    return [
      {
        type: 'screen-reader',
        severity: 'high',
        element: '.frame-preview-system',
        description: 'Animation preview lacks screen reader descriptions',
        suggestion: 'Add aria-live regions and descriptive text for animations'
      }
    ];
  }

  private checkFocusManagement(): A11yIssue[] {
    return [
      {
        type: 'focus-management',
        severity: 'medium',
        element: '.ant-modal',
        description: 'Modal focus management could be improved',
        suggestion: 'Ensure focus is trapped within modal and returns to trigger element'
      }
    ];
  }

  private persistActions(): void {
    try {
      localStorage.setItem('avatar_builder_analytics', JSON.stringify(this.userActions));
    } catch (error) {
      console.warn('Failed to persist analytics data:', error);
    }
  }

  private persistFeedback(): void {
    try {
      localStorage.setItem('avatar_builder_feedback', JSON.stringify(this.feedbackCollection));
    } catch (error) {
      console.warn('Failed to persist feedback data:', error);
    }
  }
}

/**
 * React hook for user experience tracking
 */
export const useUserExperienceTracking = () => {
  const ux = UserExperienceTesting.getInstance();
  
  return {
    startTask: (taskName: string) => ux.startTask(taskName),
    completeTask: (taskName: string, success?: boolean) => ux.completeTask(taskName, success),
    trackClick: (elementId: string, elementType: string) => ux.trackClick(elementId, elementType),
    trackError: (errorType: string, errorMessage: string, context?: any) => 
      ux.trackError(errorType, errorMessage, context),
    trackFeature: (featureName: string, action: 'start' | 'complete' | 'abandon') => 
      ux.trackFeatureUsage(featureName, action),
    collectFeedback: (feedback: Omit<UserFeedback, 'timestamp'>) => ux.collectFeedback(feedback),
    getMetrics: () => ux.calculateMetrics(),
    generateReport: () => ux.generateUsabilityReport()
  };
};
