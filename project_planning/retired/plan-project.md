# IdeaForge Project Development Plan Request

**IMPORTANT**: This prompt follows the development planning process. The output will create planning documents in the `/tasks/` directory.

**CRITICAL**: The tech stack is defined in **project_planning/tech-stack-definition.md** and is IMMUTABLE. Do not suggest any changes to technologies, versions, or architecture patterns. Use exactly what is specified.

## Context

I'm developing the IdeaForge CLI tool - a command-line application that transforms project ideas into actionable plans using MoSCoW and Kano frameworks. 

Key project resources:
- **project_planning/claude-prd.md** - Existing PRD (for reference)
- **project_planning/tech-stack-definition.md** - IMMUTABLE tech stack
- **AGENT-HANDOFF.md** - Current project state
- **ideaforge-template.org** - Template format users will fill out

## What I Need

Using the PRD as your primary context and the approved tech stack, produce a complete, actionable development plan that a junior developer—or an implementation-focused AI—can follow to enhance and extend the existing CLI tool according to the PRD specifications.

When building the plan, **strictly cover each numbered section**:

1. **Executive Summary**
   • One concise paragraph restating the IdeaForge vision from the PRD and enhancement goals.

2. **Technical Architecture Overview**
   • Diagram or descriptive outline of CLI architecture, command structure, file I/O, AI service integration, and data flow.
   • Reference the architecture decisions in the PRD (n8n + LangGraph separation, local file storage, etc.).
   • Confirm adherence to the immutable tech stack.

3. **Data Model & File Formats**
   • Org-mode template structure and parsing requirements from the PRD.
   • JSON schema for configuration and export formats.
   • Internal data structures for project analysis.

4. **CLI Command Specification**
   • Table of all commands from the PRD (init, analyze, refine, flow, tables, export).
   • Command workflow diagrams (init → analyze → refine → export).
   • Error handling and user feedback patterns.

5. **Epic & Milestone Breakdown (Roadmap)**
   • Split work into 1-2 week iterations for implementing PRD features.
   • For each milestone list:
     – Goals & deliverables
     – User stories with acceptance criteria
     – Key technical tasks
     – Estimated effort (S, M, L)
     – Prerequisites / dependencies

6. **Detailed Task Board (Backlog Grooming)**
   • Convert PRD features and user stories into atomic developer tasks.
   • Each task: description, definition of done, testing criteria, estimated effort.

7. **AI Integration Specification**
   • Implement the n8n + LangGraph architecture from the PRD.
   • Prompt templates for MoSCoW/Kano analysis (including the specific evaluation questions).
   • Progress messaging system as specified in the PRD.
   • Integration with Hacker News and Reddit APIs for research.

8. **Testing Strategy**
   • Unit tests for org-mode parsers and utilities.
   • Integration tests for CLI commands.
   • End-to-end testing scenarios covering the full workflow.
   • Mock n8n responses and LangGraph states for testing.

9. **Distribution & Release Pipeline**
   • NPM publishing workflow.
   • Semantic versioning strategy.
   • GitHub releases and changelog generation.
   • Documentation updates process.

10. **Risk Register & Mitigations**
    • Identify risks (API limits, LangGraph complexity, n8n reliability).
    • Mitigation strategies for each risk.

11. **Success Metrics Alignment**
    • Map PRD success criteria to measurable checkpoints.
    • 5-10 minute analysis completion time.
    • Clear progress updates throughout execution.

12. **Next Steps & Open Questions**
    • Address the open questions from the PRD.
    • Research spikes needed for LangGraph implementation.
    • Community feedback to gather.

## Formatting Requirements

• Use H2/H3 headings.
• Tables or code blocks where clarity improves.
• Keep language concise yet instructional; assume a junior developer audience.
• All items must be actionable and sequenced logically.
• Reference the immutable tech stack for all implementation details.

## Task List Generation

After creating the development plan, generate detailed task lists using the format from `generate-tasks.mdc`:

1. **tasks-ideaforge-checklist.md** - Contains the task list with checkboxes, one task per line. Each task will have a code in the format T101 (first task in parent group one).

2. **tasks-ideaforge-detailed.md** - Contains all task codes with detailed information the developer needs:
   - Prerequisites
   - Implementation steps
   - Code examples where helpful
   - Testing procedures
   - Definition of done

Testing tasks should receive their own line on the task list and their own section in the expanded task document. 
Focus on CLI-specific considerations and PRD requirements like:
- Org-mode file parsing
- n8n webhook integration
- LangGraph state management
- Progress messaging system
- MoSCoW evaluation logic with specific questions
- Export to multiple formats (Cursor markdown, org-mode)
- Technology extraction and external research integration 