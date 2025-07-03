import { ProjectState } from '../state';

/**
 * Determines if the document contains :RESPONSE: tags for refinement
 */
export function checkForResponses(state: ProjectState): string {
  if (state.fileContent && state.fileContent.includes(':RESPONSE:')) {
    return 'responseProcessing';
  }
  return 'requirementsAnalysis';
}

/**
 * Routes after research synthesis based on refinement state
 */
export function routeAfterResearch(state: ProjectState): string {
  // Check if we're in refinement mode (have user responses)
  if (state.userResponses && state.userResponses.length > 0) {
    return 'feedbackIntegration';
  }
  // Otherwise, we're done
  return 'END';
}

/**
 * Routes after changelog generation
 */
export function routeAfterChangelog(state: ProjectState): string {
  // If we have updated requirements, re-analyze them
  if (state.requirements && state.requirements.length > 0) {
    return 'requirementsAnalysis';
  }
  // Otherwise end
  return 'END';
}

/**
 * Generic error checking for nodes
 */
export function checkForErrors(state: ProjectState): string {
  // Check if the node set a nextNode override (for error handling)
  if (state.nextNode === null && state.errors && state.errors.length > 0) {
    // Critical error - end the flow
    return 'END';
  }
  // Otherwise continue with normal flow
  return 'CONTINUE';
}

/**
 * Get the default flow map for the graph
 */
export function getFlowMap(): Record<string, string> {
  return {
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
  };
}

/**
 * Checks if a node is a terminal node in the flow
 */
export function isTerminalNode(nodeName: string): boolean {
  const terminalNodes = ['researchSynthesisNode', 'changelogGeneration'];
  return terminalNodes.includes(nodeName);
}

/**
 * Determines if we should skip research nodes
 * (e.g., when in refinement mode)
 */
export function shouldSkipResearch(state: ProjectState): boolean {
  // Skip research if we're processing responses
  return !!(state.userResponses && state.userResponses.length > 0);
}

/**
 * Routes for specific analysis types
 */
export type AnalysisMode = 'full' | 'quick' | 'refinement';

export function determineAnalysisMode(state: ProjectState): AnalysisMode {
  if (state.fileContent && state.fileContent.includes(':RESPONSE:')) {
    return 'refinement';
  }
  
  // Could add logic for quick analysis based on flags or document size
  return 'full';
}

/**
 * Determines if we should search Hacker News
 */
export function shouldSearchHackerNews(state: ProjectState): boolean {
  // Search HN if we have extracted technologies
  return !!(state.extractedTechnologies && state.extractedTechnologies.length > 0);
}

/**
 * Determines if we should search Reddit
 */
export function shouldSearchReddit(state: ProjectState): boolean {
  // Search Reddit if we have extracted technologies and already searched HN
  return !!(state.extractedTechnologies && 
           state.extractedTechnologies.length > 0 &&
           state.hackerNewsResults);
}

/**
 * Determines if we should perform additional research
 */
export function shouldPerformAdditionalResearch(state: ProjectState): boolean {
  // Perform additional research if we have research topics
  return !!(state.researchTopics && state.researchTopics.length > 0);
} 