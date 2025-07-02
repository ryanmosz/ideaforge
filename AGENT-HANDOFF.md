# IdeaForge Project Handoff

## Project Overview
IdeaForge is a CLI tool that transforms project ideas into actionable plans using MoSCoW and Kano frameworks. It helps developers plan projects before writing code by analyzing requirements, prioritizing features, and generating implementation strategies.

## Current State (as of handoff)
- ✅ **Fully functional CLI tool** with all planned commands implemented
- ✅ **Published to GitHub**: https://github.com/ryanmosz/ideaforge
- ✅ **TypeScript codebase** with proper build configuration
- ✅ **All dependencies installed** and project builds successfully
- ✅ **Initial commit pushed** with complete project structure
- ✅ **Project prompt.md updated** for IdeaForge-specific development guidelines
- ✅ **Documentation links identified** for Cursor integration
- ✅ **Cursor documentation setup guide created** with CLI-specific guidance
- ✅ **Planning prompts reorganized** - plan-project.md for full project, plan-parent.md for individual tasks
- ✅ **Tech stack definition created** - immutable technology choices documented
- ✅ **Ora documentation link fixed** - now uses npm page instead of GitHub README
- ✅ **Git workflow commands documented** - SUBTASK-COMMIT and PARENT-COMPLETE workflows defined

## Repository Information
- **GitHub URL**: https://github.com/ryanmosz/ideaforge
- **Branch**: main (default)
- **Visibility**: Public
- **Description**: Transform your project ideas into actionable plans using MoSCoW and Kano frameworks

## Project Structure
```
G2P3/
├── bin/ideaforge           # CLI entry point (executable)
├── src/cli/index.ts        # Main CLI implementation
├── dist/                   # Compiled JavaScript (generated)
├── project_ideas/          # Example analyses and research
├── project_planning/       # Planning documents and guides
│   ├── prompt.md          # Development prompt for AI assistants
│   ├── cursor-documentation-setup.md  # Cursor setup guide
│   ├── plan-project.md    # Planning prompt for full project
│   ├── plan-parent.md     # Planning prompt for individual parent tasks
│   ├── claude-prd.md      # Product Requirements Document
│   ├── technical-implementation-plan.md  # Task breakdown
│   ├── tech-stack-definition.md  # IMMUTABLE tech stack definition
│   ├── git-workflow.md    # Standard Git command workflows
│   └── retired/           # Previous planning iterations
├── .cursor/rules/          # Development rules and patterns
├── package.json            # Node.js configuration
├── tsconfig.json           # TypeScript configuration
├── README.md               # User documentation
└── ideaforge-template.org  # Template for project ideas
```

## Available Commands
1. `ideaforge init` - Creates a new project template
2. `ideaforge analyze` - Analyzes project ideas with AI
3. `ideaforge refine` - Iterates on analysis with feedback
4. `ideaforge flow` - Generates architecture diagrams
5. `ideaforge tables` - Extracts MoSCoW/Kano tables
6. `ideaforge export` - Exports plans to various formats

## Setup Instructions
```bash
# Clone the repository
git clone https://github.com/ryanmosz/ideaforge.git
cd ideaforge

# Install dependencies
npm install

# The project will build automatically via the prepare script
# Or manually build with:
npm run build

# Test the CLI
./bin/ideaforge -h
```

## Development
- **Language**: TypeScript
- **Runtime**: Node.js (>=16.0.0)
- **Key Dependencies**:
  - commander (CLI framework)
  - axios (HTTP requests)
  - chalk (terminal styling)
  - ora (loading spinners)

## Technical Details
- Uses CommonJS modules for Node.js compatibility
- TypeScript compiles to ES2022 target
- Executable script at `bin/ideaforge` requires compiled JS from `dist/`
- Includes ESLint and Jest configurations for code quality
- **All technology choices are immutable** - see tech-stack-definition.md

