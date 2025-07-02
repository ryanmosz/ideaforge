# Parent Task Development Plan Request

**IMPORTANT**: This prompt follows the PRD generation process defined in `.cursor/rules/create-feature-prd.mdc`. The output will create a new file named `prd-parent-task-[TASK-ID].md` in the `/tasks/` directory.

## Context

I need a detailed development plan for a specific parent task from the IdeaForge technical implementation plan. The full project context is available in:
- **project_planning/claude-prd.md** - Complete Product Requirements Document
- **project_planning/technical-implementation-plan.md** - Overall task breakdown  
- **project_planning/tech-stack-definition.md** - IMMUTABLE tech stack (never change these technologies)
- **AGENT-HANDOFF.md** - Current project state

**CRITICAL**: The tech stack defined in tech-stack-definition.md is immutable. All implementation must use exactly these technologies and versions. Do not suggest alternatives or upgrades.

## Process

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

### 8. **Functional Requirements**
   - Numbered list of specific functionalities
   - Clear, implementation-focused requirements
   - Technical specifications

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



### Step 3: Task List Generation

Following the Parent Task Development Plan Request, I will generate detailed task lists using the format from `generate-tasks.mdc`:

1. **tasks-parent-[TASK-ID]-checklist.md** - Checkbox list with task codes
2. **tasks-parent-[TASK-ID]-detailed.md** - Detailed implementation information

## Output

The final output will be saved as:
- **PRD**: `/tasks/prd-parent-task-[TASK-ID].md`
- **Checklist**: `/tasks/tasks-parent-[TASK-ID]-checklist.md`
- **Details**: `/tasks/tasks-parent-[TASK-ID]-detailed.md`

## Target Audience

The primary reader is a **junior developer** implementing their first CLI project. Requirements must be:
- Explicit and unambiguous
- Free of unnecessary jargon
- Include concrete examples
- Provide clear success criteria

Remember to move any previous *plan*, *checklist* and *detailed* file to `tasks/complete/` first!

## Parent Task to Plan :