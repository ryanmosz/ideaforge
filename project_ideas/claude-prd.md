## Updated Product Requirements Document (PRD) - IdeaForge

### Overview
IdeaForge is a command-line interface tool designed to help me thoroughly plan projects before development begins. Using the full MoSCoW prioritization method (Must have, Should have, Could have, Won't have) combined with Kano model insights, the CLI ensures smart planning upfront to enhance dev time efficiency and avoid rework. The tool processes my project requirements and brainstormed ideas through AI-powered evaluation via n8n workflows, providing detailed progress updates throughout the analysis process.

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
   - File-based refinement workflow:
     - Initial upload → AI analysis → Org-mode output
     - User edits org-mode file and adds :RESPONSE: tagged comments
     - Re-upload edited file → AI processes changes and responses
     - New version generated incorporating feedback
     - Repeat as many times as needed
   - Each iteration saved with version number (v1, v2, v3...)
   - Changelog section automatically maintained in org-mode output
   - AI recognizes :RESPONSE: tags as user feedback, not original content

6. **Progress Messaging**
   - Real-time status updates throughout execution:
     - Document parsing and validation
     - Uploading to n8n webhook
     - AI processing stages (requirements analysis, MoSCoW evaluation, suggestions)
     - Result generation and formatting
   - Progress indicators with emoji for clarity
   - Estimated time remaining when possible
   - Clear error messages if any step fails
   - Example output:
     ```
     📄 Parsing org-mode document...
     ✓ Document validated successfully
     🔄 Connecting to n8n webhook...
     🤖 AI analyzing 5 requirements and 12 ideas...
     ⏱️  Estimated time: 3-5 minutes
     📊 Generating MoSCoW categorizations...
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
   - **Dependency Analysis**: Automatically identify feature dependencies and ordering
   - **Risk Assessment**: Flag potential technical and scope-related risks
   - **Tech Stack Validation**: Verify technology choices work well together

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

**Primary Purpose**: Enable thorough pre-development planning to ensure project success and avoid rework.

**Key Goals**:
1. **Iterate and Refine**: Help me explore and refine ideas before committing to development
   - Support multiple rounds of refinement through file-based feedback loops
   - AI learns from my edits and responses to improve suggestions
2. **Smart Planning**: Apply MoSCoW rigorously via command-line workflow to identify what's truly essential vs. nice-to-have
3. **Expand Thinking**: AI suggests alternatives and new features I hadn't considered
4. **Avoid Scope Creep**: Clear "Won't have" categorization prevents feature creep during development
5. **Time Efficiency**: Complete analysis in 5-10 minutes with clear progress updates, quick refinement cycles
6. **Decision Documentation**: Create a clear record of what to build and why, including decision evolution

**Success Criteria**: A project plan that I'm confident in, with clear priorities and rationale for each decision.

### Technical Architecture

- **CLI Framework**: Node.js with TypeScript (easily portable to Electron later)
- **CLI Library**: Commander.js or Yargs for command parsing
- **Progress Display**: Ora or CLI-progress for status updates
- **Workflow Orchestration**: n8n on Elestio for complex multi-step processing
- **AI Providers**:
  - OpenAI GPT-4 for all analysis steps
  - Multiple parallel calls for different perspectives
- **Local Storage**: Project files and results only
- **Visualization**: Graphviz or Mermaid.js for architecture flow diagrams
- **Future Electron**: Core logic in separate modules for easy GUI wrapper

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

### n8n Workflow Pattern (Enhanced Multi-Step Processing)
1. CLI sends request to webhook and waits for response
2. n8n orchestrates complex multi-step analysis:
   
   **Step 1 - Document Enrichment:**
   - Extract semantic meaning from requirements
   - Identify implicit constraints and dependencies
   - Cross-reference similar successful projects (if available in Supabase)
   - Generate requirement dependency graph
   
   **Step 2 - Parallel AI Analysis:**
   - **OpenAI GPT-4**: MoSCoW categorization and rationale
   - **Claude API** (if configured): Alternative perspective on categorization
   - **OpenAI GPT-3.5**: Quick feasibility checks and red flags
   - Aggregate and reconcile different AI perspectives
   
   **Step 3 - Specialized Evaluations:**
   - Technical complexity scoring using code analysis prompts
   - Market fit evaluation using business analysis prompts
   - User experience impact assessment
   - Integration with existing tech stack compatibility check
   
   **Step 4 - Synthesis and Suggestions:**
   - Combine all analyses into coherent recommendations
   - Generate architecture suggestions based on requirements
   - Identify potential technical debt and mitigation strategies
   - Create implementation ordering based on dependencies
   
   **Step 5 - Caching and Learning:**
   - Store analysis results locally with version numbers
   - Cache current session data in memory for refinement loops
   - Save all iterations as separate files for manual comparison
   
3. Results returned with complete analysis package
4. CLI saves enhanced results to local file system
5. Progress messages indicate each workflow step

**n8n Value-Adds Over Direct API:**
- Orchestrates multiple AI models for diverse perspectives
- Implements retry logic and error handling
- Manages rate limiting across multiple API providers
- Performs data transformations between steps
- Enables workflow versioning and A/B testing
- Provides detailed execution logs and debugging
- Allows non-code workflow modifications

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
- Supabase for task queue management only
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
```

File: /tasks/prd-ideaforge-orgmode.org
Change: Create org-mode version of the PRD
```org
* Product Requirements Document - IdeaForge
** Introduction/Overview
IdeaForge is a Mac desktop application designed to help project managers evaluate and plan weekly project ideas using the MoSCoW and Kano frameworks. The app processes uploaded requirement documents and brainstormed ideas through AI-powered evaluation, providing insights while maintaining a non-blocking user experience.

** Goals
1. Enable rapid evaluation of project ideas against requirements
2. Provide AI-powered categorization using MoSCoW and Kano frameworks  
3. Offer non-blocking processing so users can continue working
4. Export planning documents in both Cursor markdown and Emacs org-mode formats
5. Complete evaluations within 5-10 minutes

** User Stories
*** As a project manager
I want to upload my requirements and ideas document so that I can get AI-powered evaluation of feasibility
*** As a user
I want to continue using the app while evaluations run so that I don't waste time waiting
*** As a planner
I want to export my categorized ideas to org-mode so that I can manage tasks in Emacs
*** As a developer
I want the AI to consider three key questions when evaluating must-haves so that I get practical assessments

** Functional Requirements
*** TODO Document Upload and Processing
- [ ] Accept .txt file uploads containing requirements and ideas sections
- [ ] Parse documents to extract requirements and ideas
- [ ] Send evaluation requests to n8n webhooks without blocking the UI

*** TODO Background Task Management
- [ ] Show a simple progress indicator for active background tasks
- [ ] Notify users when background tasks complete

*** TODO AI Evaluation Display
- [ ] Display requirement alignment scores
- [ ] Show must-have assessment based on three questions
- [ ] Present market viability insights
- [ ] List suggested alternatives

*** TODO Visualization and Interaction
- [ ] Provide an interactive MoSCoW/Kano matrix visualization
- [ ] Allow manual override of AI categorizations

*** TODO Export Functionality
- [ ] Export results in Cursor-compatible markdown format
- [ ] Export results in Emacs org-mode format with proper structure

** Non-Goals (Out of Scope)                                    :NOT_TO_BUILD:
- Complex background monitoring or intelligence gathering
- Real-time market data updates
- Multi-user collaboration features
- Automated requirement extraction from non-text formats
- Integration with project management tools
- Mobile or web versions

** Design Considerations
| Aspect | Description |
|--------+-------------|
| Interface | Clean, native Mac interface using Electron |
| Complexity | Minimal UI that doesn't overwhelm with options |
| Feedback | Clear visual feedback for background operations |
| Input | Drag-and-drop support for file uploads |
| Output | Export preview before saving files |

** Technical Considerations
| Component | Technology |
|-----------+------------|
| Frontend | Electron app with React/TypeScript |
| AI Processing | n8n webhooks (hosted on Elestio) |
| Queue Management | Supabase for task queuing only |
| AI Provider | OpenAI API (via n8n) |
| Storage | Local file system for documents |
| Task Checking | Simple polling mechanism |

** Success Metrics
- [ ] Evaluation completion time under 10 minutes
- [ ] Zero UI blocking during background operations
- [ ] Successful export to both markdown and org-mode formats
- [ ] Accurate AI categorization (validated by user overrides < 30%)

** Open Questions
1. Should the app remember previous evaluations for reference?
2. What's the preferred notification method when tasks complete?
3. Should org-mode exports include deadline properties?
4. How detailed should the progress indicators be?
```

File: src/services/backgroundTaskManager.ts
Change: Create simplified background task manager
```typescript
import { N8nClient } from './n8nClient';
import { supabaseService } from './supabaseClient';

export interface BackgroundTask {
  id: string;
  type: 'evaluation' | 'market-research' | 'suggestion-generation';
  status: 'pending' | 'running' | 'completed' | 'failed';
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
}

export class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private onTaskComplete: (task: BackgroundTask) => void;

  constructor(
    private n8nClient: N8nClient,
    onTaskComplete: (task: BackgroundTask) => void
  ) {
    this.onTaskComplete = onTaskComplete;
  }

  async submitEvaluation(
    ideaId: string,
    idea: string,
    requirements: string[],
    projectId: string
  ): Promise<string> {
    const taskId = crypto.randomUUID();
    const task: BackgroundTask = {
      id: taskId,
      type: 'evaluation',
      status: 'pending',
      projectId,
      startedAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    // Send to n8n webhook (non-blocking)
    this.n8nClient.evaluateIdeaAsync(
      idea,
      ideaId,
      requirements,
      projectId,
      taskId
    ).catch(error => {
      task.status = 'failed';
      task.completedAt = new Date();
      this.onTaskComplete(task);
    });

    this.startPolling();
    return taskId;
  }

  private startPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      const pendingTasks = Array.from(this.tasks.values())
        .filter(t => t.status === 'pending' || t.status === 'running');

      if (pendingTasks.length === 0) {
        this.stopPolling();
        return;
      }

      // Check task status in Supabase
      for (const task of pendingTasks) {
        try {
          const result = await supabaseService.getTaskResult(task.id);
          if (result) {
            task.status = 'completed';
            task.completedAt = new Date();
            task.result = result;
            this.onTaskComplete(task);
          }
        } catch (error) {
          console.error(`Error checking task ${task.id}:`, error);
        }
      }
    }, 5000); // Poll every 5 seconds
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  getActiveTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'pending' || t.status === 'running');
  }

  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId);
  }
}
```

File: src/services/n8nClient.ts
Change: Simplify n8n client for basic webhook operations
```typescript
import axios from 'axios';

export class N8nClient {
  private webhookUrl: string;

  constructor(config: { baseUrl: string; webhookId: string }) {
    this.webhookUrl = `${config.baseUrl}/webhook/${config.webhookId}`;
  }

  async parseDocument(content: string): Promise<{
    requirements: string[];
    ideas: string[];
  }> {
    const response = await axios.post(`${this.webhookUrl}/parse-document`, {
      content,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  async evaluateIdeaAsync(
    idea: string,
    ideaId: string,
    requirements: string[],
    projectId: string,
    taskId: string
  ): Promise<void> {
    // Fire and forget - n8n will process and update Supabase
    axios.post(`${this.webhookUrl}/evaluate-idea`, {
      idea,
      ideaId,
      requirements,
      projectId,
      taskId,
      mustHaveQuestions: [
        'What will happen if this idea/feature is not included in the project?',
        'Is there a simpler way to accomplish this?',
        'Will the product work without it?'
      ]
    }).catch(console.error);
  }

  async generateSuggestionsAsync(
    ideas: string[],
    requirements: string[],
    projectId: string,
    taskId: string
  ): Promise<void> {
    axios.post(`${this.webhookUrl}/generate-suggestions`, {
      ideas,
      requirements,
      projectId,
      taskId
    }).catch(console.error);
  }
}
```

File: src/components/BackgroundTaskIndicator.tsx
Change: Create simple task status indicator
```typescript
import React from 'react';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface BackgroundTaskIndicatorProps {
  tasks: Task[];
}

export const BackgroundTaskIndicator: React.FC<BackgroundTaskIndicatorProps> = ({ tasks }) => {
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'running');
  
  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center space-x-2">
        <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
        <span className="text-sm font-medium text-gray-700">
          {activeTasks.length} task{activeTasks.length > 1 ? 's' : ''} running
        </span>
      </div>
      
      <div className="mt-2 space-y-1">
        {tasks.slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center justify-between text-xs">
            <span className="text-gray-600 truncate">
              {task.type.replace('-', ' ')}
            </span>
            {task.status === 'completed' ? (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            ) : task.status === 'failed' ? (
              <XCircleIcon className="w-4 h-4 text-red-500" />
            ) : (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

File: src/services/exportService.ts
Change: Create export service for markdown and org-mode
```typescript
import { Project, Idea, Evaluation } from '../types';

export class ExportService {
  exportToMarkdown(project: Project): string {
    let markdown = `# ${project.name} - Project Plan\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Requirements section
    markdown += `## Requirements\n\n`;
    project.requirements.forEach((req, index) => {
      markdown += `${index + 1}. ${req.text} (${req.priority})\n`;
    });
    
    // Ideas by category
    markdown += `\n## Ideas by Category\n\n`;
    
    const categories = ['must', 'should', 'could', 'wont'];
    categories.forEach(category => {
      const ideas = project.ideas.filter(i => i.moscowCategory === category);
      if (ideas.length > 0) {
        markdown += `### ${category.toUpperCase()} HAVE\n\n`;
        ideas.forEach(idea => {
          markdown += `- **${idea.title}**\n`;
          markdown += `  - ${idea.description}\n`;
          const evaluation = project.evaluations.find(e => e.ideaId === idea.id);
          if (evaluation) {
            markdown += `  - Score: ${evaluation.overallScore}/100\n`;
          }
          markdown += '\n';
        });
      }
    });
    
    return markdown;
  }

  exportToOrgMode(project: Project): string {
    let org = `#+TITLE: ${project.name} - Project Plan\n`;
    org += `#+DATE: ${new Date().toISOString()}\n\n`;
    
    // Requirements
    org += `* Requirements\n\n`;
    project.requirements.forEach((req, index) => {
      const tag = req.priority === 'critical' ? ':CRITICAL:' : 
                  req.priority === 'important' ? ':IMPORTANT:' : ':NICE_TO_HAVE:';
      org += `** ${req.text} ${tag}\n`;
    });
    
    // Ideas organized by MoSCoW
    org += `\n* Ideas by Category\n\n`;
    
    const categoryMap = {
      'must': 'MUST HAVE',
      'should': 'SHOULD HAVE',
      'could': 'COULD HAVE',
      'wont': 'WONT HAVE'
    };
    
    Object.entries(categoryMap).forEach(([key, label]) => {
      const ideas = project.ideas.filter(i => i.moscowCategory === key);
      if (ideas.length > 0) {
        org += `** ${label}\n\n`;
        ideas.forEach(idea => {
          const evaluation = project.evaluations.find(e => e.ideaId === idea.id);
          const score = evaluation?.overallScore || 0;
          
          // Determine status tag based on score
          let statusTag = ':TODO:';
          if (key === 'wont') statusTag = ':NOT_TO_BUILD:';
          else if (score < 50) statusTag = ':NOT_TO_BUILD:';
          
          org += `*** ${statusTag} ${idea.title}\n`;
          org += `    :PROPERTIES:\n`;
          org += `    :SCORE: ${score}\n`;
          org += `    :KANO: ${idea.kanoCategory || 'unassigned'}\n`;
          org += `    :END:\n`;
          org += `    ${idea.description}\n\n`;
          
          if (evaluation?.mustHaveEvaluation) {
            org += `**** Must-Have Analysis\n`;
            org += `     | Question | Answer | Impact |\n`;
            org += `     |----------+--------+--------|\n`;
            org += `     | Impact if excluded? | ${evaluation.mustHaveEvaluation.impactIfExcluded.score}/100 | ${evaluation.mustHaveEvaluation.impactIfExcluded.reasoning} |\n`;
            org += `     | Simpler alternative? | ${evaluation.mustHaveEvaluation.simplerAlternative.exists ? 'Yes' : 'No'} | ${evaluation.mustHaveEvaluation.simplerAlternative.suggestion || 'N/A'} |\n`;
            org += `     | Works without? | ${evaluation.mustHaveEvaluation.productViability.worksWithout ? 'Yes' : 'No'} | ${evaluation.mustHaveEvaluation.productViability.degradationLevel} |\n`;
            org += `\n`;
          }
        });
      }
    });
    
    // Summary table
    org += `\n* Summary\n\n`;
    org += `| Category | Count | Avg Score |\n`;
    org += `|----------+-------+-----------|\n`;
    
    Object.entries(categoryMap).forEach(([key, label]) => {
      const ideas = project.ideas.filter(i => i.moscowCategory === key);
      const scores = ideas.map(idea => {
        const eval = project.evaluations.find(e => e.ideaId === idea.id);
        return eval?.overallScore || 0;
      });
      const avgScore = scores.length > 0 ? 
        Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      
      org += `| ${label} | ${ideas.length} | ${avgScore} |\n`;
    });
    
    return org;
  }
}
```

File: n8n-workflows/simple-evaluation-webhook.json
Change: Create simplified n8n webhook workflow
```json
{
  "name": "Simple Idea Evaluation",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "evaluate-idea",
        "responseMode": "onReceived",
        "responseData": "allEntries"
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "model": "gpt-4",
        "messages": {
          "messages": [
            {
              "role": "system",
              "content": "You are a project evaluation expert. Evaluate ideas based on requirements and the MoSCoW/Kano frameworks. For must-have evaluation, consider these three questions:\n1. What will happen if this is not included?\n2. Is there a simpler way to accomplish this?\n3. Will the product work without it?"
            },
            {
              "role": "user",
              "content": "Idea: {{ $json[\"idea\"] }}\n\nRequirements:\n{{ $json[\"requirements\"].join(\"\\n\") }}\n\nProvide evaluation with:\n- Overall score (0-100)\n- MoSCoW recommendation (must/should/could/wont)\n- Kano category (basic/performance/excitement/indifferent)\n- Answers to the three must-have questions\n- Brief market viability assessment"
            }
          ]
        }
      },
      "id": "openai",
      "name": "OpenAI Evaluation",
      "type": "n8n-nodes-base.openAi",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "schema": "public",
        "table": "task_results",
        "columns": {
          "task_id": "={{ $node[\"webhook\"].json[\"taskId\"] }}",
          "result": "={{ $json }}",
          "completed_at": "={{ new Date().toISOString() }}"
        }
      },
      "id": "supabase",
      "name": "Store Result",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "webhook": {
      "main": [[{ "node": "openai", "type": "main", "index": 0 }]]
    },
    "openai": {
      "main": [[{ "node": "supabase", "type": "main", "index": 0 }]]
    }
  }
}
```

File: supabase/migrations/001_simple_schema.sql
Change: Create simplified Supabase schema
```sql
-- Simple task results table for n8n integration
CREATE TABLE task_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL UNIQUE,
  result JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick task lookup
CREATE INDEX idx_task_results_task_id ON task_results(task_id);

-- Simple RLS policy (adjust for your auth needs)
ALTER TABLE task_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON task_results FOR ALL USING (true);
```
</xml>