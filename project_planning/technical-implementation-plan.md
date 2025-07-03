## Relevant Files

- `src/cli/index.ts` - Main CLI entry point and command definitions
- `src/cli/commands/*.ts` - Individual command implementations
- `src/parsers/orgmode-parser.ts` - Org-mode file parsing logic
- `src/parsers/orgmode-parser.test.ts` - Tests for org-mode parsing
- `src/services/n8n-client.ts` - n8n webhook integration service
- `src/services/n8n-client.test.ts` - Tests for n8n integration
- `src/services/openai-processor.ts` - AI analysis orchestration
- `src/services/openai-processor.test.ts` - Tests for AI processing
- `src/generators/suggestion-generator.ts` - Project suggestion generation
- `src/generators/visualization-generator.ts` - Architecture diagram generation
- `src/exporters/orgmode-exporter.ts` - Org-mode format exporter
- `src/exporters/markdown-exporter.ts` - Cursor markdown exporter
- `src/models/types.ts` - TypeScript type definitions
- `src/utils/progress-logger.ts` - CLI progress messaging utilities
- `src/utils/file-handler.ts` - File I/O operations
- `ideaforge-template.org` - Default org-mode template
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variable template

### Notes

- The project will be built with Node.js/TypeScript for easy migration to Electron later
- **LangGraph is the core intelligence layer** managing state and planning dialogue
- n8n workflows handle external API calls and rate limiting
- All file operations will be synchronous with progress updates
- The iterative refinement loop is file-based with LangGraph state management
- External intelligence gathering (HN/Reddit) flows through n8n to LangGraph
- Focus on LangGraph implementation first as it's the primary learning goal

## Tasks

- [x] 1.0 Set up project foundation and development environment
  - [x] 1.1 Initialize Node.js/TypeScript project structure
  - [x] 1.2 Configure build tools and TypeScript compiler
  - [x] 1.3 Set up testing framework (Jest)
  - [x] 1.4 Install core dependencies (Commander.js, Axios, etc.)
  - [x] 1.5 Create environment configuration structure

- [x] 2.0 Implement org-mode parsing and file handling
  - [x] 2.1 Create org-mode parser for template structure
  - [x] 2.2 Implement file validation and error handling
  - [x] 2.3 Build data extraction for requirements, user stories, and brainstorming
  - [x] 2.4 Handle :RESPONSE: tag recognition for refinement loops
  - [x] 2.5 Create file versioning system for iterations

- [x] 3.0 Build CLI framework and command structure
  - [x] 3.1 Implement main CLI entry point with Commander.js
  - [x] 3.2 Create analyze command for initial processing
  - [x] 3.3 Create refine command for iterative improvements
  - [x] 3.4 Create export command with format options
  - [x] 3.5 Create visualization commands for diagrams and tables
  - [x] 3.6 Implement progress messaging system

- [x] 4.0 Implement LangGraph agent architecture (Priority: HIGHEST)
  - [x] 4.1 Set up LangGraph project structure
  - [x] 4.2 Define ProjectState TypeScript schema
  - [x] 4.3 Create core analysis nodes:
    - [x] 4.3.1 DocumentParserNode - Parse org-mode structure
    - [x] 4.3.2 RequirementsAnalysisNode - Understand project goals
    - [x] 4.3.3 MoscowCategorizationNode - Apply MoSCoW framework
    - [x] 4.3.4 KanoEvaluationNode - Assess user value
    - [x] 4.3.5 DependencyAnalysisNode - Map feature relationships
  - [x] 4.4 Create research nodes:
    - [x] 4.4.1 TechnologyExtractionNode - Parse for tech keywords
    - [x] 4.4.2 HackerNewsSearchNode - Query HN discussions
    - [x] 4.4.3 RedditSearchNode - Search relevant subreddits
    - [x] 4.4.4 AdditionalResearchNode - Process user topics
    - [x] 4.4.5 ResearchSynthesisNode - Combine findings
  - [x] 4.5 Create refinement nodes:
    - [x] 4.5.1 ResponseProcessingNode - Handle :RESPONSE: tags
    - [x] 4.5.2 FeedbackIntegrationNode - Update analysis
    - [x] 4.5.3 ChangelogGenerationNode - Track changes
  - [x] 4.6 Build graph edges and conditional routing
  - [x] 4.7 Implement state persistence between sessions
  - [x] 4.8 Create LangGraph-CLI communication layer

- [ ] 5.0 Develop n8n integration for external APIs
  - [x] 5.1 Create n8n webhook endpoints for CLI
  - [x] 5.2 Implement Hacker News API integration workflow
  - [x] 5.3 Build Reddit API integration workflow
  - [x] 5.4 Set up rate limiting and retry logic
  - [ ] 5.5 Create response caching for API calls
  - [ ] 5.6 Build communication bridge to LangGraph

- [ ] 6.0 Implement AI analysis within LangGraph nodes
  - [ ] 6.1 Build MoSCoW categorization prompts and logic
  - [ ] 6.2 Create Kano evaluation criteria
  - [ ] 6.3 Implement project suggestion generation
  - [ ] 6.4 Build alternative idea generation
  - [ ] 6.5 Create dependency analysis features
  - [ ] 6.6 Implement risk assessment with research context
  - [ ] 6.7 Build tech stack validation

- [ ] 7.0 Create export and visualization systems
  - [ ] 7.1 Build org-mode exporter with tables and changelog
  - [ ] 7.2 Create Cursor markdown task list exporter
  - [ ] 7.3 Implement MoSCoW/Kano table generation
  - [ ] 7.4 Build architecture flow diagram generator
  - [ ] 7.5 Create visualization format options (PNG/SVG/ASCII)

- [ ] 8.0 Implement refinement loop in LangGraph
  - [ ] 8.1 Build document comparison logic
  - [ ] 8.2 Create :RESPONSE: tag processing in ResponseNode
  - [ ] 8.3 Implement version tracking in state
  - [ ] 8.4 Build systemic change detection
  - [ ] 8.5 Create feedback synthesis across sections

- [ ] 9.0 Enhance external intelligence features
  - [ ] 9.1 Implement technology extraction algorithms
  - [ ] 9.2 Create Hacker News content filtering
  - [ ] 9.3 Build Reddit relevance scoring
  - [ ] 9.4 Implement additional research topic handling
  - [ ] 9.5 Create research result caching in LangGraph state

- [ ] 10.0 Testing and quality assurance
  - [ ] 10.1 Write unit tests for all core modules
  - [ ] 10.2 Create integration tests for LangGraph flows
  - [ ] 10.3 Test n8n webhook communications
  - [ ] 10.4 Build end-to-end test scenarios
  - [ ] 10.5 Test refinement loop iterations
  - [ ] 10.6 Validate all export formats

- [ ] 11.0 Refactor for UI-agnostic architecture
  - [ ] 11.1 Create /core directory structure
  - [ ] 11.2 Move business logic out of CLI handlers
  - [ ] 11.3 Create abstract interfaces for I/O operations
  - [ ] 11.4 Ensure all core modules work with data structures, not files
  - [ ] 11.5 Document interface contracts for future UI implementations

- [ ] 12.0 Documentation and deployment preparation
  - [ ] 12.1 Create user documentation and README
  - [ ] 12.2 Write LangGraph architecture guide
  - [ ] 12.3 Document n8n workflow setup
  - [ ] 12.4 Create API configuration instructions
  - [ ] 12.5 Build example projects and templates
  - [ ] 12.6 Document multi-iteration refinement examples
  - [ ] 12.7 Package for distribution