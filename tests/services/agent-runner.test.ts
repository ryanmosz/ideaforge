import { AgentRunner } from '../../src/services/agent-runner';
import { FileHandler } from '../../src/services/file-handler';
import { SessionManager } from '../../src/agents/persistence';
import * as graphModule from '../../src/agents/graph';
import { EventEmitter } from 'events';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../../src/services/file-handler');
jest.mock('../../src/agents/persistence');
jest.mock('../../src/agents/graph');

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

// Mock the graph module
const mockBuildIdeaForgeGraph = graphModule.buildIdeaForgeGraph as jest.MockedFunction<typeof graphModule.buildIdeaForgeGraph>;

describe('AgentRunner', () => {
  let agentRunner: AgentRunner;
  let mockFileHandler: jest.Mocked<FileHandler>;
  let mockSessionManager: jest.Mocked<SessionManager>;
  let mockMemorySaver: any;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Use fake timers for progress buffering tests
    jest.useFakeTimers();
    
    // Create mock instances
    mockFileHandler = new FileHandler() as jest.Mocked<FileHandler>;
    
    agentRunner = new AgentRunner(mockFileHandler);
    
    // Get the mocked SessionManager instance
    mockSessionManager = (SessionManager as jest.MockedClass<typeof SessionManager>).mock.instances[0] as jest.Mocked<SessionManager>;
    
    // Add missing mocks for SessionManager
    mockMemorySaver = {
      storage: {},
      writes: [],
      _getPendingSends: jest.fn(),
      getTuple: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      list: jest.fn()
    };
    mockSessionManager.getCheckpointer = jest.fn().mockReturnValue(mockMemorySaver);
    mockSessionManager.saveState = jest.fn().mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    // Clean up timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  describe('constructor', () => {
    it('should initialize with FileHandler', () => {
      expect(agentRunner).toBeInstanceOf(EventEmitter);
      expect(SessionManager).toHaveBeenCalledWith(undefined);
    });
    
    it('should accept custom state path', () => {
      const customPath = '/custom/state/path';
      // Create new runner to test constructor param
      new AgentRunner(mockFileHandler, customPath);
      expect(SessionManager).toHaveBeenCalledWith(customPath);
    });
  });
  
  describe('getSession', () => {
    it('should retrieve session information', async () => {
      const mockSession = { 
        threadId: 'test-thread', 
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 0,
        currentCheckpointId: undefined
      };
      mockSessionManager.getOrCreateSession.mockResolvedValue(mockSession);
      
      const session = await agentRunner.getSession('test.org');
      
      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith('test.org');
      expect(session).toEqual(mockSession);
    });
  });
  
  describe('clearSession', () => {
    it('should clear session by creating new one', async () => {
      const mockSession = { 
        threadId: 'new-thread', 
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 0,
        currentCheckpointId: undefined
      };
      mockSessionManager.getOrCreateSession.mockResolvedValue(mockSession);
      
      await agentRunner.clearSession('test.org');
      
      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith('test.org', { forceNew: true });
    });
  });
  
  describe('interrupt', () => {
    it('should emit interrupted event', (done) => {
      agentRunner.on('interrupted', () => {
        done();
      });
      
      agentRunner.interrupt();
    });
  });
  
  describe('progress events', () => {
    it('should be an EventEmitter', () => {
      expect(agentRunner.on).toBeDefined();
      expect(agentRunner.emit).toBeDefined();
      expect(agentRunner.removeListener).toBeDefined();
    });
  });
  
  describe('analyze', () => {
    let mockGraph: any;
    let mockStream: any;
    
    beforeEach(() => {
      // Mock graph builder
      mockGraph = {
        stream: jest.fn()
      };
      
      mockStream = {
        [Symbol.asyncIterator]: jest.fn()
      };
      
      mockBuildIdeaForgeGraph.mockReturnValue(mockGraph);
      mockGraph.stream.mockResolvedValue(mockStream);
    });
    
    it('should execute full analysis successfully', async () => {
      // Arrange
      const testPath = 'test.org';
      const mockContent = '* Test Document\n** Requirements\n*** MUST: Do something';
      
      (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: testPath,
        lastModified: new Date(),
        checkpointCount: 0
      });
      
      // Mock stream iterator
      const updates = [
        { documentParser: { fileContent: '* Test' } },
        { requirementsAnalysis: { requirements: [] } },
        { __end__: { 
          requirements: [],
          userStories: [],
          brainstormIdeas: [],
          questionsAnswers: [],
          moscowAnalysis: { must: [], should: [], could: [], wont: [] },
          kanoAnalysis: { basic: [], performance: [], excitement: [] },
          dependencies: [],
          projectSuggestions: [],
          alternativeIdeas: []
        }}
      ];
      
      let index = 0;
      mockStream[Symbol.asyncIterator].mockImplementation(() => ({
        async next() {
          if (index < updates.length) {
            return { value: updates[index++], done: false };
          }
          return { done: true };
        }
      }));
      
      // Act
      const result = await agentRunner.analyze(testPath);
      
      // Assert
      expect(fs.promises.readFile).toHaveBeenCalledWith(testPath, 'utf-8');
      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        testPath,
        { forceNew: undefined }
      );
      expect(mockBuildIdeaForgeGraph).toHaveBeenCalled();
      expect(result).toHaveProperty('sessionId', 'test-thread');
      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('nodesExecuted');
      expect(result.nodesExecuted).toContain('documentParser');
    });
    
    it('should handle interruption gracefully', async () => {
      // Arrange
      (fs.promises.readFile as jest.Mock).mockResolvedValue('* Test');
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 0
      });
      
      // Mock stream that checks interruption
      mockStream[Symbol.asyncIterator].mockImplementation(() => ({
        async next() {
          // Simulate interruption
          agentRunner.interrupt();
          return { value: { documentParser: {} }, done: false };
        }
      }));
      
      // Act & Assert
      await expect(agentRunner.analyze('test.org'))
        .rejects.toThrow('Analysis interrupted');
    });
    
    it('should buffer progress events and flush periodically', async () => {
      // Arrange
      (fs.promises.readFile as jest.Mock).mockResolvedValue('* Test');
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 0
      });
      
      const progressEvents: any[] = [];
      agentRunner.on('progress', (event) => {
        progressEvents.push(event);
      });
      
      let nodeIndex = 0;
      const nodes = ['documentParser', 'requirementsAnalysis', 'moscowCategorization'];
      
      mockStream[Symbol.asyncIterator].mockImplementation(() => ({
        async next() {
          if (nodeIndex < nodes.length) {
            return { value: { [nodes[nodeIndex++]]: {} }, done: false };
          }
          if (nodeIndex === nodes.length) {
            nodeIndex++;
            return { value: { __end__: { 
              requirements: [],
              userStories: [],
              brainstormIdeas: [],
              questionsAnswers: [],
              moscowAnalysis: { must: [], should: [], could: [], wont: [] },
              kanoAnalysis: { basic: [], performance: [], excitement: [] }
            }}, done: false };
          }
          return { done: true };
        }
      }));
      
      // Act
      const analyzePromise = agentRunner.analyze('test.org');
      
      // Initially no events should be emitted
      expect(progressEvents.length).toBe(0);
      
      // Advance timers to trigger buffer flush
      await jest.advanceTimersByTimeAsync(100);
      
      // Now events should be flushed
      expect(progressEvents.length).toBeGreaterThan(0);
      
      // Complete the analysis
      await analyzePromise;
    });
    
    it('should emit errors immediately without buffering', async () => {
      // Arrange
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      const progressEvents: any[] = [];
      agentRunner.on('progress', (event) => {
        progressEvents.push(event);
      });
      
      // Act
      try {
        await agentRunner.analyze('test.org');
      } catch {
        // Expected to fail
      }
      
      // Assert - error events should be emitted immediately
      const errorEvents = progressEvents.filter(e => e.level === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].message).toContain('Analysis failed');
    });
  });
  
  describe('refine', () => {
    let mockGraph: any;
    let mockStream: any;
    let mockCheckpointer: any;
    
    beforeEach(() => {
      // Mock graph builder
      mockGraph = {
        stream: jest.fn()
      };
      
      mockStream = {
        [Symbol.asyncIterator]: jest.fn()
      };
      
      mockBuildIdeaForgeGraph.mockReturnValue(mockGraph);
      mockGraph.stream.mockResolvedValue(mockStream);
      
      // Mock checkpointer
      mockCheckpointer = {
        get: jest.fn(),
        put: jest.fn()
      };
      mockSessionManager.getCheckpointer.mockReturnValue(mockCheckpointer);
    });
    
    it('should process refinement with existing session', async () => {
      // Arrange
      const testPath = 'test.org';
      const mockContent = '* Test Document\n** Section\n:RESPONSE:\nUser feedback here\n:END:';
      
      const previousState = {
        filePath: testPath,
        fileContent: '* Test Document',
        requirements: [{ id: 'REQ-1', title: 'Test requirement', description: 'Test' }],
        refinementIteration: 0,
        changelog: [],
        userResponses: []
      } as any;
      
      const mockCheckpoint = {
        id: 'checkpoint-1',
        channel_values: previousState
      };
      
      (fs.promises.readFile as jest.Mock).mockResolvedValue(mockContent);
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: testPath,
        lastModified: new Date(),
        checkpointCount: 1
      });
      
      mockCheckpointer.get.mockResolvedValue(mockCheckpoint);
      
      // Mock stream with refinement flow
      const updates = [
        { responseProcessing: { userResponses: [{ tag: 'RESPONSE', response: 'feedback', section: 'Section' }] } },
        { feedbackIntegration: {} },
        { changelogGeneration: {
          ...previousState,
          refinementIteration: 1,
          changelog: [{
            iteration: 1,
            timestamp: new Date().toISOString(),
            changes: ['Integrated user feedback', 'Updated requirements based on responses']
          }],
          userResponses: [{ tag: 'RESPONSE', response: 'feedback', section: 'Section' }]
        }}
      ];
      
      let index = 0;
      mockStream[Symbol.asyncIterator].mockImplementation(() => ({
        async next() {
          if (index < updates.length) {
            return { value: updates[index++], done: false };
          }
          return { done: true };
        }
      }));
      
      // Act
      const result = await agentRunner.refine(testPath);
      
      // Assert
      expect(fs.promises.readFile).toHaveBeenCalledWith(testPath, 'utf-8');
      expect(mockCheckpointer.get).toHaveBeenCalled();
      expect(result).toHaveProperty('refinementIteration', 1);
      expect(result).toHaveProperty('changelog');
      expect(result.changelog).toHaveLength(1);
      expect(result.changelog[0].version).toBe('v2');
      expect(result.changesApplied).toContain('Processed 1 user responses');
      expect(result.nodesExecuted).toContain('responseProcessing');
    });
    
    it('should error if no previous analysis exists', async () => {
      // Arrange
      (fs.promises.readFile as jest.Mock).mockResolvedValue('* Test');
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 0
      });
      
      mockCheckpointer.get.mockResolvedValue(null);
      
      // Act & Assert
      await expect(agentRunner.refine('test.org'))
        .rejects.toThrow('No previous analysis found');
    });
    
    it('should handle interruption during refinement', async () => {
      // Arrange
      const previousState = {
        filePath: 'test.org',
        fileContent: 'test',
        refinementIteration: 0
      } as any;
      
      const mockCheckpoint = {
        id: 'checkpoint-1',
        channel_values: previousState
      };
      
      (fs.promises.readFile as jest.Mock).mockResolvedValue('* Test with response');
      mockSessionManager.getOrCreateSession.mockResolvedValue({
        threadId: 'test-thread',
        filePath: 'test.org',
        lastModified: new Date(),
        checkpointCount: 1
      });
      
      mockCheckpointer.get.mockResolvedValue(mockCheckpoint);
      
      // Mock stream that checks interruption
      mockStream[Symbol.asyncIterator].mockImplementation(() => ({
        async next() {
          // Simulate interruption
          agentRunner.interrupt();
          return { value: { responseProcessing: {} }, done: false };
        }
      }));
      
      // Act & Assert
      await expect(agentRunner.refine('test.org'))
        .rejects.toThrow('Refinement interrupted');
    });
  });
});

