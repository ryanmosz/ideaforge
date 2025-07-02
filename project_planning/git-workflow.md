# Git Workflow Commands for IdeaForge

This document defines two standard Git workflows used during development. Reference these by their code names when directing agents to perform Git operations.

## Workflow 1: do @git-workflow.md : SUBTASK-COMMIT

**Code Name**: `SUBTASK-COMMIT`  
**Usage**: When working on a subtask within a parent task  
**Frequency**: Most common

### Command Sequence:
1. Stage all changes (including new files, modifications, and deletions)
2. Create a commit on the current branch
3. Use a descriptive commit message following conventional commits format

### Git Commands:
```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "type: description of changes"
```

### Requirements:
- ✅ No files left unstaged
- ✅ Stay on current feature branch
- ✅ Use conventional commit format (feat:, fix:, docs:, etc.)

### Example Usage:
"Please execute SUBTASK-COMMIT for the changes we just made"

---

## Workflow 2: do @git-workflow.md : PARENT-COMPLETE new PARENT: project_planning/technical-implementation-plan.md section:

**Code Name**: `PARENT-COMPLETE`  
**Usage**: When completing a parent task and transitioning to the next one  
**Frequency**: Less common (once per parent task)

### Prerequisites:
1. check tasks/parent-task-1.0-plan.md, tasks/tasks-parent-1.0-checklist.md tasks/tasks-parent-1.0-detailed.md and AGENT-HANDOFF.md to make sure that all tasks are complete for the current task level of the master project_planning/technical-implementation-plan.md that we are about to move on from. if so, move on to the next step, if not STOP IMMEDIATELY and explain the descepancy. this is IMPERATIVE to making sure all steps in the project are complete before moving forward where we will assume they have been completed appropriately.
2. only if step 0.0 has completed succesfully, mark off tasks completed since last main branch commit in the master checklist at project_planning/technical-implementation-plan.md

### Command Sequence:
1. Stage all changes (including new files, modifications, and deletions)
2. Create a final commit on the current feature branch
3. Switch to main branch
4. Merge the feature branch into main
5. Update README.md if necessary
6. Push main branch to GitHub
7. Create a new feature branch for the next parent task

### Git Commands:
```bash
# 1. Stage all changes
git add -A

# 2. Final commit on feature branch
git commit -m "type: complete parent task X.X - description"

# 3. Switch to main
git checkout main

# 4. Pull latest main (ensure up to date)
git pull origin main

# 5. Merge feature branch
git merge [current-feature-branch]

# 6. Update README if needed
# (manually check and update README.md if necessary)

# 7. Push to GitHub
git push origin main

# 8. Create new feature branch
git checkout -b feature/[next-parent-task-name]
```

### Requirements:
- ✅ No files left unstaged before final commit
- ✅ Merge must be clean (no conflicts)
- ✅ README.md reviewed and updated if needed
- ✅ Main branch pushed to GitHub
- ✅ New feature branch created and checked out
- ✅ New branch named after next parent task (e.g., `feature/task-4.0-langgraph`)

### Input Required:
When using PARENT-COMPLETE, specify the next parent task:
- Task number (e.g., "4.0")
- Task name (e.g., "Implement LangGraph agent architecture")

### Example Usage:
"Please execute PARENT-COMPLETE. The next parent task is 4.0 Implement LangGraph agent architecture"

---

## Branch Naming Convention

Feature branches should follow this pattern:
- `feature/task-X.X-short-description`
- Examples:
  - `feature/task-1.0-project-setup`
  - `feature/task-4.0-langgraph`
  - `feature/task-7.0-export-systems`

## Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Important Notes

1. **Always verify** before executing PARENT-COMPLETE:
   - All tests pass
   - Documentation is updated
   - No uncommitted changes remain

2. **Feature branch cleanup**: After PARENT-COMPLETE, the old feature branch can be deleted locally:
   ```bash
   git branch -d [old-feature-branch]
   ```

3. **If conflicts occur** during merge, resolve them carefully and create a merge commit.

---

*Use these code names to streamline Git operations and maintain consistent workflow practices throughout the IdeaForge project.* 