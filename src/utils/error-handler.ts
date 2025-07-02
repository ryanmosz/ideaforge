/**
 * Error handling utilities for IdeaForge
 * Provides custom error types and error handling functions
 */

import { ValidationError } from '../parsers/orgmode-types';

/**
 * Custom error for org-mode parsing issues
 */
export class OrgParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly section?: string,
    public readonly suggestion?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OrgParseError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OrgParseError);
    }
  }
  
  /**
   * Format error for display to user
   */
  toUserMessage(): string {
    let msg = this.message;
    
    if (this.section) {
      msg = `[${this.section}] ${msg}`;
    }
    
    if (this.line) {
      msg = `Line ${this.line}: ${msg}`;
    }
    
    if (this.suggestion) {
      msg += `\n  💡 Suggestion: ${this.suggestion}`;
    }
    
    return msg;
  }
}

/**
 * Error for file system operations
 */
export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'create',
    public readonly path: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileOperationError);
    }
  }
  
  /**
   * Format error for display
   */
  toUserMessage(): string {
    let msg = `Failed to ${this.operation} file: ${this.path}`;
    
    if (this.message) {
      msg += `\n  Reason: ${this.message}`;
    }
    
    if (this.originalError) {
      msg += `\n  Details: ${this.originalError.message}`;
    }
    
    return msg;
  }
}

/**
 * Error for validation failures
 */
export class DocumentValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
    public readonly warnings?: ValidationError[]
  ) {
    super(message);
    this.name = 'DocumentValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DocumentValidationError);
    }
  }
}

/**
 * Convert any error to ValidationError array
 */
export function handleParseError(error: unknown): ValidationError[] {
  if (error instanceof OrgParseError) {
    return [{
      type: 'parse_error',
      message: error.message,
      line: error.line,
      section: error.section,
      suggestion: error.suggestion
    }];
  }
  
  if (error instanceof SyntaxError) {
    return [{
      type: 'parse_error',
      message: `Syntax error: ${error.message}`,
      suggestion: 'Check for unmatched brackets or invalid syntax'
    }];
  }
  
  if (error instanceof TypeError) {
    return [{
      type: 'parse_error',
      message: `Type error: ${error.message}`,
      suggestion: 'The document structure may be corrupted'
    }];
  }
  
  if (error instanceof Error) {
    return [{
      type: 'parse_error',
      message: error.message
    }];
  }
  
  return [{
    type: 'parse_error',
    message: 'An unknown error occurred while parsing the document',
    suggestion: 'Please ensure the file is a valid org-mode document'
  }];
}

/**
 * Handle file operation errors
 */
export function handleFileError(
  operation: 'read' | 'write' | 'delete' | 'create',
  path: string,
  error: unknown
): FileOperationError {
  if (error instanceof Error) {
    let message = error.message;
    
    // Common error patterns
    if (error.message.includes('ENOENT')) {
      message = 'File not found';
    } else if (error.message.includes('EACCES')) {
      message = 'Permission denied';
    } else if (error.message.includes('EISDIR')) {
      message = 'Path is a directory, not a file';
    } else if (error.message.includes('ENOSPC')) {
      message = 'No space left on device';
    }
    
    return new FileOperationError(message, operation, path, error);
  }
  
  return new FileOperationError('Unknown error', operation, path);
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';
  
  const lines: string[] = ['❌ Validation Errors:'];
  
  errors.forEach((error, index) => {
    let line = `  ${index + 1}. ${error.message}`;
    
    if (error.line) {
      line = `  ${index + 1}. Line ${error.line}: ${error.message}`;
    }
    
    if (error.section) {
      line = `  ${index + 1}. [${error.section}] ${error.message}`;
    }
    
    lines.push(line);
    
    if (error.suggestion) {
      lines.push(`     💡 ${error.suggestion}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Format validation warnings for display
 */
export function formatValidationWarnings(warnings: ValidationError[]): string {
  if (warnings.length === 0) return '';
  
  const lines: string[] = ['⚠️  Warnings:'];
  
  warnings.forEach((warning, index) => {
    let line = `  ${index + 1}. ${warning.message}`;
    
    if (warning.line) {
      line = `  ${index + 1}. Line ${warning.line}: ${warning.message}`;
    }
    
    if (warning.section) {
      line = `  ${index + 1}. [${warning.section}] ${warning.message}`;
    }
    
    lines.push(line);
    
    if (warning.suggestion) {
      lines.push(`     💡 ${warning.suggestion}`);
    }
  });
  
  return lines.join('\n');
}

/**
 * Create a user-friendly error message from any error
 */
export function createUserErrorMessage(error: unknown): string {
  if (error instanceof OrgParseError) {
    return error.toUserMessage();
  }
  
  if (error instanceof FileOperationError) {
    return error.toUserMessage();
  }
  
  if (error instanceof DocumentValidationError) {
    const parts: string[] = [error.message];
    
    if (error.errors.length > 0) {
      parts.push(formatValidationErrors(error.errors));
    }
    
    if (error.warnings && error.warnings.length > 0) {
      parts.push(formatValidationWarnings(error.warnings));
    }
    
    return parts.join('\n\n');
  }
  
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  
  return 'An unknown error occurred';
} 