import { KanoEvaluationNode } from '../../../src/agents/nodes/KanoEvaluationNode';
import { ProjectState } from '../../../src/agents/state';
import { SystemMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn()
  }))
}));

describe('KanoEvaluationNode', () => {
  let node: KanoEvaluationNode;
  let mockInvoke: jest.Mock;
  let initialState: ProjectState;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create node and get mock
    node = new KanoEvaluationNode();
    const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
    mockInvoke = ChatOpenAI.mock.results[0].value.invoke;
    
    // Set up initial state with requirements and MoSCoW analysis
    initialState = {
      filePath: 'test-project.org',
      fileContent: '',
      requirements: [
        {
          id: 'REQ-1',
          title: 'User authentication',
          description: 'The system must support secure user login'
        },
        {
          id: 'REQ-2',
          title: 'Performance dashboard',
          description: 'Display real-time performance metrics'
        },
        {
          id: 'REQ-3',
          title: 'AI suggestions',
          description: 'Provide intelligent suggestions based on user behavior'
        },
        {
          id: 'REQ-4',
          title: 'Data export',
          description: 'Export data in multiple formats'
        },
        {
          id: 'REQ-5',
          title: 'Dark mode',
          description: 'Support dark theme for better UX'
        }
      ],
      userStories: [
        {
          id: 'US-1',
          actor: 'user',
          action: 'login securely',
          benefit: 'my data is protected'
        },
        {
          id: 'US-2',
          actor: 'power user',
          action: 'see real-time metrics',
          benefit: 'I can make informed decisions'
        }
      ],
      brainstormIdeas: [
        {
          id: 'IDEA-1',
          category: 'Innovative Features',
          title: 'AI-powered insights',
          description: 'Machine learning for predictive analytics'
        }
      ],
      questionsAnswers: [
        {
          id: 'QA-1',
          question: 'What features would surprise and delight users?',
          answer: 'AI-powered suggestions and beautiful visualizations'
        }
      ],
      moscowAnalysis: {
        must: [
          { id: 'REQ-1', title: 'User authentication', description: 'The system must support secure user login' }
        ],
        should: [
          { id: 'REQ-2', title: 'Performance dashboard', description: 'Display real-time performance metrics' }
        ],
        could: [
          { id: 'REQ-3', title: 'AI suggestions', description: 'Provide intelligent suggestions based on user behavior' },
          { id: 'REQ-5', title: 'Dark mode', description: 'Support dark theme for better UX' }
        ],
        wont: [
          { id: 'REQ-4', title: 'Data export', description: 'Export data in multiple formats' }
        ]
      },
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
      currentNode: 'MoscowCategorizationNode',
      nextNode: 'KanoEvaluationNode',
      errors: [],
      messages: []
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node).toBeInstanceOf(KanoEvaluationNode);
    });
    
    it('should handle empty requirements', async () => {
      initialState.requirements = [];
      
      const result = await node.invoke(initialState);
      
      expect(result.currentNode).toBe('KanoEvaluationNode');
      expect(result.nextNode).toBe('DependencyAnalysisNode');
      expect(result.messages).toHaveLength(1);
      expect((result.messages![0] as SystemMessage).content).toContain('No requirements to evaluate');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
    
    it('should handle LLM errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('API Error'));
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('KanoEvaluationNode error: API Error');
      expect(result.currentNode).toBe('KanoEvaluationNode');
      expect(result.nextNode).toBe('DependencyAnalysisNode'); // Still continues
    });
  });
  
  describe('Kano evaluation', () => {
    it('should evaluate requirements successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `BASIC: REQ-1 (Users expect secure login)
PERFORMANCE: REQ-2 (More metrics means better insights), REQ-4 (More export formats better)
EXCITEMENT: REQ-3 (AI suggestions would delight users), REQ-5 (Dark mode is a nice surprise)`
      });
      
      const result = await node.invoke(initialState);
      
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result.kanoAnalysis).toBeDefined();
      expect(result.kanoAnalysis!.basic).toHaveLength(1);
      expect(result.kanoAnalysis!.performance).toHaveLength(2);
      expect(result.kanoAnalysis!.excitement).toHaveLength(2);
      
      // Check specific evaluations
      expect(result.kanoAnalysis!.basic[0].id).toBe('REQ-1');
      expect(result.kanoAnalysis!.basic[0].kanoCategory).toBe('basic');
      expect(result.kanoAnalysis!.basic[0].kanoRationale).toBe('Users expect secure login');
      
      expect(result.kanoAnalysis!.excitement.map(r => r.id)).toContain('REQ-3');
      expect(result.kanoAnalysis!.excitement.map(r => r.id)).toContain('REQ-5');
    });
    
    it('should include MoSCoW context in the prompt', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: REQ-1'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('MoSCoW Categorization:');
      expect(userMessage.content).toContain('Must Have: REQ-1');
      expect(userMessage.content).toContain('Should Have: REQ-2');
      expect(userMessage.content).toContain('Could Have: REQ-3, REQ-5');
      expect(userMessage.content).toContain('Won\'t Have: REQ-4');
    });
    
    it('should handle missing MoSCoW analysis', async () => {
      initialState.moscowAnalysis = { must: [], should: [], could: [], wont: [] };
      
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: REQ-1'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeUndefined();
      expect(result.kanoAnalysis).toBeDefined();
    });
  });
  
  describe('Context inclusion', () => {
    it('should include user stories in context', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: REQ-1'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('User Stories (to understand expectations):');
      expect(userMessage.content).toContain('As user, I want to login securely');
      expect(userMessage.content).toContain('As power user, I want to see real-time metrics');
    });
    
    it('should include innovative brainstorming ideas', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'EXCITEMENT: REQ-3'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('Innovative feature ideas:');
      expect(userMessage.content).toContain('Machine learning for predictive analytics');
    });
    
    it('should include expectation-related Q&A', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'EXCITEMENT: REQ-3'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('Expectation-related Q&A:');
      expect(userMessage.content).toContain('What features would surprise and delight users?');
      expect(userMessage.content).toContain('AI-powered suggestions and beautiful visualizations');
    });
  });
  
  describe('Rationale extraction', () => {
    it('should extract rationales from parentheses', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `BASIC: REQ-1 (This is expected by all users)
PERFORMANCE: REQ-2 (The more data, the better)
EXCITEMENT: REQ-3 (Would be a pleasant surprise)`
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.kanoAnalysis!.basic[0].kanoRationale).toBe('This is expected by all users');
      expect(result.kanoAnalysis!.performance[0].kanoRationale).toBe('The more data, the better');
      expect(result.kanoAnalysis!.excitement[0].kanoRationale).toBe('Would be a pleasant surprise');
    });
    
    it('should provide default rationale when missing', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: REQ-1, REQ-2'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.kanoAnalysis!.basic[0].kanoRationale).toBe('Evaluated by Kano model');
      expect(result.kanoAnalysis!.basic[1].kanoRationale).toBe('Evaluated by Kano model');
    });
  });
  
  describe('Message generation', () => {
    it('should generate a proper evaluation message', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `BASIC: REQ-1 (Security is expected)
PERFORMANCE: REQ-2 (More metrics better)
EXCITEMENT: REQ-3 (AI would delight)`
      });
      
      const result = await node.invoke(initialState);
      
      const message = result.messages![0] as SystemMessage;
      expect(message.content).toContain('Kano Model Evaluation Complete:');
      expect(message.content).toContain('Basic Features (1):');
      expect(message.content).toContain('- The system must support secure user login [Security is expected]');
      expect(message.content).toContain('Performance Features (3):'); // 1 + 2 uncategorized
      expect(message.content).toContain('Excitement Features (1):');
    });
    
    it('should preserve existing messages', async () => {
      initialState.messages = [new SystemMessage('Previous message')];
      
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: REQ-1'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages![0]).toBe(initialState.messages[0]);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle alternative excitement keyword', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'EXCITING: REQ-3, REQ-5' // Alternative keyword
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.kanoAnalysis!.excitement).toHaveLength(2);
      expect(result.kanoAnalysis!.excitement.map(r => r.id)).toContain('REQ-3');
      expect(result.kanoAnalysis!.excitement.map(r => r.id)).toContain('REQ-5');
    });
    
    it('should handle uncategorized requirements as performance', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `BASIC: REQ-1
EXCITEMENT: REQ-3`
        // REQ-2, REQ-4, REQ-5 not mentioned
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.kanoAnalysis!.performance).toHaveLength(3);
      const performanceIds = result.kanoAnalysis!.performance.map(r => r.id);
      expect(performanceIds).toContain('REQ-2');
      expect(performanceIds).toContain('REQ-4');
      expect(performanceIds).toContain('REQ-5');
      expect(result.kanoAnalysis!.performance[0].kanoRationale).toBe('Default categorization');
    });
    
    it('should not duplicate requirements across categories', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `BASIC: REQ-1, REQ-2
PERFORMANCE: REQ-2, REQ-3` // REQ-2 appears twice
      });
      
      const result = await node.invoke(initialState);
      
      // REQ-2 should only appear in BASIC (first occurrence)
      expect(result.kanoAnalysis!.basic.map(r => r.id)).toContain('REQ-2');
      expect(result.kanoAnalysis!.performance.map(r => r.id)).not.toContain('REQ-2');
      
      // Total requirements should equal input
      const totalEvaluated = 
        result.kanoAnalysis!.basic.length +
        result.kanoAnalysis!.performance.length +
        result.kanoAnalysis!.excitement.length;
      expect(totalEvaluated).toBe(5);
    });
    
    it('should handle mixed case requirement IDs', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'BASIC: req-1, Req-2'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.kanoAnalysis!.basic).toHaveLength(2);
      expect(result.kanoAnalysis!.basic.map(r => r.id)).toContain('REQ-1');
      expect(result.kanoAnalysis!.basic.map(r => r.id)).toContain('REQ-2');
    });
  });
}); 