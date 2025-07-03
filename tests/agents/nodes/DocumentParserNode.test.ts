import { DocumentParserNode } from '../../../src/agents/nodes/DocumentParserNode';
import { ProjectState } from '../../../src/agents/state';

describe('DocumentParserNode', () => {
  let node: DocumentParserNode;
  let initialState: ProjectState;
  
  beforeEach(() => {
    node = new DocumentParserNode();
    initialState = {
      filePath: 'test.org',
      fileContent: '',
      requirements: [],
      userStories: [],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: { must: [], should: [], could: [], wont: [] },
      kanoAnalysis: { basic: [], performance: [], excitement: [] },
      dependencies: [],
      extractedTechnologies: [],
      researchTopics: [],
      hackerNewsResults: [],
      redditResults: [],
      additionalResearchResults: [],
      researchSynthesis: '',
      userResponses: [],
      refinementIteration: 0,
      changelog: [],
      projectSuggestions: [],
      alternativeIdeas: [],
      techStackRecommendations: [],
      riskAssessment: [],
      currentNode: '',
      nextNode: null,
      errors: [],
      messages: []
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node).toBeInstanceOf(DocumentParserNode);
    });
    
    it('should handle empty content', async () => {
      const result = await node.invoke(initialState);
      
      expect(result.requirements).toEqual([]);
      expect(result.userStories).toEqual([]);
      expect(result.brainstormIdeas).toEqual([]);
      expect(result.questionsAnswers).toEqual([]);
      expect(result.currentNode).toBe('DocumentParserNode');
      expect(result.nextNode).toBe('RequirementsAnalysisNode');
    });
    
    it('should handle parse errors gracefully', async () => {
      // Create invalid content that might cause parser errors
      initialState.fileContent = '* Invalid [[ bracket structure';
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('DocumentParserNode:');
      expect(result.nextNode).toBe('RequirementsAnalysisNode');
    });
  });
  
  describe('Requirements extraction', () => {
    it('should extract requirements from org-mode content', async () => {
      initialState.fileContent = `* Project Overview
** Requirements
The system must support user authentication
The system should have a dashboard view
The application could include social features
The system must handle file uploads`;
      
      const result = await node.invoke(initialState);
      
      expect(result.requirements).toHaveLength(4);
      expect(result.requirements![0]).toEqual({
        id: 'REQ-1',
        title: 'The system must support user authentication',
        description: 'The system must support user authentication'
      });
      expect(result.requirements![3].id).toBe('REQ-4');
    });
  });
  
  describe('User stories extraction', () => {
    it('should extract properly formatted user stories', async () => {
      initialState.fileContent = `* User Stories
As a developer, I want to analyze project ideas, so that I can plan implementation effectively
As an admin, I want to export reports
As a user, I want to save my progress, so that I can continue later`;
      
      const result = await node.invoke(initialState);
      
      expect(result.userStories).toHaveLength(3);
      expect(result.userStories![0]).toEqual({
        id: 'US-1',
        actor: 'developer',
        action: 'analyze project ideas',
        benefit: 'I can plan implementation effectively'
      });
      expect(result.userStories![1]).toEqual({
        id: 'US-2',
        actor: 'admin',
        action: 'export reports',
        benefit: ''
      });
    });
    
    it('should handle various user story formats', async () => {
      initialState.fileContent = `** User Stories
As an end user, I want to login quickly
As a system administrator, I want to monitor performance, so that I can optimize the system`;
      
      const result = await node.invoke(initialState);
      
      expect(result.userStories).toHaveLength(2);
      expect(result.userStories![0].actor).toBe('end user');
      expect(result.userStories![1].benefit).toBe('I can optimize the system');
    });
  });
  
  describe('Brainstorming ideas extraction', () => {
    it('should extract categorized brainstorming ideas', async () => {
      initialState.fileContent = `** Brainstorming
*** Features
Add AI-powered suggestions
Implement real-time collaboration
*** Technical
Use microservices architecture
Implement caching layer`;
      
      const result = await node.invoke(initialState);
      
      expect(result.brainstormIdeas).toHaveLength(4);
      expect(result.brainstormIdeas![0]).toEqual({
        id: 'IDEA-1',
        category: 'Features',
        title: 'Add AI-powered suggestions',
        description: 'Add AI-powered suggestions'
      });
      expect(result.brainstormIdeas![2].category).toBe('Technical');
    });
    
    it('should use General category for uncategorized ideas', async () => {
      initialState.fileContent = `** Brainstorming
Consider mobile app version
Add analytics dashboard`;
      
      const result = await node.invoke(initialState);
      
      expect(result.brainstormIdeas).toHaveLength(2);
      expect(result.brainstormIdeas![0].category).toBe('General');
    });
  });
  
  describe('Q&A extraction', () => {
    it('should extract question-answer pairs', async () => {
      initialState.fileContent = `** Questions and Answers
Q: What is the target audience?
A: Developers and project managers who need to plan software projects
Q: What platforms will be supported?
A: Initially web, with mobile apps planned for the future
Question: How will authentication work?
Answer: OAuth2 with support for Google and GitHub`;
      
      const result = await node.invoke(initialState);
      
      expect(result.questionsAnswers).toHaveLength(3);
      expect(result.questionsAnswers![0]).toEqual({
        question: 'What is the target audience?',
        answer: 'Developers and project managers who need to plan software projects'
      });
      expect(result.questionsAnswers![2].question).toBe('How will authentication work?');
    });
    
    it('should handle multi-line questions and answers', async () => {
      initialState.fileContent = `** Questions and Answers
Q: What are the main features
we need to implement?
A: User authentication,
project analysis,
and report generation`;
      
      const result = await node.invoke(initialState);
      
      expect(result.questionsAnswers).toHaveLength(1);
      expect(result.questionsAnswers![0].question).toBe('What are the main features we need to implement?');
      expect(result.questionsAnswers![0].answer).toBe('User authentication, project analysis, and report generation');
    });
  });
  
  describe('Integration test', () => {
    it('should extract all types of content from a complete document', async () => {
      initialState.fileContent = `#+TITLE: IdeaForge Project

* Overview
AI-powered project planning tool

** Requirements
Must support org-mode parsing
Should integrate with LangGraph
Must have export functionality

** User Stories
As a developer, I want to analyze my ideas, so that I can create better plans
As a team lead, I want to export reports, so that I can share with stakeholders

** Brainstorming
*** Core Features
AI analysis engine
Template library
*** Integrations
GitHub integration
Slack notifications

** Questions and Answers
Q: What AI model will be used?
A: GPT-4 for advanced analysis
Q: Is there a free tier?
A: Yes, limited to 5 projects per month`;
      
      const result = await node.invoke(initialState);
      
      expect(result.requirements).toHaveLength(3);
      expect(result.userStories).toHaveLength(2);
      expect(result.brainstormIdeas).toHaveLength(4);
      expect(result.questionsAnswers).toHaveLength(2);
      expect(result.errors).toBeUndefined();
      expect(result.nextNode).toBe('RequirementsAnalysisNode');
    });
  });
}); 