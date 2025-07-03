import { ProgressManager } from '../../src/cli/progress-manager';
import ora from 'ora';

// ora and chalk are automatically mocked by Jest through moduleNameMapper
const mockOra = ora as jest.MockedFunction<typeof ora>;

describe('ProgressManager', () => {
  let progressManager: ProgressManager;
  let mockSpinner: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set up console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Set up spinner mock
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      stopAndPersist: jest.fn().mockReturnThis(),
      clear: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
      text: '',
      isSpinning: true
    };
    
    mockOra.mockReturnValue(mockSpinner);
    
    // Create new instance
    progressManager = new ProgressManager();
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  describe('start()', () => {
    it('should create and start a spinner with the given message', () => {
      progressManager.start('Processing files...');
      
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Processing files...',
        color: 'blue',
        prefixText: '  '
      });
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
    
    it('should handle multiple start calls', () => {
      progressManager.start('First task');
      progressManager.start('Second task');
      
      expect(mockOra).toHaveBeenCalledTimes(2);
      expect(mockSpinner.start).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('update()', () => {
    it('should update spinner text when spinner exists', () => {
      progressManager.start('Initial message');
      mockSpinner.text = 'Initial message';
      progressManager.update('Updated message');
      
      expect(mockSpinner.stopAndPersist).toHaveBeenCalled();
      expect(mockOra).toHaveBeenCalledWith({
        text: 'Updated message',
        color: 'blue',
        prefixText: '  '
      });
    });
    
    it('should log message when no spinner exists', () => {
      progressManager.update('Message without spinner');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Message without spinner'));
    });
  });
  
  describe('succeed()', () => {
    it('should mark spinner as successful and clear it', () => {
      progressManager.start('Task in progress');
      progressManager.succeed('Task completed');
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Task completed'));
      expect(progressManager.isSpinning()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Completed successfully'));
    });
    
    it('should log success message when no spinner exists', () => {
      progressManager.succeed('Direct success message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Direct success message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Completed successfully'));
    });
  });
  
  describe('fail()', () => {
    it('should mark spinner as failed and clear it', () => {
      progressManager.start('Task in progress');
      progressManager.fail('Task failed');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('Task failed'));
      expect(progressManager.isSpinning()).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Operation failed'));
    });
    
    it('should log error message when no spinner exists', () => {
      progressManager.fail('Direct error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Direct error message'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Operation failed'));
    });
  });
  
  describe('warn()', () => {
    it('should show warning and stop spinner', () => {
      progressManager.start('Task in progress');
      progressManager.warn('Warning message');
      
      expect(mockSpinner.warn).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
      expect(progressManager.isSpinning()).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning issued'));
    });
    
    it('should log warning when no spinner exists', () => {
      progressManager.warn('Direct warning');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Direct warning'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning issued'));
    });
  });
  
  describe('info()', () => {
    it('should log info message and preserve spinner', () => {
      progressManager.start('Task in progress');
      progressManager.info('Information message');
      
      expect(mockSpinner.clear).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Information message'));
      expect(mockSpinner.render).toHaveBeenCalled();
      expect(progressManager.isSpinning()).toBe(true);
    });
    
    it('should log info message when no spinner exists', () => {
      progressManager.info('Direct info');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Direct info'));
    });
  });
  
  describe('stop()', () => {
    it('should stop the spinner', () => {
      progressManager.start('Task in progress');
      progressManager.stop();
      
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(progressManager.isSpinning()).toBe(false);
    });
    
    it('should handle stop when no spinner exists', () => {
      expect(() => progressManager.stop()).not.toThrow();
    });
  });
  
  describe('isSpinning()', () => {
    it('should return true when spinner is active', () => {
      progressManager.start('Task in progress');
      expect(progressManager.isSpinning()).toBe(true);
    });
    
    it('should return false when no spinner exists', () => {
      expect(progressManager.isSpinning()).toBe(false);
    });
    
    it('should return false after spinner is stopped', () => {
      progressManager.start('Task in progress');
      progressManager.stop();
      expect(progressManager.isSpinning()).toBe(false);
    });
    
    it('should return false when spinner exists but is not spinning', () => {
      progressManager.start('Task in progress');
      mockSpinner.isSpinning = false;
      expect(progressManager.isSpinning()).toBe(false);
    });
  });
}); 