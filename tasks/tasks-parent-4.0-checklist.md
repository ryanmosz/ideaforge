## Relevant Files

- `src/agents/index.ts` - Main LangGraph agent export and initialization
- `src/agents/state.ts` - ProjectState TypeScript schema definition  
- `src/agents/graph.ts` - Graph construction and node connections
- `src/agents/nodes/base-node.ts` - Abstract base class for all analysis nodes
- `src/agents/nodes/document-parser-node.ts` - Parses org-mode documents
- `src/agents/nodes/requirements-analysis-node.ts` - Analyzes project requirements
- `src/agents/nodes/moscow-categorization-node.ts` - Applies MoSCoW framework
- `src/agents/nodes/kano-evaluation-node.ts` - Kano model evaluation
- `src/agents/nodes/dependency-analysis-node.ts` - Maps feature dependencies
- `src/agents/nodes/research/*.ts` - Research node stubs for Task 5.0
- `src/agents/nodes/refinement/*.ts` - Refinement and feedback processing
- `src/agents/edges/routing.ts` - Conditional routing logic
- `src/agents/persistence/memory-saver.ts` - State persistence implementation
- `src/agents/persistence/session-manager.ts` - Session management utilities
- `src/agents/prompts/*.ts` - AI prompt templates for each node
- `src/services/agent-runner.ts` - CLI-LangGraph integration layer
- `tests/agents/**/*.test.ts` - Comprehensive test coverage for all components

### Notes

- LangGraph is the core intelligence layer managing state and planning dialogue
- Each node should be kept under 500 lines per the ESLint rule
- Use `npm test` after each subtask to ensure nothing breaks
- State persistence enables conversation memory across CLI invocations
- Progress updates should flow through the existing ProgressManager

## Tasks

# Parent Task 4.0: Implement LangGraph agent architecture

- [x] 4.1 Set up LangGraph project structure
- [x] 4.2 Define ProjectState TypeScript schema
- [ ] 4.3 Create core analysis nodes:
  - [x] 4.3.1 DocumentParserNode - Parse org-mode structure  
  - [x] 4.3.2 RequirementsAnalysisNode - Understand project goals
  - [x] 4.3.3 MoscowCategorizationNode - Apply MoSCoW framework
  - [x] 4.3.4 KanoEvaluationNode - Assess user value
  - [x] 4.3.5 DependencyAnalysisNode - Map feature relationships
- [ ] 4.4 Create research nodes:
  - [x] 4.4.1 TechnologyExtractionNode - Parse for tech keywords
  - [x] 4.4.2 HackerNewsSearchNode - Query HN discussions
  - [x] 4.4.3 RedditSearchNode - Search relevant subreddits
  - [x] 4.4.4 AdditionalResearchNode - Process user topics
  - [x] 4.4.5 ResearchSynthesisNode - Combine findings
- [ ] 4.5 Create refinement nodes:
  - [ ] 4.5.1 ResponseProcessingNode - Handle :RESPONSE: tags
  - [ ] 4.5.2 FeedbackIntegrationNode - Update analysis
  - [ ] 4.5.3 ChangelogGenerationNode - Track changes
- [ ] 4.6 Build graph edges and conditional routing
- [ ] 4.7 Implement state persistence between sessions
- [ ] 4.8 Create LangGraph-CLI communication layer 