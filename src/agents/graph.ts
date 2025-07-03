// Graph construction - connects all nodes with edges and routing logic

import { StateGraph, END } from '@langchain/langgraph';
import { ProjectState } from './state';
import { stateChannels } from './state-annotations';
import { 
  checkForResponses, 
  routeAfterResearch, 
  routeAfterChangelog, 
  checkForErrors,
  getFlowMap 
} from './edges/routing';

// Import all nodes
import { DocumentParserNode } from './nodes/DocumentParserNode';
import { RequirementsAnalysisNode } from './nodes/RequirementsAnalysisNode';
import { MoscowCategorizationNode } from './nodes/MoscowCategorizationNode';
import { KanoEvaluationNode } from './nodes/KanoEvaluationNode';
import { DependencyAnalysisNode } from './nodes/DependencyAnalysisNode';
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

export function buildIdeaForgeGraph() {
  const graph = new StateGraph<ProjectState>({
    channels: stateChannels
  });
  
  // Initialize all nodes
  const documentParser = new DocumentParserNode();
  const requirementsAnalysis = new RequirementsAnalysisNode();
  const moscowCategorization = new MoscowCategorizationNode();
  const kanoEvaluation = new KanoEvaluationNode();
  const dependencyAnalysis = new DependencyAnalysisNode();
  const technologyExtraction = new TechnologyExtractionNode();
  const hackerNewsSearch = new HackerNewsSearchNode();
  const redditSearch = new RedditSearchNode();
  const additionalResearch = new AdditionalResearchNode();
  const researchSynthesis = new ResearchSynthesisNode();
  const responseProcessing = new ResponseProcessingNode();
  const feedbackIntegration = new FeedbackIntegrationNode();
  const changelogGeneration = new ChangelogGenerationNode();
  
  // Add all nodes to the graph (bind process methods)
  graph.addNode('documentParser' as any, documentParser.invoke.bind(documentParser));
  graph.addNode('requirementsAnalysis' as any, requirementsAnalysis.invoke.bind(requirementsAnalysis));
  graph.addNode('moscowCategorization' as any, moscowCategorization.invoke.bind(moscowCategorization));
  graph.addNode('kanoEvaluation' as any, kanoEvaluation.invoke.bind(kanoEvaluation));
  graph.addNode('dependencyAnalysis' as any, dependencyAnalysis.invoke.bind(dependencyAnalysis));
  graph.addNode('technologyExtraction' as any, technologyExtraction.invoke.bind(technologyExtraction));
  graph.addNode('hackerNewsSearch' as any, hackerNewsSearch.process.bind(hackerNewsSearch));
  graph.addNode('redditSearch' as any, redditSearch.process.bind(redditSearch));
  graph.addNode('additionalResearch' as any, additionalResearch.process.bind(additionalResearch));
  graph.addNode('researchSynthesisNode' as any, researchSynthesis.process.bind(researchSynthesis));
  graph.addNode('responseProcessing' as any, responseProcessing.process.bind(responseProcessing));
  graph.addNode('feedbackIntegration' as any, feedbackIntegration.process.bind(feedbackIntegration));
  graph.addNode('changelogGeneration' as any, changelogGeneration.process.bind(changelogGeneration));
  
  // Set entry point
  graph.setEntryPoint('documentParser' as any);
  
  // Define edges - main analysis flow
  graph.addEdge('documentParser' as any, 'requirementsAnalysis' as any);
  graph.addEdge('requirementsAnalysis' as any, 'moscowCategorization' as any);
  graph.addEdge('moscowCategorization' as any, 'kanoEvaluation' as any);
  graph.addEdge('kanoEvaluation' as any, 'dependencyAnalysis' as any);
  graph.addEdge('dependencyAnalysis' as any, 'technologyExtraction' as any);
  
  // Research flow
  graph.addEdge('technologyExtraction' as any, 'hackerNewsSearch' as any);
  graph.addEdge('hackerNewsSearch' as any, 'redditSearch' as any);
  graph.addEdge('redditSearch' as any, 'additionalResearch' as any);
  graph.addEdge('additionalResearch' as any, 'researchSynthesisNode' as any);
  
  // Conditional routing after research synthesis
  graph.addConditionalEdges(
    'researchSynthesisNode' as any,
    routeAfterResearch,
    {
      'feedbackIntegration': 'feedbackIntegration' as any,
      'END': END
    }
  );
  
  // Refinement flow routing
  graph.addConditionalEdges(
    'documentParser' as any,
    checkForResponses,
    {
      'responseProcessing': 'responseProcessing' as any,
      'requirementsAnalysis': 'requirementsAnalysis' as any
    }
  );
  
  // Response processing flow
  graph.addEdge('responseProcessing' as any, 'feedbackIntegration' as any);
  graph.addEdge('feedbackIntegration' as any, 'changelogGeneration' as any);
  
  // After changelog, re-run analysis with updated state
  graph.addConditionalEdges(
    'changelogGeneration' as any,
    routeAfterChangelog,
    {
      'requirementsAnalysis': 'requirementsAnalysis' as any,
      'END': END
    }
  );
  
  // Error recovery paths
  // Each node can set errors in state, and we check for them
  const errorCheckNodes = [
    'documentParser',
    'requirementsAnalysis',
    'moscowCategorization',
    'kanoEvaluation',
    'dependencyAnalysis',
    'technologyExtraction',
    'hackerNewsSearch',
    'redditSearch',
    'additionalResearch',
    'researchSynthesisNode',
    'responseProcessing',
    'feedbackIntegration',
    'changelogGeneration'
  ];
  
  // Add error handling for critical nodes
  const flowMap = getFlowMap();
  
  errorCheckNodes.forEach(nodeName => {
    // Skip nodes that already have conditional edges or don't have a next node
    if (nodeName !== 'changelogGeneration' && 
        nodeName !== 'researchSynthesisNode' && 
        nodeName !== 'documentParser' &&
        flowMap[nodeName]) {
      graph.addConditionalEdges(
        nodeName as any,
        checkForErrors,
        {
          'END': END,
          'CONTINUE': flowMap[nodeName] as any
        }
      );
    }
  });
  
  return graph.compile();
} 