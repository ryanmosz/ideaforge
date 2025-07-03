import { RequirementsAnalysisNode } from '../../../src/agents/nodes/RequirementsAnalysisNode';
import { ProjectState } from '../../../src/agents/state';
import { SystemMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn()
  }))
}));

describe('RequirementsAnalysisNode', () => {
  let node: RequirementsAnalysisNode;
  let mockInvoke: jest.Mock;
  let initialState: ProjectState;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create node and get mock
    node = new RequirementsAnalysisNode();
    const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
    mockInvoke = ChatOpenAI.mock.results[0].value.invoke;
    
    // Set up initial state
    initialState = {
      filePath: 'test-project.org',
      fileContent: '',
      requirements: [
        {
          id: 'REQ-1',
          title: 'User authentication',
          description: 'The system must support user authentication with OAuth2'
        },
        {
          id: 'REQ-2',
          title: 'Real-time updates',
          description: 'The system should provide real-time data updates'
        },
        {
          id: 'REQ-3',
          title: 'Export functionality',
          description: 'Users must be able to export data in multiple formats'
        }
      ],
      userStories: [
        {
          id: 'US-1',
          actor: 'developer',
          action: 'integrate with existing systems',
          benefit: 'I can leverage current infrastructure'
        }
      ],
      brainstormIdeas: [],
      questionsAnswers: [
        {
          id: 'QA-1',
          question: 'What is the expected user base?',
          answer: '1000-5000 concurrent users'
        }
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
      currentNode: 'DocumentParserNode',
      nextNode: 'RequirementsAnalysisNode',
      errors: [],
      messages: []
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node).toBeInstanceOf(RequirementsAnalysisNode);
    });
    
    it('should handle empty requirements', async () => {
      initialState.requirements = [];
      
      const result = await node.invoke(initialState);
      
      expect(result.currentNode).toBe('RequirementsAnalysisNode');
      expect(result.nextNode).toBe('MoscowCategorizationNode');
      expect(result.messages).toHaveLength(1);
      expect(result.messages![0]).toBeInstanceOf(SystemMessage);
      expect((result.messages![0] as SystemMessage).content).toContain('No requirements found');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
    
    it('should handle LLM errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('API Error'));
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('RequirementsAnalysisNode error: API Error');
      expect(result.currentNode).toBe('RequirementsAnalysisNode');
      expect(result.nextNode).toBe('MoscowCategorizationNode'); // Still continues
    });
  });
  
  describe('Requirements analysis', () => {
    beforeEach(() => {
      // Set up mock responses
      mockInvoke
        .mockResolvedValueOnce({ content: 'Project goal: Build a real-time collaboration platform' })
        .mockResolvedValueOnce({ content: '- Authentication: Security and access control\n- Real-time: Live collaboration features' })
        .mockResolvedValueOnce({ content: '1. Secure authentication system\n2. Low-latency real-time updates' });
    });
    
    it('should analyze requirements successfully', async () => {
      const result = await node.invoke(initialState);
      
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(result.currentNode).toBe('RequirementsAnalysisNode');
      expect(result.nextNode).toBe('MoscowCategorizationNode');
      expect(result.errors).toBeUndefined();
      
      // Check message was added
      expect(result.messages).toHaveLength(1);
      const message = result.messages![0] as SystemMessage;
      expect(message.content).toContain('Requirements Analysis Complete');
      expect(message.content).toContain('Project Goals:');
      expect(message.content).toContain('Build a real-time collaboration platform');
      expect(message.content).toContain('Key Themes:');
      expect(message.content).toContain('Authentication: Security and access control');
      expect(message.content).toContain('Critical Success Factors:');
      expect(message.content).toContain('Secure authentication system');
    });
    
    it('should include context from user stories and Q&A', async () => {
      await node.invoke(initialState);
      
      // Check that context was included in prompts
      const calls = mockInvoke.mock.calls;
      
      // Each call should include context
      calls.forEach(call => {
        const messages = call[0];
        const userMessage = messages[1];
        expect(userMessage.content).toContain('User Stories:');
        expect(userMessage.content).toContain('As developer, I want to integrate with existing systems');
        expect(userMessage.content).toContain('Project Q&A:');
        expect(userMessage.content).toContain('What is the expected user base?');
        expect(userMessage.content).toContain('1000-5000 concurrent users');
      });
    });
    
    it('should format requirements correctly', async () => {
      await node.invoke(initialState);
      
      // Check requirements formatting in prompts
      const firstCall = mockInvoke.mock.calls[0];
      const userMessage = firstCall[0][1];
      
      expect(userMessage.content).toContain('[REQ-1] The system must support user authentication with OAuth2');
      expect(userMessage.content).toContain('[REQ-2] The system should provide real-time data updates');
      expect(userMessage.content).toContain('[REQ-3] Users must be able to export data in multiple formats');
    });
  });
  
  describe('Analysis methods', () => {
    it('should call all three analysis methods', async () => {
      mockInvoke
        .mockResolvedValueOnce({ content: 'Goals analysis' })
        .mockResolvedValueOnce({ content: 'Themes analysis' })
        .mockResolvedValueOnce({ content: 'Critical factors analysis' });
      
      await node.invoke(initialState);
      
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      
      // Check each method was called with appropriate prompts
      const [goalsCall, themesCall, factorsCall] = mockInvoke.mock.calls;
      
      // Project goals call
      expect(goalsCall[0][0].content).toContain('senior project analyst');
      expect(goalsCall[0][1].content).toContain('Identify the main project goals');
      
      // Key themes call
      expect(themesCall[0][0].content).toContain('requirements analyst');
      expect(themesCall[0][1].content).toContain('Extract key themes');
      
      // Critical factors call
      expect(factorsCall[0][0].content).toContain('project strategist');
      expect(factorsCall[0][1].content).toContain('List critical success factors');
    });
  });
  
  describe('Edge cases', () => {
    it('should handle missing user stories and Q&A', async () => {
      initialState.userStories = [];
      initialState.questionsAnswers = [];
      
      mockInvoke
        .mockResolvedValueOnce({ content: 'Goals' })
        .mockResolvedValueOnce({ content: 'Themes' })
        .mockResolvedValueOnce({ content: 'Factors' });
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeUndefined();
      
      // Check that prompts don't include empty sections
      const firstCall = mockInvoke.mock.calls[0];
      const userMessage = firstCall[0][1];
      expect(userMessage.content).not.toContain('User Stories:');
      expect(userMessage.content).not.toContain('Project Q&A:');
    });
    
    it('should preserve existing messages', async () => {
      const existingMessage = new SystemMessage('Previous analysis');
      initialState.messages = [existingMessage];
      
      mockInvoke
        .mockResolvedValueOnce({ content: 'Goals' })
        .mockResolvedValueOnce({ content: 'Themes' })
        .mockResolvedValueOnce({ content: 'Factors' });
      
      const result = await node.invoke(initialState);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages![0]).toBe(existingMessage);
      expect(result.messages![1]).toBeInstanceOf(SystemMessage);
    });
  });
}); 