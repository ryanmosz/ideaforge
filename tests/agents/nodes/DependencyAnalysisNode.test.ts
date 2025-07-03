import { DependencyAnalysisNode } from '../../../src/agents/nodes/DependencyAnalysisNode';
import { ProjectState } from '../../../src/agents/state';
import { SystemMessage } from '@langchain/core/messages';

// Mock ChatOpenAI
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn()
  }))
}));

describe('DependencyAnalysisNode', () => {
  let node: DependencyAnalysisNode;
  let mockInvoke: jest.Mock;
  let initialState: ProjectState;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create node and get mock
    node = new DependencyAnalysisNode();
    const ChatOpenAI = require('@langchain/openai').ChatOpenAI;
    mockInvoke = ChatOpenAI.mock.results[0].value.invoke;
    
    // Set up initial state with all required fields
    initialState = {
      filePath: '/test/project.org',
      fileContent: '',
      requirements: [
        { id: 'REQ-1', title: 'User Auth', description: 'User authentication system' },
        { id: 'REQ-2', title: 'Dashboard', description: 'Real-time dashboard' },
        { id: 'REQ-3', title: 'Reports', description: 'Basic reporting functionality' },
        { id: 'REQ-4', title: 'Analytics', description: 'Advanced analytics' },
        { id: 'REQ-5', title: 'Offline', description: 'Offline mode support' },
        { id: 'REQ-6', title: 'Sync', description: 'Real-time data sync' }
      ],
      userStories: [],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: {
        must: [
          { id: 'REQ-1', title: 'User Auth', description: 'User authentication system' },
          { id: 'REQ-2', title: 'Dashboard', description: 'Real-time dashboard' }
        ],
        should: [
          { id: 'REQ-3', title: 'Reports', description: 'Basic reporting functionality' }
        ],
        could: [],
        wont: []
      },
      kanoAnalysis: {
        basic: [
          { id: 'REQ-1', title: 'User Auth', description: 'User authentication system' }
        ],
        performance: [],
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
      refinementIteration: 0,
      changelog: [],
      projectSuggestions: [],
      alternativeIdeas: [],
      techStackRecommendations: [],
      riskAssessment: [],
      messages: [],
      errors: [],
      currentNode: 'KanoEvaluationNode',
      nextNode: null
    };
  });
  
  describe('Basic functionality', () => {
    it('should create an instance', () => {
      expect(node).toBeDefined();
      expect(node.invoke).toBeDefined();
    });
    
    it('should handle empty requirements', async () => {
      const state = { ...initialState, requirements: [] };
      
      const result = await node.invoke(state);
      
      expect(result.currentNode).toBe('DependencyAnalysisNode');
      expect(result.nextNode).toBe('TechnologyExtractionNode');
      expect(result.messages).toHaveLength(1);
      expect(result.messages![0].content).toContain('No requirements to analyze');
    });
    
    it('should handle LLM errors gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('API Error'));
      
      const result = await node.invoke(initialState);
      
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('DependencyAnalysisNode error: API Error');
      expect(result.nextNode).toBe('TechnologyExtractionNode');
    });
  });
  
  describe('Dependency analysis', () => {
    it('should analyze dependencies successfully', async () => {
      const mockResponse = {
        content: `Based on the requirements analysis:

DEP: REQ-2 -> REQ-1 [REQUIRES] Dashboard requires user authentication
DEP: REQ-4 -> REQ-3 [EXTENDS] Advanced analytics extends basic reporting
DEP: REQ-5 -> REQ-6 [CONFLICTS] Offline mode conflicts with real-time sync
DEP: REQ-6 -> REQ-2 [RELATED] Real-time sync shares infrastructure with dashboard`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.dependencies).toBeDefined();
      // Should have 3 dependencies (conflicts are excluded from state dependencies)
      expect(result.dependencies).toHaveLength(3);
      
      const req2Dep = result.dependencies!.find(d => d.requirementId === 'REQ-2');
      expect(req2Dep).toBeDefined();
      expect(req2Dep!.dependsOn).toContain('REQ-1');
    });
    
    it('should include context in analysis prompt', async () => {
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      await node.invoke(initialState);
      
      const calls = mockInvoke.mock.calls[0][0];
      const userMessage = calls[1].content;
      
      expect(userMessage).toContain('High Priority Requirements:');
      expect(userMessage).toContain('REQ-1: User authentication system');
      expect(userMessage).toContain('Basic/Expected Features:');
    });
    
    it('should parse various dependency types', async () => {
      const mockResponse = {
        content: `DEP: REQ-1 -> REQ-2 [REQUIRES] Auth needs user data
DEP: REQ-3 -> REQ-4 [EXTENDS] Reports extend analytics
DEP: REQ-5 -> REQ-6 [CONFLICTS] Offline conflicts with sync
DEP: REQ-2 -> REQ-3 [RELATED] Dashboard related to reports
DEP: REQ-1 -> REQ-5 [BLOCKS] Auth must complete before offline`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      // Check that dependencies were parsed and converted correctly
      expect(result.dependencies).toBeDefined();
      expect(result.dependencies!.length).toBeGreaterThan(0);
    });
  });
  
  describe('Conflict detection', () => {
    it('should identify direct conflicts', async () => {
      const mockResponse = {
        content: `DEP: REQ-5 -> REQ-6 [CONFLICTS] Offline mode cannot work with real-time sync
DEP: REQ-2 -> REQ-1 [REQUIRES] Dashboard needs auth`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.messages![0].content).toContain('Potential Conflicts:');
      expect(result.messages![0].content).toContain('REQ-5 conflicts with REQ-6');
    });
    
    it('should detect circular dependencies', async () => {
      const mockResponse = {
        content: `DEP: REQ-1 -> REQ-2 [REQUIRES] A needs B
DEP: REQ-2 -> REQ-3 [REQUIRES] B needs C
DEP: REQ-3 -> REQ-1 [REQUIRES] C needs A`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.messages![0].content).toContain('Circular dependency detected');
      expect(result.messages![0].content).toContain('REQ-1 → REQ-2 → REQ-3 → REQ-1');
    });
    
    it('should handle no conflicts', async () => {
      const mockResponse = {
        content: `DEP: REQ-2 -> REQ-1 [REQUIRES] Dashboard needs auth`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.messages![0].content).toContain('No conflicts detected');
    });
  });
  
  describe('Risk assessment', () => {
    it('should assess high coupling risk', async () => {
      const mockResponse = {
        content: `DEP: REQ-1 -> REQ-2 [REQUIRES] Many dependencies
DEP: REQ-1 -> REQ-3 [REQUIRES] Many dependencies
DEP: REQ-1 -> REQ-4 [REQUIRES] Many dependencies
DEP: REQ-1 -> REQ-5 [REQUIRES] Many dependencies
DEP: REQ-6 -> REQ-1 [REQUIRES] Depends on central component`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.riskAssessment).toBeDefined();
      const highRisk = result.riskAssessment!.find(r => 
        r.risk.includes('REQ-1') && r.risk.includes('high coupling')
      );
      expect(highRisk).toBeDefined();
      expect(highRisk!.impact).toBe('high');
    });
    
    it('should identify blocking dependency risks', async () => {
      const mockResponse = {
        content: `DEP: REQ-1 -> REQ-2 [BLOCKS] Must complete first
DEP: REQ-2 -> REQ-3 [BLOCKS] Sequential dependency
DEP: REQ-3 -> REQ-4 [BLOCKS] Sequential dependency`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      const scheduleRisk = result.riskAssessment!.find(r => 
        r.risk.includes('blocking dependencies')
      );
      expect(scheduleRisk).toBeDefined();
      expect(scheduleRisk!.impact).toBe('medium');
    });
  });
  
  describe('Context inclusion', () => {
    it('should include technical brainstorming ideas', async () => {
      const stateWithIdeas = {
        ...initialState,
        brainstormIdeas: [
          { id: 'IDEA-1', category: 'Technical Architecture', title: 'Microservices', description: 'Use microservices' },
          { id: 'IDEA-2', category: 'UX', title: 'Dark mode', description: 'Add dark mode' },
          { id: 'IDEA-3', category: 'Integration', title: 'API Gateway', description: 'Use API gateway' }
        ]
      };
      
      mockInvoke.mockResolvedValueOnce({ content: '' });
      
      await node.invoke(stateWithIdeas);
      
      const userMessage = mockInvoke.mock.calls[0][0][1].content;
      expect(userMessage).toContain('Technical Considerations:');
      expect(userMessage).toContain('Use microservices');
      expect(userMessage).toContain('Use API gateway');
      expect(userMessage).not.toContain('Add dark mode'); // Not technical
    });
  });
  
  describe('Message generation', () => {
    it('should generate comprehensive analysis message', async () => {
      const mockResponse = {
        content: `DEP: REQ-2 -> REQ-1 [REQUIRES] Dashboard needs auth
DEP: REQ-5 -> REQ-6 [CONFLICTS] Offline conflicts with sync`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      const message = result.messages![0].content;
      expect(message).toContain('Dependency Analysis Complete:');
      expect(message).toContain('Found 2 dependencies:');
      expect(message).toContain('REQ-2 → REQ-1: requires');
      expect(message).toContain('Potential Conflicts:');
      expect(message).toContain('Dependency Risks:');
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
    it('should handle invalid requirement IDs', async () => {
      const mockResponse = {
        content: `DEP: REQ-999 -> REQ-1 [REQUIRES] Invalid source
DEP: REQ-1 -> REQ-888 [REQUIRES] Invalid target
DEP: REQ-2 -> REQ-1 [REQUIRES] Valid dependency`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.dependencies).toHaveLength(1);
      expect(result.dependencies![0].requirementId).toBe('REQ-2');
    });
    
    it('should handle case-insensitive IDs and types', async () => {
      const mockResponse = {
        content: `DEP: req-1 -> ReQ-2 [REQUIRES] Mixed case IDs
DEP: REQ-3 -> REQ-4 [extends] Lowercase type`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.dependencies).toHaveLength(2);
      const req1Dep = result.dependencies!.find(d => d.requirementId === 'REQ-1');
      expect(req1Dep).toBeDefined();
      expect(req1Dep!.dependsOn).toContain('REQ-2');
    });
    
    it('should skip malformed dependency lines', async () => {
      const mockResponse = {
        content: `Some analysis text
DEP: REQ-1 -> REQ-2 [REQUIRES] Valid format
DEP: REQ-3 REQ-4 [EXTENDS] Missing arrow
DEP: REQ-5 -> REQ-6 Missing type
DEP: REQ-2 -> REQ-3 [UNKNOWN] Invalid type
DEP: REQ-4 -> REQ-5 [BLOCKS] Another valid one`
      };
      
      mockInvoke.mockResolvedValueOnce(mockResponse);
      
      const result = await node.invoke(initialState);
      
      expect(result.dependencies).toHaveLength(2);
      const req1Dep = result.dependencies!.find(d => d.requirementId === 'REQ-1');
      const req4Dep = result.dependencies!.find(d => d.requirementId === 'REQ-4');
      expect(req1Dep).toBeDefined();
      expect(req4Dep).toBeDefined();
    });
  });
}); 