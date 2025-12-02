/**
 * Jitsi Analytics Service
 * 
 * Tracks and logs Jitsi video call quality metrics and connection issues.
 * Stores analytics data in localStorage for later review/export.
 * 
 * TODO: In production, this should send data to a backend analytics service
 * instead of storing in localStorage.
 */

export interface CallQualityEvent {
  timestamp: number;
  roomId: string;
  eventType: 'quality_change' | 'participant_change' | 'connection_error' | 'call_started' | 'call_ended';
  quality?: 'good' | 'medium' | 'poor';
  participantCount?: number;
  error?: string;
  duration?: number; // in seconds
}

export interface CallSession {
  sessionId: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  participantCount: number;
  qualityEvents: CallQualityEvent[];
  errors: string[];
  averageQuality?: 'good' | 'medium' | 'poor';
}

class JitsiAnalyticsService {
  private readonly STORAGE_KEY = 'stargety_jitsi_analytics';
  private readonly MAX_SESSIONS = 100; // Keep last 100 sessions
  private currentSession: CallSession | null = null;

  /**
   * Start tracking a new call session
   */
  startSession(roomId: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      sessionId,
      roomId,
      startTime: Date.now(),
      participantCount: 1,
      qualityEvents: [],
      errors: [],
    };

    this.logEvent({
      timestamp: Date.now(),
      roomId,
      eventType: 'call_started',
      participantCount: 1,
    });

    console.log(`📊 Analytics: Started session ${sessionId} for room ${roomId}`);
    return sessionId;
  }

  /**
   * End the current call session
   */
  endSession(): void {
    if (!this.currentSession) {
      console.warn('📊 Analytics: No active session to end');
      return;
    }

    const endTime = Date.now();
    const duration = Math.floor((endTime - this.currentSession.startTime) / 1000); // seconds

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.averageQuality = this.calculateAverageQuality();

    this.logEvent({
      timestamp: endTime,
      roomId: this.currentSession.roomId,
      eventType: 'call_ended',
      duration,
    });

    // Save session to storage
    this.saveSession(this.currentSession);

    console.log(`📊 Analytics: Ended session ${this.currentSession.sessionId} (duration: ${duration}s)`);
    this.currentSession = null;
  }

  /**
   * Log a quality change event
   */
  logQualityChange(quality: 'good' | 'medium' | 'poor'): void {
    if (!this.currentSession) return;

    this.logEvent({
      timestamp: Date.now(),
      roomId: this.currentSession.roomId,
      eventType: 'quality_change',
      quality,
    });

    console.log(`📊 Analytics: Quality changed to ${quality}`);
  }

  /**
   * Log a participant count change
   */
  logParticipantChange(count: number): void {
    if (!this.currentSession) return;

    this.currentSession.participantCount = count;

    this.logEvent({
      timestamp: Date.now(),
      roomId: this.currentSession.roomId,
      eventType: 'participant_change',
      participantCount: count,
    });

    console.log(`📊 Analytics: Participant count changed to ${count}`);
  }

  /**
   * Log a connection error
   */
  logError(error: string): void {
    if (!this.currentSession) return;

    this.currentSession.errors.push(error);

    this.logEvent({
      timestamp: Date.now(),
      roomId: this.currentSession.roomId,
      eventType: 'connection_error',
      error,
    });

    console.error(`📊 Analytics: Error logged - ${error}`);
  }

  /**
   * Get all stored sessions
   */
  getAllSessions(): CallSession[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const sessions = JSON.parse(data);
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('Failed to load analytics sessions:', error);
      return [];
    }
  }

  /**
   * Get sessions for a specific room
   */
  getSessionsByRoom(roomId: string): CallSession[] {
    return this.getAllSessions().filter(session => session.roomId === roomId);
  }

  /**
   * Get analytics summary
   */
  getSummary(): {
    totalSessions: number;
    totalDuration: number;
    averageSessionDuration: number;
    totalErrors: number;
    qualityDistribution: { good: number; medium: number; poor: number };
  } {
    const sessions = this.getAllSessions();
    
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const totalErrors = sessions.reduce((sum, s) => sum + s.errors.length, 0);
    
    const qualityDistribution = sessions.reduce(
      (dist, session) => {
        if (session.averageQuality) {
          dist[session.averageQuality]++;
        }
        return dist;
      },
      { good: 0, medium: 0, poor: 0 }
    );

    return {
      totalSessions,
      totalDuration,
      averageSessionDuration,
      totalErrors,
      qualityDistribution,
    };
  }

  /**
   * Export analytics data as JSON
   */
  exportData(): string {
    const sessions = this.getAllSessions();
    const summary = this.getSummary();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      summary,
      sessions,
    }, null, 2);
  }

  /**
   * Clear all analytics data
   */
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentSession = null;
    console.log('📊 Analytics: All data cleared');
  }

  // Private methods

  private logEvent(event: CallQualityEvent): void {
    if (!this.currentSession) return;
    this.currentSession.qualityEvents.push(event);
  }

  private saveSession(session: CallSession): void {
    try {
      const sessions = this.getAllSessions();
      sessions.push(session);

      // Keep only the last MAX_SESSIONS
      const trimmedSessions = sessions.slice(-this.MAX_SESSIONS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedSessions));
    } catch (error) {
      console.error('Failed to save analytics session:', error);
    }
  }

  private calculateAverageQuality(): 'good' | 'medium' | 'poor' {
    if (!this.currentSession) return 'good';

    const qualityEvents = this.currentSession.qualityEvents.filter(
      e => e.eventType === 'quality_change' && e.quality
    );

    if (qualityEvents.length === 0) return 'good';

    const qualityScores = qualityEvents.map(e => {
      switch (e.quality) {
        case 'good': return 3;
        case 'medium': return 2;
        case 'poor': return 1;
        default: return 3;
      }
    });

    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    if (averageScore >= 2.5) return 'good';
    if (averageScore >= 1.5) return 'medium';
    return 'poor';
  }
}

// Export singleton instance
export const jitsiAnalyticsService = new JitsiAnalyticsService();

