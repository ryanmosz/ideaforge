import { AdditionalResearchNode } from '../../../../src/agents/nodes/research/AdditionalResearchNode';
import { ProjectState } from '../../../../src/agents/state';
import { ChatOpenAI } from '@langchain/openai';

// Mock the llm-factory module
jest.mock('../../../../src/agents/utils/llm-factory', () => ({
  createLLM: jest.fn()
}));

import { createLLM } from '../../../../src/agents/utils/llm-factory';

describe('AdditionalResearchNode', () => {
  let node: AdditionalResearchNode;
  let mockState: ProjectState;
  let mockLLM: jest.Mocked<ChatOpenAI>;

  beforeEach(() => {
    node = new AdditionalResearchNode();
    
    // Create mock LLM
    mockLLM = {
      invoke: jest.fn()
    } as any;
    
    (createLLM as jest.Mock).mockReturnValue(mockLLM);
    
    // Create initial state
    mockState = {
      filePath: 'test.org',
      fileContent: '* Project Overview\nA test project for research\n\n* Additional Research Subjects\n- Machine Learning frameworks\n- Kubernetes orchestration\n- WebRTC protocols',
      requirements: [
        { id: 'R1', title: 'User Authentication', description: 'Secure login system' },
        { id: 'R2', title: 'Data Processing', description: 'ML-based analysis' }
      ],
      userStories: [
        { id: 'US1', actor: 'developer', action: 'build scalable applications', benefit: 'handle growth' }
      ],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: { 
        must: [{ id: 'R1', title: 'User Authentication', description: 'Secure login system' }], 
        should: [], 
        could: [], 
        wont: [] 
      },
      kanoAnalysis: { basic: [], performance: [], excitement: [] },
      dependencies: [],
      extractedTechnologies: ['Node.js', 'React', 'PostgreSQL'],
      researchTopics: [
        'Machine Learning frameworks',
        'Kubernetes orchestration', 
        'WebRTC protocols',
        'React vs Angular comparison',
        'Node.js best practices 2024'
      ],
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
    
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should handle no additional research topics', async () => {
      // Set research topics to only auto-generated ones
      mockState.researchTopics = [
        'React vs Angular comparison',
        'Node.js best practices 2024',
        'PostgreSQL optimization guide'
      ];

      const result = await node.process(mockState);

      expect(result.additionalResearchResults).toEqual([]);
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: "No additional research topics specified by user"
      }));
      expect(result.nextNode).toBe('ResearchSynthesisNode');
    });

    it('should extract and research user-specified topics', async () => {
      // Mock LLM responses
      mockLLM.invoke.mockImplementation(async (messages) => {
        const messageArray = Array.isArray(messages) ? messages : [];
        const userMessage = messageArray.length > 1 && messageArray[1] && typeof messageArray[1] === 'object' && 'content' in messageArray[1] 
          ? String((messageArray[1] as any).content) 
          : '';
        
        if (userMessage.includes('Machine Learning frameworks')) {
          return {
            content: 'Machine Learning frameworks research: TensorFlow and PyTorch are the leading ML frameworks. TensorFlow excels in production deployment while PyTorch is preferred for research and rapid prototyping.'
          } as any;
                  } else if (userMessage.includes('Kubernetes orchestration')) {
            return {
              content: 'Kubernetes orchestration research: Use Kubernetes for container orchestration at scale. Key concepts include pods, services, deployments, and ingress controllers. Consider managed services like EKS or GKE.'
            } as any;
          } else if (userMessage.includes('WebRTC protocols')) {
            return {
              content: 'WebRTC protocols research: WebRTC enables real-time peer-to-peer communication. Key protocols include ICE for NAT traversal, STUN/TURN servers, and DTLS for encryption. Consider using libraries like SimplePeer.'
            } as any;
        }
        
        return { content: 'Generic research findings' } as any;
      });

      const result = await node.process(mockState);

      expect(mockLLM.invoke).toHaveBeenCalledTimes(3);
      expect(result.additionalResearchResults).toHaveLength(3);
      
      expect(result.additionalResearchResults![0]).toEqual({
        topic: 'Machine Learning frameworks',
        findings: expect.stringContaining('TensorFlow and PyTorch')
      });
      
      expect(result.additionalResearchResults![1]).toEqual({
        topic: 'Kubernetes orchestration',
        findings: expect.stringContaining('container orchestration')
      });
      
      expect(result.additionalResearchResults![2]).toEqual({
        topic: 'WebRTC protocols',
        findings: expect.stringContaining('real-time peer-to-peer')
      });
    });

    it('should extract topics from questions and answers', async () => {
      mockState.questionsAnswers = [
        {
          id: 'Q1',
          question: 'What additional research subjects should we explore?',
          answer: '- Blockchain integration possibilities\n- Real-time communication protocols\n- Data privacy regulations'
        }
      ];
      
      mockLLM.invoke.mockResolvedValue({
        content: 'Research findings for the topic'
      } as any);

      const result = await node.process(mockState);

      expect(mockLLM.invoke).toHaveBeenCalledTimes(3);
      expect(result.additionalResearchResults).toHaveLength(3);
      
      const topics = result.additionalResearchResults!.map(r => r.topic);
      expect(topics).toContain('Blockchain integration possibilities');
      expect(topics).toContain('Real-time communication protocols');
      expect(topics).toContain('Data privacy regulations');
    });

    it('should include project context in research prompts', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: 'Research findings'
      } as any);

      await node.process(mockState);

      // Check that project context was included in prompts
      const calls = mockLLM.invoke.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const firstCall = calls[0];
      expect(firstCall).toBeDefined();
      
      const messages = Array.isArray(firstCall[0]) ? firstCall[0] : [];
      const userMessage = messages.find((msg: any) => msg.role === 'user');
      
      if (userMessage && typeof userMessage === 'object' && 'content' in userMessage) {
        const content = String((userMessage as any).content);
        expect(content).toContain('Project Overview: A test project for research');
        expect(content).toContain('Key Requirements:');
        expect(content).toContain('User Authentication');
        expect(content).toContain('Technologies: Node.js, React, PostgreSQL');
        expect(content).toContain('Primary User Story: As a developer');
      }
    });

    it('should handle research errors gracefully', async () => {
      // First topic succeeds, second fails, third succeeds
      let callCount = 0;
      mockLLM.invoke.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('OpenAI API error');
        }
        return { content: `Research findings for call ${callCount}` } as any;
      });

      const result = await node.process(mockState);

      // Should still get 2 successful results (1st and 3rd)
      expect(result.additionalResearchResults).toHaveLength(2);
      
      // Should have error message
      const errorMessages = result.messages?.filter(msg => {
        const content = typeof msg.content === 'string' ? msg.content : '';
        return content.includes('Error researching topic');
      });
      expect(errorMessages).toHaveLength(1);
      if (errorMessages && errorMessages[0]) {
        const content = String(errorMessages[0].content);
        expect(content).toContain('Kubernetes orchestration');
        expect(content).toContain('OpenAI API error');
      }
    });

    it('should filter out auto-generated topics correctly', async () => {
      // Mix of user-specified and auto-generated topics
      mockState.researchTopics = [
        'GraphQL subscriptions', // User-specified
        'React vs Vue comparison', // Auto-generated (vs comparison)
        'WebRTC protocols', // User-specified
        'Docker best practices 2024', // Auto-generated (best practices)
        'Microservices architecture', // User-specified
        'Node.js Express.js integration guide' // Auto-generated (integration guide)
      ];
      
      mockLLM.invoke.mockResolvedValue({
        content: 'Research findings'
      } as any);

      const result = await node.process(mockState);

      // Should only research user-specified topics
      expect(mockLLM.invoke).toHaveBeenCalledTimes(3);
      expect(result.additionalResearchResults).toHaveLength(3);
      
      const topics = result.additionalResearchResults!.map(r => r.topic);
      expect(topics).toContain('GraphQL subscriptions');
      expect(topics).toContain('WebRTC protocols');
      expect(topics).toContain('Microservices architecture');
      
      // Should NOT contain auto-generated topics
      expect(topics).not.toContain('React vs Vue comparison');
      expect(topics).not.toContain('Docker best practices 2024');
      expect(topics).not.toContain('Node.js Express.js integration guide');
    });

    it('should handle general node errors', async () => {
      // Simulate error in createLLM
      (createLLM as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create LLM');
      });

      const result = await node.process(mockState);

      expect(result.additionalResearchResults).toEqual([]);
      expect(result.errors).toContainEqual('AdditionalResearchNode: Failed to create LLM');
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: 'AdditionalResearchNode error: Failed to create LLM'
      }));
      expect(result.nextNode).toBe('ResearchSynthesisNode');
    });

    it('should create completion summary message', async () => {
      mockLLM.invoke.mockResolvedValue({
        content: 'Research findings'
      } as any);

      const result = await node.process(mockState);

      const summaryMessage = result.messages?.find(msg => {
        const content = typeof msg.content === 'string' ? msg.content : '';
        return content.includes('Completed additional research');
      });
      
      expect(summaryMessage).toBeDefined();
      if (summaryMessage) {
        const content = String(summaryMessage.content);
        expect(content).toContain('Completed additional research on 3 topics:');
        expect(content).toContain('- Machine Learning frameworks');
        expect(content).toContain('- Kubernetes orchestration');
        expect(content).toContain('- WebRTC protocols');
      }
    });
  });
}); 