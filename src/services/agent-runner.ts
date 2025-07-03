import { EventEmitter } from 'events';
import { SessionManager } from '../agents/persistence';
import { FileHandler } from './file-handler';
import { buildIdeaForgeGraph } from '../agents/graph';
import { ProjectState } from '../agents/state';
import { ProgressManager } from '../cli/progress-manager';
import {
  AnalyzeOptions,
  RefineOptions,
  AnalysisResult,
  RefinementResult,
  ProgressEvent
} from '../types/agent-runner.types';

/**
 * AgentRunner orchestrates LangGraph execution for the CLI.
 * 
 * Responsibilities:
 * - Manages graph lifecycle and execution
 * - Handles state persistence through sessions  
 * - Streams progress events to CLI
 * - Provides interruption and error handling
 * 
 * @example
 * const runner = new AgentRunner(fileHandler);
 * runner.on('progress', (e) => console.log(e.message));
 * const result = await runner.analyze('project.org');
 */
export class AgentRunner extends EventEmitter {
  private sessionManager: SessionManager;
  private interrupted: boolean = false;
  private isExecuting: boolean = false;
  private progressBuffer: ProgressEvent[] = [];
  private progressFlushInterval?: NodeJS.Timeout;
  private interruptHandlers: Array<() => void> = [];
  private cleanupPromise?: Promise<void>;
  private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  constructor(_fileHandler: FileHandler, statePath?: string) {
    super();
    // fileHandler will be used in future versions
    this.sessionManager = new SessionManager(statePath);
    
    // Set up interruption handling
    this.setupInterruptHandler();
  }
  
  /**
   * Analyze an org-mode document using LangGraph
   */
  async analyze(documentPath: string, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    this.interrupted = false;
    this.isExecuting = true;
    
    // Start progress buffering
    this.startProgressBuffer();
    
    try {
      // Emit start event
      this.emitProgress('start', `Starting analysis of ${documentPath}...`);
      
      // Load document content
      this.emitProgress('documentParser', 'Loading document...');
      const rawContent = await this.withErrorHandling(
        () => this.loadDocumentContent(documentPath),
        'Document loading'
      );
      
      // Get or create session
      this.emitProgress('session', 'Initializing session...');
      const session = await this.sessionManager.getOrCreateSession(
        documentPath,
        { forceNew: options.forceNewSession }
      );
      
      // Build graph with checkpointer
      this.emitProgress('graph', 'Building analysis graph...');
      const checkpointer = this.sessionManager.getCheckpointer();
      const progressAdapter = this.createProgressAdapter();
      
      const graph = buildIdeaForgeGraph(
        progressAdapter,
        checkpointer,
        options.modelName
      );
      
      // Create initial state
      const initialState: Partial<ProjectState> = {
        filePath: documentPath,
        fileContent: rawContent,
        refinementIteration: 0,
        currentNode: 'documentParser',
        errors: [],
        messages: []
      };
      
      // Execute graph with progress tracking
      const config = {
        configurable: { 
          thread_id: session.threadId 
        }
      };
      
      this.emitProgress('execution', 'Running analysis...');
      const stream = await this.executeWithTimeout(
        () => this.withRetry(
          () => graph.stream(initialState, config),
          3,
          'Analysis execution'
        ),
        options.timeout || this.DEFAULT_TIMEOUT
      ) as AsyncIterable<Record<string, any>>;
      
      let finalState: ProjectState | null = null;
      const nodesExecuted: string[] = [];
      
      // Process stream updates
      for await (const update of stream) {
        if (this.interrupted) {
          throw new Error('Analysis interrupted by user');
        }
        
        // Each update is a node name to state update mapping
        for (const [nodeName, nodeUpdate] of Object.entries(update)) {
          if (nodeName) {
            nodesExecuted.push(nodeName);
            this.emitProgress(nodeName, `Processing ${this.getNodeDisplayName(nodeName)}...`);
            
            // The final state will be the accumulated state from all nodes
            if (nodeUpdate) {
              finalState = nodeUpdate as ProjectState;
            }
          }
        }
      }
      
      if (!finalState) {
        throw new Error('Analysis failed to produce final state');
      }
      
      // Save final state
      await this.sessionManager.saveState();
      
      // Transform to result format
      const result = this.transformToAnalysisResult(finalState, {
        sessionId: session.threadId,
        executionTime: Date.now() - startTime,
        nodesExecuted
      });
      
      // Emit aggregated progress
      this.emitAggregatedProgress(nodesExecuted);
      this.emitProgress('complete', 'Analysis complete!');
      return result;
      
    } catch (error) {
      this.isExecuting = false;
      
      if (this.interrupted) {
        this.emitProgress('error', 'Analysis interrupted by user', 'warning');
        throw new Error('Analysis interrupted');
      }
      
      this.emitProgress('error', `Analysis failed: ${(error as Error).message}`, 'error');
      throw error;
      
    } finally {
      this.isExecuting = false;
      this.stopProgressBuffer();
    }
  }
  