## Current Features
- Template-based project planning with Org-mode format
- AI-powered analysis of requirements
- MoSCoW prioritization (Must/Should/Could/Won't)
- Kano model integration (Basic/Performance/Excitement)
- Architecture flow diagram generation
- Export to multiple formats (Markdown, JSON, Cursor tasks)
- Iterative refinement workflow

## Recent Updates
- **Updated prompt.md**: Converted from Studybara (React Native) project guidelines to IdeaForge (CLI) specific instructions
- **Identified documentation sources**: Recommended 12 documentation URLs for Cursor's searchable docs feature
- **Reorganized project files**: Moved planning documents to appropriate directories
- **Created cursor-documentation-setup.md**: Comprehensive guide for setting up Cursor with CLI-specific documentation and common gotchas
- **Reorganized planning prompts**: 
  - Renamed plan-prompt.txt to plan-project.md
  - Created plan-parent.md for individual parent task planning (copy entire file, paste parent task at end)
  - Both prompts now specify output file naming and retired file management
- **Created tech-stack-definition.md**: Immutable technology choices and version control policy
- **Updated all planning documents**: Added references to tech stack definition with emphasis on immutability
- **Fixed Ora documentation link**: Changed from GitHub README to npm package page for better Cursor indexing
- **Created git-workflow.md**: Documented two standard Git workflows:
  - SUBTASK-COMMIT for regular commits during subtask work
  - PARENT-COMPLETE for finishing parent tasks and transitioning to the next

## Cursor Documentation Setup
See `project_planning/cursor-documentation-setup.md` for detailed instructions. Key docs to add:
- Node.js API: https://nodejs.org/docs/latest-v20.x/api/
- TypeScript: https://www.typescriptlang.org/docs/
- Commander.js: https://github.com/tj/commander.js#readme
- Axios: https://axios-http.com/docs/intro
- Jest: https://jestjs.io/docs/getting-started
- Ora: https://www.npmjs.com/package/ora (use npm page, not GitHub)
- Plus 6 other relevant documentation sources

The setup guide includes CLI-specific gotchas, red flags to watch for, and IdeaForge-specific patterns.

## Planning Documents
- **prompt.md**: Main development guidelines for AI assistants working on IdeaForge
- **plan-project.md**: Template for generating full project development plans based on PRD
- **plan-parent.md**: Template for generating detailed plans for individual parent tasks
- **cursor-documentation-setup.md**: Step-by-step guide for configuring Cursor with proper documentation
- **claude-prd.md**: Comprehensive Product Requirements Document defining IdeaForge features and architecture
- **technical-implementation-plan.md**: Complete task breakdown with 12 parent tasks
- **tech-stack-definition.md**: IMMUTABLE technology specifications and version control policy
- **git-workflow.md**: Standard Git workflows with code names for common operations

## Planning Workflow
1. Use **plan-project.md** for overall project planning (generates tasks-ideaforge-checklist.md and tasks-ideaforge-detailed.md)
2. Use **plan-parent.md** for detailed planning of each parent task:
   - Copy the entire content of plan-parent.md
   - Paste it into your chat/prompt
   - Copy a parent task from technical-implementation-plan.md
   - Paste the parent task at the very end after "## Parent Task to Plan"
3. Generated plans create new files (e.g., parent-task-4.0-plan.md)
4. Previous iterations should be moved to project_planning/retired/
5. **All implementations must adhere to tech-stack-definition.md**

## Git Workflow
- **SUBTASK-COMMIT**: Use when working on subtasks - stages all files and commits on current branch
- **PARENT-COMPLETE**: Use when finishing a parent task - commits, merges to main, pushes, and creates new feature branch
- See `project_planning/git-workflow.md` for detailed instructions

## PRD Key Features (from claude-prd.md)
- n8n + LangGraph architecture for intelligent planning
- Technology extraction and external research (Hacker News, Reddit)
- Full MoSCoW framework with specific evaluation questions
- Iterative refinement with :RESPONSE: tags
- Progress messaging throughout execution
- Export to Cursor markdown and org-mode formats

## Tech Stack Policy
**The tech stack defined in tech-stack-definition.md is IMMUTABLE**. This includes:
- Node.js v16.0.0+ with TypeScript 5.3.0
- CommonJS modules (no ESM)
- Specific versions of all dependencies
- n8n + LangGraph architecture
- No upgrades or changes without explicit written approval

## Next Steps & Opportunities
1. **NPM Publishing**: Package could be published to npm registry for easier installation
2. **CI/CD**: Add GitHub Actions for automated testing and releases
3. **Tests**: Implement unit tests using the Jest configuration
4. **Documentation**: Expand examples and use cases
5. **Features**: 
   - Implement n8n webhook integration
   - Add LangGraph state management
   - Integrate external research APIs
   - Enhance progress messaging system

## Known Issues
None currently identified - project is in initial working state.

## Maintenance Notes
- Run `npm run lint` to check code style
- Run `npm test` to execute tests (once implemented)
- Update version in package.json before releases
- Keep README.md synchronized with new features
- Use updated prompt.md for consistent development approach
- Follow cursor-documentation-setup.md when configuring development environment
- Use plan-project.md for full project planning
- Use plan-parent.md for detailed parent task planning (copy file, paste task at end)
- Move old generated plans to project_planning/retired/
- Use git-workflow.md for standard Git operations (SUBTASK-COMMIT and PARENT-COMPLETE)
- **Never modify tech stack without explicit approval**

## Contact
Repository: https://github.com/ryanmosz/ideaforge
Created by: ryanmosz

---
*This handoff document provides the complete context needed to understand and continue development on the IdeaForge project.*
