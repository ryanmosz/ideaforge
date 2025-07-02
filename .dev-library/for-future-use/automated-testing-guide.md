# Automated Testing Guide for WordWise

This guide serves as a comprehensive reference for all automated testing approaches available in the WordWise project. Not all tools need to be used for every task - choose the appropriate ones based on what you're testing.

## Table of Contents
1. [Command-Line Testing Tools](#command-line-testing-tools)
2. [Custom Python Testing Scripts](#custom-python-testing-scripts)
3. [Testing Strategies by Component](#testing-strategies-by-component)
4. [Quick Reference](#quick-reference)

## Command-Line Testing Tools

### 1. W3M - Text-Based Browser Testing

W3M is a terminal-based web browser that's excellent for testing server-side rendered content and basic HTML structure.

**Installation:**
```bash
brew install w3m  # macOS
sudo apt-get install w3m  # Ubuntu/Debian
```

**Basic Usage:**
```bash
# Dump page content
w3m -dump http://localhost:3000/login

# Interactive mode
w3m http://localhost:3000

# Save output to file
w3m -dump http://localhost:3000 > output.txt
```

**Example Test Script:**
```bash
#!/bin/bash
URL="http://localhost:3000/test-page"
OUTPUT=$(w3m -dump $URL 2>&1)

# Check for specific content
if echo "$OUTPUT" | grep -q "Expected Text"; then
    echo "✅ Content found"
else
    echo "❌ Content missing"
fi
```

**Limitations:**
- Cannot execute JavaScript
- No CSS rendering
- Limited form interaction
- Best for static content verification

### 2. cURL - HTTP Request Testing

cURL is perfect for testing APIs, endpoints, and HTTP responses.

**Basic Usage:**
```bash
# GET request
curl http://localhost:3000/api/health

# POST request with JSON
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "test content"}'

# Include headers in output
curl -i http://localhost:3000

# Follow redirects
curl -L http://localhost:3000

# Save response to file
curl -o response.json http://localhost:3000/api/data
```

**Authentication Testing:**
```bash
# Bearer token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/protected

# Basic auth
curl -u username:password http://localhost:3000/api/secure
```

### 3. HTTPie - Human-Friendly HTTP Client

HTTPie provides a more intuitive interface than cURL.

**Installation:**
```bash
brew install httpie  # macOS
pip install httpie   # Python
```

**Usage:**
```bash
# GET request
http localhost:3000/api/users

# POST with JSON (automatic)
http POST localhost:3000/api/users name="John" email="john@example.com"

# Custom headers
http localhost:3000/api/data Authorization:"Bearer token"
```

### 4. jq - JSON Processing

Essential for parsing API responses in test scripts.

**Installation:**
```bash
brew install jq  # macOS
```

**Usage:**
```bash
# Extract field from JSON response
curl -s http://localhost:3000/api/user | jq '.name'

# Check if array has items
curl -s http://localhost:3000/api/suggestions | jq '. | length'

# Filter and map
curl -s http://localhost:3000/api/data | jq '.items[] | {id, name}'
```

### 5. Docker Commands for Container Testing

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs frontend

# Execute commands in container
docker-compose exec frontend npm test

# Check container health
docker inspect wordwise-frontend-1 | jq '.[0].State.Health'
```

### 6. Supabase CLI for Database Testing

```bash
# Check function status
supabase functions list

# Test edge function locally
supabase functions serve analyze-text

# Invoke function
supabase functions invoke analyze-text --body '{"text": "test"}'

# Database migrations status
supabase db diff

# Direct database queries
supabase db query "SELECT COUNT(*) FROM users"
```

### 7. Jest/Vitest for Unit Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- TextEditor.test.tsx

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run tests matching pattern
npm test -- --testNamePattern="should handle suggestions"
```

### 8. Lighthouse CLI for Performance Testing

**Installation:**
```bash
npm install -g lighthouse
```

**Usage:**
```bash
# Basic performance audit
lighthouse http://localhost:3000 --view

# Specific categories
lighthouse http://localhost:3000 --only-categories=performance,accessibility

# JSON output for CI
lighthouse http://localhost:3000 --output=json --output-path=./report.json
```

## Custom Python Testing Scripts

### 1. Enhanced W3M Testing with Beautiful Soup

```python
#!/usr/bin/env python3
"""
Enhanced HTML testing that W3M can't provide
"""
import subprocess
import sys
from bs4 import BeautifulSoup
import requests

def test_page_structure(url):
    """Test HTML structure and content"""
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Check meta tags
    meta_description = soup.find('meta', attrs={'name': 'description'})
    assert meta_description, "Missing meta description"
    
    # Check form structure
    login_form = soup.find('form', {'id': 'login-form'})
    if login_form:
        email_input = login_form.find('input', {'type': 'email'})
        password_input = login_form.find('input', {'type': 'password'})
        assert email_input, "Missing email input"
        assert password_input, "Missing password input"
    
    # Count specific elements
    suggestion_cards = soup.find_all('div', class_='suggestion-card')
    print(f"Found {len(suggestion_cards)} suggestion cards")
    
    # Check accessibility
    images_without_alt = soup.find_all('img', alt=False)
    if images_without_alt:
        print(f"⚠️  {len(images_without_alt)} images missing alt text")
    
    return True

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    test_page_structure(url)
```

### 2. API Response Validator

```python
#!/usr/bin/env python3
"""
Validate API responses against expected schemas
"""
import requests
import json
from typing import Dict, List, Any

class APIValidator:
    def __init__(self, base_url: str):
        self.base_url = base_url
    
    def validate_suggestion_response(self, text: str) -> Dict[str, Any]:
        """Test the suggestion API endpoint"""
        response = requests.post(
            f"{self.base_url}/functions/v1/analyze-text",
            json={
                "text": text,
                "documentId": "test-123",
                "userSettings": {
                    "brandTone": "professional",
                    "readingLevel": 8,
                    "bannedWords": []
                }
            },
            headers={"Authorization": "Bearer YOUR_TOKEN"}
        )
        
        assert response.status_code == 200, f"Bad status: {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "suggestions" in data, "Missing suggestions field"
        assert isinstance(data["suggestions"], list), "Suggestions not a list"
        
        # Validate each suggestion
        for suggestion in data["suggestions"]:
            self.validate_suggestion(suggestion)
        
        return {
            "status": "success",
            "suggestion_count": len(data["suggestions"]),
            "types": [s["type"] for s in data["suggestions"]]
        }
    
    def validate_suggestion(self, suggestion: Dict[str, Any]):
        """Validate individual suggestion structure"""
        required_fields = [
            "startIndex", "endIndex", "type", 
            "originalText", "suggestionText", 
            "explanation", "confidence"
        ]
        
        for field in required_fields:
            assert field in suggestion, f"Missing field: {field}"
        
        # Type validations
        assert isinstance(suggestion["startIndex"], int)
        assert isinstance(suggestion["endIndex"], int)
        assert suggestion["type"] in [
            "grammar", "tone", "persuasive", "conciseness",
            "headline", "readability", "vocabulary", "ab_test"
        ]
        assert 0 <= suggestion["confidence"] <= 1

if __name__ == "__main__":
    validator = APIValidator("http://localhost:3000")
    result = validator.validate_suggestion_response("This are a test.")
    print(json.dumps(result, indent=2))
```

### 3. Visual Regression Testing

```python
#!/usr/bin/env python3
"""
Capture and compare screenshots for visual regression testing
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from PIL import Image, ImageChops
import os

class VisualTester:
    def __init__(self, headless=True):
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument('--headless')
        self.driver = webdriver.Chrome(options=options)
        self.baseline_dir = "tests/visual/baseline"
        self.current_dir = "tests/visual/current"
        
    def capture_page(self, url: str, name: str):
        """Capture screenshot of a page"""
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        screenshot_path = os.path.join(self.current_dir, f"{name}.png")
        self.driver.save_screenshot(screenshot_path)
        return screenshot_path
    
    def compare_images(self, name: str) -> bool:
        """Compare current screenshot with baseline"""
        baseline = Image.open(os.path.join(self.baseline_dir, f"{name}.png"))
        current = Image.open(os.path.join(self.current_dir, f"{name}.png"))
        
        diff = ImageChops.difference(baseline, current)
        
        if diff.getbbox() is None:
            print(f"✅ {name}: No visual changes")
            return True
        else:
            diff.save(f"tests/visual/diff/{name}_diff.png")
            print(f"❌ {name}: Visual changes detected")
            return False
    
    def cleanup(self):
        self.driver.quit()

# Usage
tester = VisualTester()
tester.capture_page("http://localhost:3000/login", "login_page")
tester.compare_images("login_page")
tester.cleanup()
```

### 4. Load Testing Script

```python
#!/usr/bin/env python3
"""
Simple load testing for API endpoints
"""
import asyncio
import aiohttp
import time
from statistics import mean, stdev

async def make_request(session, url, data):
    """Make a single request and measure time"""
    start = time.time()
    try:
        async with session.post(url, json=data) as response:
            await response.text()
            return {
                "status": response.status,
                "duration": time.time() - start,
                "success": response.status == 200
            }
    except Exception as e:
        return {
            "status": 0,
            "duration": time.time() - start,
            "success": False,
            "error": str(e)
        }

async def load_test(url: str, concurrent_requests: int, total_requests: int):
    """Run load test with specified concurrency"""
    data = {
        "text": "This is a test sentence with some errors.",
        "documentId": "load-test",
        "userSettings": {
            "brandTone": "professional",
            "readingLevel": 8,
            "bannedWords": []
        }
    }
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        results = []
        
        for i in range(total_requests):
            task = make_request(session, url, data)
            tasks.append(task)
            
            if len(tasks) >= concurrent_requests:
                batch_results = await asyncio.gather(*tasks)
                results.extend(batch_results)
                tasks = []
                
        if tasks:
            batch_results = await asyncio.gather(*tasks)
            results.extend(batch_results)
    
    # Calculate statistics
    successful = [r for r in results if r["success"]]
    durations = [r["duration"] for r in successful]
    
    print(f"\nLoad Test Results:")
    print(f"Total Requests: {total_requests}")
    print(f"Successful: {len(successful)}")
    print(f"Failed: {total_requests - len(successful)}")
    print(f"Success Rate: {len(successful)/total_requests*100:.1f}%")
    
    if durations:
        print(f"\nResponse Times (seconds):")
        print(f"Min: {min(durations):.3f}")
        print(f"Max: {max(durations):.3f}")
        print(f"Mean: {mean(durations):.3f}")
        print(f"StdDev: {stdev(durations):.3f}" if len(durations) > 1 else "")

# Usage
asyncio.run(load_test(
    "http://localhost:3000/api/analyze",
    concurrent_requests=10,
    total_requests=100
))
```

### 5. Database State Validator

```python
#!/usr/bin/env python3
"""
Validate database state and integrity
"""
import psycopg2
import os
from datetime import datetime, timedelta

class DatabaseValidator:
    def __init__(self):
        self.conn = psycopg2.connect(
            host="localhost",
            database="wordwise",
            user="postgres",
            password="localpassword",
            port=5432
        )
        self.cursor = self.conn.cursor()
    
    def validate_user_data(self):
        """Check user data integrity"""
        # Check for orphaned documents
        self.cursor.execute("""
            SELECT COUNT(*) FROM documents d
            LEFT JOIN users u ON d.user_id = u.id
            WHERE u.id IS NULL
        """)
        orphaned = self.cursor.fetchone()[0]
        assert orphaned == 0, f"Found {orphaned} orphaned documents"
        
        # Check for invalid user settings
        self.cursor.execute("""
            SELECT COUNT(*) FROM users
            WHERE reading_level < 1 OR reading_level > 12
        """)
        invalid = self.cursor.fetchone()[0]
        assert invalid == 0, f"Found {invalid} users with invalid reading level"
        
        print("✅ User data integrity check passed")
    
    def validate_suggestions(self):
        """Check suggestion data validity"""
        # Check position indices
        self.cursor.execute("""
            SELECT COUNT(*) FROM suggestions
            WHERE start_index >= end_index
        """)
        invalid_positions = self.cursor.fetchone()[0]
        assert invalid_positions == 0, f"Found {invalid_positions} suggestions with invalid positions"
        
        # Check confidence scores
        self.cursor.execute("""
            SELECT COUNT(*) FROM suggestions
            WHERE confidence < 0 OR confidence > 1
        """)
        invalid_confidence = self.cursor.fetchone()[0]
        assert invalid_confidence == 0, f"Found {invalid_confidence} suggestions with invalid confidence"
        
        print("✅ Suggestions data integrity check passed")
    
    def check_recent_activity(self, hours=24):
        """Check for recent system activity"""
        since = datetime.now() - timedelta(hours=hours)
        
        self.cursor.execute("""
            SELECT COUNT(*) FROM analytics
            WHERE timestamp > %s
        """, (since,))
        
        recent_events = self.cursor.fetchone()[0]
        print(f"📊 {recent_events} analytics events in last {hours} hours")
        
        return recent_events > 0
    
    def cleanup(self):
        self.cursor.close()
        self.conn.close()

# Usage
validator = DatabaseValidator()
validator.validate_user_data()
validator.validate_suggestions()
validator.check_recent_activity()
validator.cleanup()
```

## Testing Strategies by Component

### Frontend React Components

**Tools**: Jest/Vitest, React Testing Library, W3M (limited)

```bash
# Unit tests
npm test -- SuggestionCard.test.tsx

# Component integration tests
npm test -- TextEditor.test.tsx

# Snapshot testing
npm test -- --updateSnapshot
```

### API Endpoints

**Tools**: cURL, HTTPie, Python scripts

```bash
# Health check
curl http://localhost:3000/api/health

# Authentication flow
./scripts/test-auth-flow.sh

# Edge function testing
supabase functions invoke analyze-text --body @test-payload.json
```

### Database Operations

**Tools**: Supabase CLI, psql, Python scripts

```bash
# Direct query
supabase db query "SELECT * FROM users LIMIT 5"

# Migration status
supabase db diff

# Python validation
python3 scripts/validate-db-state.py
```

### Visual/UI Testing

**Tools**: Lighthouse, Selenium (Python), Percy (if integrated)

```bash
# Performance audit
lighthouse http://localhost:3000 --preset=desktop

# Visual regression
python3 scripts/visual-regression-test.py
```

### Docker Environment

**Tools**: Docker CLI, docker-compose

```bash
# Container health
docker-compose ps

# Log analysis
docker-compose logs frontend | grep ERROR

# Resource usage
docker stats wordwise-frontend-1
```

## Quick Reference

### Testing Decision Tree

```
Is it an API endpoint?
  ├─ Yes → Use cURL/HTTPie first, then Python for complex validation
  └─ No → Continue
  
Is it a React component?
  ├─ Yes → Use Jest/Vitest for logic, W3M for basic HTML
  └─ No → Continue

Is it database-related?
  ├─ Yes → Use Supabase CLI or Python psycopg2
  └─ No → Continue

Is it visual/UI?
  ├─ Yes → Use Lighthouse for performance, Python/Selenium for regression
  └─ No → Use appropriate tool based on context
```

### Common Testing Patterns

1. **API Testing Pattern**
   ```bash
   # 1. Check health
   curl http://localhost:3000/health
   
   # 2. Test endpoint
   curl -X POST http://localhost:3000/api/endpoint \
     -H "Content-Type: application/json" \
     -d @payload.json
   
   # 3. Validate response
   curl ... | jq '.expectedField'
   ```

2. **Component Testing Pattern**
   ```bash
   # 1. Run unit tests
   npm test -- ComponentName.test.tsx
   
   # 2. Check HTML structure
   w3m -dump http://localhost:3000/page | grep "Expected Content"
   
   # 3. Validate with Python if needed
   python3 scripts/validate-html-structure.py
   ```

3. **Database Testing Pattern**
   ```bash
   # 1. Check schema
   supabase db diff
   
   # 2. Validate data
   python3 scripts/validate-db-integrity.py
   
   # 3. Test queries
   supabase db query "SELECT COUNT(*) FROM table"
   ```

## Best Practices

1. **Start Simple**: Use basic tools (cURL, W3M) before complex ones
2. **Automate Repeatedly**: If you run a test twice, script it
3. **Layer Your Tests**: Unit → Integration → E2E
4. **Document Failures**: Include error messages in test output
5. **Version Control Tests**: Keep test scripts in the repo
6. **CI/CD Integration**: Design tests to run in pipelines
7. **Performance Baselines**: Track metrics over time

## Tool Installation Summary

```bash
# macOS (using Homebrew)
brew install w3m curl httpie jq lighthouse

# Python tools
pip install requests beautifulsoup4 selenium pytest aiohttp psycopg2-binary pillow

# Node.js tools
npm install -g lighthouse jest @playwright/test

# Docker (download from docker.com)
# Supabase CLI
brew install supabase/tap/supabase
```

Remember: This is a reference guide. Choose the right tool for each specific testing need rather than using all tools for every test. 