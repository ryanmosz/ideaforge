# AI Model Configuration

IdeaForge supports multiple AI models for analysis. You can choose between different models based on your needs and budget.

## Available Models

| Model | Description | Use Case |
|-------|-------------|----------|
| `o3-mini` | Default model, cost-effective | Most analysis tasks, quick iterations |
| `gpt-4.1` | Standard GPT-4 | Complex analysis, better reasoning |
| `gpt-4.5-preview` | Latest GPT-4 Turbo | Best performance, newest features |

## Configuration Methods

### 1. Environment Variable

Set the `AI_MODEL` environment variable in your `.env` file:

```bash
# .env file
OPENAI_API_KEY=sk-your-api-key
N8N_WEBHOOK_URL=https://your-webhook-url
AI_MODEL=gpt-4.1  # Optional, defaults to o3-mini
```

### 2. Command Line Option

Specify the model when running commands:

```bash
# Using o3-mini (default)
./bin/ideaforge analyze project.org

# Using GPT-4.1
./bin/ideaforge analyze project.org --model gpt-4.1

# Using GPT-4.5 Preview
./bin/ideaforge analyze project.org --model gpt-4.5-preview

# Also works with refine command
./bin/ideaforge refine project.org --model gpt-4.5-preview
```

### 3. Precedence

Command line options take precedence over environment variables:
1. CLI `--model` option (highest priority)
2. `AI_MODEL` environment variable
3. Default: `o3-mini`

## Model Characteristics

### o3-mini
- **Speed**: Fast
- **Cost**: Low
- **Quality**: Good for most tasks
- **Best for**: Quick iterations, initial analysis, cost-conscious usage

### gpt-4.1
- **Speed**: Moderate
- **Cost**: Medium
- **Quality**: Excellent
- **Best for**: Complex requirements, detailed analysis, production use

### gpt-4.5-preview
- **Speed**: Moderate
- **Cost**: High
- **Quality**: Best available
- **Best for**: Critical analysis, maximum accuracy, latest features

## Example Usage

```bash
# Quick analysis with default model
./bin/ideaforge analyze startup-idea.org

# Detailed analysis with GPT-4.1
./bin/ideaforge analyze complex-project.org --model gpt-4.1 -o detailed-analysis.org

# Refinement with best model
./bin/ideaforge refine project-v1.org --model gpt-4.5-preview

# Set model for session
export AI_MODEL=gpt-4.1
./bin/ideaforge analyze project1.org
./bin/ideaforge analyze project2.org  # Also uses gpt-4.1
```

## Cost Considerations

- **o3-mini**: ~10x cheaper than GPT-4
- **gpt-4.1**: Standard GPT-4 pricing
- **gpt-4.5-preview**: ~2x more expensive than standard GPT-4

Choose based on your needs - use o3-mini for development and testing, upgrade to GPT-4 models for production or critical analysis. 