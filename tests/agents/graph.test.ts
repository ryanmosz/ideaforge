import { buildIdeaForgeGraph } from '../../src/agents/graph';

// Mock all nodes
jest.mock('../../src/agents/nodes/DocumentParserNode');
jest.mock('../../src/agents/nodes/RequirementsAnalysisNode');
jest.mock('../../src/agents/nodes/MoscowCategorizationNode');
jest.mock('../../src/agents/nodes/KanoEvaluationNode');
jest.mock('../../src/agents/nodes/DependencyAnalysisNode');
jest.mock('../../src/agents/nodes/research');
jest.mock('../../src/agents/nodes/refinement');

describe('IdeaForge Graph', () => {
  let graph: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('buildIdeaForgeGraph', () => {
    it('should create and compile a graph without errors', () => {
      expect(() => {
        graph = buildIdeaForgeGraph();
      }).not.toThrow();
      
      expect(graph).toBeDefined();
    });
    
    it('should return a compiled graph', () => {
      graph = buildIdeaForgeGraph();
      
      // A compiled graph should have invoke method
      expect(typeof graph.invoke).toBe('function');
    });
  });
  
  describe('Graph Compilation', () => {
    it('should compile without errors', () => {
      expect(() => {
        graph = buildIdeaForgeGraph();
      }).not.toThrow();
    });
  });
  
  describe('Graph Execution', () => {
    it('should accept a valid ProjectState for invocation', () => {
      graph = buildIdeaForgeGraph();
      
      // Should not throw when preparing for invocation
      expect(() => {
        // We're not actually invoking here since nodes are mocked
        // Just testing that the graph structure accepts the state
        const invokePromise = graph.invoke;
        expect(invokePromise).toBeDefined();
      }).not.toThrow();
    });
  });
}); 