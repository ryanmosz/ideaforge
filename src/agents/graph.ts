// Graph construction - connects all nodes with edges and routing logic

import { StateGraph } from '@langchain/langgraph';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import {
  DocumentParserNode,
  RequirementsAnalysisNode,
  MoscowCategorizationNode,
  KanoEvaluationNode,
  DependencyAnalysisNode
} from './nodes';
import {
  TechnologyExtractionNode,
  HackerNewsSearchNode,
  RedditSearchNode,
  AdditionalResearchNode,
  ResearchSynthesisNode
} from './nodes/research';
import {
  ResponseProcessingNode,
  FeedbackIntegrationNode,
  ChangelogGenerationNode
} from './nodes/refinement';
import { ProjectState } from './state';
import { stateChannels } from './state-annotations';
import { ProgressManager } from '../cli/progress-manager';
import { shouldSearchReddit, shouldSearchHackerNews, shouldPerformAdditionalResearch } from './edges/routing';

/**
 * Builds the IdeaForge LangGraph workflow
 * @param progressManager - Optional progress manager for CLI integration
 * @param checkpointer - Optional checkpoint saver for state persistence
 * @param modelName - Optional AI model name
 * @returns Compiled LangGraph workflow
 */
export function buildIdeaForgeGraph(
  _progressManager?: ProgressManager,
  checkpointer?: BaseCheckpointSaver,  
  _modelName?: string
): any {  // Temporarily return any to avoid type issues
  // Create nodes
  const documentParser = new DocumentParserNode();
  const requirementsAnalysis = new RequirementsAnalysisNode();
  const moscowCategorization = new MoscowCategorizationNode();
  const kanoEvaluation = new KanoEvaluationNode();
  const dependencyAnalysis = new DependencyAnalysisNode();
  
  // Research nodes
  const technologyExtraction = new TechnologyExtractionNode();
  const hackerNewsSearch = new HackerNewsSearchNode();
  const redditSearch = new RedditSearchNode();
  const additionalResearch = new AdditionalResearchNode();
  const researchSynthesis = new ResearchSynthesisNode();
  
  // Refinement nodes
  const responseProcessing = new ResponseProcessingNode();
  const feedbackIntegration = new FeedbackIntegrationNode();
  const changelogGeneration = new ChangelogGenerationNode();
  
  // Create the graph
  const graph = new StateGraph<ProjectState>({
    channels: stateChannels
  });
  
  // Add nodes
  graph.addNode('documentParser', async (state) => documentParser.invoke(state));
  graph.addNode('requirementsAnalysis', async (state) => requirementsAnalysis.invoke(state));
  graph.addNode('moscowCategorization', async (state) => moscowCategorization.invoke(state));
  graph.addNode('kanoEvaluation', async (state) => kanoEvaluation.invoke(state));
  graph.addNode('dependencyAnalysis', async (state) => dependencyAnalysis.invoke(state));
  
  // Research nodes
  graph.addNode('technologyExtraction', async (state) => technologyExtraction.invoke(state));
  graph.addNode('hackerNewsSearch', async (state) => hackerNewsSearch.process(state));
  graph.addNode('redditSearch', async (state) => redditSearch.process(state));
  graph.addNode('additionalResearch', async (state) => additionalResearch.process(state));
  graph.addNode('researchSynthesisNode', async (state) => researchSynthesis.process(state));
  
  // Refinement nodes
  graph.addNode('responseProcessing', async (state) => responseProcessing.process(state));
  graph.addNode('feedbackIntegration', async (state) => feedbackIntegration.process(state));
  graph.addNode('changelogGeneration', async (state) => changelogGeneration.process(state));
  
  // Define flow with conditional edges
  // Start from documentParser
  graph.addEdge('__start__' as any, 'documentParser' as any);
  graph.addEdge('documentParser' as any, 'requirementsAnalysis' as any);
  graph.addEdge('requirementsAnalysis' as any, 'moscowCategorization' as any);
  graph.addEdge('moscowCategorization' as any, 'kanoEvaluation' as any);
  graph.addEdge('kanoEvaluation' as any, 'dependencyAnalysis' as any);
  graph.addEdge('dependencyAnalysis' as any, 'technologyExtraction' as any);
  
  // Conditional research edges
  graph.addConditionalEdges(
    'technologyExtraction' as any,
    async (state) => {
      if (shouldSearchHackerNews(state)) {
        return 'hackerNewsSearch';
      }
      if (shouldSearchReddit(state)) {
        return 'redditSearch';
      }
      if (shouldPerformAdditionalResearch(state)) {
        return 'additionalResearch';
      }
      return 'researchSynthesisNode';
    },
    {
      hackerNewsSearch: 'hackerNewsSearch' as any,
      redditSearch: 'redditSearch' as any,
      additionalResearch: 'additionalResearch' as any,
      researchSynthesisNode: 'researchSynthesisNode' as any
    }
  );
  
  // Research flow
  graph.addConditionalEdges(
    'hackerNewsSearch' as any,
    async (state) => {
      if (shouldSearchReddit(state)) {
        return 'redditSearch';
      }
      if (shouldPerformAdditionalResearch(state)) {
        return 'additionalResearch';
      }
      return 'researchSynthesisNode';
    },
    {
      redditSearch: 'redditSearch' as any,
      additionalResearch: 'additionalResearch' as any,
      researchSynthesisNode: 'researchSynthesisNode' as any
    }
  );
  
  graph.addConditionalEdges(
    'redditSearch' as any,
    async (state) => {
      if (shouldPerformAdditionalResearch(state)) {
        return 'additionalResearch';
      }
      return 'researchSynthesisNode';
    },
    {
      additionalResearch: 'additionalResearch' as any,
      researchSynthesisNode: 'researchSynthesisNode' as any
    }
  );
  
  graph.addEdge('additionalResearch' as any, 'researchSynthesisNode' as any);
  
  // Check for refinement after research
  graph.addConditionalEdges(
    'researchSynthesisNode' as any,
    async (state) => {
      if (state.userResponses && state.userResponses.length > 0) {
        return 'responseProcessing';
      }
      return '__end__';
    },
    {
      responseProcessing: 'responseProcessing' as any,
      __end__: '__end__' as any
    }
  );
  
  // Add finish node (LangGraph handles END internally)
  
  // Refinement flow
  graph.addEdge('responseProcessing' as any, 'feedbackIntegration' as any);
  graph.addEdge('feedbackIntegration' as any, 'changelogGeneration' as any);
  graph.addEdge('changelogGeneration' as any, '__end__' as any);
  
  // Compile the graph with checkpointer if provided
  return graph.compile({ checkpointer });
} 