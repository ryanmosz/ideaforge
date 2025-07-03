import { FeedbackIntegrationNode } from '../../../../src/agents/nodes/refinement/FeedbackIntegrationNode';
import { ProjectState } from '../../../../src/agents/state';
import { HumanMessage } from '@langchain/core/messages';
import * as llmFactory from '../../../../src/agents/utils/llm-factory';

// Mock the LLM factory
jest.mock('../../../../src/agents/utils/llm-factory');

describe('FeedbackIntegrationNode', () => {
  let node: FeedbackIntegrationNode;
  let initialState: ProjectState;
  let mockLLM: any;
  
  beforeEach(() => {
    node = new FeedbackIntegrationNode();
    
    // Setup mock LLM
    mockLLM = {
      invoke: jest.fn()
    };
    (llmFactory.createLLM as jest.Mock).mockReturnValue(mockLLM);
    
    initialState = {
      filePath: 'test.org',
      fileContent: '',
      requirements: [
        { id: 'REQ-1', title: 'User authentication', description: 'System must support secure login' },
        { id: 'REQ-2', title: 'Dashboard view', description: 'Display user metrics' }
      ],
      userStories: [],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: {
        must: [{ id: 'REQ-1', title: 'User authentication', description: 'System must support secure login', moscowCategory: 'must' }],
        should: [{ id: 'REQ-2', title: 'Dashboard view', description: 'Display user metrics', moscowCategory: 'should' }],
        could: [],
        wont: []
      },
      kanoAnalysis: {
        basic: [{ id: 'REQ-1', title: 'User authentication', description: 'System must support secure login', kanoCategory: 'basic' }],
        performance: [{ id: 'REQ-2', title: 'Dashboard view', description: 'Display user metrics', kanoCategory: 'performance' }],
        excitement: []
      },
      dependencies: [],
      extractedTechnologies: [],
      researchTopics: [],
      hackerNewsResults: [],
      redditResults: [],
      additionalResearchResults: [],
      researchSynthesis: '',
      userResponses: [],
      refinementIteration: 1,
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
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('process', () => {
    it('should handle empty feedback gracefully', async () => {
      const state = {
        ...initialState,
        userResponses: []
      };
      
      const result = await node.process(state);
      
      expect(result.messages).toBeDefined();
      const lastMessage = result.messages![result.messages!.length - 1];
      const content = (lastMessage as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('No feedback to integrate')).toBe(true);
      expect(result.nextNode).toBe('ChangelogGenerationNode');
      expect(mockLLM.invoke).not.toHaveBeenCalled();
    });
    
    it('should process requirement updates from feedback', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'need-more-details',
            response: 'Please add OAuth2 support to authentication requirement',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [{
          id: 'REQ-1',
          field: 'description',
          oldValue: 'System must support secure login',
          newValue: 'System must support secure login with OAuth2',
          reason: 'User requested OAuth2 support'
        }],
        categoryChanges: [],
        newRequirements: [],
        clarifications: []
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify(mockIntegration)
      });
      
      const result = await node.process(state);
      
      expect(result.requirements).toBeDefined();
      expect(result.requirements).toHaveLength(2);
      
      const updatedReq = result.requirements!.find(r => r.id === 'REQ-1');
      expect(updatedReq).toBeDefined();
      expect(updatedReq!.description).toContain('OAuth2');
      expect(updatedReq!.description).toContain('[Updated based on feedback:');
    });
    
    it('should handle category changes', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'priority-change',
            response: 'Dashboard should be a must-have feature',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [],
        categoryChanges: [{
          itemId: 'REQ-2',
          fromCategory: 'should',
          toCategory: 'must',
          reason: 'User indicated dashboard is critical'
        }],
        newRequirements: [],
        clarifications: []
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: `Analysis: ${JSON.stringify(mockIntegration)}`
      });
      
      const result = await node.process(state);
      
      expect(result.moscowAnalysis).toBeDefined();
      expect(result.moscowAnalysis!.must).toHaveLength(2);
      expect(result.moscowAnalysis!.should).toHaveLength(0);
      
      const movedReq = result.moscowAnalysis!.must.find(r => r.id === 'REQ-2');
      expect(movedReq).toBeDefined();
      expect(movedReq!.moscowCategory).toBe('must');
    });
    
    it('should add new requirements from feedback', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'missing-feature',
            response: 'We need data export functionality',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [],
        categoryChanges: [],
        newRequirements: [{
          title: 'Data export',
          description: 'Allow users to export their data in CSV format',
          source: 'User feedback'
        }],
        clarifications: []
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify(mockIntegration)
      });
      
      const result = await node.process(state);
      
      expect(result.requirements).toBeDefined();
      expect(result.requirements).toHaveLength(3);
      
      const newReq = result.requirements!.find(r => r.id === 'REQ-3');
      expect(newReq).toBeDefined();
      expect(newReq!.title).toBe('Data export');
      expect(newReq!.description).toBe('Allow users to export their data in CSV format');
    });
    
    it('should handle Kano category changes', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'excitement-feature',
            response: 'Dashboard could be an excitement feature with advanced analytics',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [],
        categoryChanges: [{
          itemId: 'REQ-2',
          fromCategory: 'performance',
          toCategory: 'excitement',
          reason: 'Advanced analytics would delight users'
        }],
        newRequirements: [],
        clarifications: []
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify(mockIntegration)
      });
      
      const result = await node.process(state);
      
      expect(result.kanoAnalysis).toBeDefined();
      expect(result.kanoAnalysis!.performance).toHaveLength(0);
      expect(result.kanoAnalysis!.excitement).toHaveLength(1);
      
      const movedReq = result.kanoAnalysis!.excitement[0];
      expect(movedReq.id).toBe('REQ-2');
      expect(movedReq.kanoCategory).toBe('excitement');
    });
    
    it('should process clarifications', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'clarification',
            response: 'By secure login, I mean including 2FA support',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [],
        categoryChanges: [],
        newRequirements: [],
        clarifications: [{
          section: 'Requirements',
          clarification: 'Secure login should include 2FA support'
        }]
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify(mockIntegration)
      });
      
      const result = await node.process(state);
      
      expect(result.errors).toBeUndefined();
      const lastMessage = result.messages![result.messages!.length - 1];
      const content = (lastMessage as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('Processed 1 clarifications')).toBe(true);
    });
    
    it('should handle multiple types of changes', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'comprehensive-feedback',
            response: 'Update auth to include SSO, move dashboard to must-have, and add user management',
            section: 'Requirements'
          }
        ]
      };
      
      const mockIntegration = {
        requirementUpdates: [{
          id: 'REQ-1',
          field: 'title',
          oldValue: 'User authentication',
          newValue: 'User authentication with SSO',
          reason: 'SSO support requested'
        }],
        categoryChanges: [{
          itemId: 'REQ-2',
          fromCategory: 'should',
          toCategory: 'must',
          reason: 'Dashboard prioritized'
        }],
        newRequirements: [{
          title: 'User management',
          description: 'Admin interface for managing users',
          source: 'Feedback'
        }],
        clarifications: []
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify(mockIntegration)
      });
      
      const result = await node.process(state);
      
      // Check all changes applied
      expect(result.requirements).toHaveLength(3);
      expect(result.requirements![0].title).toContain('SSO');
      expect(result.moscowAnalysis!.must).toHaveLength(2);
      expect(result.requirements![2].title).toBe('User management');
      
      // Check summary
      const lastMessage = result.messages![result.messages!.length - 1];
      const content = (lastMessage as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('Updated 1 requirements')).toBe(true);
      expect(typeof content === 'string' && content.includes('Recategorized 1 items')).toBe(true);
      expect(typeof content === 'string' && content.includes('Added 1 new requirements')).toBe(true);
    });
    
    it('should handle malformed AI responses gracefully', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'test',
            response: 'Some feedback',
            section: 'Test'
          }
        ]
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: 'This is not valid JSON at all'
      });
      
      const result = await node.process(state);
      
      // Should fall back to clarifications only
      expect(result.errors).toBeUndefined();
      expect(result.requirements).toEqual(initialState.requirements); // No changes
      const lastMessage = result.messages![result.messages!.length - 1];
      const content = (lastMessage as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('Processed 1 clarifications')).toBe(true);
    });
    
    it('should handle AI errors gracefully', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'test',
            response: 'Some feedback',
            section: 'Test'
          }
        ]
      };
      
      mockLLM.invoke.mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await node.process(state);
      
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('FeedbackIntegrationNode: AI service unavailable');
      expect(result.nextNode).toBeNull();
    });
    
    it('should build proper feedback prompt', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'test-tag',
            response: 'Test response',
            section: 'Test Section'
          }
        ]
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({
          requirementUpdates: [],
          categoryChanges: [],
          newRequirements: [],
          clarifications: []
        })
      });
      
      await node.process(state);
      
      expect(mockLLM.invoke).toHaveBeenCalledWith([
        { role: 'system', content: expect.stringContaining('analyzing user feedback') },
        { role: 'user', content: expect.stringContaining('CURRENT REQUIREMENTS:') }
      ]);
      
      const userPrompt = mockLLM.invoke.mock.calls[0][0][1].content;
      expect(userPrompt).toContain('REQ-1: User authentication');
      expect(userPrompt).toContain('REQ-2: Dashboard view');
      expect(userPrompt).toContain('Must Have: REQ-1');
      expect(userPrompt).toContain('Should Have: REQ-2');
      expect(userPrompt).toContain('Tag: test-tag');
      expect(userPrompt).toContain('Feedback: Test response');
    });
    
    it('should handle non-string LLM responses', async () => {
      const state = {
        ...initialState,
        userResponses: [
          {
            tag: 'test',
            response: 'Feedback',
            section: 'Test'
          }
        ]
      };
      
      mockLLM.invoke.mockResolvedValue({
        content: { not: 'a string' } // Invalid response type
      });
      
      const result = await node.process(state);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid LLM response format');
    });
  });
}); 