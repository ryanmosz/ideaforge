import {
  OrgParseError,
  FileOperationError,
  DocumentValidationError,
  handleParseError,
  handleFileError,
  formatValidationErrors,
  formatValidationWarnings,
  createUserErrorMessage
} from '../../src/utils/error-handler';
import { ValidationError } from '../../src/parsers/orgmode-types';

describe('Error Handling Utilities', () => {
  describe('OrgParseError', () => {
    it('should create error with basic message', () => {
      const error = new OrgParseError('Invalid syntax');
      expect(error.message).toBe('Invalid syntax');
      expect(error.name).toBe('OrgParseError');
    });

    it('should format user message with line number', () => {
      const error = new OrgParseError('Missing heading', 42);
      expect(error.toUserMessage()).toBe('Line 42: Missing heading');
    });

    it('should format user message with section', () => {
      const error = new OrgParseError('Invalid tag', undefined, 'Requirements');
      expect(error.toUserMessage()).toBe('[Requirements] Invalid tag');
    });

    it('should format user message with suggestion', () => {
      const error = new OrgParseError(
        'Invalid tag format',
        10,
        'User Stories',
        'Use :TAG: format'
      );
      expect(error.toUserMessage()).toBe(
        'Line 10: [User Stories] Invalid tag format\n  💡 Suggestion: Use :TAG: format'
      );
    });
  });

  describe('FileOperationError', () => {
    it('should create error for read operation', () => {
      const error = new FileOperationError('Not found', 'read', '/path/to/file.org');
      expect(error.operation).toBe('read');
      expect(error.path).toBe('/path/to/file.org');
    });

    it('should format user message with original error', () => {
      const originalError = new Error('ENOENT: no such file or directory');
      const error = new FileOperationError('Not found', 'read', 'test.org', originalError);
      
      const message = error.toUserMessage();
      expect(message).toContain('Failed to read file: test.org');
      expect(message).toContain('Reason: Not found');
      expect(message).toContain('Details: ENOENT: no such file or directory');
    });
  });

  describe('DocumentValidationError', () => {
    it('should store errors and warnings', () => {
      const errors: ValidationError[] = [
        { type: 'missing_section', message: 'Missing Requirements' }
      ];
      const warnings: ValidationError[] = [
        { type: 'missing_optional', message: 'No changelog found' }
      ];
      
      const error = new DocumentValidationError('Validation failed', errors, warnings);
      expect(error.errors).toEqual(errors);
      expect(error.warnings).toEqual(warnings);
    });
  });

  describe('handleParseError', () => {
    it('should handle OrgParseError', () => {
      const error = new OrgParseError('Test error', 10, 'Section', 'Fix it');
      const result = handleParseError(error);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'parse_error',
        message: 'Test error',
        line: 10,
        section: 'Section',
        suggestion: 'Fix it'
      });
    });

    it('should handle SyntaxError', () => {
      const error = new SyntaxError('Unexpected token');
      const result = handleParseError(error);
      
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Syntax error: Unexpected token');
      expect(result[0].suggestion).toBe('Check for unmatched brackets or invalid syntax');
    });

    it('should handle TypeError', () => {
      const error = new TypeError('Cannot read property of undefined');
      const result = handleParseError(error);
      
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Type error: Cannot read property of undefined');
      expect(result[0].suggestion).toBe('The document structure may be corrupted');
    });

    it('should handle unknown errors', () => {
      const result = handleParseError('Some string error');
      
      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('An unknown error occurred while parsing the document');
      expect(result[0].suggestion).toBe('Please ensure the file is a valid org-mode document');
    });
  });

  describe('handleFileError', () => {
    it('should handle ENOENT error', () => {
      const error = new Error('ENOENT: no such file or directory');
      const result = handleFileError('read', 'test.org', error);
      
      expect(result.message).toBe('File not found');
      expect(result.operation).toBe('read');
      expect(result.path).toBe('test.org');
    });

    it('should handle EACCES error', () => {
      const error = new Error('EACCES: permission denied');
      const result = handleFileError('write', 'protected.org', error);
      
      expect(result.message).toBe('Permission denied');
    });

    it('should handle EISDIR error', () => {
      const error = new Error('EISDIR: illegal operation on a directory');
      const result = handleFileError('read', '/some/dir', error);
      
      expect(result.message).toBe('Path is a directory, not a file');
    });

    it('should handle ENOSPC error', () => {
      const error = new Error('ENOSPC: no space left on device');
      const result = handleFileError('write', 'large.org', error);
      
      expect(result.message).toBe('No space left on device');
    });

    it('should handle unknown errors', () => {
      const result = handleFileError('read', 'test.org', 'not an error');
      
      expect(result.message).toBe('Unknown error');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format empty array', () => {
      expect(formatValidationErrors([])).toBe('');
    });

    it('should format single error', () => {
      const errors: ValidationError[] = [
        { type: 'missing_section', message: 'Missing Requirements' }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toContain('❌ Validation Errors:');
      expect(result).toContain('1. Missing Requirements');
    });

    it('should format error with line number', () => {
      const errors: ValidationError[] = [
        { type: 'invalid_format', message: 'Invalid tag', line: 42 }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toContain('1. Line 42: Invalid tag');
    });

    it('should format error with section', () => {
      const errors: ValidationError[] = [
        { type: 'missing_section', message: 'Empty content', section: 'User Stories' }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toContain('1. [User Stories] Empty content');
    });

    it('should format error with suggestion', () => {
      const errors: ValidationError[] = [
        { 
          type: 'invalid_format', 
          message: 'Wrong format',
          suggestion: 'Use proper syntax'
        }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toContain('1. Wrong format');
      expect(result).toContain('💡 Use proper syntax');
    });

    it('should format multiple errors', () => {
      const errors: ValidationError[] = [
        { type: 'missing_section', message: 'Error 1' },
        { type: 'invalid_format', message: 'Error 2', line: 10 },
        { type: 'parse_error', message: 'Error 3', suggestion: 'Fix it' }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toContain('1. Error 1');
      expect(result).toContain('2. Line 10: Error 2');
      expect(result).toContain('3. Error 3');
      expect(result).toContain('💡 Fix it');
    });
  });

  describe('formatValidationWarnings', () => {
    it('should format warnings with warning symbol', () => {
      const warnings: ValidationError[] = [
        { type: 'missing_optional', message: 'Optional section missing' }
      ];
      
      const result = formatValidationWarnings(warnings);
      expect(result).toContain('⚠️  Warnings:');
      expect(result).toContain('1. Optional section missing');
    });
  });

  describe('createUserErrorMessage', () => {
    it('should handle OrgParseError', () => {
      const error = new OrgParseError('Parse failed', 10);
      const result = createUserErrorMessage(error);
      expect(result).toBe('Line 10: Parse failed');
    });

    it('should handle FileOperationError', () => {
      const error = new FileOperationError('Not found', 'read', 'test.org');
      const result = createUserErrorMessage(error);
      expect(result).toContain('Failed to read file: test.org');
    });

    it('should handle DocumentValidationError', () => {
      const errors: ValidationError[] = [
        { type: 'missing_section', message: 'Missing section' }
      ];
      const warnings: ValidationError[] = [
        { type: 'missing_optional', message: 'Missing optional' }
      ];
      
      const error = new DocumentValidationError('Validation failed', errors, warnings);
      const result = createUserErrorMessage(error);
      
      expect(result).toContain('Validation failed');
      expect(result).toContain('❌ Validation Errors:');
      expect(result).toContain('⚠️  Warnings:');
    });

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      const result = createUserErrorMessage(error);
      expect(result).toBe('Error: Something went wrong');
    });

    it('should handle unknown error', () => {
      const result = createUserErrorMessage('not an error');
      expect(result).toBe('An unknown error occurred');
    });
  });
}); 