import { BaseMessage } from '@langchain/core/messages';
import { Requirement, UserStory, BrainstormIdea, QuestionAnswer } from './types';

/**
 * State channel definitions for LangGraph
 * Each channel defines how state is managed and updated
 */
export const stateChannels = {
  // Input channels
  filePath: {
    value: (x: string, y?: string) => y ?? x,
    default: () => ''
  },
  fileContent: {
    value: (x: string, y?: string) => y ?? x,
    default: () => ''
  },
  
  // Array channels that append values
  requirements: {
    value: (x: Requirement[], y?: Requirement[]) => y ?? x,
    default: () => [] as Requirement[]
  },
  userStories: {
    value: (x: UserStory[], y?: UserStory[]) => y ?? x,
    default: () => [] as UserStory[]
  },
  brainstormIdeas: {
    value: (x: BrainstormIdea[], y?: BrainstormIdea[]) => y ?? x,
    default: () => [] as BrainstormIdea[]
  },
  questionsAnswers: {
    value: (x: QuestionAnswer[], y?: QuestionAnswer[]) => y ?? x,
    default: () => [] as QuestionAnswer[]
  },
  
  // Analysis results - replace on update
  moscowAnalysis: {
    value: (x: any, y?: any) => y ?? x,
    default: () => ({ must: [], should: [], could: [], wont: [] })
  },
  kanoAnalysis: {
    value: (x: any, y?: any) => y ?? x,
    default: () => ({ basic: [], performance: [], excitement: [] })
  },
  dependencies: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  
  // Research channels
  extractedTechnologies: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [] as string[]
  },
  researchTopics: {
    value: (x: string[], y?: string[]) => y ?? x,
    default: () => [] as string[]
  },
  hackerNewsResults: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  redditResults: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  additionalResearchResults: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  researchSynthesis: {
    value: (x: string, y?: string) => y ?? x,
    default: () => ''
  },
  
  // Refinement channels
  userResponses: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  refinementIteration: {
    value: (x: number, y?: number) => y ?? x,
    default: () => 0
  },
  changelog: {
    value: (x: any[], y?: any[]) => [...x, ...(y ?? [])], // Append new changes
    default: () => []
  },
  
  // Generated content
  projectSuggestions: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  alternativeIdeas: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  techStackRecommendations: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  riskAssessment: {
    value: (x: any[], y?: any[]) => y ?? x,
    default: () => []
  },
  
  // Control flow
  currentNode: {
    value: (x: string, y?: string) => y ?? x,
    default: () => 'start'
  },
  nextNode: {
    value: (x: string | null, y?: string | null) => y ?? x,
    default: () => null as string | null
  },
  errors: {
    value: (x: string[], y?: string[]) => [...x, ...(y ?? [])], // Append errors
    default: () => [] as string[]
  },
  
  // Message history
  messages: {
    value: (x: BaseMessage[], y?: BaseMessage[]) => [...x, ...(y ?? [])], // Append messages
    default: () => [] as BaseMessage[]
  }
}; 