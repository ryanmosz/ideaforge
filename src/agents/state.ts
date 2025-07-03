import { BaseMessage } from '@langchain/core/messages';
import { Requirement, UserStory, BrainstormIdea, QuestionAnswer } from './types';

/**
 * The main state schema for the IdeaForge agent
 * This represents all data that flows through the graph
 */
export interface ProjectState {
  // Input data
  filePath: string;
  fileContent: string;
  
  // Parsed document structure
  requirements: Requirement[];
  userStories: UserStory[];
  brainstormIdeas: BrainstormIdea[];
  questionsAnswers: QuestionAnswer[];
  
  // Analysis results
  moscowAnalysis: {
    must: Requirement[];
    should: Requirement[];
    could: Requirement[];
    wont: Requirement[];
  };
  
  kanoAnalysis: {
    basic: Requirement[];
    performance: Requirement[];
    excitement: Requirement[];
  };
  
  dependencies: {
    requirementId: string;
    dependsOn: string[];
  }[];
  
  // Research findings
  extractedTechnologies: string[];
  researchTopics: string[];
  
  hackerNewsResults: {
    title: string;
    url: string;
    summary: string;
    relevance: number;
  }[];
  
  redditResults: {
    title: string;
    url: string;
    summary: string;
    subreddit: string;
    relevance: number;
  }[];
  
  additionalResearchResults: {
    topic: string;
    findings: string;
  }[];
  
  researchSynthesis: string;
  
  // Refinement data
  userResponses: {
    tag: string;
    response: string;
    section: string;
  }[];
  
  refinementIteration: number;
  changelog: {
    iteration: number;
    changes: string[];
    timestamp: string;
  }[];
  
  // Generated content
  projectSuggestions: {
    title: string;
    description: string;
    rationale: string;
  }[];
  
  alternativeIdeas: {
    title: string;
    description: string;
    differentiator: string;
  }[];
  
  techStackRecommendations: {
    technology: string;
    purpose: string;
    alternatives: string[];
  }[];
  
  riskAssessment: {
    risk: string;
    impact: 'high' | 'medium' | 'low';
    likelihood: 'high' | 'medium' | 'low';
    mitigation: string;
  }[];
  
  // Control flow
  currentNode: string;
  nextNode: string | null;
  errors: string[];
  
  // Message history for debugging
  messages: BaseMessage[];
} 