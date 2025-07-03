/**
 * Session tracking service for n8n request correlation and analytics
 */

export interface SessionError {
  timestamp: number;
  error: string;
  context: string;
  stack?: string;
}

export interface SessionMetadata {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  requestCount: number;
  technologies: Set<string>;
  errors: SessionError[];
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  totalResponseTime: number;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalRequests: number;
  totalErrors: number;
  averageRequestsPerSession: number;
  topTechnologies: Array<{ technology: string; count: number }>;
}

export class SessionTracker {
  private sessions: Map<string, SessionMetadata> = new Map();
  private readonly maxSessionAge: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    maxSessionAgeMs: number = 24 * 60 * 60 * 1000, // 24 hours default
    enableAutoCleanup: boolean = true
  ) {
    this.maxSessionAge = maxSessionAgeMs;
    if (enableAutoCleanup) {
      this.startCleanupTimer();
    }
  }
  
  /**
   * Track a new request for a session
   */
  trackRequest(sessionId: string, technology: string, responseTime?: number): void {
    const now = Date.now();
    
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        startTime: now,
        lastActivity: now,
        requestCount: 0,
        technologies: new Set(),
        errors: [],
        successCount: 0,
        failureCount: 0,
        averageResponseTime: 0,
        totalResponseTime: 0
      });
    }
    
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = now;
    session.requestCount++;
    session.technologies.add(technology);
    
    if (responseTime !== undefined) {
      session.totalResponseTime += responseTime;
      session.averageResponseTime = session.totalResponseTime / session.requestCount;
    }
  }
  
  /**
   * Track a successful request
   */
  trackSuccess(sessionId: string, technology: string, responseTime: number): void {
    this.trackRequest(sessionId, technology, responseTime);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.successCount++;
    }
  }
  
  /**
   * Track a failed request
   */
  trackFailure(sessionId: string, technology: string, error: Error | string, context?: string): void {
    this.trackRequest(sessionId, technology);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.failureCount++;
      this.trackError(sessionId, error, context || technology);
    }
  }
  
  /**
   * Track an error for a session
   */
  trackError(sessionId: string, error: Error | string, context: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      session.errors.push({
        timestamp: Date.now(),
        error: errorMessage,
        context,
        stack: errorStack
      });
      
      // Limit error history to prevent memory issues
      if (session.errors.length > 50) {
        session.errors = session.errors.slice(-50); // Keep last 50 errors
      }
    }
  }
  
  /**
   * Get metrics for a specific session
   */
  getSessionMetrics(sessionId: string): SessionMetadata | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    // Return a copy to prevent external modification
    return {
      ...session,
      technologies: new Set(session.technologies),
      errors: [...session.errors]
    };
  }
  
  /**
   * Get all session metrics
   */
  getAllSessionMetrics(): SessionMetadata[] {
    return Array.from(this.sessions.values()).map(session => ({
      ...session,
      technologies: new Set(session.technologies),
      errors: [...session.errors]
    }));
  }
  
  /**
   * Get aggregate statistics across all sessions
   */
  getStats(): SessionStats {
    const allSessions = Array.from(this.sessions.values());
    const now = Date.now();
    
    // Count active sessions (activity within last hour)
    const activeSessions = allSessions.filter(
      session => now - session.lastActivity < 60 * 60 * 1000
    ).length;
    
    // Calculate totals
    const totalRequests = allSessions.reduce((sum, session) => sum + session.requestCount, 0);
    const totalErrors = allSessions.reduce((sum, session) => sum + session.errors.length, 0);
    
    // Calculate technology frequencies
    const techCounts = new Map<string, number>();
    allSessions.forEach(session => {
      session.technologies.forEach(tech => {
        techCounts.set(tech, (techCounts.get(tech) || 0) + 1);
      });
    });
    
    // Sort technologies by frequency
    const topTechnologies = Array.from(techCounts.entries())
      .map(([technology, count]) => ({ technology, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
    
    return {
      totalSessions: allSessions.length,
      activeSessions,
      totalRequests,
      totalErrors,
      averageRequestsPerSession: allSessions.length > 0 
        ? totalRequests / allSessions.length 
        : 0,
      topTechnologies
    };
  }
  
  /**
   * Get sessions with errors
   */
  getErrorSessions(): SessionMetadata[] {
    return Array.from(this.sessions.values())
      .filter(session => session.errors.length > 0)
      .map(session => ({
        ...session,
        technologies: new Set(session.technologies),
        errors: [...session.errors]
      }));
  }
  
  /**
   * Clear a specific session
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear();
  }
  
  /**
   * Clean up old sessions
   */
  private cleanupSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > this.maxSessionAge) {
        expiredSessions.push(sessionId);
      }
    }
    
    expiredSessions.forEach(sessionId => {
      console.log(`[SessionTracker] Cleaning up expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`[SessionTracker] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
  
  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupSessions();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Stop the cleanup timer (for testing or shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Export session data for debugging
   */
  exportSessionData(sessionId?: string): string {
    const data = sessionId 
      ? this.getSessionMetrics(sessionId)
      : this.getAllSessionMetrics();
    
    if (data === undefined) {
      return 'undefined';
    }
    
    return JSON.stringify(data, (_key, value) => {
      // Convert Sets to Arrays for JSON serialization
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }, 2);
  }
} 