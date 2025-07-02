#!/bin/bash
# CLI command testing script for IdeaForge

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track test results
PASSED=0
FAILED=0

# Test function
test_command() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "Testing: $description... "
    
    OUTPUT=$($command 2>&1)
    
    if echo "$OUTPUT" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Expected: $expected"
        echo "  Got: $OUTPUT"
        ((FAILED++))
    fi
}

echo "=== IdeaForge CLI Tests ==="
echo

# Build the project first
echo "Building project..."
npm run build > /dev/null 2>&1

# Test 1: CLI without .env shows error for actual commands
test_command "CLI without .env shows configuration error for commands" \
    "./bin/ideaforge init" \
    "Configuration error"

# Test 2: CLI with valid .env loads successfully
echo "OPENAI_API_KEY=test-key" > .env.test
echo "N8N_WEBHOOK_URL=https://test.com/webhook" >> .env.test
cp .env.test .env

test_command "CLI with valid .env runs commands successfully" \
    "./bin/ideaforge init" \
    "init command not yet implemented"

# Test 3: Help command shows description (doesn't need .env)
rm -f .env  # Remove .env to test help works without it
test_command "Help command shows description without .env" \
    "./bin/ideaforge --help" \
    "Transform your project ideas into actionable plans"

# Test 4: Version command shows version (doesn't need .env)
test_command "Version command shows version without .env" \
    "./bin/ideaforge --version" \
    "0.1.0"

# Test 5: Create .env again for remaining tests
cp .env.test .env

test_command "Init command shows not implemented" \
    "./bin/ideaforge init" \
    "init command not yet implemented"

# Test 6: Unknown command
test_command "Unknown command shows error" \
    "./bin/ideaforge unknown-command" \
    "unknown command"

# Clean up
rm -f .env .env.test

# Summary
echo
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi 