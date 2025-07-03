import { AnalyzeCommand } from '../../../src/cli/commands/analyze';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';

describe('AnalyzeCommand', () => {
  let command: AnalyzeCommand;
  let mockContext: CommandContext;
  let program: Command;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console.error to suppress output during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
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
        stop: jest.fn(),
        isSpinning: jest.fn().mockReturnValue(true)
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    command = new AnalyzeCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should register analyze command', () => {
    command.register(program);
    const analyzeCmd = program.commands.find(cmd => cmd.name() === 'analyze');
    expect(analyzeCmd).toBeDefined();
    expect(analyzeCmd?.description()).toContain('Analyze an org-mode project template');
  });

  describe('execute', () => {
    const mockOrgData = {
      title: 'Test Project',
      userStories: ['Story 1', 'Story 2'],
      requirements: ['Req 1'],
      brainstormIdeas: ['Idea 1', 'Idea 2', 'Idea 3']
    };

    it('should successfully analyze and save org file', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue(undefined);
      
      // Register command
      command.register(program);
      
      // Parse command line to trigger action
      await program.parseAsync(['node', 'test', 'analyze', 'test.org', '--output', 'result.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('📄 Reading org-mode file...');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('✓ Document parsed successfully');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('📊 Found: 2 user stories, 1 requirements, 3 ideas');
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(mockOrgData, expect.stringContaining('result.org'), 'orgmode');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith(expect.stringContaining('Analysis complete'));
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockContext.fileHandler.readOrgFile = jest.fn().mockRejectedValue(error);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });
      
      command.register(program);
      
      await expect(program.parseAsync(['node', 'test', 'analyze', 'missing.org', '--output', 'result.org']))
        .rejects.toThrow('Process exited');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Analysis failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should handle empty document', async () => {
      const emptyData = {
        title: 'Empty Project'
      };
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(emptyData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue(undefined);
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'analyze', 'empty.org', '--output', 'result.org']);
      
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('📊 Found: no data');
    });

    it('should use default output path when not specified', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue(undefined);
      
      command.register(program);
      
      // Don't specify output option
      await program.parseAsync(['node', 'test', 'analyze', 'test.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgData, 
        expect.stringContaining('ideaforge-results.org'), 
        'orgmode'
      );
    });
  });
}); 