  /**
   * Refine an analysis with user responses
   */
  async refine(documentPath: string, options: RefineOptions = {}): Promise<RefinementResult> {
    const startTime = Date.now();
    this.interrupted = false;
    this.isExecuting = true;
    
    // Start progress buffering
    this.startProgressBuffer();
    
    try {
      // Emit start event
      this.emitProgress('start', `Starting refinement of ${documentPath}...`);
      
      // Load document with responses
      this.emitProgress('documentParser', 'Loading document with responses...');
      const rawContent = await this.withErrorHandling(
        () => this.loadDocumentContent(documentPath),
        'Document loading'
      );
      
      // Get existing session (required for refinement)
      this.emitProgress('session', 'Loading previous analysis session...');
      const session = await this.sessionManager.getOrCreateSession(
        documentPath,
        { forceNew: false }
      );
      
      // Verify session has previous analysis
      const checkpointer = this.sessionManager.getCheckpointer();
      const checkpoint = await checkpointer.get({ configurable: { thread_id: session.threadId } });
      
      if (!checkpoint) {
        throw new Error(
          'No previous analysis found for this document. ' +
          'Please run "ideaforge analyze" first.'
        );
      }
      
      // Build graph
      this.emitProgress('graph', 'Building refinement graph...');
      const progressAdapter = this.createProgressAdapter();
      const graph = buildIdeaForgeGraph(
        progressAdapter,
        checkpointer,
        options.modelName
      );
      
      // Get previous state
      const previousState = checkpoint.channel_values as unknown as ProjectState;
      
      // Update state with new content
      const updatedState: Partial<ProjectState> = {
        ...previousState,
        fileContent: rawContent,
        refinementIteration: (previousState.refinementIteration || 0) + 1,
        currentNode: 'responseProcessing' // Start from response processing
      };
      
      // Execute from response processing node
      const config = {
        configurable: { 
          thread_id: session.threadId,
          checkpoint_id: (checkpoint as any).checkpoint_id || (checkpoint as any).id
        }
      };
      
      this.emitProgress('execution', 'Processing responses and refining analysis...');
      const stream = await this.executeWithTimeout(
        () => this.withRetry(
          () => graph.stream(updatedState, config),
          3,
          'Refinement execution'
        ),
        options.timeout || this.DEFAULT_TIMEOUT
      ) as AsyncIterable<Record<string, any>>;
      
      let finalState: ProjectState | null = null;
      const nodesExecuted: string[] = [];
      
      // Process stream updates
      for await (const update of stream) {
        if (this.interrupted) {
          throw new Error('Refinement interrupted by user');
        }
        
        // Each update is a node name to state update mapping
        for (const [nodeName, nodeUpdate] of Object.entries(update)) {
          if (nodeName) {
            nodesExecuted.push(nodeName);
            this.emitProgress(nodeName, `Processing ${this.getNodeDisplayName(nodeName)}...`);
            
            // The final state will be the accumulated state from all nodes
            if (nodeUpdate) {
              finalState = nodeUpdate as ProjectState;
            }
          }
        }
      }
      
      if (!finalState) {
        throw new Error('Refinement failed to produce final state');
      }
      
      // Save updated state
      await this.sessionManager.saveState();
      
      // Transform to refinement result
      const analysisResult = this.transformToAnalysisResult(finalState, {
        sessionId: session.threadId,
        executionTime: Date.now() - startTime,
        nodesExecuted
      });
      
      // Add refinement-specific data
      const refinementResult: RefinementResult = {
        ...analysisResult,
        changelog: this.transformChangelog(finalState.changelog || []),
        refinementIteration: finalState.refinementIteration || 1,
        changesApplied: this.extractChangesApplied(finalState)
      };
      
      // Emit aggregated progress
      this.emitAggregatedProgress(nodesExecuted);
      this.emitProgress('complete', `Refinement complete! Iteration ${refinementResult.refinementIteration}`);
      return refinementResult;
      
    } catch (error) {
      this.isExecuting = false;
      
      if (this.interrupted) {
        this.emitProgress('error', 'Refinement interrupted by user', 'warning');
        throw new Error('Refinement interrupted');
      }
      
      this.emitProgress('error', `Refinement failed: ${(error as Error).message}`, 'error');
      throw error;
      
    } finally {
      this.isExecuting = false;
      this.stopProgressBuffer();
    }
  }
  
