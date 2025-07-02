# IdeaForge LangGraph Integration Implementation Prompt

## Overview
This document provides comprehensive instructions for integrating LangGraph into the IdeaForge project and implementing all architectural improvements identified in the Gemini comparison analysis. The person implementing these changes has agreed to ALL suggestions in that analysis.

## Required Document Updates

### 1. Update ideaforge-template.org
Add a new section before the Changelog section:
```org
* Additional Research Subjects
  [List specific topics, technologies, or areas you want the system to research beyond its automatic analysis. These will be included in the next iteration's research phase.]
  -
  -
  -
```

### 2. Update claude-prd.md with the following major changes:

#### A. Architectural Transformation
Replace the current simple n8n workflow with a sophisticated n8n + LangGraph architecture:

**n8n responsibilities:**
- Webhook endpoints for CLI communication
- External API integrations (Hacker News, Reddit, and future APIs)
- Rate limiting and retry logic for external services
- Short-term caching of external data
- Triggering LangGraph agent executions

**LangGraph responsibilities:**
- Document analysis and understanding
- MoSCoW/Kano evaluation logic
- Iterative refinement state management
- Suggestion generation and synthesis
- Orchestrating the planning partner dialogue
- Managing conversation state across refinement iterations
- Processing :RESPONSE: tags and user feedback

#### B. Enhanced Research Integration
Implement a sophisticated research pipeline:

1. **Technology Extraction Node**: Automatically parse requirements and brainstorming sections to identify:
   - Programming languages mentioned
   - Frameworks and libraries
   - Architectural patterns
   - Domain-specific terms

2. **Research Orchestration**:
   ```
   TechExtractionNode → ParallelResearchNode → SynthesisNode
                         ├─ HackerNewsNode
                         ├─ RedditNode
                         └─ AdditionalResearchNode (user-specified topics)
   ```

3. **Research Features**:
   - Query relevant subreddits based on extracted technologies
   - Search Hacker News for discussions about similar projects
   - Filter content by recency and relevance score
   - Process user-specified research subjects from the new template field
   - Synthesize findings into actionable insights

#### C. State Management Architecture
Implement LangGraph state management that tracks:
```typescript
interface ProjectState {
    // Core document data
    original_requirements: string;
    current_document: string;
    document_version: number;
    
    // Analysis results
    moscow_analysis: Record<string, Feature[]>;
    kano_analysis: Record<string, Feature[]>;
    dependency_graph: Record<string, string[]>;
    
    // Research data
    extracted_technologies: string[];
    research_findings: Record<string, Finding[]>;
    additional_research_topics: string[];
    
    // Refinement tracking
    user_responses: UserResponse[];
    changelog_entries: ChangelogEntry[];
    suggestion_history: Suggestion[];
    
    // Metadata
    session_id: string;
    created_at: string;
    last_modified: string;
}
```

#### D. Remove Supabase References
- Remove all Supabase integration sections
- Update storage to use LangGraph state for session management
- Use local file system for persistence between sessions
- Remove database-related technical requirements

### 3. Update technical-implementation-plan.md

Add new sections and reorganize existing ones:

#### New Section: LangGraph Implementation (Priority: HIGHEST)
Insert after section 3.0:
```
- [ ] 3.5 Implement LangGraph agent architecture
  - [ ] 3.5.1 Set up LangGraph project structure
  - [ ] 3.5.2 Define ProjectState schema
  - [ ] 3.5.3 Create core analysis nodes:
    - [ ] DocumentParserNode
    - [ ] RequirementsAnalysisNode
    - [ ] MoscowCategorizationNode
    - [ ] KanoEvaluationNode
    - [ ] DependencyAnalysisNode
  - [ ] 3.5.4 Create research nodes:
    - [ ] TechnologyExtractionNode
    - [ ] HackerNewsSearchNode
    - [ ] RedditSearchNode
    - [ ] AdditionalResearchNode
    - [ ] ResearchSynthesisNode
  - [ ] 3.5.5 Create refinement nodes:
    - [ ] ResponseProcessingNode
    - [ ] FeedbackIntegrationNode
    - [ ] ChangelogGenerationNode
  - [ ] 3.5.6 Build graph edges and conditional routing
  - [ ] 3.5.7 Implement state persistence between sessions
```

#### Update Section 4.0: n8n Integration
Modify to focus on n8n's new limited role:
- Webhook endpoints only
- External API calls (HN/Reddit)
- Rate limiting for external services
- Communication bridge to LangGraph

#### New Section: Code Organization for UI-Agnostic Design
Add after current sections:
```
- [ ] 11.0 Refactor for UI-agnostic architecture
  - [ ] 11.1 Create /core directory structure
  - [ ] 11.2 Move business logic out of CLI handlers
  - [ ] 11.3 Create abstract interfaces for I/O operations
  - [ ] 11.4 Ensure all core modules work with data structures, not files
  - [ ] 11.5 Document interface contracts for future UI implementations
```

### 4. Create New Files

#### A. Create src/langgraph/nodes/research.py
Basic structure for research nodes that:
- Extract technologies from requirements
- Handle user-specified additional research topics
- Query external sources through n8n
- Synthesize findings

#### B. Create src/langgraph/graph.py
Main LangGraph implementation that:
- Defines the agent graph structure
- Implements conditional edges for refinement loops
- Handles state management
- Orchestrates the planning partner dialogue

### 5. Key Implementation Details

#### Refinement Loop Implementation
1. First iteration: Full analysis with all nodes
2. Subsequent iterations:
   - Parse entire document to capture systemic changes
   - Identify and prioritize :RESPONSE: tagged sections
   - Incorporate previous state for context
   - Re-evaluate all analyses in light of responses (responses can have systemic effects)
   - Maintain efficiency by caching unchanged portions where possible
   - Append to changelog automatically

Note: While :RESPONSE: tags indicate specific user feedback locations, the system processes the entire document in each iteration because responses can trigger systemic changes that affect multiple sections. This ensures coherent updates across the whole project plan.

#### Research Enhancement
- Additional research subjects from template trigger specific queries
- Research synthesis considers project context
- Results integrated into suggestions and risk assessments
- Caching prevents redundant API calls within session

#### Progress Messaging Updates
Add new progress messages for:
- "🔍 Extracting project technologies..."
- "🌐 Researching on Hacker News and Reddit..."
- "🧠 LangGraph analyzing requirements..."
- "🔄 Processing your feedback..."
- "📊 Updating MoSCoW categorizations..."

## Migration Strategy

1. **Phase 1**: Implement LangGraph nodes without removing existing code
2. **Phase 2**: Route requests through LangGraph while keeping n8n for external calls
3. **Phase 3**: Full integration with LangGraph handling all state and logic
4. **Phase 4**: Refactor for UI-agnostic architecture

## Testing Requirements

- Test state persistence across sessions
- Verify research integration with mock API responses
- Ensure refinement loop maintains context
- Validate :RESPONSE: tag processing
- Test changelog generation accuracy

## Success Criteria

1. LangGraph successfully maintains state across refinement iterations
2. Research findings directly influence suggestions
3. Additional research subjects produce relevant results
4. System provides more nuanced feedback based on conversation history
5. Architecture supports future UI additions without core logic changes

## Notes for Implementation

- Keep CLI as the primary interface
- Ensure backward compatibility with existing org-mode templates
- Maintain fast response times despite added complexity
- Document all LangGraph node contracts clearly
- Create examples of multi-iteration refinement sessions

This implementation will transform IdeaForge from a simple analysis tool into an intelligent planning partner that learns and improves through iterative dialogue.