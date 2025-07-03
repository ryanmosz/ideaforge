import { ChangelogGenerationNode } from '../../../../src/agents/nodes/refinement/ChangelogGenerationNode';
import { ProjectState } from '../../../../src/agents/state';
import { HumanMessage } from '@langchain/core/messages';

describe('ChangelogGenerationNode', () => {
  let node: ChangelogGenerationNode;
  let initialState: ProjectState;
  
  beforeEach(() => {
    node = new ChangelogGenerationNode();
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
  
  describe('process', () => {
    it('should generate changelog for refinement with user responses', async () => {
      const state = {
        ...initialState,
        userResponses: [
          { tag: 'auth-feedback', response: 'Add OAuth support', section: 'Requirements' },
          { tag: 'ui-feedback', response: 'Use React', section: 'Technical' }
        ],
        refinementIteration: 2
      };
      
      const result = await node.process(state);
      
      expect(result.changelog).toBeDefined();
      expect(result.changelog).toHaveLength(1);
      
      const entry = result.changelog![0] as any; // Type assertion for extended fields
      expect(entry.iteration).toBe(2);
      expect(entry.responsesProcessed).toBe(2);
      expect(entry.summary).toContain('Processed 2 user response(s)');
      
      // Check sections
      expect(entry.sections).toBeDefined();
      const feedbackSection = entry.sections.find((s: any) => s.title === 'User Feedback Processing');
      expect(feedbackSection).toBeDefined();
      expect(feedbackSection!.changes).toContain(
        'Processed 1 feedback response(s) in "Requirements" section'
      );
      
      // Check formatted changelog
      expect(result.formattedChangelog).toBeDefined();
      expect(result.formattedChangelog).toContain('# IdeaForge Analysis Changelog');
      expect(result.formattedChangelog).toContain('Version 2');
    });
    
    it('should handle refinement with no user feedback', async () => {
      const state = {
        ...initialState,
        userResponses: [],
        refinementIteration: 1
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      expect(entry.summary).toBe('Refinement iteration completed with no user feedback');
      expect(entry.responsesProcessed).toBe(0);
      
      // Should still have general updates section
      expect(entry.sections).toHaveLength(1);
      expect(entry.sections[0].title).toBe('General Updates');
    });
    
    it('should detect requirement changes', async () => {
      const state = {
        ...initialState,
        requirements: [
          { id: 'REQ-1', title: 'Auth', description: 'OAuth login [Updated based on feedback: User requested]' },
          { id: 'REQ-2', title: 'Dashboard', description: 'Dashboard view' },
          { id: 'REQ-3', title: 'Export', description: 'Export' }
        ],
        userResponses: []
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      const reqSection = entry.sections.find((s: any) => s.title === 'Requirement Updates');
      expect(reqSection).toBeDefined();
      expect(reqSection!.changes).toContain('Total requirements: 3');
      expect(reqSection!.changes).toContain('Requirements with detailed descriptions: 2');
      expect(reqSection!.changes).toContain('Requirements updated based on feedback: 1');
    });
    
    it('should detect categorization changes', async () => {
      const state = {
        ...initialState,
        moscowAnalysis: {
          must: [{ id: 'REQ-1', title: 'Auth', description: 'Auth', moscowCategory: 'must' as const }],
          should: [
            { id: 'REQ-2', title: 'Dashboard', description: 'Dashboard', moscowCategory: 'should' as const },
            { id: 'REQ-3', title: 'Export', description: 'Export', moscowCategory: 'should' as const }
          ],
          could: [{ id: 'REQ-4', title: 'Theme', description: 'Theme', moscowCategory: 'could' as const }],
          wont: []
        },
        kanoAnalysis: {
          basic: [{ id: 'REQ-1', title: 'Auth', description: 'Auth', kanoCategory: 'basic' as const }],
          performance: [{ id: 'REQ-2', title: 'Dashboard', description: 'Dashboard', kanoCategory: 'performance' as const }],
          excitement: [{ id: 'REQ-3', title: 'Export', description: 'Export', kanoCategory: 'excitement' as const }]
        },
        userResponses: []
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      const catSection = entry.sections.find((s: any) => s.title === 'Categorization Changes');
      expect(catSection).toBeDefined();
      expect(catSection!.changes).toContain('MoSCoW distribution: Must(1), Should(2), Could(1), Won\'t(0)');
      expect(catSection!.changes).toContain('Kano distribution: Basic(1), Performance(1), Excitement(1)');
    });
    
    it('should detect research changes', async () => {
      const state = {
        ...initialState,
        extractedTechnologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
        hackerNewsResults: [
          { title: 'React best practices', url: 'https://news.ycombinator.com/item?id=1', summary: 'Discussion', relevance: 0.9 },
          { title: 'Node.js performance', url: 'https://news.ycombinator.com/item?id=2', summary: 'Tips', relevance: 0.8 }
        ],
        redditResults: [
          { title: 'React vs Vue', url: 'https://reddit.com/r/webdev/1', summary: 'Comparison', subreddit: 'webdev', relevance: 0.7 }
        ],
        additionalResearchResults: [
          { topic: 'Authentication patterns', findings: 'OAuth2 is recommended' }
        ],
        userResponses: []
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      const researchSection = entry.sections.find((s: any) => s.title === 'Research Updates');
      expect(researchSection).toBeDefined();
      expect(researchSection!.changes).toContain('Technologies identified: 6');
      expect(researchSection!.changes).toContain('Including: React, Node.js, PostgreSQL, Redis, Docker ...');
      expect(researchSection!.changes).toContain('Hacker News discussions analyzed: 2');
      expect(researchSection!.changes).toContain('Reddit threads analyzed: 1');
      expect(researchSection!.changes).toContain('Additional research topics explored: 1');
    });
    
    it('should handle multiple sections with user feedback', async () => {
      const state = {
        ...initialState,
        userResponses: [
          { tag: 'req-1', response: 'Feedback 1', section: 'Requirements' },
          { tag: 'req-2', response: 'Feedback 2', section: 'Requirements' },
          { tag: 'ui-1', response: 'UI feedback', section: 'User Interface' }
        ],
        requirements: [{ id: 'REQ-1', title: 'Test', description: 'Test' }],
        moscowAnalysis: {
          must: [{ id: 'REQ-1', title: 'Test', description: 'Test', moscowCategory: 'must' as const }],
          should: [], could: [], wont: []
        },
        refinementIteration: 3
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      expect(entry.summary).toContain('3 user response(s)');
      expect(entry.summary).toContain('across 3 areas'); // User Feedback, Requirements, Categorization
      
      // Check feedback processing details
      const feedbackSection = entry.sections.find((s: any) => s.title === 'User Feedback Processing');
      const changes = feedbackSection!.changes;
      expect(changes).toContain('Processed 2 feedback response(s) in "Requirements" section');
      expect(changes).toContain('Tags processed: req-1, req-2');
      expect(changes).toContain('Processed 1 feedback response(s) in "User Interface" section');
    });
    
    it('should format changelog with multiple entries', async () => {
      const existingEntry = {
        iteration: 1,
        changes: ['Initial analysis completed', 'Found 5 requirements'],
        timestamp: '2024-01-01T10:00:00Z',
        responsesProcessed: 0
      };
      
      const state = {
        ...initialState,
        changelog: [existingEntry],
        userResponses: [
          { tag: 'update-1', response: 'Update requirement', section: 'Requirements' }
        ],
        refinementIteration: 2
      };
      
      const result = await node.process(state);
      
      expect(result.formattedChangelog).toContain('Version 2');
      expect(result.formattedChangelog).toContain('Version 1');
      expect(result.formattedChangelog).toContain('Initial analysis completed');
      expect(result.formattedChangelog).toContain('User Feedback Processing');
      
      // Verify newest first order
      const version2Index = result.formattedChangelog!.indexOf('Version 2');
      const version1Index = result.formattedChangelog!.indexOf('Version 1');
      expect(version2Index).toBeLessThan(version1Index);
    });
    
    it('should handle errors gracefully', async () => {
      // Force an error by making state.userResponses undefined
      const state = {
        ...initialState,
        userResponses: undefined as any
      };
      
      const result = await node.process(state);
      
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toContain('ChangelogGenerationNode:');
      expect(result.nextNode).toBeNull();
    });
    
    it('should group feedback by section with overflow handling', async () => {
      const state = {
        ...initialState,
        userResponses: [
          { tag: 'tag-1', response: 'Feedback 1', section: 'Requirements' },
          { tag: 'tag-2', response: 'Feedback 2', section: 'Requirements' },
          { tag: 'tag-3', response: 'Feedback 3', section: 'Requirements' },
          { tag: 'tag-4', response: 'Feedback 4', section: 'Requirements' },
          { tag: 'tag-5', response: 'Feedback 5', section: 'Requirements' }
        ]
      };
      
      const result = await node.process(state);
      
      const entry = result.changelog![0] as any;
      const feedbackSection = entry.sections.find((s: any) => s.title === 'User Feedback Processing');
      const tagLine = feedbackSection!.changes.find((c: any) => c.includes('Tags processed:'));
      
      expect(tagLine).toBeDefined();
      expect(tagLine).toContain('tag-1, tag-2, tag-3');
      expect(tagLine).toContain('(and 2 more)');
    });
    
    it('should update messages with processing progress', async () => {
      const state = {
        ...initialState,
        userResponses: [
          { tag: 'test', response: 'Test', section: 'Test' }
        ],
        refinementIteration: 1
      };
      
      const result = await node.process(state);
      
      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      
      // Check processing message
      const processingMsg = result.messages!.find(m => {
        const content = (m as HumanMessage).content;
        return typeof content === 'string' && content.includes('Generating changelog');
      });
      expect(processingMsg).toBeDefined();
      
      // Check completion message
      const completionMsg = result.messages![result.messages!.length - 1];
      const content = (completionMsg as HumanMessage).content;
      expect(typeof content === 'string' && content.includes('Changelog updated for iteration 1')).toBe(true);
    });
  });
}); 