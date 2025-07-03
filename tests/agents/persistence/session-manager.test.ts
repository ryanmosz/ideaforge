import { SessionManager } from '../../../src/agents/persistence/session-manager';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { rimraf } from 'rimraf';

describe('SessionManager', () => {
  const testStatePath = path.join(process.cwd(), '.test-ideaforge-state', 'state.json');
  let sessionManager: SessionManager;
  
  beforeEach(async () => {
    // Clean up test directory
    const testDir = path.dirname(testStatePath);
    if (existsSync(testDir)) {
      await rimraf(testDir);
    }
    sessionManager = new SessionManager(testStatePath);
  });
  
  afterEach(async () => {
    // Clean up test directory
    const testDir = path.dirname(testStatePath);
    if (existsSync(testDir)) {
      await rimraf(testDir);
    }
  });
  
  describe('constructor', () => {
    it('should create with default path when not provided', () => {
      const defaultManager = new SessionManager();
      expect(defaultManager).toBeDefined();
    });
    
    it('should create with custom path when provided', () => {
      const customManager = new SessionManager('/custom/path/state.json');
      expect(customManager).toBeDefined();
    });
  });
  
  describe('getCheckpointer', () => {
    it('should return the MemorySaver instance', () => {
      const checkpointer = sessionManager.getCheckpointer();
      expect(checkpointer).toBeDefined();
      expect(checkpointer.constructor.name).toBe('MemorySaver');
    });
  });
  
  describe('generateThreadId', () => {
    it('should generate deterministic thread ID from file path', () => {
      const filePath = '/path/to/file.org';
      
      const id1 = sessionManager.generateThreadId(filePath);
      const id2 = sessionManager.generateThreadId(filePath);
      
      expect(id1).toBe(id2);
      expect(id1).toHaveLength(16);
      expect(id1).toMatch(/^[a-f0-9]{16}$/);
    });
    
    it('should normalize paths for consistency', () => {
      const path1 = '/path/to/file.org';
      const path2 = '\\path\\to\\file.org';
      const path3 = '/PATH/TO/FILE.ORG';
      
      const id1 = sessionManager.generateThreadId(path1);
      const id2 = sessionManager.generateThreadId(path2);
      const id3 = sessionManager.generateThreadId(path3);
      
      expect(id1).toBe(id2);
      expect(id1).toBe(id3);
    });
    
    it('should generate different ID with salt', () => {
      const filePath = '/path/to/file.org';
      
      const idNoSalt = sessionManager.generateThreadId(filePath);
      const idWithSalt = sessionManager.generateThreadId(filePath, 'salt123');
      
      expect(idNoSalt).not.toBe(idWithSalt);
    });
  });
  
  describe('getOrCreateSession', () => {
    it('should create new session', async () => {
      const filePath = '/path/to/file.org';
      
      const session = await sessionManager.getOrCreateSession(filePath);
      
      expect(session.filePath).toBe(filePath);
      expect(session.checkpointCount).toBe(0);
      expect(session.currentCheckpointId).toBeUndefined();
      expect(session.threadId).toHaveLength(16);
    });
    
    it('should force new session when forceNew option is true', async () => {
      const filePath = '/path/to/file.org';
      
      const session1 = await sessionManager.getOrCreateSession(filePath);
      const session2 = await sessionManager.getOrCreateSession(filePath, { forceNew: true });
      
      expect(session1.threadId).not.toBe(session2.threadId);
    });
    
    it('should generate same thread ID for same file without forceNew', async () => {
      const filePath = '/path/to/file.org';
      
      const session1 = await sessionManager.getOrCreateSession(filePath);
      const session2 = await sessionManager.getOrCreateSession(filePath);
      
      expect(session1.threadId).toBe(session2.threadId);
    });
  });
  
  describe('saveState', () => {
    it('should create state directory if it does not exist', async () => {
      const stateDir = path.dirname(testStatePath);
      expect(existsSync(stateDir)).toBe(false);
      
      await sessionManager.saveState();
      
      expect(existsSync(stateDir)).toBe(true);
      expect(existsSync(testStatePath)).toBe(true);
    });
    
    it('should save state to disk', async () => {
      await sessionManager.saveState();
      
      const data = await fs.readFile(testStatePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      expect(parsed).toHaveProperty('info');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.info).toBe('Using MemorySaver - state is in-memory only');
    });
  });
  
  describe('loadState', () => {
    it('should handle non-existent state file gracefully', async () => {
      await expect(sessionManager.loadState()).resolves.not.toThrow();
    });
    
    it('should load state from disk', async () => {
      // Create a state file
      const stateDir = path.dirname(testStatePath);
      await fs.mkdir(stateDir, { recursive: true });
      await fs.writeFile(
        testStatePath,
        JSON.stringify({ checkpoints: [] }, null, 2),
        'utf-8'
      );
      
      await expect(sessionManager.loadState()).resolves.not.toThrow();
    });
  });
  
  describe('getSessionConfig', () => {
    it('should return config with thread ID only', () => {
      const sessionInfo = {
        threadId: 'thread123',
        filePath: '/test.org',
        lastModified: new Date(),
        checkpointCount: 0
      };
      
      const config = sessionManager.getSessionConfig(sessionInfo);
      
      expect(config).toEqual({
        configurable: {
          thread_id: 'thread123',
          checkpoint_id: undefined
        }
      });
    });
    
    it('should return config with thread ID and checkpoint ID', () => {
      const sessionInfo = {
        threadId: 'thread123',
        filePath: '/test.org',
        lastModified: new Date(),
        checkpointCount: 2,
        currentCheckpointId: 'cp2'
      };
      
      const config = sessionManager.getSessionConfig(sessionInfo);
      
      expect(config).toEqual({
        configurable: {
          thread_id: 'thread123',
          checkpoint_id: 'cp2'
        }
      });
    });
  });
}); 