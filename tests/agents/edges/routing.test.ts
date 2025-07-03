import {
  checkForResponses,
  routeAfterResearch,
  routeAfterChangelog,
  checkForErrors,
  getFlowMap,
  isTerminalNode,
  shouldSkipResearch,
  determineAnalysisMode
} from '../../../src/agents/edges/routing';
import { ProjectState } from '../../../src/agents/state';

describe('Routing Functions', () => {
  let mockState: ProjectState;
  
  beforeEach(() => {
    mockState = {
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
  
  describe('checkForResponses', () => {
    it('should route to responseProcessing when :RESPONSE: tags present', () => {
      mockState.fileContent = 'Content with :RESPONSE: tag';
      expect(checkForResponses(mockState)).toBe('responseProcessing');
    });
    
    it('should route to requirementsAnalysis when no :RESPONSE: tags', () => {
      mockState.fileContent = 'Normal content';
      expect(checkForResponses(mockState)).toBe('requirementsAnalysis');
    });
    
    it('should handle empty file content', () => {
      mockState.fileContent = '';
      expect(checkForResponses(mockState)).toBe('requirementsAnalysis');
    });
    
    it('should handle null file content', () => {
      mockState.fileContent = null as any;
      expect(checkForResponses(mockState)).toBe('requirementsAnalysis');
    });
  });
  
  describe('routeAfterResearch', () => {
    it('should route to feedbackIntegration when user responses exist', () => {
      mockState.userResponses = [
        { tag: 'test', response: 'feedback', section: 'Test' }
      ];
      expect(routeAfterResearch(mockState)).toBe('feedbackIntegration');
    });
    
    it('should route to END when no user responses', () => {
      mockState.userResponses = [];
      expect(routeAfterResearch(mockState)).toBe('END');
    });
    
    it('should handle null user responses', () => {
      mockState.userResponses = null as any;
      expect(routeAfterResearch(mockState)).toBe('END');
    });
  });
  
  describe('routeAfterChangelog', () => {
    it('should route to requirementsAnalysis when requirements exist', () => {
      mockState.requirements = [
        { id: 'REQ-1', title: 'Test', description: 'Test requirement' }
      ];
      expect(routeAfterChangelog(mockState)).toBe('requirementsAnalysis');
    });
    
    it('should route to END when no requirements', () => {
      mockState.requirements = [];
      expect(routeAfterChangelog(mockState)).toBe('END');
    });
    
    it('should handle null requirements', () => {
      mockState.requirements = null as any;
      expect(routeAfterChangelog(mockState)).toBe('END');
    });
  });
  
  describe('checkForErrors', () => {
    it('should route to END on critical error', () => {
      mockState.nextNode = null;
      mockState.errors = ['Critical error'];
      expect(checkForErrors(mockState)).toBe('END');
    });
    
    it('should route to CONTINUE when no errors', () => {
      mockState.errors = [];
      expect(checkForErrors(mockState)).toBe('CONTINUE');
    });
    
    it('should route to CONTINUE when nextNode is set', () => {
      mockState.nextNode = 'someNode';
      mockState.errors = ['Error'];
      expect(checkForErrors(mockState)).toBe('CONTINUE');
    });
    
    it('should handle null errors array', () => {
      mockState.errors = null as any;
      expect(checkForErrors(mockState)).toBe('CONTINUE');
    });
  });
  
  describe('getFlowMap', () => {
    it('should return complete flow map', () => {
      const flowMap = getFlowMap();
      
      expect(flowMap).toEqual({
        'documentParser': 'requirementsAnalysis',
        'requirementsAnalysis': 'moscowCategorization',
        'moscowCategorization': 'kanoEvaluation',
        'kanoEvaluation': 'dependencyAnalysis',
        'dependencyAnalysis': 'technologyExtraction',
        'technologyExtraction': 'hackerNewsSearch',
        'hackerNewsSearch': 'redditSearch',
        'redditSearch': 'additionalResearch',
        'additionalResearch': 'researchSynthesisNode',
        'responseProcessing': 'feedbackIntegration',
        'feedbackIntegration': 'changelogGeneration'
      });
    });
  });
  
  describe('isTerminalNode', () => {
    it('should identify terminal nodes', () => {
      expect(isTerminalNode('researchSynthesisNode')).toBe(true);
      expect(isTerminalNode('changelogGeneration')).toBe(true);
    });
    
    it('should identify non-terminal nodes', () => {
      expect(isTerminalNode('documentParser')).toBe(false);
      expect(isTerminalNode('requirementsAnalysis')).toBe(false);
      expect(isTerminalNode('moscowCategorization')).toBe(false);
    });
  });
  
  describe('shouldSkipResearch', () => {
    it('should skip research when user responses exist', () => {
      mockState.userResponses = [
        { tag: 'test', response: 'feedback', section: 'Test' }
      ];
      expect(shouldSkipResearch(mockState)).toBe(true);
    });
    
    it('should not skip research when no user responses', () => {
      mockState.userResponses = [];
      expect(shouldSkipResearch(mockState)).toBe(false);
    });
    
    it('should handle null user responses', () => {
      mockState.userResponses = null as any;
      expect(shouldSkipResearch(mockState)).toBe(false);
    });
  });
  
  describe('determineAnalysisMode', () => {
    it('should return refinement mode when :RESPONSE: tags present', () => {
      mockState.fileContent = 'Content with :RESPONSE: tag';
      expect(determineAnalysisMode(mockState)).toBe('refinement');
    });
    
    it('should return full mode for normal content', () => {
      mockState.fileContent = 'Normal content';
      expect(determineAnalysisMode(mockState)).toBe('full');
    });
    
    it('should handle empty content', () => {
      mockState.fileContent = '';
      expect(determineAnalysisMode(mockState)).toBe('full');
    });
  });
}); 