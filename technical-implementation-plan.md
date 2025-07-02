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
- n8n workflows will be configured separately on Elestio platform
- All file operations will be synchronous with progress updates
- The iterative refinement loop is file-based, not chat-based
- External intelligence gathering (HN/Reddit) will be implemented through n8n

## Tasks

- [ ] 1.0 Set up project foundation and development environment
  - [ ] 1.1 Initialize Node.js/TypeScript project structure
  - [ ] 1.2 Configure build tools and TypeScript compiler
  - [ ] 1.3 Set up testing framework (Jest)
  - [ ] 1.4 Install core dependencies (Commander.js, Axios, etc.)
  - [ ] 1.5 Create environment configuration structure

- [ ] 2.0 Implement org-mode parsing and file handling
  - [ ] 2.1 Create org-mode parser for template structure
  - [ ] 2.2 Implement file validation and error handling
  - [ ] 2.3 Build data extraction for requirements, user stories, and brainstorming
  - [ ] 2.4 Handle :RESPONSE: tag recognition for refinement loops
  - [ ] 2.5 Create file versioning system for iterations

- [ ] 3.0 Build CLI framework and command structure
  - [ ] 3.1 Implement main CLI entry point with Commander.js
  - [ ] 3.2 Create analyze command for initial processing
  - [ ] 3.3 Create refine command for iterative improvements
  - [ ] 3.4 Create export command with format options
  - [ ] 3.5 Create visualization commands for diagrams and tables
  - [ ] 3.6 Implement progress messaging system

- [ ] 4.0 Develop n8n integration and workflow orchestration
  - [ ] 4.1 Create n8n webhook client service
  - [ ] 4.2 Implement document enrichment step integration
  - [ ] 4.3 Build external intelligence gathering integration (HN/Reddit)
  - [ ] 4.4 Set up parallel AI analysis coordination
  - [ ] 4.5 Implement specialized evaluation workflows
  - [ ] 4.6 Create synthesis and suggestion aggregation

- [ ] 5.0 Implement AI analysis and MoSCoW framework
  - [ ] 5.1 Build MoSCoW categorization logic with evaluation questions
  - [ ] 5.2 Create project suggestion generation system
  - [ ] 5.3 Implement alternative idea generation
  - [ ] 5.4 Build dependency analysis features
  - [ ] 5.5 Create risk assessment functionality
  - [ ] 5.6 Implement tech stack validation

- [ ] 6.0 Create export and visualization systems
  - [ ] 6.1 Build org-mode exporter with tables and changelog
  - [ ] 6.2 Create Cursor markdown task list exporter
  - [ ] 6.3 Implement MoSCoW/Kano table generation
  - [ ] 6.4 Build architecture flow diagram generator
  - [ ] 6.5 Create visualization format options (PNG/SVG/ASCII)

- [ ] 7.0 Implement refinement loop and iteration handling
  - [ ] 7.1 Build file comparison and change detection
  - [ ] 7.2 Create :RESPONSE: tag processing logic
  - [ ] 7.3 Implement version tracking and changelog updates
  - [ ] 7.4 Build iteration synthesis functionality
  - [ ] 7.5 Create feedback integration system

- [ ] 8.0 Add external intelligence features
  - [ ] 8.1 Implement technology extraction from requirements
  - [ ] 8.2 Create Hacker News API integration
  - [ ] 8.3 Build Reddit API integration
  - [ ] 8.4 Implement content filtering and relevance scoring
  - [ ] 8.5 Create caching system for external data

- [ ] 9.0 Testing and quality assurance
  - [ ] 9.1 Write unit tests for all core modules
  - [ ] 9.2 Create integration tests for n8n workflows
  - [ ] 9.3 Build end-to-end test scenarios
  - [ ] 9.4 Test refinement loop iterations
  - [ ] 9.5 Validate all export formats

- [ ] 10.0 Documentation and deployment preparation
  - [ ] 10.1 Create user documentation and README
  - [ ] 10.2 Write n8n workflow setup guide
  - [ ] 10.3 Create API configuration instructions
  - [ ] 10.4 Build example projects and templates
  - [ ] 10.5 Package for distribution