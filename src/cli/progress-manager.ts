import ora, { Ora } from 'ora';
import chalk from 'chalk';

/**
 * Manages progress display for CLI commands using Ora spinners
 * Provides verbose feedback with timestamps and detailed status updates
 */
export class ProgressManager {
  private spinner: Ora | null = null;
  private startTime: number | null = null;
  
  /**
   * Get formatted timestamp for verbose output
   */
  private getTimestamp(): string {
    const now = new Date();
    return chalk.gray(`[${now.toLocaleTimeString()}]`);
  }
  
  /**
   * Get elapsed time since operation started
   */
  private getElapsedTime(): string {
    if (!this.startTime) return '';
    const elapsed = Date.now() - this.startTime;
    const seconds = (elapsed / 1000).toFixed(1);
    return chalk.gray(`(${seconds}s)`);
  }
  
  /**
   * Start a new progress indicator with the given message
   * @param message - The message to display
   */
  start(message: string): void {
    this.startTime = Date.now();
    
    // Show timestamp and initial message
    console.log(`\n${this.getTimestamp()} ${chalk.bold('Starting:')} ${message}`);
    
    this.spinner = ora({
      text: message,
      color: 'blue',
      prefixText: '  '  // Indent spinner
    }).start();
  }
  
  /**
   * Update the current progress message
   * @param message - The new message to display
   */
  update(message: string): void {
    const elapsed = this.getElapsedTime();
    
    if (this.spinner) {
      // Show previous state as completed
      const previousText = this.spinner.text;
      this.spinner.stopAndPersist({
        symbol: chalk.green('→'),
        text: chalk.gray(previousText) + ' ' + elapsed,
        prefixText: '  '
      });
      
      // Start new spinner with updated message
      this.spinner = ora({
        text: message,
        color: 'blue',
        prefixText: '  '
      }).start();
    } else {
      console.log(`  ${chalk.blue('→')} ${message}`);
    }
  }
  
  /**
   * Mark the current operation as successful
   * @param message - The success message to display
   */
  succeed(message: string): void {
    const elapsed = this.getElapsedTime();
    
    if (this.spinner) {
      this.spinner.succeed(chalk.green(message) + ' ' + elapsed);
      this.spinner = null;
    } else {
      console.log(`  ${chalk.green('✓')} ${chalk.green(message)} ${elapsed}`);
    }
    
    // Show completion timestamp
    console.log(`${this.getTimestamp()} ${chalk.bold.green('Completed successfully')}\n`);
    this.startTime = null;
  }
  
  /**
   * Mark the current operation as failed
   * @param message - The failure message to display
   */
  fail(message: string): void {
    const elapsed = this.getElapsedTime();
    
    if (this.spinner) {
      this.spinner.fail(chalk.red(message) + ' ' + elapsed);
      this.spinner = null;
    } else {
      console.error(`  ${chalk.red('✗')} ${chalk.red(message)} ${elapsed}`);
    }
    
    // Show failure timestamp
    console.error(`${this.getTimestamp()} ${chalk.bold.red('Operation failed')}\n`);
    this.startTime = null;
  }
  
  /**
   * Display a warning message
   * @param message - The warning message to display
   */
  warn(message: string): void {
    if (this.spinner) {
      this.spinner.warn(chalk.yellow(message));
      this.spinner = null;
    } else {
      console.warn(`  ${chalk.yellow('⚠')} ${chalk.yellow(message)}`);
    }
    
    console.log(`${this.getTimestamp()} ${chalk.bold.yellow('Warning issued')}\n`);
    this.startTime = null;
  }
  
  /**
   * Log an info message without affecting the spinner
   * @param message - The info message to display
   */
  info(message: string): void {
    if (this.spinner) {
      // Temporarily clear spinner
      this.spinner.clear();
    }
    
    console.log(`  ${chalk.cyan('ℹ')} ${chalk.cyan(message)}`);
    
    if (this.spinner) {
      // Restore spinner
      this.spinner.render();
    }
  }
  
  /**
   * Stop the spinner without a final message
   * Useful for cleanup or when switching to direct console output
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
    this.startTime = null;
  }
  
  /**
   * Check if a spinner is currently active
   * @returns True if a spinner is running
   */
  isSpinning(): boolean {
    return this.spinner !== null && this.spinner.isSpinning;
  }
} 