import { ExportCommand } from '../../../src/cli/commands/export';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';

describe('ExportCommand', () => {
  let command: ExportCommand;
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
        info: jest.fn(),
        isSpinning: jest.fn().mockReturnValue(true)
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    command = new ExportCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should register export command', () => {
    command.register(program);
    const exportCmd = program.commands.find(cmd => cmd.name() === 'export');
    expect(exportCmd).toBeDefined();
    expect(exportCmd?.description()).toContain('Export project plan to different formats');
  });

  describe('execute', () => {
    const mockOrgData = {
      metadata: { title: 'Test Project' },
      userStories: ['Story 1', 'Story 2'],
      requirements: ['Req 1'],
      brainstormIdeas: ['Idea 1', 'Idea 2', 'Idea 3']
    };

    it('should export to cursor format by default', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-export.md',
        format: 'cursor',
        statistics: { totalTasks: 3, userStoryTasks: 2, requirementTasks: 1 }
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'export', 'test.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('📄 Reading source file...');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('📝 Exporting to cursor format...');
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgData, 
        expect.stringContaining('-export.md'), 
        'cursor'
      );
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Generated: 3 tasks, 2 user story tasks, 1 requirement tasks');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith(expect.stringContaining('📋 Exported successfully'));
    });

    it('should export to orgmode format when specified', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-export.org',
        format: 'orgmode',
        statistics: { sections: 5, words: 500 }
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'export', 'test.org', '--format', 'orgmode']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgData, 
        expect.stringContaining('-export.org'), 
        'orgmode'
      );
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Document stats: 5 sections, 500 words');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith(expect.stringContaining('📄 Exported successfully'));
    });

    it('should use custom output path when specified', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'custom-output.md',
        format: 'cursor'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'export', 'test.org', '--output', 'custom-output.md']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgData, 
        'custom-output.md', 
        'cursor'
      );
    });

    it('should handle invalid format error', async () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });
      
      command.register(program);
      
      await expect(
        program.parseAsync(['node', 'test', 'export', 'test.org', '--format', 'invalid'])
      ).rejects.toThrow('Process exited');
      
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid format: invalid')
        })
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockContext.fileHandler.readOrgFile = jest.fn().mockRejectedValue(error);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });
      
      command.register(program);
      
      await expect(
        program.parseAsync(['node', 'test', 'export', 'missing.org'])
      ).rejects.toThrow('Process exited');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Export failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should handle write errors', async () => {
      const error = new Error('Permission denied');
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockRejectedValue(error);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });
      
      command.register(program);
      
      await expect(
        program.parseAsync(['node', 'test', 'export', 'test.org'])
      ).rejects.toThrow('Process exited');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Export failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should handle format option case-insensitively', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-export.md',
        format: 'cursor'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'export', 'test.org', '--format', 'CURSOR']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgData, 
        expect.any(String), 
        'cursor'
      );
    });
  });
}); 