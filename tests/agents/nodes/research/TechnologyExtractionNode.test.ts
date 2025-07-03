import { TechnologyExtractionNode } from '../../../../src/agents/nodes/research/TechnologyExtractionNode';
import { ProjectState } from '../../../../src/agents/state';
import { SystemMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn()
  }))
}));

describe('TechnologyExtractionNode', () => {
  let node: TechnologyExtractionNode;
  let mockInvoke: jest.Mock;
  let initialState: ProjectState;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create node and get mock
    node = new TechnologyExtractionNode();
    const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
    mockInvoke = ChatOpenAI.mock.results[0].value.invoke;
    
    // Set up initial state with all required fields
    initialState = {
      filePath: '/test/project.org',
      fileContent: '',
      requirements: [
        { id: 'REQ-1', title: 'Web Dashboard', description: 'Build a React dashboard with real-time updates' },
        { id: 'REQ-2', title: 'API Backend', description: 'RESTful API using Node.js and PostgreSQL' },
        { id: 'REQ-3', title: 'Authentication', description: 'Implement OAuth 2.0 authentication' }
      ],
      userStories: [
        { id: 'US-1', actor: 'Developer', action: 'deploy using Docker', benefit: 'ensure consistent environments' }
      ],
      brainstormIdeas: [
        { id: 'IDEA-1', category: 'Architecture', title: 'Microservices', description: 'Use Kubernetes for orchestration' },
        { id: 'IDEA-2', category: 'Frontend', title: 'UI Framework', description: 'Consider Vue.js or Angular as alternatives' }
      ],
      questionsAnswers: [
        { id: 'QA-1', question: 'What tech stack should we use?', answer: 'MERN stack with TypeScript' }
      ],
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
      messages: [],
      errors: [],
      currentNode: 'DependencyAnalysisNode',
      nextNode: null
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node.invoke).toBeDefined();
    });
    
    it('should handle empty content', async () => {
      const state = {
        ...initialState,
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: []
      };
      
      const result = await node.invoke(state);
      
      expect(result.extractedTechnologies).toEqual([]);
      expect(result.currentNode).toBe('TechnologyExtractionNode');
      expect(result.nextNode).toBe('HackerNewsSearchNode');
      expect(result.messages![0].content).toContain('No content available');
    });
    
    it('should handle LLM errors gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('API Error'));
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('TechnologyExtractionNode error: API Error');
      expect(result.nextNode).toBe('HackerNewsSearchNode');
    });
  });
  
  describe('Technology extraction', () => {
    it('should extract technologies from all content types', async () => {
      const mockResponse = {
        content: `React
Node.js
PostgreSQL
Docker
Kubernetes
TypeScript
OAuth 2.0
GraphQL`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.extractedTechnologies).toBeDefined();
      expect(result.extractedTechnologies).toContain('React');
      expect(result.extractedTechnologies).toContain('Node.js');
      expect(result.extractedTechnologies).toContain('PostgreSQL');
      expect(result.extractedTechnologies).toContain('Docker');
    });
    
    it('should combine AI and explicit extraction', async () => {
      const mockResponse = {
        content: `Express.js
MongoDB
Redis`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      // Should include both AI extracted and explicitly mentioned
      expect(result.extractedTechnologies).toContain('Express.js'); // From AI
      expect(result.extractedTechnologies).toContain('React'); // From requirements
      expect(result.extractedTechnologies).toContain('PostgreSQL'); // From requirements
      expect(result.extractedTechnologies).toContain('Docker'); // From user stories
    });
    
    it('should deduplicate technologies', async () => {
      const mockResponse = {
        content: `React
React
Node.js
Node.js`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      // Count occurrences of React
      const reactCount = result.extractedTechnologies!.filter(t => t === 'React').length;
      expect(reactCount).toBe(1);
    });
  });
  
  describe('Explicit technology extraction', () => {
    it('should extract programming languages', async () => {
      const state = {
        ...initialState,
        requirements: [
          { id: 'REQ-1', title: 'Backend', description: 'Build with Python or Java' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(state);
      
      expect(result.extractedTechnologies).toContain('Python');
      expect(result.extractedTechnologies).toContain('Java');
    });
    
    it('should extract and normalize technology names', async () => {
      const state = {
        ...initialState,
        requirements: [
          { id: 'REQ-1', title: 'Stack', description: 'Using node.js, react.js, and postgres' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(state);
      
      expect(result.extractedTechnologies).toContain('Node.js'); // Normalized
      expect(result.extractedTechnologies).toContain('React'); // Normalized
      expect(result.extractedTechnologies).toContain('PostgreSQL'); // Normalized
    });
    
    it('should extract cloud providers', async () => {
      const state = {
        ...initialState,
        brainstormIdeas: [
          { id: 'IDEA-1', category: 'Deploy', title: 'Cloud', description: 'Deploy on AWS or Google Cloud' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(state);
      
      expect(result.extractedTechnologies).toContain('AWS');
      expect(result.extractedTechnologies).toContain('Google Cloud');
    });
  });
  
  describe('Research topic generation', () => {
    it('should generate comparison topics', async () => {
      const mockResponse = {
        content: `React
Angular
Vue.js`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.researchTopics).toBeDefined();
      const comparisonTopic = result.researchTopics!.find(t => t.includes('vs'));
      expect(comparisonTopic).toBeDefined();
    });
    
    it('should generate best practices topics', async () => {
      const mockResponse = {
        content: `React
Node.js`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      const currentYear = new Date().getFullYear();
      expect(result.researchTopics).toContain(`React best practices ${currentYear}`);
      expect(result.researchTopics).toContain(`Node.js best practices ${currentYear}`);
    });
    
    it('should generate integration topics', async () => {
      const mockResponse = {
        content: `React
Node.js
Docker
Kubernetes`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.researchTopics).toContain('React Node.js full stack setup');
      expect(result.researchTopics).toContain('Docker Kubernetes deployment guide');
    });
  });
  
  describe('Project-specific topics', () => {
    it('should generate real-time topics when requirements mention real-time', async () => {
      mockInvoke.mockResolvedValueOnce({ content: 'Node.js' });
      
      const result = await node.invoke(initialState);
      
      expect(result.researchTopics).toContain('WebSocket vs Server-Sent Events');
      expect(result.researchTopics).toContain('Socket.io real-time implementation');
    });
    
    it('should generate auth topics when requirements mention authentication', async () => {
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(initialState);
      
      expect(result.researchTopics).toContain('JWT vs session authentication');
      expect(result.researchTopics).toContain('OAuth 2.0 implementation guide');
    });
  });
  
  describe('Content gathering', () => {
    it('should include technical Q&A only', async () => {
      const state = {
        ...initialState,
        questionsAnswers: [
          { id: 'QA-1', question: 'What database should we use?', answer: 'PostgreSQL' },
          { id: 'QA-2', question: 'What is the budget?', answer: '$50,000' },
          { id: 'QA-3', question: 'Which framework is best?', answer: 'React with Next.js' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      await node.invoke(state);
      
      // Check that technical Q&A were included in the prompt
      const userMessage = mockInvoke.mock.calls[0][0][1].content;
      expect(userMessage).toContain('What database should we use?');
      expect(userMessage).toContain('Which framework is best?');
      expect(userMessage).not.toContain('What is the budget?'); // Non-technical
    });
  });
  
  describe('Message generation', () => {
    it('should generate comprehensive extraction message', async () => {
      const mockResponse = {
        content: `React
Node.js`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      const message = result.messages![0].content;
      expect(message).toContain('Technology Extraction Complete:');
      expect(message).toContain('Found');
      expect(message).toContain('technologies:');
      expect(message).toContain('Generated');
      expect(message).toContain('research topics:');
    });
    
    it('should preserve existing messages', async () => {
      const existingMessage = new SystemMessage('Previous analysis');
      const stateWithMessages = {
        ...initialState,
        messages: [existingMessage]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(stateWithMessages);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages![0]).toBe(existingMessage);
    });
  });
  
  describe('Edge cases', () => {
    it('should filter out invalid lines from AI response', async () => {
      const mockResponse = {
        content: `- React
1. Node.js
PostgreSQL
- MongoDB
2. Redis

Express.js`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      // Should only include clean technology names
      expect(result.extractedTechnologies).toContain('PostgreSQL');
      expect(result.extractedTechnologies).toContain('Express.js');
      expect(result.extractedTechnologies).not.toContain('- React');
      expect(result.extractedTechnologies).not.toContain('1. Node.js');
    });
    
    it('should handle phrase extraction patterns', async () => {
      const state = {
        ...initialState,
        requirements: [
          { id: 'REQ-1', title: 'Stack', description: 'Built with MERN stack, using MongoDB database, deployed on Heroku' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      const result = await node.invoke(state);
      
      expect(result.extractedTechnologies).toContain('MongoDB');
      expect(result.extractedTechnologies).toContain('Heroku');
    });
  });
}); 