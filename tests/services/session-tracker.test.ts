import { SessionTracker } from '../../src/services/session-tracker';

describe('SessionTracker', () => {
  let tracker: SessionTracker;
  
  beforeEach(() => {
    jest.useFakeTimers();
    tracker = new SessionTracker(5 * 60 * 1000); // 5 minutes for testing
  });
  
  afterEach(() => {
    tracker.stopCleanupTimer();
    jest.useRealTimers();
  });
  
  describe('trackRequest', () => {
    it('should create new session on first request', () => {
      tracker.trackRequest('session-1', 'javascript', 100);
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics).toBeDefined();
      expect(metrics?.sessionId).toBe('session-1');
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.technologies.has('javascript')).toBe(true);
      expect(metrics?.averageResponseTime).toBe(100);
    });
    
    it('should update existing session', () => {
      tracker.trackRequest('session-1', 'javascript', 100);
      tracker.trackRequest('session-1', 'python', 200);
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.requestCount).toBe(2);
      expect(metrics?.technologies.size).toBe(2);
      expect(metrics?.technologies.has('python')).toBe(true);
      expect(metrics?.averageResponseTime).toBe(150); // (100 + 200) / 2
    });
    
    it('should handle requests without response time', () => {
      tracker.trackRequest('session-1', 'javascript');
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.averageResponseTime).toBe(0);
    });
  });
  
  describe('trackSuccess', () => {
    it('should increment success count', () => {
      tracker.trackSuccess('session-1', 'javascript', 100);
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.successCount).toBe(1);
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.averageResponseTime).toBe(100);
    });
    
    it('should track multiple successes', () => {
      tracker.trackSuccess('session-1', 'javascript', 100);
      tracker.trackSuccess('session-1', 'python', 200);
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.successCount).toBe(2);
      expect(metrics?.requestCount).toBe(2);
    });
  });
  
  describe('trackFailure', () => {
    it('should increment failure count and track error', () => {
      const error = new Error('Network error');
      tracker.trackFailure('session-1', 'javascript', error);
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.failureCount).toBe(1);
      expect(metrics?.requestCount).toBe(1);
      expect(metrics?.errors.length).toBe(1);
      expect(metrics?.errors[0].error).toBe('Network error');
      expect(metrics?.errors[0].context).toBe('javascript');
    });
    
    it('should handle string errors', () => {
      tracker.trackFailure('session-1', 'javascript', 'Connection refused');
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.errors[0].error).toBe('Connection refused');
      expect(metrics?.errors[0].stack).toBeUndefined();
    });
    
    it('should use custom context when provided', () => {
      tracker.trackFailure('session-1', 'javascript', 'Error', 'API call failed');
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.errors[0].context).toBe('API call failed');
    });
  });
  
  describe('trackError', () => {
    it('should add error to existing session', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackError('session-1', new Error('Test error'), 'Test context');
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.errors.length).toBe(1);
      expect(metrics?.errors[0].error).toBe('Test error');
      expect(metrics?.errors[0].context).toBe('Test context');
      expect(metrics?.errors[0].stack).toBeDefined();
    });
    
    it('should not track error for non-existent session', () => {
      tracker.trackError('non-existent', 'Error', 'Context');
      
      const metrics = tracker.getSessionMetrics('non-existent');
      expect(metrics).toBeUndefined();
    });
    
    it('should limit error history to prevent memory issues', () => {
      tracker.trackRequest('session-1', 'javascript');
      
      // Add 150 errors
      for (let i = 0; i < 150; i++) {
        tracker.trackError('session-1', `Error ${i}`, 'Context');
      }
      
      const metrics = tracker.getSessionMetrics('session-1');
      expect(metrics?.errors.length).toBe(50); // Should keep only last 50
      expect(metrics?.errors[0].error).toBe('Error 100'); // First kept error
      expect(metrics?.errors[49].error).toBe('Error 149'); // Last error
    });
  });
  
  describe('getSessionMetrics', () => {
    it('should return undefined for non-existent session', () => {
      const metrics = tracker.getSessionMetrics('non-existent');
      expect(metrics).toBeUndefined();
    });
    
    it('should return copy of session data', () => {
      tracker.trackRequest('session-1', 'javascript');
      
      const metrics1 = tracker.getSessionMetrics('session-1');
      const metrics2 = tracker.getSessionMetrics('session-1');
      
      expect(metrics1).not.toBe(metrics2); // Different objects
      expect(metrics1).toEqual(metrics2); // Same content
    });
  });
  
  describe('getAllSessionMetrics', () => {
    it('should return all sessions', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackRequest('session-2', 'python');
      
      const allMetrics = tracker.getAllSessionMetrics();
      expect(allMetrics.length).toBe(2);
      expect(allMetrics.find(m => m.sessionId === 'session-1')).toBeDefined();
      expect(allMetrics.find(m => m.sessionId === 'session-2')).toBeDefined();
    });
    
    it('should return empty array when no sessions', () => {
      const allMetrics = tracker.getAllSessionMetrics();
      expect(allMetrics).toEqual([]);
    });
  });
  
  describe('getStats', () => {
    it('should calculate aggregate statistics', () => {
      // Create a fresh tracker to avoid interference
      const statsTracker = new SessionTracker(60 * 60 * 1000); // 1 hour to avoid cleanup
      
      // Stop the cleanup timer immediately to prevent interference
      statsTracker.stopCleanupTimer();
      
      // Create sessions with different activities
      statsTracker.trackSuccess('session-1', 'javascript', 100);
      statsTracker.trackSuccess('session-1', 'python', 200);
      statsTracker.trackFailure('session-1', 'react', 'Error');
      
      statsTracker.trackSuccess('session-2', 'javascript', 150);
      statsTracker.trackError('session-2', 'Test error', 'Context');
      
      // Make session-2 inactive
      jest.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours
      statsTracker.trackRequest('session-1', 'vue'); // Keep session-1 active
      
      const stats = statsTracker.getStats();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(1); // Only session-1 is active
      expect(stats.totalRequests).toBe(5);
      expect(stats.totalErrors).toBe(2);
      expect(stats.averageRequestsPerSession).toBe(2.5);
      
      // Check top technologies
      expect(stats.topTechnologies).toContainEqual({ technology: 'javascript', count: 2 });
      expect(stats.topTechnologies[0].technology).toBe('javascript'); // Most popular
    });
    
    it('should handle empty stats gracefully', () => {
      const stats = tracker.getStats();
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.averageRequestsPerSession).toBe(0);
      expect(stats.topTechnologies).toEqual([]);
    });
  });
  
  describe('getErrorSessions', () => {
    it('should return only sessions with errors', () => {
      tracker.trackSuccess('session-1', 'javascript', 100);
      tracker.trackFailure('session-2', 'python', 'Error');
      tracker.trackRequest('session-3', 'react');
      tracker.trackError('session-3', 'Test error', 'Context');
      
      const errorSessions = tracker.getErrorSessions();
      
      expect(errorSessions.length).toBe(2);
      expect(errorSessions.find(s => s.sessionId === 'session-1')).toBeUndefined();
      expect(errorSessions.find(s => s.sessionId === 'session-2')).toBeDefined();
      expect(errorSessions.find(s => s.sessionId === 'session-3')).toBeDefined();
    });
  });
  
  describe('clearSession', () => {
    it('should remove specific session', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackRequest('session-2', 'python');
      
      const cleared = tracker.clearSession('session-1');
      
      expect(cleared).toBe(true);
      expect(tracker.getSessionMetrics('session-1')).toBeUndefined();
      expect(tracker.getSessionMetrics('session-2')).toBeDefined();
    });
    
    it('should return false for non-existent session', () => {
      const cleared = tracker.clearSession('non-existent');
      expect(cleared).toBe(false);
    });
  });
  
  describe('clearAllSessions', () => {
    it('should remove all sessions', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackRequest('session-2', 'python');
      
      tracker.clearAllSessions();
      
      expect(tracker.getAllSessionMetrics()).toEqual([]);
    });
  });
  
  describe('cleanup', () => {
    it('should remove expired sessions', () => {
      // Create a fresh tracker with shorter max age for testing
      const cleanupTracker = new SessionTracker(5 * 60 * 1000); // 5 minutes
      cleanupTracker.stopCleanupTimer(); // Stop automatic cleanup
      
      cleanupTracker.trackRequest('session-1', 'javascript');
      cleanupTracker.trackRequest('session-2', 'python');
      
      // Advance time past max session age
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes (max is 5)
      
      // Manually trigger cleanup using private method via reflection
      (cleanupTracker as any).cleanupSessions();
      
      expect(cleanupTracker.getAllSessionMetrics()).toEqual([]);
    });
    
    it('should keep active sessions', () => {
      // Create a fresh tracker with shorter max age for testing
      const cleanupTracker = new SessionTracker(10 * 60 * 1000); // 10 minutes
      cleanupTracker.stopCleanupTimer(); // Stop automatic cleanup
      
      cleanupTracker.trackRequest('session-1', 'javascript');
      
      // Advance time but keep session active
      jest.advanceTimersByTime(8 * 60 * 1000); // 8 minutes
      cleanupTracker.trackRequest('session-1', 'python'); // Activity updates lastActivity
      
      // Advance more time
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 more minutes (total 13 minutes from start)
      
      // Manually trigger cleanup
      (cleanupTracker as any).cleanupSessions();
      
      // Session should still exist because it was active 5 minutes ago
      expect(cleanupTracker.getSessionMetrics('session-1')).toBeDefined();
    });
  });
  
  describe('exportSessionData', () => {
    it('should export specific session as JSON', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackError('session-1', 'Test error', 'Context');
      
      const exported = tracker.exportSessionData('session-1');
      const parsed = JSON.parse(exported);
      
      expect(parsed.sessionId).toBe('session-1');
      expect(parsed.technologies).toEqual(['javascript']); // Set converted to array
      expect(parsed.errors.length).toBe(1);
    });
    
    it('should export all sessions when no sessionId provided', () => {
      tracker.trackRequest('session-1', 'javascript');
      tracker.trackRequest('session-2', 'python');
      
      const exported = tracker.exportSessionData();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
    
    it('should handle empty data', () => {
      const exported = tracker.exportSessionData('non-existent');
      expect(exported).toBe('undefined');
    });
  });
  
  describe('timer management', () => {
    it('should stop cleanup timer', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      tracker.stopCleanupTimer();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
    
    it('should handle multiple stop calls gracefully', () => {
      tracker.stopCleanupTimer();
      tracker.stopCleanupTimer(); // Should not throw
      
      expect(() => tracker.stopCleanupTimer()).not.toThrow();
    });
  });
}); 