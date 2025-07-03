import { StateGraph } from '@langchain/langgraph';
import { ProjectState } from './state';
import { stateChannels } from './state-annotations';

/**
 * Creates and configures the IdeaForge LangGraph agent
 */
export function createIdeaForgeAgent(): StateGraph<ProjectState> {
  const graph = new StateGraph<ProjectState>({
    channels: stateChannels
  });
  
  // Graph construction will be completed in later tasks
  
  return graph;
}

export * from './state';
export * from './types';
export * from './state-annotations'; 