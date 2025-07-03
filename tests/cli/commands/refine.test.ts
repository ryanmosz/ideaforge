import { RefineCommand } from '../../../src/cli/commands/refine';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';
import { AgentRunner } from '../../../src/services/agent-runner';
import { EventEmitter } from 'events';
import { RefinementResult } from '../../../src/types/agent-runner.types';

// Mock AgentRunner
jest.mock('../../../src/services/agent-runner');

describe('RefineCommand', () => {
  let command: RefineCommand;
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
        info: jest.fn(),
        stop: jest.fn(),
        isSpinning: jest.fn().mockReturnValue(true)
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    // Create mock AgentRunner instance
    mockAgentRunner = new EventEmitter() as any;
    mockAgentRunner.refine = jest.fn();
    mockAgentRunner.interrupt = jest.fn();
    
    // Mock the AgentRunner constructor
    (AgentRunner as jest.MockedClass<typeof AgentRunner>).mockImplementation(() => mockAgentRunner);
    
    command = new RefineCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should register refine command', () => {
    command.register(program);
    const refineCmd = program.commands.find(cmd => cmd.name() === 'refine');
    expect(refineCmd).toBeDefined();
    expect(refineCmd?.description()).toContain('Process user responses and refine the project analysis');
  });

  describe('execute', () => {
    const mockRefinementResult: RefinementResult = {
      requirements: [{ 
        id: 'R1', 
        title: 'Updated requirement', 
        description: 'Refined based on feedback',
        moscowCategory: 'must' as const
      }],
      userStories: [{ 
        id: 'US1',
        actor: 'user', 
        action: 'refine', 
        benefit: 'better results' 
      }],
      brainstormIdeas: [{ 
        id: 'B1',
        category: 'feature', 
        title: 'Refined idea',
        description: 'Updated based on feedback'
      }],
      questionsAnswers: [],
      moscowAnalysis: {
        must: [{ id: '1', category: 'requirement', title: 'Must have', description: 'Updated' }],
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
      executionTime: 2000,
      nodesExecuted: ['responseProcessing', 'feedbackIntegration', 'changelogGeneration'],
      changelog: [
        {
          version: 'v2',
          timestamp: new Date(),
          changes: ['Updated requirements based on feedback', 'Refined user stories'],
          responsesProcessed: 2
        }
      ],
      refinementIteration: 2,
      changesApplied: ['Updated requirements based on feedback', 'Refined user stories']
    };

    it('should successfully refine analysis', async () => {
      mockAgentRunner.refine.mockResolvedValue(mockRefinementResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('🔄 Starting refinement with user feedback...');
      expect(mockAgentRunner.refine).toHaveBeenCalledWith('test.org', {
        modelName: 'o3-mini'
      });
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: mockRefinementResult.requirements,
          userStories: mockRefinementResult.userStories,
          refinementIteration: 2
        }), 
        'test-v2.org',
        'orgmode'
      );
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith('✅ Refinement complete! Results saved to: test-v2.org');
    });

    it('should handle no previous analysis error', async () => {
      const error = new Error('No previous analysis found');
      mockAgentRunner.refine.mockRejectedValue(error);
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'refine', 'test.org']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ No previous analysis found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Tip: Run "ideaforge analyze" on this file first\n');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
    });

    it('should handle interruption', async () => {
      const error = new Error('Refinement interrupted');
      mockAgentRunner.refine.mockRejectedValue(error);
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'refine', 'test.org']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(mockContext.progressManager.warn).toHaveBeenCalledWith('⚠️  Refinement was interrupted');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
    });

    it('should handle generic errors', async () => {
      const error = new Error('Something went wrong');
      mockAgentRunner.refine.mockRejectedValue(error);
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'refine', 'test.org']))
        .rejects.toThrow('Process exited with code 1');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Refinement failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should use custom output path when specified', async () => {
      mockAgentRunner.refine.mockResolvedValue(mockRefinementResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'custom-output.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org', '--output', 'custom-output.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        expect.any(Object),
        'custom-output.org',
        'orgmode'
      );
    });

    it('should handle progress events', async () => {
      mockAgentRunner.refine.mockImplementation(async () => {
        // Emit progress events
        mockAgentRunner.emit('progress', {
          node: 'responseProcessing',
          message: 'Processing responses...',
          timestamp: new Date(),
          level: 'info'
        });
        mockAgentRunner.emit('progress', {
          node: 'feedbackIntegration',
          message: 'Integrating feedback...',
          timestamp: new Date(),
          level: 'warning'
        });
        return mockRefinementResult;
      });
      
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('Processing responses...');
      expect(mockContext.progressManager.warn).toHaveBeenCalledWith('Integrating feedback...');
    });

    it('should handle different model options', async () => {
      mockAgentRunner.refine.mockResolvedValue(mockRefinementResult);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org', '--model', 'gpt-4.1']);
      
      expect(mockAgentRunner.refine).toHaveBeenCalledWith('test.org', {
        modelName: 'gpt-4.1'
      });
    });

    it('should show refinement summary with changes', async () => {
      const resultWithChanges: RefinementResult = {
        ...mockRefinementResult,
        changesApplied: [
          'Updated requirement priorities based on user feedback',
          'Added new user story for admin functionality',
          'Refined technical requirements'
        ]
      };
      
      mockAgentRunner.refine.mockResolvedValue(resultWithChanges);
      (mockContext.fileHandler.writeDocument as jest.Mock).mockReturnValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode',
        statistics: {}
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      // Check that summary was displayed
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🔄 Refinement Summary:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   • Iteration: #2');
      expect(consoleLogSpy).toHaveBeenCalledWith('   • Changes Applied: 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📝 Changes:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   • Updated requirement priorities based on user feedback');
    });
  });
}); 