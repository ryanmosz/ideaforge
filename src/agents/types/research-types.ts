/**
 * Research-related types for LangGraph agents
 */

export type ResearchSource = 'hackernews' | 'reddit' | 'documentation' | 'other';

export interface ResearchResult {
  id: string;
  source: ResearchSource;
  title: string;
  url: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface ResearchSummary {
  query: string;
  timestamp: number;
  totalResults: number;
  topResults: ResearchResult[];
  insights: string[];
  recommendations: string[];
}

export interface ResearchMetadata {
  sessionId: string;
  searchedAt: number;
  cacheKey?: string;
  processingTime?: number;
  errors?: string[];
} 