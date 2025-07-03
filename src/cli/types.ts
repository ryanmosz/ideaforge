import { FileHandler } from '../services/file-handler';
import { ProgressManager } from './progress-manager';

/**
 * Context object passed to all CLI commands
 * Contains shared services and utilities
 */
export interface CommandContext {
  fileHandler: FileHandler;
  progressManager: ProgressManager;
} 