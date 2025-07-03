import { Command } from 'commander';
import { CommandContext } from '../types';
import { ProgressManager } from '../progress-manager';
import { FileHandler } from '../../services/file-handler';
import { createUserErrorMessage } from '../../utils/error-handler';

/**
 * Base class for all CLI commands
 * Provides common functionality and utilities
 */
export abstract class BaseCommand {
  protected fileHandler: FileHandler;
  protected progressManager: ProgressManager;

  constructor(protected context: CommandContext) {
    this.fileHandler = context.fileHandler;
    this.progressManager = context.progressManager;
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
    
    // Format error message for user
    const errorMessage = createUserErrorMessage(error);
    console.error(errorMessage);
    
    // Exit with error code
    process.exit(1);
  }
} 