  /**
   * Get session information for a document
   */
  async getSession(documentPath: string): Promise<any> {
    return this.sessionManager.getOrCreateSession(documentPath);
  }
  
  /**
   * Clear session for a document
   */
  async clearSession(documentPath: string): Promise<void> {
    // Create a new session with forceNew to effectively clear the old one
    await this.sessionManager.getOrCreateSession(documentPath, { forceNew: true });
  }
  
  /**
   * Enhanced interruption with cleanup
   */
  async interrupt(): Promise<void> {
    if (this.interrupted) {
      return this.cleanupPromise || Promise.resolve();
    }
    
    this.interrupted = true;
    this.emitProgress('system', 'Interruption requested...', 'warning');
    
    // Start cleanup
    this.cleanupPromise = this.performCleanup();
    
    try {
      await this.cleanupPromise;
      this.emit('interrupted');
    } catch (error) {
      this.emitProgress('system', 'Cleanup failed', 'error');
      throw error;
    }
  }
  
  /**
   * Perform cleanup operations
   */
  private async performCleanup(): Promise<void> {
    const cleanupTasks: Promise<void>[] = [];
    
    // Save partial state if executing
    if (this.isExecuting) {
      cleanupTasks.push(
        this.sessionManager.saveState()
          .then(() => {
            this.emitProgress('system', 'Partial state saved', 'info');
          })
          .catch(() => {
            this.emitProgress('system', 'Could not save state', 'warning');
          })
      );
    }
    
    // Run registered cleanup handlers
    this.interruptHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Cleanup handler error:', error);
      }
    });
    
    // Wait for all cleanup
    await Promise.allSettled(cleanupTasks);
    
    // Stop progress buffer
    this.stopProgressBuffer();
  }
  
  /**
   * Register a cleanup handler
   */
  onInterrupt(handler: () => void): void {
    this.interruptHandlers.push(handler);
  }
  
  /**
   * Execute with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.DEFAULT_TIMEOUT
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.interrupt();
        reject(new Error('Operation timed out'));
      }, timeoutMs);
    });
    
    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
  
  /**
   * Emit a progress event
   */
  private emitProgress(node: string, message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const event: ProgressEvent = {
      node,
      message,
      timestamp: new Date(),
      level
    };
    
    // Add to buffer
    this.progressBuffer.push(event);
    
    // Immediate emit for errors
    if (level === 'error') {
      this.flushProgressBuffer();
    }
    
    // Debug logging with emojis
    if (process.env.DEBUG) {
      const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '📍';
      console.log(`${prefix} [${node}] ${message}`);
    }
  }
  
  /**
   * Start progress event buffering
   */
  private startProgressBuffer(): void {
    this.progressFlushInterval = setInterval(() => {
      this.flushProgressBuffer();
    }, 100); // Flush every 100ms
  }
  
  /**
   * Stop progress event buffering
   */
  private stopProgressBuffer(): void {
    if (this.progressFlushInterval) {
      clearInterval(this.progressFlushInterval);
      this.progressFlushInterval = undefined;
    }
    this.flushProgressBuffer();
  }
  
  /**
   * Flush buffered progress events
   */
  private flushProgressBuffer(): void {
    if (this.progressBuffer.length === 0) return;
    
    // Emit all buffered events
    const events = [...this.progressBuffer];
    this.progressBuffer = [];
    
    events.forEach(event => {
      super.emit('progress', event);
    });
  }
  
  /**
   * Create aggregated progress message
   */
  private createProgressSummary(nodesCompleted: string[], totalNodes: number): string {
    const percentage = Math.round((nodesCompleted.length / totalNodes) * 100);
    return `Progress: ${percentage}% (${nodesCompleted.length}/${totalNodes} steps completed)`;
  }
  
  /**
   * Emit aggregated progress
   */
  private emitAggregatedProgress(nodesExecuted: string[]): void {
    const totalNodes = 13; // Total possible nodes
    const summary = this.createProgressSummary(nodesExecuted, totalNodes);
    this.emitProgress('summary', summary);
  }
  
  /**
   * Create progress adapter for nodes
   */
  private createProgressAdapter(): ProgressManager {
    return {
      start: (msg: string) => this.emitProgress('current', msg),
      update: (msg: string) => this.emitProgress('current', msg),
      succeed: (msg: string) => this.emitProgress('current', `✓ ${msg}`),
      fail: (msg: string) => this.emitProgress('current', `✗ ${msg}`, 'error'),
      warn: (msg: string) => this.emitProgress('current', `⚠ ${msg}`, 'warning'),
      info: (msg: string) => this.emitProgress('current', msg),
      stop: () => {},
      isSpinning: () => false
    } as ProgressManager;
  }
  
  /**
   * Get display name for a node
   */
  private getNodeDisplayName(node: string): string {
    const displayNames: Record<string, string> = {
      documentParser: 'document parsing',
      requirementsAnalysis: 'requirements analysis',
      moscowCategorization: 'MoSCoW categorization',
      kanoEvaluation: 'Kano evaluation',
      dependencyAnalysis: 'dependency analysis',
      technologyExtraction: 'technology extraction',
      hackerNewsSearch: 'Hacker News search',
      redditSearch: 'Reddit search',
      additionalResearch: 'additional research',
      researchSynthesis: 'research synthesis',
      researchSynthesisNode: 'research synthesis',
      responseProcessing: 'response processing',
      feedbackIntegration: 'feedback integration',
      changelogGeneration: 'changelog generation'
    };
    
    return displayNames[node] || node;
  }
  
  /**
   * Transform LangGraph state to CLI result format
   */
  private transformToAnalysisResult(
    state: ProjectState,
    metadata: {
      sessionId: string;
      executionTime: number;
      nodesExecuted: string[];
    }
  ): AnalysisResult {
    // Transform MoscowAnalysis from Requirement[] to BrainstormIdea[]
    const moscowAnalysis = state.moscowAnalysis ? {
      must: state.moscowAnalysis.must.map(req => ({
        id: req.id,
        category: 'requirement',
        title: req.title,
        description: req.description
      })),
      should: state.moscowAnalysis.should.map(req => ({
        id: req.id,
        category: 'requirement',
        title: req.title,
        description: req.description
      })),
      could: state.moscowAnalysis.could.map(req => ({
        id: req.id,
        category: 'requirement',
        title: req.title,
        description: req.description
      })),
      wont: state.moscowAnalysis.wont.map(req => ({
        id: req.id,
        category: 'requirement',
        title: req.title,
        description: req.description
      }))
    } : {
      must: [],
      should: [],
      could: [],
      wont: []
    };
    
    // Transform dependencies to expected format
    const dependencies = (state.dependencies || []).map(dep => ({
      from: dep.requirementId,
      to: dep.dependsOn[0] || '',
      type: 'DEPENDS',  // Default type, as it's not in state
      reason: ''        // Default empty, as it's not in state
    }));
    
    // Transform suggestions to expected format
    const suggestions = (state.projectSuggestions || []).map((sugg, idx) => ({
      id: `sugg-${idx}`,
      type: 'enhancement',
      title: sugg.title,
      description: sugg.description,
      rationale: sugg.rationale
    }));
    
    // Transform alternativeIdeas to expected format
    const alternativeIdeas = (state.alternativeIdeas || []).map((alt, idx) => ({
      id: `alt-${idx}`,
      title: alt.title,
      description: alt.description,
      pros: [],  // Not available in current state
      cons: []   // Not available in current state
    }));
    
    return {
      // Core data
      requirements: state.requirements || [],
      userStories: state.userStories || [],
      brainstormIdeas: state.brainstormIdeas || [],
      questionsAnswers: state.questionsAnswers || [],
      
      // Analysis results
      moscowAnalysis,
      kanoAnalysis: state.kanoAnalysis || {
        basic: [],
        performance: [],
        excitement: []
      },
      dependencies,
      suggestions,
      alternativeIdeas,
      researchSynthesis: state.researchSynthesis,
      
      // Metadata
      sessionId: metadata.sessionId,
      executionTime: metadata.executionTime,
      nodesExecuted: metadata.nodesExecuted
    };
  }
  
  /**
   * Load document content as raw string
   */
  private async loadDocumentContent(filePath: string): Promise<string> {
    // For now, we'll read the file directly. In the future, this could use FileHandler
    const fs = await import('fs').then(m => m.promises);
    return fs.readFile(filePath, 'utf-8');
  }
  
  /**
   * Transform changelog entries to expected format
   */
  private transformChangelog(changelog: ProjectState['changelog']): RefinementResult['changelog'] {
    return changelog.map(entry => ({
      version: `v${entry.iteration + 1}`,
      timestamp: new Date(entry.timestamp),
      changes: entry.changes,
      responsesProcessed: entry.changes.filter(c => c.includes('response')).length
    }));
  }
  
  /**
   * Extract list of changes applied during refinement
   */
  private extractChangesApplied(state: ProjectState): string[] {
    const changes: string[] = [];
    
    // Get latest changelog entry
    if (state.changelog && state.changelog.length > 0) {
      const latestEntry = state.changelog[state.changelog.length - 1];
      changes.push(...latestEntry.changes);
    }
    
    // Add response processing summary
    if (state.userResponses && state.userResponses.length > 0) {
      changes.push(`Processed ${state.userResponses.length} user responses`);
    }
    
    return changes;
  }
  
  /**
   * Set up interrupt handlers
   */
  private setupInterruptHandler(): void {
    // Skip in test environment to avoid EventEmitter warnings
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    const cleanup = async () => {
      if (this.isExecuting) {
        this.interrupted = true;
        
        // Try to save partial state
        try {
          await this.sessionManager.saveState();
          this.emitProgress('system', 'Partial state saved', 'warning');
        } catch (error) {
          this.emitProgress('system', 'Could not save state', 'error');
        }
        
        // Emit final event
        this.emit('interrupted');
      }
    };
    
    // Handle both SIGINT (Ctrl+C) and SIGTERM
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
  }
  
  /**
   * Classify and enhance error messages
   */
  private classifyError(error: any, context: string): Error {
    // API Key errors
    if (error.message?.includes('OPENAI_API_KEY') || 
        error.message?.includes('API key')) {
      return new Error(
        'OpenAI API key not configured.\n' +
        '  1. Copy .env.example to .env\n' +
        '  2. Add your OpenAI API key\n' +
        '  3. Try again'
      );
    }
    
    // Rate limit errors
    if (error.response?.status === 429 || 
        error.message?.includes('rate limit')) {
      return new Error(
        'OpenAI rate limit exceeded.\n' +
        '  • Wait a moment and try again\n' +
        '  • Consider using a different model\n' +
        '  • Check your OpenAI usage dashboard'
      );
    }
    
    // File errors
    if (error.code === 'ENOENT') {
      return new Error(
        `File not found: ${error.path}\n` +
        '  • Check the file path is correct\n' +
        '  • Ensure the file exists\n' +
        '  • Try using an absolute path'
      );
    }
    
    // Model errors
    if (error.message?.includes('model')) {
      const AI_MODELS = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'o1-mini', 'o3-mini'];
      return new Error(
        `AI model error: ${error.message}\n` +
        '  • Try a different model with --model\n' +
        `  • Available models: ${AI_MODELS.join(', ')}`
      );
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT') {
      return new Error(
        'Network connection failed.\n' +
        '  • Check your internet connection\n' +
        '  • Verify firewall settings\n' +
        '  • Try again in a moment'
      );
    }
    
    // State errors
    if (error.message?.includes('checkpoint') || 
        error.message?.includes('session')) {
      return new Error(
        `Session error: ${error.message}\n` +
        '  • Try running with --fresh flag\n' +
        `  • Clear session: ideaforge session --clear ${context}`
      );
    }
    
    // Generic error with context
    const enhancedMessage = `${context} failed: ${error.message}`;
    
    if (process.env.DEBUG) {
      console.error('\n[DEBUG] Full error:', error);
      console.error('[DEBUG] Stack trace:', error.stack);
    }
    
    return new Error(enhancedMessage);
  }
  
  /**
   * Wrap operations with error handling
   */
  private async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.classifyError(error, context);
    }
  }
  
  /**
   * Retry operation with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string = 'Operation'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry certain errors
        if (error.message?.includes('API key') ||
            error.code === 'ENOENT' ||
            this.interrupted) {
          throw error;
        }
        
        // Check if retryable
        const isRetryable = 
          error.response?.status === 429 || // Rate limit
          error.code === 'ETIMEDOUT' ||      // Timeout
          error.code === 'ECONNRESET';       // Connection reset
        
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }
        
        // Calculate backoff
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        
        this.emitProgress(
          'retry',
          `${context} failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffMs}ms...`,
          'warning'
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw lastError;
  }
} 