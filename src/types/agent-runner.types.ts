// Import types from agents module
import { 
  Requirement,
  UserStory,
  BrainstormIdea,
  QuestionAnswer 
} from '../agents/types';

// Define types that don't exist yet - will be implemented in future tasks
export interface MoscowAnalysis {
  must: BrainstormIdea[];
  should: BrainstormIdea[];
  could: BrainstormIdea[];
  wont: BrainstormIdea[];
}

export interface KanoAnalysis {
  basic: Requirement[];
  performance: Requirement[];
  excitement: Requirement[];
}

export interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  rationale: string;
}

export interface Alternative {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
}

// Options for analysis
export interface AnalyzeOptions {
  outputPath?: string;
  modelName?: string;
  forceNewSession?: boolean;
  timeout?: number;
}

// Options for refinement
export interface RefineOptions {
  outputPath?: string;
  modelName?: string;
  continueSession?: boolean;
  timeout?: number;
}

// Progress event structure
export interface ProgressEvent {
  node: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
}

// Result structure matching CLI expectations
export interface AnalysisResult {
  // Core data (matches existing format)
  requirements: Requirement[];
  userStories: UserStory[];
  brainstormIdeas: BrainstormIdea[];
  questionsAnswers: QuestionAnswer[];
  
  // Enhanced with LangGraph analysis
  moscowAnalysis: MoscowAnalysis;
  kanoAnalysis: KanoAnalysis;
  dependencies: Array<{
    from: string;
    to: string;
    type: string;
    reason: string;
  }>;
  suggestions: Suggestion[];
  alternativeIdeas: Alternative[];
  researchSynthesis?: string;
  
  // Metadata
  sessionId: string;
  executionTime: number;
  nodesExecuted: string[];
  
  // For org-mode export compatibility
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
  };
}

// Result for refinement operations
export interface RefinementResult extends AnalysisResult {
  changelog: Array<{
    version: string;
    timestamp: Date;
    changes: string[];
    responsesProcessed: number;
  }>;
  refinementIteration: number;
  changesApplied: string[];
} 