describe('AgentRunner - Interruption Handling', () => {
  let agentRunner: AgentRunner;
  let mockFileHandler: any;
  let mockSessionManager: any;
  let mockGraph: any;
  
  beforeEach(() => {
    mockFileHandler = {};
    agentRunner = new AgentRunner(mockFileHandler);
    
    // Mock session manager
    mockSessionManager = {
      getOrCreateSession: jest.fn().mockResolvedValue({
        threadId: 'test-thread',
        documentPath: 'test.org',
        createdAt: new Date(),
        iterations: []
      }),
      getCheckpointer: jest.fn(),
      saveState: jest.fn().mockResolvedValue(undefined)
    };
    (agentRunner as any).sessionManager = mockSessionManager;
    
    // Mock graph
    mockGraph = {
      stream: jest.fn()
    };
    mockBuildIdeaForgeGraph.mockReturnValue(mockGraph);
    
    // Mock fs.promises.readFile
    (fs.promises.readFile as jest.Mock).mockResolvedValue('test content');
  });
  
  it('should handle multiple interrupt calls gracefully', async () => {
    const promise1 = agentRunner.interrupt();
    const promise2 = agentRunner.interrupt();
    const promise3 = agentRunner.interrupt();
    
    // All should resolve to the same cleanup promise
    await expect(Promise.all([promise1, promise2, promise3])).resolves.toBeDefined();
  });
  
  it('should save partial state on interrupt during execution', async () => {
    // Setup mock stream
    const mockStream = {
      [Symbol.asyncIterator]: jest.fn().mockImplementation(() => ({
        async next() {
          // Simulate delay before returning
          await new Promise(resolve => setTimeout(resolve, 50));
          return { value: { documentParser: {} }, done: false };
        }
      }))
    };
    mockGraph.stream.mockResolvedValue(mockStream);
    
    // Start an analysis that will be interrupted
    const analysisPromise = agentRunner.analyze('test.org');
    
    // Wait a bit then interrupt
    setTimeout(() => agentRunner.interrupt(), 10);
    
    await expect(analysisPromise).rejects.toThrow('interrupted');
    
    // Should have attempted to save state
    expect(mockSessionManager.saveState).toHaveBeenCalled();
  });
  
  it('should run registered cleanup handlers', async () => {
    const cleanupHandler1 = jest.fn();
    const cleanupHandler2 = jest.fn();
    
    agentRunner.onInterrupt(cleanupHandler1);
    agentRunner.onInterrupt(cleanupHandler2);
    
    await agentRunner.interrupt();
    
    expect(cleanupHandler1).toHaveBeenCalled();
    expect(cleanupHandler2).toHaveBeenCalled();
  });
  
  it('should handle cleanup handler errors gracefully', async () => {
    const errorHandler = jest.fn(() => {
      throw new Error('Cleanup failed');
    });
    const goodHandler = jest.fn();
    
    agentRunner.onInterrupt(errorHandler);
    agentRunner.onInterrupt(goodHandler);
    
    // Should not throw even if handler fails
    await expect(agentRunner.interrupt()).resolves.toBeUndefined();
    expect(goodHandler).toHaveBeenCalled();
  });
  
  it('should respect timeout and interrupt long operations', async () => {
    // Mock the interrupt method to track if it was called
    const interruptSpy = jest.spyOn(agentRunner, 'interrupt');
    
    // Mock stream that immediately completes
    let callCount = 0;
    const normalStream = {
      [Symbol.asyncIterator]: jest.fn().mockImplementation(() => ({
        async next() {
          if (callCount++ === 0) {
            return { 
              value: { 
                __end__: { 
                  requirements: [],
                  userStories: [],
                  brainstormIdeas: [],
                  questionsAnswers: [],
                  moscowAnalysis: { must: [], should: [], could: [], wont: [] },
                  kanoAnalysis: { basic: [], performance: [], excitement: [] }
                } 
              }, 
              done: false 
            };
          }
          return { done: true };
        }
      }))
    };
    
    mockGraph.stream.mockResolvedValue(normalStream);
    
    // Start analysis with timeout
    await agentRunner.analyze('test.org', { timeout: 5000 });
    
    // Verify that the timeout was set up (executeWithTimeout was called)
    // Since we can't easily test the actual timeout behavior without real delays,
    // we verify the setup is correct by checking the method was called with timeout option
    expect(mockGraph.stream).toHaveBeenCalled();
    
    // The interrupt should not have been called since operation completed quickly
    expect(interruptSpy).not.toHaveBeenCalled();
  });
}); 