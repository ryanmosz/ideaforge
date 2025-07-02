## Updated Product Requirements Document (PRD) - IdeaForge

### Overview
IdeaForge is a command-line interface tool designed to help me thoroughly plan projects before development begins. Using the full MoSCoW prioritization method (Must have, Should have, Could have, Won't have) combined with Kano model insights, the CLI ensures smart planning upfront to enhance dev time efficiency and avoid rework. The tool processes my project requirements and brainstormed ideas through a sophisticated LangGraph agent architecture orchestrated by n8n workflows, providing detailed progress updates throughout the analysis process. LangGraph manages the intelligent planning dialogue and state, while n8n handles external integrations and API calls.

### Workflow Overview
1. **Initial Upload**: Submit a structured org-mode file based on the IdeaForge template containing:
   - User stories
   - Pre-classified requirements (MUST/SHOULD/COULD/WONT)
   - Technology choice options
   - Brainstormed ideas organized by category
2. **AI Analysis**: System shows progress while evaluating ideas against requirements using MoSCoW/Kano frameworks
3. **AI Suggestions**: Receive project outline, architecture recommendations, idea enhancement suggestions and alternative ideas
4. **First Output**: Save org-mode file with categorized ideas and AI suggestions
5. **Refinement Loop**:
   - Edit the org-mode file, adding :RESPONSE: tags for feedback
   - Re-run analysis on the edited file
   - AI processes changes and generates new version
   - Repeat until satisfied
6. **Final Export**: Export refined plan as Cursor markdown task list for development

Each iteration is tracked with version numbers and a changelog section maintains the evolution of decisions.

### Key Simplifications
- **Progress Updates**: Real-time CLI status messages as the tool moves through each processing stage
- **MoSCoW Analysis**: Full framework with specialized three-question evaluation for Must-haves only
- **Data Storage**: Local file system for all documents and results
- **State Management**: LangGraph handles session state and refinement history
- **Export**: Generate both Cursor markdown and Emacs org-mode format files
- **Visual Output**: Generate static app flow diagram files (PNG/SVG) showing the planning process

### Core Features

1. **Document Upload & Processing**
   - Accept .org file path as command argument
   - Parse org-mode hierarchy including:
     - User stories
     - Pre-classified requirements with MoSCoW tags
     - Technology choice trees
     - Categorized brainstorming sections
   - Validate template structure before processing
   - Process through n8n with progress updates:
     - "📄 Parsing org-mode document..."
     - "✓ Found X user stories, Y requirements, Z brainstorm ideas"
     - "🔄 Sending to AI for analysis..."
     - "🤖 AI is evaluating requirements..."
     - "📊 Generating MoSCoW categorizations..."
   - Example: `ideaforge analyze project-ideas.org`

2. **Full MoSCoW Analysis with AI Support**
   - **Must Have**: Features absolutely required for launch
     - AI evaluates using three critical questions:
       - "What will happen if this idea/feature is not included?"
       - "Is there a simpler way to accomplish this?"
       - "Will the product work without it?"
     - If any answer indicates critical failure, it's a Must-have
   
   - **Should Have**: Important but not vital for initial release
     - AI evaluates using these questions:
       - "How much value does this add compared to the effort required?"
       - "What percentage of users will be disappointed without this?"
       - "Can we launch successfully and add this in version 1.1?"
       - "Does this significantly improve the user experience?"
     - Features that add substantial value but won't break the product if missing
   
   - **Could Have**: Desirable but first to cut if needed
     - AI evaluates using these questions:
       - "Is this a 'nice surprise' rather than an expectation?"
       - "Will only power users or edge cases need this?"
       - "Does this add complexity without proportional value?"
       - "Can this wait until we validate core assumptions?"
     - Features that enhance but don't define the product
   
   - **Won't Have**: Explicitly out of scope (but recorded for future)
     - AI evaluates using these questions:
       - "Does this conflict with the core product vision?"
       - "Is this better suited for a future version or different product?"
       - "Does the effort far exceed the current project scope?"
       - "Would this distract from validating the main hypothesis?"
     - Features deliberately excluded to maintain focus
   
   - Results displayed when processing completes with:
     - Rationale for each categorization
     - Confidence score (1-10) for the classification
     - Suggested migration path (e.g., "Could → Should if X happens")

3. **AI Project Suggestions & Alternatives**
   - Generate high-level project outline based on requirements + brainstorm
   - Suggest architecture recommendations
   - Propose alternative approaches to brainstormed ideas
   - Identify new features that align with requirements but weren't considered
   - Suggest ways to combine multiple ideas into cohesive features
   - Output includes rationale for each suggestion

4. **Iterative Refinement Loop**
   - File-based refinement workflow powered by LangGraph:
     - Initial upload → LangGraph agent analysis → Org-mode output
     - User edits org-mode file and adds :RESPONSE: tagged comments
     - Re-upload edited file → LangGraph processes entire document
     - System recognizes systemic impacts of responses across sections
     - New version generated incorporating all feedback
     - Repeat as many times as needed
   - LangGraph maintains complete state across iterations
   - Each iteration saved with version number (v1, v2, v3...)
   - Changelog section automatically maintained in org-mode output
   - AI recognizes :RESPONSE: tags as user feedback, not original content
   - Full document analysis ensures coherent updates when responses affect multiple areas

6. **Progress Messaging**
   - Real-time status updates throughout execution:
     - Document parsing and validation
     - Technology extraction for research
     - External research queries
     - LangGraph agent processing stages
     - AI analysis phases (requirements, MoSCoW, Kano, synthesis)
     - Feedback integration progress
     - Result generation and formatting
   - Progress indicators with emoji for clarity
   - Estimated time remaining when possible
   - Clear error messages if any step fails
   - Example output:
     ```
     📄 Parsing org-mode document...
     ✓ Document validated successfully
     🔍 Extracting project technologies...
     🌐 Researching on Hacker News and Reddit...
     🧠 LangGraph analyzing requirements...
     ⏱️  Estimated time: 3-5 minutes
     📊 Generating MoSCoW categorizations...
     🔄 Processing your feedback...
     💡 Creating project suggestions...
     ✅ Analysis complete! Writing results...
     ```

7. **MoSCoW/Kano Visualization**
   - Generate MoSCoW/Kano analysis as org-mode tables
   - Tables include:
     - Feature categorization matrix
     - Score breakdowns with rationale
     - Confidence levels for each classification
   - Export tables integrated directly in org-mode output
   - Manual overrides via edited org-mode file in refinement loop
   - Generate app flow diagram files showing:
     - Software architecture and component interactions
     - Data flow between different parts of the system
     - Integration points and dependencies
     - Technology stack visualization
   - Output formats: PNG, SVG, or ASCII art for terminal

8. **Export Formats**
   - Cursor-compatible markdown with task lists
   - Emacs org-mode with:
     - Tables for structured data
     - Tags: TODO, IN-PROGRESS, DONE, NOT-TO-BUILD, RESPONSE
     - Proper org-mode hierarchy
     - Changelog section tracking iteration history
     - Version numbering for each refinement cycle

9. **Enhanced Intelligence Features**

- **Technology Extraction & Research**:
  - Automatically parse requirements for technologies, frameworks, and domain terms
  - Query Hacker News for relevant discussions and recent developments
  - Search appropriate subreddits based on extracted technologies
  - Process user-specified additional research subjects from template
  - Synthesize external findings into actionable project insights
  
- **Dependency Analysis**: Automatically identify feature dependencies and ordering
- **Risk Assessment**: Flag potential technical and scope-related risks based on research
- **Tech Stack Validation**: Verify technology choices work well together
- **Research Synthesis**: Combine external intelligence with project context for better suggestions

### Research Integration Architecture

The research pipeline leverages both automatic technology extraction and user-specified topics:

1. **Automatic Research Flow**:
   ```
   Requirements → Technology Extraction → External APIs → Synthesis
                                           ├─ Hacker News
                                           └─ Reddit
   ```

2. **Additional Research Topics**:
   - Users specify extra research areas in the template
   - These trigger targeted searches beyond automatic extraction
   - Results integrated into the same synthesis pipeline

3. **Research Output Integration**:
   - Influences risk assessments
   - Shapes architectural suggestions
   - Provides context for technology decisions
   - Highlights community best practices and pitfalls

### Template-Based Input Workflow

IdeaForge uses a structured org-mode template to ensure consistent, high-quality AI analysis:

1. **Template Structure**:
   - **User Stories**: Define who will use the product and why
   - **Requirements**: Pre-classified with MoSCoW tags (AI will validate/adjust)
   - **Technology Choices**: Hierarchical options with pros/cons
   - **Brainstorming Sections**: Organized by Features, Architecture, UI/UX, Integrations, and Future Ideas

2. **Benefits of Template Approach**:
   - Leverages org-mode's hierarchical structure for clear organization
   - AI performs better with structured input
   - Consistent format across all projects
   - Built-in sections guide comprehensive planning
   - Technology options use folding for easy comparison

3. **Template Usage**:
   - Download template from app or use provided ideaforge-template.org
   - Fill out all sections with project-specific content
   - Upload completed template as first interaction
   - AI preserves structure while adding analysis and suggestions

### Purpose & Goals

**Primary Purpose**: Enable thorough pre-development planning through an intelligent planning partner dialogue to ensure project success and avoid rework.

**Key Goals**:
1. **Iterate and Refine**: Engage in a planning dialogue with an AI partner that learns from feedback
   - LangGraph maintains conversation context across refinement iterations
   - Each response can trigger systemic updates across the entire plan
   - AI partner synthesizes external research with project context
2. **Smart Planning**: Apply MoSCoW rigorously via command-line workflow to identify what's truly essential vs. nice-to-have
3. **Expand Thinking**: AI suggests alternatives based on both your ideas and community best practices
4. **Avoid Scope Creep**: Clear "Won't have" categorization prevents feature creep during development
5. **Time Efficiency**: Complete analysis in 5-10 minutes with clear progress updates, quick refinement cycles
6. **Decision Documentation**: Create a clear record of what to build and why, including decision evolution and external influences

**Success Criteria**: A project plan that I'm confident in, with clear priorities, external validation, and rationale for each decision.

### Technical Architecture

**Core Architecture Pattern**: n8n + LangGraph separation of concerns

- **CLI Framework**: Node.js with TypeScript (easily portable to Electron later)
- **CLI Library**: Commander.js or Yargs for command parsing
- **Progress Display**: Ora or CLI-progress for status updates
- **Agent Framework**: LangGraph for intelligent state management and planning dialogue
- **Workflow Orchestration**: n8n on Elestio for external API integrations
- **AI Providers**:
  - OpenAI GPT-4 for all analysis steps
  - Multiple parallel calls for different perspectives
- **State Management**: LangGraph maintains session state and conversation history
- **Storage**: Local file system for document persistence between sessions
- **Visualization**: Graphviz or Mermaid.js for architecture flow diagrams
- **Future Electron**: Core logic in separate modules for easy GUI wrapper

**n8n Responsibilities**:
- Webhook endpoints for CLI communication
- External API integrations (Hacker News, Reddit, and future APIs)
- Rate limiting and retry logic for external services
- Short-term caching of external data
- Triggering LangGraph agent executions

**LangGraph Responsibilities**:
- Document analysis and understanding
- MoSCoW/Kano evaluation logic
- Iterative refinement state management
- Suggestion generation and synthesis
- Orchestrating the planning partner dialogue
- Managing conversation state across refinement iterations
- Processing :RESPONSE: tags and user feedback

### CLI Commands

**Basic Commands:**
- `ideaforge init` - Create new ideaforge-template.org in current directory
- `ideaforge analyze <file.org> [--output result.org]` - Analyze org file and save results
- `ideaforge refine <file.org>` - Submit edited file for refinement iteration

**Visualization Commands:**
- `ideaforge flow <result.org> [--format png|svg|ascii]` - Generate software architecture flow diagram
- `ideaforge tables <result.org>` - Extract MoSCoW/Kano tables from org-mode (for standalone viewing)

**Export Commands:**
- `ideaforge export <result.org> --format [cursor|orgmode] --output <file>` - Export final plan

**Options:**
- `--verbose` - Show detailed progress
- `--quiet` - Suppress progress messages (errors only)
- `--no-emoji` - Use plain text progress messages

### n8n Workflow Pattern (LangGraph Integration)

The system uses n8n for external integrations while LangGraph handles the intelligent planning:

1. **CLI initiates session** → n8n webhook → LangGraph agent starts

2. **LangGraph Document Analysis Phase**:
   - `DocumentParserNode`: Extract structure and content
   - `RequirementsAnalysisNode`: Understand project goals
   - `TechnologyExtractionNode`: Identify tech stack for research

3. **n8n External Research Phase** (triggered by LangGraph):
   ```
   TechnologyExtractionNode → n8n Research Workflow
                               ├─ Hacker News API
                               ├─ Reddit API
                               └─ Additional Topics API
   ```
   - n8n handles rate limiting and retries
   - Results passed back to LangGraph

4. **LangGraph Analysis & Synthesis**:
   - `MoscowCategorizationNode`: Apply framework with evaluation questions
   - `KanoEvaluationNode`: Assess user value and expectations
   - `DependencyAnalysisNode`: Map feature relationships
   - `ResearchSynthesisNode`: Integrate external findings
   - `SuggestionGenerationNode`: Create alternatives and improvements

5. **Iterative Refinement** (LangGraph-managed):
   - `ResponseProcessingNode`: Parse :RESPONSE: tags
   - `FeedbackIntegrationNode`: Update analysis based on feedback
   - `ChangelogGenerationNode`: Track decision evolution
   - Full document reprocessing for systemic changes

6. **Progress Updates** flow through both systems:
   ```
   📄 Parsing org-mode document... (LangGraph)
   🔍 Extracting project technologies... (LangGraph)
   🌐 Researching on Hacker News and Reddit... (n8n)
   🧠 LangGraph analyzing requirements... (LangGraph)
   🔄 Processing your feedback... (LangGraph)
   ```

<chatName="IdeaForge MoSCoW Planning App PRD"/>

<xml>
File: /tasks/prd-ideaforge.md
Change: Create simplified Product Requirements Document
```markdown
# Product Requirements Document - IdeaForge

## Introduction/Overview
IdeaForge is a Mac desktop application designed to help project managers evaluate and plan weekly project ideas using the MoSCoW and Kano frameworks. The app processes uploaded requirement documents and brainstormed ideas through AI-powered evaluation, providing insights while maintaining a non-blocking user experience.

## Goals
1. Enable rapid evaluation of project ideas against requirements
2. Provide AI-powered categorization using MoSCoW and Kano frameworks
3. Offer non-blocking processing so users can continue working
4. Export planning documents in both Cursor markdown and Emacs org-mode formats
5. Complete evaluations within 5-10 minutes

## User Stories
1. As a project manager, I want to upload my requirements and ideas document so that I can get AI-powered evaluation of feasibility
2. As a user, I want to continue using the app while evaluations run so that I don't waste time waiting
3. As a planner, I want to export my categorized ideas to org-mode so that I can manage tasks in Emacs
4. As a developer, I want the AI to consider three key questions when evaluating must-haves so that I get practical assessments

## Functional Requirements
1. The system must accept .txt file uploads containing requirements and ideas sections
2. The system must parse documents to extract requirements and ideas
3. The system must send evaluation requests to n8n webhooks without blocking the UI
4. The system must show a simple progress indicator for active background tasks
5. The system must notify users when background tasks complete
6. The system must display AI evaluation results including:
   - Requirement alignment scores
   - Must-have assessment based on three questions
   - Market viability insights
   - Suggested alternatives
7. The system must provide an interactive MoSCoW/Kano matrix visualization
8. The system must allow manual override of AI categorizations
9. The system must export results in Cursor-compatible markdown format
10. The system must export results in Emacs org-mode format with:
    - Tables for structured data
    - TODO, IN-PROGRESS, DONE, NOT-TO-BUILD tags
    - Proper org-mode hierarchy

## Non-Goals (Out of Scope)
- Complex background monitoring or intelligence gathering
- Real-time market data updates
- Multi-user collaboration features
- Automated requirement extraction from non-text formats
- Integration with project management tools
- Mobile or web versions

## Design Considerations
- Clean, native Mac interface using Electron
- Minimal UI that doesn't overwhelm with options
- Clear visual feedback for background operations
- Drag-and-drop support for file uploads
- Export preview before saving files

## Technical Considerations
- Electron app with React/TypeScript frontend
- n8n webhooks for AI processing (hosted on Elestio)
- LangGraph for state management and task orchestration
- OpenAI API for evaluations (via n8n)
- Local file system for document storage
- Simple polling mechanism for task completion

## Success Metrics
- Evaluation completion time under 10 minutes
- Zero UI blocking during background operations
- Successful export to both markdown and org-mode formats
- Accurate AI categorization (validated by user overrides < 30%)

## Open Questions
1. Should the app remember previous evaluations for reference?
2. What's the preferred notification method when tasks complete?
3. Should org-mode exports include deadline properties?
4. How detailed should the progress indicators be?
