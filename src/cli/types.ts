import { FileHandler } from '../services/file-handler';
import { ProgressManager } from './progress-manager';

/**
 * Error handler interface for consistent error handling
 */
export interface ErrorHandler {
  /**
   * Handle an error in a user-friendly way
   * @param error - The error to handle
   */
  handle(error: any): void;
}

/**
 * Context object passed to all CLI commands
 * Contains shared services and utilities
 */
export interface CommandContext {
  fileHandler: FileHandler;
  progressManager: ProgressManager;
  errorHandler: ErrorHandler;
} 