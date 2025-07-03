import { ResearchSynthesisNode } from '../../../../src/agents/nodes/research/ResearchSynthesisNode';
import { ProjectState } from '../../../../src/agents/state';
import { ChatOpenAI } from '@langchain/openai';

// Mock the llm-factory module
jest.mock('../../../../src/agents/utils/llm-factory', () => ({
  createLLM: jest.fn()
}));

import { createLLM } from '../../../../src/agents/utils/llm-factory';

describe('ResearchSynthesisNode', () => {
  let node: ResearchSynthesisNode;
  let mockState: ProjectState;
  let mockLLM: jest.Mocked<ChatOpenAI>;

  beforeEach(() => {
    node = new ResearchSynthesisNode();
    
    // Create mock LLM
    mockLLM = {
      invoke: jest.fn()
    } as any;
    
    (createLLM as jest.Mock).mockReturnValue(mockLLM);
    
    // Create initial state with research data
    mockState = {
      filePath: 'test.org',
      fileContent: '',
      requirements: [
        { id: 'R1', title: 'Real-time updates', description: 'Support WebSocket connections' },
        { id: 'R2', title: 'User authentication', description: 'Secure login system' }
      ],
      userStories: [],
      brainstormIdeas: [],
      questionsAnswers: [],
      moscowAnalysis: { 
        must: [
          { id: 'R1', title: 'Real-time updates', description: 'Support WebSocket connections' },
          { id: 'R2', title: 'User authentication', description: 'Secure login system' }
        ], 
        should: [], 
        could: [], 
        wont: [] 
      },
      kanoAnalysis: { basic: [], performance: [], excitement: [] },
      dependencies: [],
      extractedTechnologies: ['Node.js', 'React', 'WebSocket', 'PostgreSQL'],
      researchTopics: [],
      hackerNewsResults: [
        {
          title: 'WebSocket at Scale: Lessons Learned',
          url: 'https://news.ycombinator.com/item?id=123',
          summary: '🔥 Front Page: Posted 10 hours ago | 350 points (35/hr) | 120 comments\nDetailed discussion about scaling WebSocket connections to millions of users',
          relevance: 95,
          selectionReason: 'Front page discussion directly related to your real-time requirements',
          relationshipToTopic: 'Matches keywords: websocket, real-time'
        },
        {
          title: 'Why We Moved Away from WebSockets',
          url: 'https://news.ycombinator.com/item?id=124',
          summary: '📈 Trending: Posted 2 days ago | 200 points (4/hr) | 89 comments\nAlternative approaches to real-time communication',
          relevance: 80,
          selectionReason: 'Rapidly gaining traction with alternative viewpoint',
          relationshipToTopic: 'Contrasting perspective on WebSocket implementation'
        }
      ],
      redditResults: [
        {
          title: 'Best practices for WebSocket authentication?',
          url: 'https://reddit.com/r/node/123',
          summary: 'Community discussion about securing WebSocket connections with JWT tokens',
          subreddit: 'node',
          relevance: 85,
          selectionReason: 'Technical discussion combining your auth and real-time requirements',
          relationshipToTopic: 'Addresses intersection of authentication and WebSockets'
        },
        {
          title: 'React + Socket.io vs plain WebSockets',
          url: 'https://reddit.com/r/reactjs/456',
          summary: 'Debate on using Socket.io library versus native WebSocket implementation',
          subreddit: 'reactjs',
          relevance: 75,
          selectionReason: 'Popular community insight on implementation choices',
          relationshipToTopic: 'Library recommendations for React WebSocket integration'
        }
      ],
      additionalResearchResults: [
        {
          topic: 'WebSocket scaling strategies',
          findings: 'Horizontal scaling of WebSocket servers requires sticky sessions or a message broker like Redis. Consider using a dedicated WebSocket gateway service for large-scale deployments.'
        },
        {
          topic: 'JWT authentication patterns',
          findings: 'For WebSocket authentication, send JWT in the connection handshake. Implement token refresh mechanism to handle long-lived connections. Consider using short-lived tokens with refresh tokens stored securely.'
        }
      ],
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
    it('should handle no research data', async () => {
      // Clear all research data
      mockState.hackerNewsResults = [];
      mockState.redditResults = [];
      mockState.additionalResearchResults = [];
      mockState.extractedTechnologies = [];

      const result = await node.process(mockState);

      expect(result.researchSynthesis).toBe('');
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: "No research findings to synthesize"
      }));
      expect(result.nextNode).toBe('ResponseProcessingNode');
      expect(mockLLM.invoke).not.toHaveBeenCalled();
    });

    it('should synthesize research findings', async () => {
      const mockSynthesis = `## Executive Summary
WebSocket implementation requires careful consideration of scaling and authentication. Community consensus favors Socket.io for easier implementation but warns about scaling challenges.

## Technology Landscape
- Node.js: Mature ecosystem for real-time applications
- React: Well-supported with libraries like Socket.io-client
- WebSocket: Native support but requires additional tooling for production
- PostgreSQL: Solid choice for persistent data

## Community Consensus
Strong preference for Socket.io over raw WebSockets for its reconnection handling and fallback mechanisms. Authentication should use JWT tokens in handshake.

## Implementation Insights
- Use Redis for horizontal scaling
- Implement heartbeat/ping-pong for connection health
- Consider Server-Sent Events for one-way communication

## Potential Challenges
- Scaling WebSocket connections requires sticky sessions
- JWT token refresh in long-lived connections
- Memory usage with many concurrent connections

## Recommendations
1. Start with Socket.io for faster development
2. Use Redis adapter for scaling
3. Implement proper connection lifecycle management
4. Monitor memory usage closely`;

      const mockTechRecommendations = [
        {
          technology: "Socket.io",
          purpose: "WebSocket abstraction with automatic reconnection and fallbacks",
          alternatives: ["ws", "uWebSockets.js"]
        },
        {
          technology: "Redis",
          purpose: "Pub/sub for horizontal WebSocket scaling",
          alternatives: ["RabbitMQ", "NATS"]
        }
      ];

      // Mock LLM responses
      mockLLM.invoke
        .mockResolvedValueOnce({ content: mockSynthesis } as any)
        .mockResolvedValueOnce({ content: JSON.stringify(mockTechRecommendations) } as any);

      const result = await node.process(mockState);

      expect(mockLLM.invoke).toHaveBeenCalledTimes(2);
      
      // Check synthesis generation
      const firstCall = mockLLM.invoke.mock.calls[0];
      const firstMessages = Array.isArray(firstCall[0]) ? firstCall[0] : [];
      const systemMessage: any = firstMessages[0];
      const userMessage: any = firstMessages[1];
      expect(systemMessage?.content).toContain('technical research analyst');
      expect(userMessage?.content).toContain('WebSocket at Scale');
      expect(userMessage?.content).toContain('Best practices for WebSocket authentication');
      expect(userMessage?.content).toContain('WebSocket scaling strategies');
      
      // Check tech recommendations extraction
      const secondCall = mockLLM.invoke.mock.calls[1];
      const secondMessages = Array.isArray(secondCall[0]) ? secondCall[0] : [];
      const techUserMessage: any = secondMessages[1];
      expect(techUserMessage?.content).toContain('Node.js, React, WebSocket, PostgreSQL');
      
      // Verify results
      expect(result.researchSynthesis).toBe(mockSynthesis);
      expect(result.techStackRecommendations).toHaveLength(2);
      expect(result.techStackRecommendations![0]).toEqual({
        technology: "Socket.io",
        purpose: "WebSocket abstraction with automatic reconnection and fallbacks",
        alternatives: ["ws", "uWebSockets.js"]
      });
      
      // Check summary message
      const summaryMessage = result.messages?.[0];
      expect(summaryMessage).toBeDefined();
      if (summaryMessage && 'kwargs' in summaryMessage) {
        expect((summaryMessage as any).kwargs.content).toBe(
          "Research synthesis complete. Analyzed 6 research items across 3 sources."
        );
      } else if (summaryMessage && 'content' in summaryMessage) {
        expect((summaryMessage as any).content).toBe(
          "Research synthesis complete. Analyzed 6 research items across 3 sources."
        );
      }
      expect(result.nextNode).toBe('ResponseProcessingNode');
    });

    it('should build comprehensive research context', async () => {
      mockLLM.invoke.mockResolvedValue({ content: 'Test synthesis' } as any);

      await node.process(mockState);

      const call = mockLLM.invoke.mock.calls[0];
      const messages = Array.isArray(call[0]) ? call[0] : [];
      const userMessage: any = messages[1];
      const context = userMessage?.content || '';
      
      // Check project context
      expect(context).toContain('## Project Context');
      expect(context).toContain('Requirements: 2 defined');
      expect(context).toContain('Real-time updates');
      
      // Check technologies
      expect(context).toContain('## Technologies Identified');
      expect(context).toContain('Node.js, React, WebSocket, PostgreSQL');
      
      // Check Hacker News section
      expect(context).toContain('## Hacker News Insights');
      expect(context).toContain('Found 2 relevant discussions');
      expect(context).toContain('### Must-Read (1)');
      expect(context).toContain('WebSocket at Scale: Lessons Learned');
      expect(context).toContain('📎 Front page discussion directly related');
      expect(context).toContain('🔗 Matches keywords: websocket, real-time');
      
      // Check Reddit section
      expect(context).toContain('## Reddit Community Insights');
      expect(context).toContain('### r/node (1 posts)');
      expect(context).toContain('Best practices for WebSocket authentication?');
      expect(context).toContain('📎 Technical discussion combining your auth');
      
      // Check additional research
      expect(context).toContain('## Additional Research Findings');
      expect(context).toContain('### WebSocket scaling strategies');
      expect(context).toContain('Horizontal scaling of WebSocket servers');
    });

    it('should group Reddit results by subreddit', async () => {
      // Add more Reddit results
      mockState.redditResults.push(
        {
          title: 'Node.js WebSocket performance tips',
          url: 'https://reddit.com/r/node/789',
          summary: 'Tips for optimizing WebSocket performance',
          subreddit: 'node',
          relevance: 70
        },
        {
          title: 'PostgreSQL with real-time features',
          url: 'https://reddit.com/r/PostgreSQL/101',
          summary: 'Using PostgreSQL LISTEN/NOTIFY for real-time',
          subreddit: 'PostgreSQL',
          relevance: 65
        }
      );

      mockLLM.invoke.mockResolvedValue({ content: 'Test synthesis' } as any);

      await node.process(mockState);

      const messages = Array.isArray(mockLLM.invoke.mock.calls[0][0]) ? mockLLM.invoke.mock.calls[0][0] : [];
      const userMessage: any = messages[1];
      const context = userMessage?.content || '';
      
      // Should group by subreddit with post count
      expect(context).toContain('### r/node (2 posts)');
      expect(context).toContain('### r/reactjs (1 posts)');
      expect(context).toContain('### r/PostgreSQL (1 posts)');
    });

    it('should handle LLM errors gracefully', async () => {
      mockLLM.invoke.mockRejectedValue(new Error('OpenAI API error'));

      const result = await node.process(mockState);

      expect(result.researchSynthesis).toBe('');
      expect(result.errors).toContainEqual('ResearchSynthesisNode: OpenAI API error');
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: 'ResearchSynthesisNode error: OpenAI API error'
      }));
      expect(result.nextNode).toBe('ResponseProcessingNode');
    });

    it('should handle malformed tech recommendations', async () => {
      mockLLM.invoke
        .mockResolvedValueOnce({ content: 'Valid synthesis' } as any)
        .mockResolvedValueOnce({ content: 'Invalid JSON {broken}' } as any);

      const result = await node.process(mockState);

      // Should still complete successfully
      expect(result.researchSynthesis).toBe('Valid synthesis');
      expect(result.techStackRecommendations).toEqual([]); // Empty array on parse failure
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: expect.stringContaining('Research synthesis complete')
      }));
    });

    it('should filter research by influence indicators', async () => {
      // Add more varied HN results
      mockState.hackerNewsResults.push(
        {
          title: 'Old but gold: WebSocket basics',
          url: 'https://news.ycombinator.com/item?id=125',
          summary: '⭐ Influential: Posted 2 years ago | 1500 points | 400 comments\nClassic discussion on WebSocket fundamentals',
          relevance: 70
        },
        {
          title: 'Random WebSocket mention',
          url: 'https://news.ycombinator.com/item?id=126',
          summary: 'Posted 1 week ago | 50 points | 10 comments\nBrief mention in broader discussion',
          relevance: 40
        }
      );

      mockLLM.invoke.mockResolvedValue({ content: 'Test' } as any);

      await node.process(mockState);

      const messages = Array.isArray(mockLLM.invoke.mock.calls[0][0]) ? mockLLM.invoke.mock.calls[0][0] : [];
      const userMessage: any = messages[1];
      const context = userMessage?.content || '';
      
      // Should have trending section now
      expect(context).toContain('### Trending Topics (1)');
      expect(context).toContain('Why We Moved Away from WebSockets');
      
      // Should show influential but not low-relevance items
      expect(context).toContain('Old but gold: WebSocket basics');
      expect(context).not.toContain('Random WebSocket mention');
    });

    it('should count research items and sources correctly', async () => {
      mockLLM.invoke.mockResolvedValue({ content: 'Test' } as any);

      const result = await node.process(mockState);

      // 2 HN + 2 Reddit + 2 Additional = 6 items
      // 3 sources (HN, Reddit, Additional)
      expect(result.messages?.[0]).toEqual(expect.objectContaining({
        content: "Research synthesis complete. Analyzed 6 research items across 3 sources."
      }));
    });

    it('should preserve existing tech recommendations', async () => {
      // Add existing recommendations
      mockState.techStackRecommendations = [
        {
          technology: "TypeScript",
          purpose: "Type safety",
          alternatives: ["Flow"]
        }
      ];

      const newRecommendations = [
        {
          technology: "Socket.io",
          purpose: "WebSocket handling",
          alternatives: ["ws"]
        }
      ];

      mockLLM.invoke
        .mockResolvedValueOnce({ content: 'Synthesis' } as any)
        .mockResolvedValueOnce({ content: JSON.stringify(newRecommendations) } as any);

      const result = await node.process(mockState);

      // Should have both existing and new recommendations
      expect(result.techStackRecommendations).toHaveLength(2);
      expect(result.techStackRecommendations![0].technology).toBe("TypeScript");
      expect(result.techStackRecommendations![1].technology).toBe("Socket.io");
    });
  });
}); 