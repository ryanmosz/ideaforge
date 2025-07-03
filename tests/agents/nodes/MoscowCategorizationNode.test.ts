import { MoscowCategorizationNode } from '../../../src/agents/nodes/MoscowCategorizationNode';
import { ProjectState } from '../../../src/agents/state';
import { SystemMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn()
  }))
}));

describe('MoscowCategorizationNode', () => {
  let node: MoscowCategorizationNode;
  let mockInvoke: jest.Mock;
  let initialState: ProjectState;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create node and get mock
    node = new MoscowCategorizationNode();
    const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
    mockInvoke = ChatOpenAI.mock.results[0].value.invoke;
    
    // Set up initial state with requirements
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
        },
        {
          id: 'REQ-4',
          title: 'Dark mode',
          description: 'The system could have a dark mode theme'
        },
        {
          id: 'REQ-5',
          title: 'AI recommendations',
          description: 'The system won\'t include AI recommendations in this release'
        }
      ],
      userStories: [
        {
          id: 'US-1',
          actor: 'user',
          action: 'login securely',
          benefit: 'my data is protected'
        }
      ],
      brainstormIdeas: [
        {
          id: 'IDEA-1',
          category: 'Core Features',
          title: 'Authentication system',
          description: 'Essential security feature'
        }
      ],
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
      currentNode: 'RequirementsAnalysisNode',
      nextNode: 'MoscowCategorizationNode',
      errors: [],
      messages: [
        new SystemMessage(`Requirements Analysis Complete:
        
Project Goals:
Build a secure real-time collaboration platform

Key Themes:
- Authentication: Security and access control
- Real-time: Live collaboration features

Critical Success Factors:
1. Secure authentication system
2. Low-latency real-time updates`)
      ]
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node).toBeInstanceOf(MoscowCategorizationNode);
    });
    
    it('should handle empty requirements', async () => {
      initialState.requirements = [];
      
      const result = await node.invoke(initialState);
      
      expect(result.currentNode).toBe('MoscowCategorizationNode');
      expect(result.nextNode).toBe('KanoEvaluationNode');
      expect(result.messages).toHaveLength(2); // Original + new message
      expect((result.messages![1] as SystemMessage).content).toContain('No requirements to categorize');
      expect(mockInvoke).not.toHaveBeenCalled();
    });
    
    it('should handle LLM errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('API Error'));
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('MoscowCategorizationNode error: API Error');
      expect(result.currentNode).toBe('MoscowCategorizationNode');
      expect(result.nextNode).toBe('KanoEvaluationNode'); // Still continues
    });
  });
  
  describe('MoSCoW categorization', () => {
    it('should categorize requirements successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `MUST: REQ-1, REQ-3
SHOULD: REQ-2
COULD: REQ-4
WONT: REQ-5`
      });
      
      const result = await node.invoke(initialState);
      
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result.moscowAnalysis).toBeDefined();
      expect(result.moscowAnalysis!.must).toHaveLength(2);
      expect(result.moscowAnalysis!.should).toHaveLength(1);
      expect(result.moscowAnalysis!.could).toHaveLength(1);
      expect(result.moscowAnalysis!.wont).toHaveLength(1);
      
      // Check specific categorizations
      expect(result.moscowAnalysis!.must[0].id).toBe('REQ-1');
      expect(result.moscowAnalysis!.must[0].moscowCategory).toBe('must');
      expect(result.moscowAnalysis!.should[0].id).toBe('REQ-2');
      expect(result.moscowAnalysis!.could[0].id).toBe('REQ-4');
      expect(result.moscowAnalysis!.wont[0].id).toBe('REQ-5');
    });
    
    it('should include analysis context in the prompt', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: REQ-1'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('Previous Analysis:');
      expect(userMessage.content).toContain('Build a secure real-time collaboration platform');
      expect(userMessage.content).toContain('Critical Success Factors');
    });
    
    it('should handle various response formats', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `MUST HAVE: REQ-1, REQ-3
SHOULD HAVE: REQ-2
COULD HAVE: REQ-4
WON'T HAVE: REQ-5`
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.moscowAnalysis!.must).toHaveLength(2);
      expect(result.moscowAnalysis!.should).toHaveLength(1);
      expect(result.moscowAnalysis!.could).toHaveLength(1);
      expect(result.moscowAnalysis!.wont).toHaveLength(1);
    });
    
    it('should handle uncategorized requirements', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `MUST: REQ-1
SHOULD: REQ-2
WONT: REQ-5`
        // REQ-3 and REQ-4 not mentioned
      });
      
      const result = await node.invoke(initialState);
      
      // Uncategorized requirements should go to 'could'
      expect(result.moscowAnalysis!.could).toHaveLength(2);
      const couldIds = result.moscowAnalysis!.could.map(r => r.id);
      expect(couldIds).toContain('REQ-3');
      expect(couldIds).toContain('REQ-4');
    });
  });
  
  describe('Context inclusion', () => {
    it('should include user stories in context', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: REQ-1'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('User Stories for context:');
      expect(userMessage.content).toContain('As user, I want to login securely');
    });
    
    it('should include core brainstorming ideas', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: REQ-1'
      });
      
      await node.invoke(initialState);
      
      const call = mockInvoke.mock.calls[0];
      const userMessage = call[0][1];
      
      expect(userMessage.content).toContain('Core feature ideas:');
      expect(userMessage.content).toContain('Essential security feature');
    });
    
    it('should handle missing context gracefully', async () => {
      initialState.userStories = [];
      initialState.brainstormIdeas = [];
      initialState.messages = [];
      
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: REQ-1'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeUndefined();
      expect(result.moscowAnalysis).toBeDefined();
    });
  });
  
  describe('Message generation', () => {
    it('should generate a proper categorization message', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `MUST: REQ-1
SHOULD: REQ-2
COULD: REQ-4
WONT: REQ-5`
      });
      
      const result = await node.invoke(initialState);
      
      const message = result.messages![1] as SystemMessage;
      expect(message.content).toContain('MoSCoW Categorization Complete:');
      expect(message.content).toContain('Must Have (1):');
      expect(message.content).toContain('- The system must support user authentication with OAuth2');
      expect(message.content).toContain('Should Have (1):');
      expect(message.content).toContain('Could Have (2):'); // Including REQ-3 which was uncategorized
      expect(message.content).toContain('Won\'t Have (1):');
    });
    
    it('should preserve existing messages', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: REQ-1'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages![0]).toBe(initialState.messages[0]);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle case-insensitive requirement IDs', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: 'MUST: req-1, Req-2'
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.moscowAnalysis!.must).toHaveLength(2);
      expect(result.moscowAnalysis!.must.map(r => r.id)).toContain('REQ-1');
      expect(result.moscowAnalysis!.must.map(r => r.id)).toContain('REQ-2');
    });
    
    it('should handle multiple formats in one response', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `The categorization is as follows:
MUST HAVE: REQ-1 (critical for security)
Should: REQ-2
Could have: REQ-4
Won't: REQ-5 (out of scope)`
      });
      
      const result = await node.invoke(initialState);
      
      expect(result.moscowAnalysis!.must).toHaveLength(1);
      expect(result.moscowAnalysis!.should).toHaveLength(1);
      expect(result.moscowAnalysis!.could).toHaveLength(2); // REQ-4 + uncategorized REQ-3
      expect(result.moscowAnalysis!.wont).toHaveLength(1);
    });
    
    it('should not duplicate requirements across categories', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: `MUST: REQ-1, REQ-2
SHOULD: REQ-2, REQ-3` // REQ-2 appears twice
      });
      
      const result = await node.invoke(initialState);
      
      // REQ-2 should only appear in MUST (first occurrence)
      expect(result.moscowAnalysis!.must.map(r => r.id)).toContain('REQ-2');
      expect(result.moscowAnalysis!.should.map(r => r.id)).not.toContain('REQ-2');
      
      // Total requirements should equal input
      const totalCategorized = 
        result.moscowAnalysis!.must.length +
        result.moscowAnalysis!.should.length +
        result.moscowAnalysis!.could.length +
        result.moscowAnalysis!.wont.length;
      expect(totalCategorized).toBe(5);
    });
  });
}); 