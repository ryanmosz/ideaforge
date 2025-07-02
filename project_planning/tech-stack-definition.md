# IdeaForge Tech Stack Definition

**⚠️ CRITICAL: This tech stack is IMMUTABLE. No changes should be made to these technology choices or versions without explicit authorization from the project owner. This document represents the authoritative definition of technologies used in IdeaForge.**

## Core Runtime & Language

- **Node.js**: v16.0.0 or higher (LTS versions preferred)
- **TypeScript**: v5.3.0
  - Target: ES2022
  - Module: CommonJS (for Node.js compatibility)
  - Strict mode enabled

## CLI Framework & Dependencies

- **Commander.js**: v11.1.0 - CLI command parsing and structure
- **Chalk**: v5.3.0 - Terminal text styling and colors
- **Ora**: v7.0.1 - Terminal loading spinners and progress indicators
- **Axios**: v1.6.0 - HTTP client for API requests

## AI & Orchestration

- **LangGraph**: Latest stable version
  - Primary intelligence layer for state management
  - Handles planning dialogue and iterative refinement
  - Manages conversation context across sessions
  
- **n8n**: Hosted on Elestio
  - Webhook endpoints for CLI communication
  - External API integrations (Hacker News, Reddit)
  - Rate limiting and retry logic
  - Response caching

- **OpenAI API**: GPT-4
  - All AI analysis and generation tasks
  - Multiple parallel calls for different perspectives
  - Accessed through n8n workflows

## Development Tools

- **Jest**: v29.7.0 - Testing framework
- **ts-jest**: v29.1.1 - TypeScript support for Jest
- **ESLint**: v8.54.0 - Code linting
- **@typescript-eslint/parser**: v6.13.0 - TypeScript ESLint parser
- **@typescript-eslint/eslint-plugin**: v6.13.0 - TypeScript ESLint rules
- **ts-node**: v10.9.1 - TypeScript execution for development

## File Formats & Storage

- **Org-mode**: Primary template format (.org files)
- **Markdown**: Export format for documentation
- **JSON**: Configuration and data exchange
- **Local File System**: All document storage (no cloud storage in CLI version)

## Build & Distribution

- **npm**: Package management and distribution
- **TypeScript Compiler (tsc)**: Build tool
- **Git/GitHub**: Version control and repository hosting

## Architecture Patterns

- **Functional Programming**: Preferred over OOP
- **Async/Await**: For all asynchronous operations
- **CommonJS Modules**: For Node.js compatibility (not ESM)
- **500-line file limit**: Hard requirement for all source files

## Future Compatibility

- **Electron-ready**: Core logic in UI-agnostic modules for future GUI wrapper
- **No framework lock-in**: Business logic separate from CLI implementation

## Version Control Policy

1. **Never upgrade dependencies** without explicit approval
2. **Never change module systems** (stay with CommonJS)
3. **Never alter TypeScript configuration** without discussion
4. **Never switch AI providers** without authorization
5. **Never modify the n8n/LangGraph architecture** without approval

## Rationale

This tech stack was carefully chosen for:
- **Stability**: Mature, well-tested technologies
- **Simplicity**: Minimal dependencies, clear architecture
- **Performance**: Fast execution and response times
- **Portability**: Easy migration to Electron later
- **Developer Experience**: Familiar tools for Node.js developers

---

**Remember**: Any proposed changes to this tech stack require explicit written approval. The stability and consistency of these choices is critical to project success. 