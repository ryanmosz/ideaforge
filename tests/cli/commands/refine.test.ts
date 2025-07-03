import { RefineCommand } from '../../../src/cli/commands/refine';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';

describe('RefineCommand', () => {
  let command: RefineCommand;
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
        warn: jest.fn(),
        info: jest.fn(),
        stop: jest.fn(),
        isSpinning: jest.fn().mockReturnValue(true)
      },
      errorHandler: {
        handle: jest.fn()
      }
    } as any;
    
    command = new RefineCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should register refine command', () => {
    command.register(program);
    const refineCmd = program.commands.find(cmd => cmd.name() === 'refine');
    expect(refineCmd).toBeDefined();
    expect(refineCmd?.description()).toContain('Refine project plan based on :RESPONSE: feedback tags');
  });

  describe('execute', () => {
    const mockOrgDataWithResponses = {
      metadata: { title: 'Test Project' },
      sections: [
        {
          level: 1,
          title: 'User Stories',
          tags: [],
          subsections: [
            {
              level: 2,
              title: 'Story 1',
              tags: ['RESPONSE'],
              content: 'User feedback here'
            }
          ]
        },
        {
          level: 1,
          title: 'Requirements',
          tags: ['RESPONSE'],
          content: 'Requirement feedback'
        }
      ]
    };

    const mockOrgDataNoResponses = {
      metadata: { title: 'Test Project' },
      sections: [
        {
          level: 1,
          title: 'User Stories',
          tags: [],
          content: 'No feedback yet'
        }
      ]
    };

    it('should process file with RESPONSE tags', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgDataWithResponses);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('📄 Reading org-mode file with responses...');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('🔍 Found 2 :RESPONSE: sections');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('🔄 Processing feedback...');
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('💾 Saving refined version...');
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Next iteration: Add :RESPONSE: tags to test-v2.org for further refinement');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith('✅ Refinement complete! Saved to: test-v2.org');
    });

    it('should handle file without RESPONSE tags', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgDataNoResponses);
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('🔍 Found 0 :RESPONSE: sections');
      expect(mockContext.progressManager.warn).toHaveBeenCalledWith('⚠️  No :RESPONSE: tags found. Add feedback using :RESPONSE: tags and try again.');
      expect(mockContext.fileHandler.writeDocument).not.toHaveBeenCalled();
    });

    it('should auto-version output file', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgDataWithResponses);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgDataWithResponses,
        'test-v2.org',
        'orgmode'
      );
    });

    it('should increment version for already versioned files', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgDataWithResponses);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-v3.org',
        format: 'orgmode'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test-v2.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgDataWithResponses,
        'test-v3.org',
        'orgmode'
      );
    });

    it('should use custom output path when specified', async () => {
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(mockOrgDataWithResponses);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'custom-output.org',
        format: 'orgmode'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org', '--output', 'custom-output.org']);
      
      expect(mockContext.fileHandler.writeDocument).toHaveBeenCalledWith(
        mockOrgDataWithResponses,
        'custom-output.org',
        'orgmode'
      );
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockContext.fileHandler.readOrgFile = jest.fn().mockRejectedValue(error);
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exited');
      });
      
      command.register(program);
      
      await expect(
        program.parseAsync(['node', 'test', 'refine', 'missing.org'])
      ).rejects.toThrow('Process exited');
      
      expect(mockContext.progressManager.fail).toHaveBeenCalledWith('❌ Refinement failed');
      expect(mockContext.errorHandler.handle).toHaveBeenCalledWith(error);
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      exitSpy.mockRestore();
    });

    it('should count nested RESPONSE tags correctly', async () => {
      const nestedData = {
        sections: [
          {
            level: 1,
            title: 'Parent',
            tags: ['RESPONSE'],
            subsections: [
              {
                level: 2,
                title: 'Child 1',
                tags: ['RESPONSE'],
                subsections: [
                  {
                    level: 3,
                    title: 'Grandchild',
                    tags: ['RESPONSE']
                  }
                ]
              },
              {
                level: 2,
                title: 'Child 2',
                tags: []
              }
            ]
          }
        ]
      };
      
      mockContext.fileHandler.readOrgFile = jest.fn().mockResolvedValue(nestedData);
      mockContext.fileHandler.writeDocument = jest.fn().mockResolvedValue({
        success: true,
        filePath: 'test-v2.org',
        format: 'orgmode'
      });
      
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'refine', 'test.org']);
      
      expect(mockContext.progressManager.update).toHaveBeenCalledWith('🔍 Found 3 :RESPONSE: sections');
    });
  });
}); 