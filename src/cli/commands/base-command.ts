import { Command } from 'commander';
import { CommandContext, ErrorHandler } from '../types';
import { ProgressManager } from '../progress-manager';
import { FileHandler } from '../../services/file-handler';

/**
 * Base class for all CLI commands
 * Provides common functionality and utilities
 */
export abstract class BaseCommand {
  protected fileHandler: FileHandler;
  protected progressManager: ProgressManager;
  protected errorHandler: ErrorHandler;

  constructor(protected context: CommandContext) {
    this.fileHandler = context.fileHandler;
    this.progressManager = context.progressManager;
    this.errorHandler = context.errorHandler;
  }

  /**
   * Register this command with the Commander program
   * @param program - The Commander program instance
   */
  abstract register(program: Command): void;
  
  /**
   * Get the progress manager instance
   * @returns The shared progress manager
   */
  protected createProgress(): ProgressManager {
    return this.progressManager;
  }
  
  /**
   * Handle errors in a user-friendly way
   * @param error - The error to handle
   */
  protected handleError(error: any): void {
    // Stop any active spinner
    if (this.progressManager.isSpinning()) {
      this.progressManager.stop();
    }
    
    // Use the error handler from context
    this.errorHandler.handle(error);
    
    // Exit with error code
    process.exit(1);
  }
} 