# IdeaForge Demo

## Quick Start

Run the demo with this single command from the project root:

```bash
npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1
```

For research features (requires Docker + n8n setup):
```bash
npm run dev -- analyze demo/example-grammarly-demo.org --output demo/grammarly-analysis.org --model gpt-4.1 --research
```

## System Overview

IdeaForge is an AI-powered project planning tool that transforms unstructured project ideas into comprehensive, actionable requirements documents. The system analyzes your project description using advanced AI models to extract requirements, categorize them using MoSCoW and Kano frameworks, identify dependencies, and optionally enhance the analysis with real-world insights from HackerNews and Reddit communities.

## Architecture Design Decisions

### Why LangGraph + n8n?

We chose a hybrid architecture combining **LangGraph** for core AI orchestration with **n8n** for external API integrations. This separation of concerns provides several key benefits:

1. **LangGraph for AI Orchestration**: LangGraph excels at managing complex, stateful AI workflows. It handles the multi-step analysis process (parsing → requirements extraction → MoSCoW categorization → Kano evaluation → dependency analysis) with built-in state management, error recovery, and checkpoint persistence. This ensures reliable, resumable analysis even for complex projects.

2. **n8n for External APIs**: n8n serves as our integration layer for external services (HackerNews, Reddit). By delegating these integrations to n8n, we gain:
   - Visual workflow editing for non-developers to modify API logic
   - Built-in rate limiting and retry mechanisms
   - Easy addition of new data sources without code changes
   - Separation of API credentials from the main application

3. **OpenAI Calls from LangGraph**: We make OpenAI API calls directly from LangGraph nodes rather than through n8n because:
   - **Latency**: Direct calls eliminate the network hop through n8n, reducing latency by ~200-300ms per call
   - **State Context**: LangGraph nodes have full access to the accumulated analysis state, enabling more contextual prompts
   - **Error Handling**: AI-specific errors (token limits, model availability) are better handled within the LangGraph error recovery system
   - **Cost Efficiency**: Keeping AI calls within LangGraph allows better token usage optimization through shared context

This architecture gives us the best of both worlds: sophisticated AI orchestration with flexible external integrations, while maintaining performance and reliability.

## Demo Files

- **Input**: `example-grammarly-demo.org` - A sample project description for an AI-powered writing assistant
- **Output**: `grammarly-analysis.org` - The comprehensive analysis with MoSCoW/Kano frameworks
- **Setup Guide**: `TESTER-SETUP-GUIDE.md` - Complete setup instructions for testers

## Expected Results

The analysis will produce:
- Executive summary with technology recommendations
- Requirements categorized by MoSCoW (Must/Should/Could/Won't)
- Kano analysis (Basic/Performance/Excitement features)
- Dependency mapping between requirements
- Research insights from developer communities (if --research flag used)

All output is formatted with 80-character line wrapping for optimal readability. 