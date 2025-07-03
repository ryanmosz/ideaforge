// Common types used across the agent system

export interface Requirement {
  id: string;
  title: string;
  description: string;
  moscowCategory?: 'must' | 'should' | 'could' | 'wont';
  kanoCategory?: 'basic' | 'performance' | 'excitement';
  kanoRationale?: string;
}

export interface UserStory {
  id: string;
  actor: string;
  action: string;
  benefit: string;
}

export interface BrainstormIdea {
  id: string;
  category: string;
  title: string;
  description: string;
}

export interface QuestionAnswer {
  id: string;
  question: string;
  answer: string;
} 