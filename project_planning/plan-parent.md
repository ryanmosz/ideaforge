# Parent Task Development Plan Request

**IMPORTANT**: The output from this prompt will create a new file named `parent-task-[TASK-ID]-plan.md`. Any previously generated file from this prompt should be moved to `project_planning/retired/` before generating a new one.

## Context

I need a detailed development plan for a specific parent task from the IdeaForge technical implementation plan. The full project context is available in:
- **project_planning/claude-prd.md** - Complete Product Requirements Document
- **project_planning/technical-implementation-plan.md** - Overall task breakdown
- **project_planning/tech-stack-definition.md** - IMMUTABLE tech stack (never change these technologies)
- **AGENT-HANDOFF.md** - Current project state

**CRITICAL**: The tech stack defined in tech-stack-definition.md is immutable. All implementation must use exactly these technologies and versions. Do not suggest alternatives or upgrades.

## What I Need

Generate a comprehensive development plan for the parent task shown at the bottom of this prompt. The plan should include:

### 1. **Task Overview**
   • Summary of what this parent task accomplishes
   • How it fits into the overall IdeaForge architecture
   • Dependencies on other parent tasks
   • What will be possible after this task is complete

### 2. **Technical Design**
   • Detailed architecture for this component
   • Key interfaces and data structures
   • Integration points with other components
   • Technology-specific considerations (using ONLY the approved tech stack)

### 3. **Implementation Sequence**
   • Ordered list of subtasks with rationale for sequence
   • Critical path identification
   • Parallel work opportunities
   • Risk points that might cause rework

### 4. **Detailed Subtask Breakdown**
   For each subtask provide:
   • **Description**: What exactly needs to be built
   • **Implementation Steps**: Concrete steps a junior developer can follow
   • **Code Examples**: Sample code or pseudocode where helpful
   • **File Changes**: Which files to create/modify
   • **Testing Approach**: How to verify it works
   • **Definition of Done**: Clear completion criteria
   • **Common Pitfalls**: What to watch out for

### 5. **Testing Strategy**
   • Unit test requirements for this component
   • Integration test scenarios
   • Manual testing procedures
   • Mock data or services needed

### 6. **Integration Plan**
   • How to integrate with existing code
   • API contracts with other components
   • Configuration requirements
   • Migration steps if refactoring

### 7. **Documentation Requirements**
   • Code documentation standards
   • README updates needed
   • API documentation
   • Usage examples

### 8. **Estimated Timeline**
   • Hours per subtask for a junior developer
   • Total time estimate
   • Suggested daily goals
   • Checkpoint milestones

### 9. **Success Metrics**
   • How to measure successful completion
   • Performance benchmarks if applicable
   • Quality metrics

### 10. **Next Steps**
   • What becomes possible after this task
   • Which parent tasks should follow
   • Future enhancement opportunities

## Formatting Requirements

- Use clear markdown formatting
- Include code blocks with language tags
- Use tables where helpful for structured data
- Keep language clear for junior developers
- Include actual file paths and function names
- Reference specific lines from the PRD where applicable

## Special Considerations

Based on the parent task ID, emphasize:

- **Tasks 1-3**: Focus on project setup and foundations
- **Task 4**: LangGraph is the highest priority - be extra detailed with concrete implementation examples
- **Tasks 5-6**: n8n integration and AI - include API details and webhook specifications
- **Tasks 7-8**: Export and refinement - user experience focus and file format examples
- **Tasks 9-10**: Enhancement and testing - quality focus and test coverage requirements
- **Tasks 11-12**: Architecture and documentation - future-proofing and maintainability

## Output File

Create the output as: `parent-task-[TASK-ID]-plan.md`
(e.g., `parent-task-4.0-plan.md` for the LangGraph task)

Remember to move any previous plan file to `project_planning/retired/` first!

## Parent Task to Plan 