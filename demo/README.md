# IdeaForge Demo

## Quick Start

**Run the demo from this folder:**

```bash
cd demo
./run-demo.sh
```

That's it! The script handles everything and creates `grammarly-analysis.org`.

## Demo Options

```bash
# Basic AI analysis (default)
./run-demo.sh

# With research insights from HackerNews/Reddit
./run-demo.sh --research

# Use a different AI model
./run-demo.sh --model gpt-4

# See all options
./run-demo.sh --help
```

## Manual Commands

If you prefer running commands directly:

```bash
# From this demo folder
../bin/ideaforge analyze example-grammarly-demo.org --output grammarly-analysis.org --model gpt-4.1

# With research
../bin/ideaforge analyze example-grammarly-demo.org --output grammarly-analysis.org --model gpt-4.1 --research
```

## First Time Setup

If this is your first time using IdeaForge:

```bash
# Go to project root
cd ..

# Install and configure
npm install
npm run setup  # Enter your OpenAI API key

# Return to demo
cd demo
```

## Demo Files

- **`example-grammarly-demo.org`** - Sample input: an AI writing assistant for marketers
- **`grammarly-analysis.org`** - Sample output showing the full analysis
- **`run-demo.sh`** - Demo runner script for clean terminal recordings
- **`TESTER-SETUP-GUIDE.md`** - Complete setup instructions

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

## Expected Results

The analysis produces:
- Executive summary with technology recommendations
- Requirements categorized by MoSCoW (Must/Should/Could/Won't)
- Kano analysis (Basic/Performance/Excitement features)
- Dependency mapping between requirements
- Research insights from developer communities (if --research flag used)

All output is formatted with 80-character line wrapping for optimal readability.

## Try Your Own Project

```bash
# Create your own project description
nano my-project.org

# Analyze it
./run-demo.sh --input my-project.org --output my-analysis.org
``` 