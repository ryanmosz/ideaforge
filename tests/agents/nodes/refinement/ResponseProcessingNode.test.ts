import { ResponseProcessingNode } from '../../../../src/agents/nodes/refinement/ResponseProcessingNode';
import { ProjectState } from '../../../../src/agents/state';
import { HumanMessage } from '@langchain/core/messages';

describe('ResponseProcessingNode', () => {
  let node: ResponseProcessingNode;
  let initialState: ProjectState;
  
  beforeEach(() => {
    node = new ResponseProcessingNode();
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
  
  describe('process', () => {
    it('should extract and process :RESPONSE: tags', async () => {
      const state = {
        ...initialState,
        fileContent: `* Project Overview
Some intro text

* Requirements
** Core Functionality
:RESPONSE: need-more-details
Please elaborate on the authentication flow and security requirements.

** User Interface
Basic UI requirements

:RESPONSE: ui-framework-choice
Consider using React or Vue.js for better component reusability.

* User Stories
** As a user
:RESPONSE: missing-acceptance-criteria
This user story needs clear acceptance criteria to be testable.
The criteria should include specific measurable outcomes.

* Brainstorming Ideas`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toBeDefined();
      expect(result.userResponses).toHaveLength(3);
      
      // Check first response
      expect(result.userResponses![0]).toEqual({
        tag: 'need-more-details',
        response: 'Please elaborate on the authentication flow and security requirements.',
        section: 'Core Functionality'
      });
      
      // Check second response
      expect(result.userResponses![1]).toEqual({
        tag: 'ui-framework-choice',
        response: 'Consider using React or Vue.js for better component reusability.',
        section: 'User Interface'
      });
      
      // Check third response (multi-line)
      expect(result.userResponses![2]).toEqual({
        tag: 'missing-acceptance-criteria',
        response: 'This user story needs clear acceptance criteria to be testable.\nThe criteria should include specific measurable outcomes.',
        section: 'As a user'
      });
      
      // Check refinement iteration incremented
      expect(result.refinementIteration).toBe(1);
      
      // Check changelog entry created
      expect(result.changelog).toHaveLength(1);
      expect(result.changelog![0].changes).toContain(
        'Processed 3 user feedback responses'
      );
      
      // Check next node
      expect(result.nextNode).toBe('FeedbackIntegrationNode');
    });
    
    it('should handle documents with no :RESPONSE: tags', async () => {
      const state = {
        ...initialState,
        fileContent: `* Project Overview
Just a normal document

* Requirements
No response tags here

* User Stories
Nothing to process`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toEqual([]);
      expect(result.nextNode).toBeNull(); // No refinement needed
      
      // Check message added
      const lastMessage = result.messages![result.messages!.length - 1];
      const content = (lastMessage as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('No :RESPONSE: tags found')).toBe(true);
    });
    
    it('should filter out invalid response tags', async () => {
      const state = {
        ...initialState,
        fileContent: `* Test Section
:RESPONSE:
Empty response should be filtered

:RESPONSE: 
Tag with only spaces should be filtered

:RESPONSE: !!!
Tag with only punctuation should be filtered

:RESPONSE: valid-tag
This is a valid response that should be kept.`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      // Only one valid response should remain
      expect(result.userResponses).toHaveLength(1);
      expect(result.userResponses![0].tag).toBe('valid-tag');
    });
    
    it('should handle :PROPERTIES: drawers correctly', async () => {
      const state = {
        ...initialState,
        fileContent: `* Requirements
:PROPERTIES:
:ID: req-001
:CREATED: 2024-01-01
:END:

:RESPONSE: property-test
This response should be captured correctly despite the properties drawer above.`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toHaveLength(1);
      expect(result.userResponses![0].response).toBe(
        'This response should be captured correctly despite the properties drawer above.'
      );
    });
    
    it('should stop response extraction at :END: tags', async () => {
      const state = {
        ...initialState,
        fileContent: `* Section
:RESPONSE: drawer-test
This should be included.
:END:
This should NOT be included after :END:`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toHaveLength(1);
      expect(result.userResponses![0].response).toBe('This should be included.');
      expect(result.userResponses![0].response).not.toContain('NOT be included');
    });
    
    it('should track section names correctly', async () => {
      const state = {
        ...initialState,
        fileContent: `* First Section
** Subsection A
:RESPONSE: in-subsection
Response in subsection

* Second Section
:RESPONSE: in-main-section
Response in main section

*** Deep Subsection
:RESPONSE: deep-response
Response in deep subsection`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toHaveLength(3);
      expect(result.userResponses![0].section).toBe('Subsection A');
      expect(result.userResponses![1].section).toBe('Second Section');
      expect(result.userResponses![2].section).toBe('Deep Subsection');
    });
    
    it('should create proper changelog summaries', async () => {
      const state = {
        ...initialState,
        fileContent: `* Requirements
:RESPONSE: req-1
Requirement feedback 1

:RESPONSE: req-2
Requirement feedback 2

* User Stories
:RESPONSE: story-1
Story feedback

* Other Section
:RESPONSE: other-1
Other feedback`,
        refinementIteration: 2
      };
      
      const result = await node.process(state);
      
      expect(result.changelog).toHaveLength(1);
      const changes = result.changelog![0].changes;
      
      // Should have section summaries
      expect(changes).toContain('Requirements: 2 response(s)');
      expect(changes).toContain('User Stories: 1 response(s)');
      
      // Should include tags for important sections
      const tagLine = changes.find(c => c.includes('Tags:'));
      expect(tagLine).toBeDefined();
      expect(tagLine).toContain('req-1, req-2');
    });
    
    it('should handle errors gracefully', async () => {
      const state = {
        ...initialState,
        fileContent: null as any, // Force error
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('ResponseProcessingNode:');
      expect(result.nextNode).toBeNull();
    });
    
    it('should handle multi-line responses with varied formatting', async () => {
      const state = {
        ...initialState,
        fileContent: `* Section
:RESPONSE: multi-line-test
  First line with leading spaces
  
  Line after blank line
	Line with tab
  
Last line`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.userResponses).toHaveLength(1);
      const response = result.userResponses![0].response;
      
      // Should preserve line structure but trim individual lines
      expect(response).toBe(
        'First line with leading spaces\nLine after blank line\nLine with tab\nLast line'
      );
    });
    
    it('should update messages with processing progress', async () => {
      const initialMessages = [
        new HumanMessage({ content: 'Initial message' })
      ];
      
      const state = {
        ...initialState,
        messages: initialMessages,
        fileContent: `* Test
:RESPONSE: test-tag
Test response`,
        refinementIteration: 0
      };
      
      const result = await node.process(state);
      
      expect(result.messages!.length).toBeGreaterThan(initialMessages.length);
      
      // Check processing message
      const processingMsg = result.messages!.find(m => {
        const content = (m as HumanMessage).content;
        return typeof content === 'string' && content.includes('Processing user feedback');
      });
      expect(processingMsg).toBeDefined();
      
      // Check result message
      const resultMsg = result.messages![result.messages!.length - 1];
      const resultContent = (resultMsg as HumanMessage).content;
      expect(typeof resultContent === 'string' && resultContent.includes('Found and processed 1 :RESPONSE: tags')).toBe(true);
      expect(typeof resultContent === 'string' && resultContent.includes('test-tag in Test')).toBe(true);
    });
  });
}); 