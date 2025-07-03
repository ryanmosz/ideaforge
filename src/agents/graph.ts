// Graph construction - will be fully implemented in task 4.6

import { StateGraph } from '@langchain/langgraph';
import { ProjectState } from './state';
import { stateChannels } from './state-annotations';

export function buildIdeaForgeGraph(): StateGraph<ProjectState> {
  const graph = new StateGraph<ProjectState>({
    channels: stateChannels
  });
  
  // Graph construction will be completed in task 4.6
  
  return graph;
} 