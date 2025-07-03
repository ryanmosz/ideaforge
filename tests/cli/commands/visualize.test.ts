import { VisualizeCommand } from '../../../src/cli/commands/visualize';
import { CommandContext } from '../../../src/cli/types';
import { Command } from 'commander';

describe('VisualizeCommand', () => {
  let command: VisualizeCommand;
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
    
    command = new VisualizeCommand(mockContext);
    program = new Command();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should register visualize command with subcommands', () => {
    command.register(program);
    const visualizeCmd = program.commands.find(cmd => cmd.name() === 'visualize');
    expect(visualizeCmd).toBeDefined();
    expect(visualizeCmd?.description()).toContain('Generate visualizations from project data');
    
    // Check subcommands
    const flowCmd = visualizeCmd?.commands.find(cmd => cmd.name() === 'flow');
    expect(flowCmd).toBeDefined();
    expect(flowCmd?.description()).toContain('Generate architecture flow diagram');
    
    const tablesCmd = visualizeCmd?.commands.find(cmd => cmd.name() === 'tables');
    expect(tablesCmd).toBeDefined();
    expect(tablesCmd?.description()).toContain('Extract MoSCoW/Kano tables');
  });

  describe('flow subcommand', () => {
    it('should show coming soon message for flow generation', async () => {
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'visualize', 'flow', 'test.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('🎨 Preparing to generate flow diagram...');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith('📊 Flow diagram generation will be available in v2.0!');
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Future feature: Will generate PNG flow diagram from test.org');
    });

    it('should accept format option', async () => {
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'visualize', 'flow', 'test.org', '--format', 'svg']);
      
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Future feature: Will generate SVG flow diagram from test.org');
    });

    it('should use PNG as default format', async () => {
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'visualize', 'flow', 'test.org']);
      
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Future feature: Will generate PNG flow diagram from test.org');
    });
  });

  describe('tables subcommand', () => {
    it('should show coming soon message for table extraction', async () => {
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'visualize', 'tables', 'test.org']);
      
      expect(mockContext.progressManager.start).toHaveBeenCalledWith('📊 Preparing to extract tables...');
      expect(mockContext.progressManager.succeed).toHaveBeenCalledWith('📋 Table extraction will be available in v2.0!');
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Future feature: Will extract MoSCoW/Kano tables from test.org');
    });

    it('should handle output option', async () => {
      command.register(program);
      
      await program.parseAsync(['node', 'test', 'visualize', 'tables', 'test.org', '--output', 'tables.md']);
      
      expect(mockContext.progressManager.info).toHaveBeenCalledWith('Future feature: Will save MoSCoW/Kano tables to tables.md');
    });
  });
}); 