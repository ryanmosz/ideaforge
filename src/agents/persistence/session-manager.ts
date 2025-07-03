import * as crypto from 'crypto';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface SessionInfo {
  threadId: string;
  filePath: string;
  lastModified: Date;
  checkpointCount: number;
  currentCheckpointId?: string;
}

export interface SessionOptions {
  forceNew?: boolean;
  resumeFrom?: string;
}

/**
 * Manages LangGraph sessions and thread IDs
 * Uses MemorySaver for in-memory checkpointing
 */
export class SessionManager {
  private checkpointer: MemorySaver;
  private statePath: string;
  
  constructor(statePath?: string) {
    this.checkpointer = new MemorySaver();
    this.statePath = statePath || path.join(process.cwd(), '.ideaforge', 'state');
  }
  
  /**
   * Get the checkpointer instance
   */
  getCheckpointer(): MemorySaver {
    return this.checkpointer;
  }
  
  /**
   * Generate a deterministic thread ID based on file path and optional salt
   */
  generateThreadId(filePath: string, salt?: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    const input = salt ? `${normalizedPath}:${salt}` : normalizedPath;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }
  
  /**
   * Get or create a session for the given file
   */
  async getOrCreateSession(
    filePath: string,
    options: SessionOptions = {}
  ): Promise<SessionInfo> {
    const threadId = options.forceNew 
      ? this.generateThreadId(filePath, Date.now().toString())
      : this.generateThreadId(filePath);
      
    // For now, we'll return basic info
    // In a real implementation, we'd check the checkpointer for existing sessions
    
    return {
      threadId,
      filePath,
      lastModified: new Date(),
      checkpointCount: 0,
      currentCheckpointId: undefined
    };
  }
  
  /**
   * Save the current checkpointer state to disk
   * Note: This is a simplified implementation for demonstration
   */
  async saveState(): Promise<void> {
    const stateDir = path.dirname(this.statePath);
    
    if (!existsSync(stateDir)) {
      await fs.mkdir(stateDir, { recursive: true });
    }
    
    // Note: MemorySaver doesn't expose internal state directly
    // In a production system, you would use SqliteSaver or PostgresSaver
    // which persist automatically
    
    await fs.writeFile(
      this.statePath,
      JSON.stringify({ 
        info: 'Using MemorySaver - state is in-memory only',
        timestamp: new Date().toISOString()
      }, null, 2),
      'utf-8'
    );
  }
  
  /**
   * Load state from disk
   * Note: With MemorySaver, state is not persisted between runs
   */
  async loadState(): Promise<void> {
    try {
      if (existsSync(this.statePath)) {
        await fs.readFile(this.statePath, 'utf-8');
        // Note: State was read but not used since MemorySaver is in-memory only
        
        // Log that we're using in-memory storage
        console.info('Using MemorySaver - previous state not restored');
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }
  
  /**
   * Get session configuration for LangGraph
   */
  getSessionConfig(sessionInfo: SessionInfo): { configurable: Record<string, any> } {
    return {
      configurable: {
        thread_id: sessionInfo.threadId,
        checkpoint_id: sessionInfo.currentCheckpointId
      }
    };
  }
} 