import { AnalyzeCommand } from '../../../src/cli/commands/analyze';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';
import { AgentRunner } from '../../../src/services/agent-runner';
import { EventEmitter } from 'events';

// Mock AgentRunner
jest.mock('../../../src/services/agent-runner');

describe('AnalyzeCommand', () => {
  let command: AnalyzeCommand;
  let mockContext: CommandContext;
  let program: Command;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let mockAgentRunner: jest.Mocked<AgentRunner>;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console to suppress output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Mock process.exit to prevent Jest worker failures
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    });
    
    mockContext = {
      fileHandler: {
        readOrgFile: jest.fn(),
        writeDocument: jest.fn()
      },
      progressManager: {
        start: jest.fn(),
        update: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn(),
        warn: jest.fn(),
        stop: jest.fn(),
        isSpinning: jest.fn().mockReturnValue(true)
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    // Create mock AgentRunner instance
    mockAgentRunner = new EventEmitter() as any;
    mockAgentRunner.analyze = jest.fn();
    mockAgentRunner.interrupt = jest.fn();
    
    // Mock the AgentRunner constructor
    (AgentRunner as jest.MockedClass<typeof AgentRunner>).mockImplementation(() => mockAgentRunner);
    
    command = new AnalyzeCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should register analyze command', () => {
    command.register(program);
    const analyzeCmd = program.commands.find(cmd => cmd.name() === 'analyze');
    expect(analyzeCmd).toBeDefined();
    expect(analyzeCmd?.description()).toContain('Analyze an org-mode project template with AI-powered insights');
  });

  describe('execute', () => {
    const mockAnalysisResult = {
      requirements: [{ 
        id: 'R1', 
        title: 'Requirement 1', 
        description: 'Test requirement',
        moscowCategory: 'must' as const,
        kanoCategory: 'basic' as const
      }],
      userStories: [{ 
        id: 'US1',
        actor: 'user', 
        action: 'test', 
        benefit: 'testing' 
      }],
      brainstormIdeas: [{ 
        id: 'B1',
        category: 'feature', 
        title: 'Idea 1',
        description: 'Test idea'
      }],
      questionsAnswers: [],
      moscowAnalysis: {
        must: [{ id: '1', category: 'requirement', title: 'Must have', description: 'Critical feature' }],
        should: [],
        could: [],
        wont: []
      },
      kanoAnalysis: {
        basic: [],
        performance: [],
        excitement: []
      },
      dependencies: [],
      suggestions: [],
      alternativeIdeas: [],
      sessionId: 'test-session',
      executionTime: 1000,
      nodesExecuted: ['documentParser', 'requirementsAnalysis']
    };

    it('should successfully analyze and save org file', async () => {
      mockAgentRunner.analyze.mockResolvedValue(mockAnalysisResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'result.org',
        format: 'orgmode',
        statistics: {}
      });
      
      // Register command
      command.register(program);
      
      // Parse command line to trigger action
      await program.parseAsync(['node', 'test', 'analyze', 'test.org', '--output', 'result.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('🤖 Starting AI-powered analysis...');
      expect(mockAgentRunner.analyze).toHaveBeenCalledWith('test.org', {
        modelName: 'o3-mini',
        forceNewSession: undefined
      });
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: mockAnalysisResult.requirements,
          userStories: mockAnalysisResult.userStories,
          brainstormIdeas: mockAnalysisResult.brainstormIdeas
        }), 
        expect.stringContaining('result.org'), 
        'orgmode'
      );
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith(expect.stringContaining('Analysis complete'));
    });

    it('should handle analysis errors', async () => {
      const error = new Error('Analysis failed');
      mockAgentRunner.analyze.mockRejectedValue(error);
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'analyze', 'test.org', '--output', 'result.org']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Analysis failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle interruption', async () => {
      const error = new Error('Analysis interrupted');
      mockAgentRunner.analyze.mockRejectedValue(error);
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'analyze', 'test.org', '--output', 'result.org']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(mockContext.progressManager.warn).toHaveBeenCalledWith('⚠️  Analysis was interrupted');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
    });

    it('should use default output path when not specified', async () => {
      mockAgentRunner.analyze.mockResolvedValue(mockAnalysisResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'ideaforge-results.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      // Don't specify output option
      await program.parseAsync(['node', 'test', 'analyze', 'test.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        expect.any(Object), 
        expect.stringContaining('ideaforge-results.org'), 
        'orgmode'
      );
    });

    it('should handle fresh analysis flag', async () => {
      mockAgentRunner.analyze.mockResolvedValue(mockAnalysisResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'ideaforge-results.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'analyze', 'test.org', '--fresh']);
      
      expect(mockAgentRunner.analyze).toHaveBeenCalledWith('test.org', {
        modelName: 'o3-mini',
        forceNewSession: true
      });
    });

    it('should handle progress events', async () => {
      // Setup a delayed analysis to emit progress events
      mockAgentRunner.analyze.mockImplementation(async () => {
        // Emit some progress events
        mockAgentRunner.emit('progress', {
          node: 'documentParser',
          message: 'Parsing document...',
          timestamp: new Date(),
          level: 'info'
        });
        mockAgentRunner.emit('progress', {
          node: 'requirementsAnalysis',
          message: 'Analyzing requirements...',
          timestamp: new Date(),
          level: 'info'
        });
        return mockAnalysisResult;
      });
      
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'ideaforge-results.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'analyze', 'test.org']);
      
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('Parsing document...');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('Analyzing requirements...');
    });
  });
}); 