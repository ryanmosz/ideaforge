#!/bin/bash

# IdeaForge Demo Runner
# This script makes it easy to run the demo from this folder

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
MODEL="gpt-4.1"
INPUT="example-grammarly-demo.org"
OUTPUT="grammarly-analysis.org"
RESEARCH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --research)
            RESEARCH="--research"
            shift
            ;;
        --model)
            MODEL="$2"
            shift 2
            ;;
        --input)
            INPUT="$2"
            shift 2
            ;;
        --output)
            OUTPUT="$2"
            shift 2
            ;;
        --help)
            echo "IdeaForge Demo Runner"
            echo ""
            echo "Usage: ./run-demo.sh [options]"
            echo ""
            echo "Options:"
            echo "  --research        Enable research features (requires Docker + n8n)"
            echo "  --model MODEL     AI model to use (default: gpt-4.1)"
            echo "  --input FILE      Input file (default: example-grammarly-demo.org)"
            echo "  --output FILE     Output file (default: grammarly-analysis.org)"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run-demo.sh                    # Basic demo"
            echo "  ./run-demo.sh --research         # Demo with research"
            echo "  ./run-demo.sh --model gpt-4      # Use GPT-4"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if we're in the demo directory
if [ ! -f "example-grammarly-demo.org" ]; then
    echo -e "${RED}Error: Must run from the demo directory${NC}"
    echo "Please cd to the demo directory first"
    exit 1
fi

# Check if the project has been built
if [ ! -d "../dist" ]; then
    echo -e "${YELLOW}Project needs to be built. Building now...${NC}"
    (cd .. && npm run build)
fi

# Check for .env file
if [ ! -f "../.env" ]; then
    echo -e "${RED}Error: OpenAI API key not configured${NC}"
    echo "Please run 'npm run setup' from the project root first"
    exit 1
fi

# Show what we're doing
echo -e "${BLUE}🚀 Running IdeaForge Demo${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Input:  ${GREEN}$INPUT${NC}"
echo -e "Output: ${GREEN}$OUTPUT${NC}"
echo -e "Model:  ${GREEN}$MODEL${NC}"
if [ -n "$RESEARCH" ]; then
    echo -e "Mode:   ${GREEN}AI + Research${NC}"
else
    echo -e "Mode:   ${GREEN}AI Analysis Only${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Run the analysis
cd ..
npm run dev -- analyze "demo/$INPUT" --output "demo/$OUTPUT" --model "$MODEL" $RESEARCH

# Show completion message
echo -e "\n${GREEN}✅ Demo complete!${NC}"
echo -e "View results: ${BLUE}$OUTPUT${NC}" 