# Parent Task 2.0 Development Plan: Implement Org-mode Parsing and File Handling

## 1. Task Overview

### Summary
Parent Task 2.0 implements the core org-mode parsing capabilities that enable IdeaForge to read, understand, and process project planning documents. This task creates the foundation for all document-based operations in the system, from initial template parsing to iterative refinement loops.

### How it fits into IdeaForge architecture
- **Foundation Layer**: This is the primary data ingestion layer that all other components depend on
- **Feeds Into**: LangGraph agents (Task 4.0), AI analysis (Task 6.0), and export systems (Task 7.0)
- **Enables**: Template validation, data extraction, refinement tracking, and version management

### Dependencies on other parent tasks
- **Depends On**: Task 1.0 (Project foundation) - Complete ✅
- **Required For**: Tasks 3.0, 4.0, 6.0, 7.0, 8.0

### What will be possible after completion
- Load and parse org-mode files with full structural understanding
- Extract all planning data: user stories, requirements, brainstorming sections
- Validate template structure before processing
- Track document versions through refinement iterations
- Recognize and handle :RESPONSE: tags for feedback loops

## 2. Technical Design

### Architecture Overview
```
src/
├── parsers/
│   ├── orgmode-parser.ts       # Main parser implementation
│   ├── orgmode-validator.ts    # Template structure validation
│   └── orgmode-types.ts        # TypeScript interfaces
├── services/
│   ├── file-handler.ts         # File I/O operations
│   └── version-manager.ts      # Document versioning
├── models/
│   └── document-types.ts       # Shared document models
└── utils/
    └── orgmode-helpers.ts      # Parsing utilities
```

### Key Interfaces and Data Structures
```typescript
// Core document structure
interface OrgDocument {
  title: string;
  metadata: DocumentMetadata;
  sections: OrgSection[];
  version: string;
  changelog?: ChangelogEntry[];
}

interface OrgSection {
  level: number;
  heading: string;
  content: string;
  tags: string[];
  children: OrgSection[];
  properties?: Record<string, string>;
}

interface ParseResult {
  success: boolean;
  document?: OrgDocument;
  errors?: ValidationError[];
}
```

### Integration Points
- **CLI Commands**: Parser integrates with analyze/refine commands
- **LangGraph**: Parsed data feeds into DocumentParserNode
- **File System**: Version manager handles file naming and storage
- **Export System**: Parser output format enables easy conversion

### Technology Considerations
- **No external org-mode libraries**: Build custom parser for control
- **Synchronous file operations**: As specified in tech stack
- **TypeScript strict mode**: Full type safety for parsed data
- **500-line file limit**: Split parser into logical modules

## 3. Implementation Sequence

### Ordered list with rationale
1. **T201**: TypeScript interfaces and data models (Foundation - enables type-safe development)
2. **T202**: Basic org-mode parser (Core functionality - parse headings and content)
3. **T203**: Template structure validator (Safety - ensure valid input before processing)
4. **T204**: Data extraction for specific sections (Feature - extract requirements, stories, etc.)
5. **T205**: Response tag recognition (Feature - enable refinement loops)
6. **T206**: File versioning system (Feature - track iterations)
7. **T207**: Error handling and recovery (Polish - robust user experience)
8. **T208**: Parser performance optimization (Polish - handle large documents)
9. **T209**: Unit tests for all modules (Quality - ensure reliability)
10. **T210**: Integration tests (Quality - verify system-wide compatibility)

### Critical Path
T201 → T202 → T203 → T204 (these must be sequential)

### Parallel Opportunities
- T205 & T206 can be developed in parallel after T204
- T207 can begin after T203
- T209 can be written alongside implementation

### Risk Points
- **T202**: Parser complexity might require iteration
- **T203**: Template validation rules might need adjustment based on real usage
- **T205**: :RESPONSE: tag handling affects multiple components

## 4. Detailed Subtask Breakdown

### T201: Create TypeScript interfaces and data models
**Description**: Define all TypeScript types for org-mode parsing
**Implementation Steps**:
1. Create `src/models/document-types.ts` with base interfaces
2. Create `src/parsers/orgmode-types.ts` with parser-specific types
3. Define validation error types and parse result types
4. Add JSDoc comments for all interfaces

**Code Example**:
```typescript
// src/models/document-types.ts
export interface DocumentMetadata {
  title: string;
  author?: string;
  date?: string;
  startup?: string;
}

export interface MoscowTag {
  type: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  confidence?: number;
}
```

**File Changes**: Create new files listed above
**Testing**: TypeScript compilation validates interfaces
**Definition of Done**: All types defined, no TypeScript errors
**Common Pitfalls**: Over-engineering types before understanding full requirements

### T202: Implement basic org-mode parser
**Description**: Build parser to handle org-mode structure
**Implementation Steps**:
1. Create `src/parsers/orgmode-parser.ts`
2. Implement heading detection with regex
3. Build hierarchical structure from flat lines
4. Parse metadata from header section
5. Handle content association with headings

**Code Example**:
```typescript
export class OrgModeParser {
  private readonly HEADING_REGEX = /^(\*+)\s+(.+?)(?:\s+(:.+:))?$/;
  
  parse(content: string): ParseResult {
    const lines = content.split('\n');
    const document = this.buildDocument(lines);
    return { success: true, document };
  }
}
```

**File Changes**: Create parser implementation
**Testing**: Parse ideaforge-template.org successfully
**Definition of Done**: Can parse template into hierarchical structure
**Common Pitfalls**: Regex complexity, handling edge cases in org syntax

### T203: Implement template structure validator
**Description**: Validate org files match expected template
**Implementation Steps**:
1. Create `src/parsers/orgmode-validator.ts`
2. Define required sections from template
3. Implement section presence validation
4. Check for required tags and metadata
5. Return helpful error messages

**Code Example**:
```typescript
const REQUIRED_SECTIONS = [
  'User Stories',
  'Requirements',
  'Technology Choices',
  'Brainstorming'
];
```

**File Changes**: Create validator module
**Testing**: Validate correct and incorrect templates
**Definition of Done**: Clear errors for invalid templates
**Common Pitfalls**: Too strict validation blocking valid variations

### T204: Build data extraction for specific sections
**Description**: Extract typed data from document sections
**Implementation Steps**:
1. Create extraction methods for each section type
2. Parse user stories into structured format
3. Extract requirements with MoSCoW tags
4. Parse brainstorming subsections
5. Handle technology choices structure

**Code Example**:
```typescript
extractRequirements(section: OrgSection): Requirement[] {
  return section.children.map(child => ({
    text: child.heading,
    type: this.extractMoscowTag(child.tags),
    description: child.content
  }));
}
```

**File Changes**: Add to parser implementation
**Testing**: Extract all data from template correctly
**Definition of Done**: All sections extractable as typed data
**Common Pitfalls**: Assuming fixed structure within sections

### T205: Handle :RESPONSE: tag recognition
**Description**: Identify and process refinement feedback
**Implementation Steps**:
1. Add RESPONSE tag detection to parser
2. Create ResponseSection interface
3. Associate responses with original sections
4. Preserve response content separately
5. Add response extraction method

**Code Example**:
```typescript
interface ResponseSection extends OrgSection {
  isResponse: true;
  targetSection?: string;
}
```

**File Changes**: Extend parser and types
**Testing**: Parse documents with :RESPONSE: tags
**Definition of Done**: Responses extracted and associated correctly
**Common Pitfalls**: Breaking existing parsing when adding response logic

### T206: Create file versioning system
**Description**: Manage document versions through iterations
**Implementation Steps**:
1. Create `src/services/version-manager.ts`
2. Implement version numbering scheme
3. Create file naming conventions
4. Add changelog parsing/generation
5. Build version comparison utilities

**Code Example**:
```typescript
generateVersionedFilename(base: string, version: number): string {
  const ext = path.extname(base);
  const name = path.basename(base, ext);
  return `${name}-v${version}${ext}`;
}
```

**File Changes**: Create version manager service
**Testing**: Version multiple iterations correctly
**Definition of Done**: Consistent versioning across refinements
**Common Pitfalls**: Conflicting version numbers, lost versions

### T207: Implement error handling and recovery
**Description**: Graceful handling of parsing errors
**Implementation Steps**:
1. Create custom error classes
2. Add try-catch blocks to parser
3. Implement partial parsing on errors
4. Create error recovery strategies
5. Format user-friendly error messages

**Code Example**:
```typescript
class OrgParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public suggestion?: string
  ) {
    super(message);
  }
}
```

**File Changes**: Add error handling throughout
**Testing**: Test with malformed documents
**Definition of Done**: No crashes on bad input
**Common Pitfalls**: Swallowing errors, unclear error messages

### T208: Optimize parser performance
**Description**: Ensure fast parsing for large documents
**Implementation Steps**:
1. Profile parser with large files
2. Optimize regex usage
3. Implement incremental parsing
4. Add parsing progress callbacks
5. Cache parsed results when appropriate

**Testing**: Benchmark with various file sizes
**Definition of Done**: Parse 1000-line file in <100ms
**Common Pitfalls**: Premature optimization, breaking functionality

### T209: Write comprehensive unit tests
**Description**: Test all parser modules
**Implementation Steps**:
1. Test basic parsing functionality
2. Test validation rules
3. Test data extraction
4. Test error cases
5. Test edge cases

**File Changes**: Create test files for each module
**Testing**: 90%+ code coverage
**Definition of Done**: All tests passing
**Common Pitfalls**: Testing implementation details

### T210: Create integration tests
**Description**: Test parser with rest of system
**Implementation Steps**:
1. Test CLI command integration
2. Test file handling integration
3. Test version management flow
4. Test error propagation
5. Create end-to-end scenarios

**Testing**: Full workflow tests pass
**Definition of Done**: Parser integrates smoothly
**Common Pitfalls**: Mocking too much, missing real issues

## 5. Testing Strategy

### Unit Test Requirements
- Each parser module gets dedicated test file
- Test normal cases, edge cases, and errors
- Mock file system operations
- Use snapshot testing for complex structures

### Integration Test Scenarios
1. Parse template → Validate → Extract data
2. Parse with responses → Version → Save
3. Invalid template → Error → Recovery
4. Large file → Performance → Success

### Manual Testing Procedures
1. Test with provided template
2. Test with modified templates
3. Test with real project files
4. Test error messages clarity

### Mock Data Needed
- Valid org-mode templates
- Invalid templates (missing sections)
- Templates with responses
- Large test documents

## 6. Integration Plan

### CLI Integration
```typescript
// src/cli/commands/analyze.ts
import { OrgModeParser } from '../../parsers/orgmode-parser';

const parser = new OrgModeParser();
const result = await parser.parse(fileContent);
if (!result.success) {
  showErrors(result.errors);
  return;
}
```

### API Contracts
- Parser returns `ParseResult` type
- Validator returns `ValidationResult`
- Version manager returns `VersionInfo`

### Configuration Requirements
- No configuration needed for basic parsing
- Optional strict mode for validation

### Migration Steps
- No existing code to migrate
- Future: May need to support multiple template versions

## 7. Documentation Requirements

### Code Documentation
- JSDoc for all public methods
- Inline comments for complex logic
- README in parsers directory

### API Documentation
```typescript
/**
 * Parses an org-mode document into structured data
 * @param content - Raw org-mode file content
 * @returns ParseResult with document or errors
 */
parse(content: string): ParseResult
```

### Usage Examples
```typescript
// Basic parsing
const parser = new OrgModeParser();
const result = parser.parse(orgContent);

// With validation
const validator = new OrgModeValidator();
const valid = validator.validate(result.document);
```

## 8. Functional Requirements

1. **F1**: Parser must handle standard org-mode syntax (headings, tags, content)
2. **F2**: Parser must extract all template sections into typed data
3. **F3**: Validator must ensure required sections are present
4. **F4**: System must recognize :RESPONSE: tags as feedback markers
5. **F5**: Version manager must maintain iteration history
6. **F6**: Parser must provide clear error messages with line numbers
7. **F7**: System must handle files up to 10MB without performance issues
8. **F8**: Parser must preserve original formatting in content sections
9. **F9**: System must support UTF-8 encoded files
10. **F10**: Version system must prevent version conflicts

## 9. Success Metrics

### Performance Benchmarks
- Parse standard template in <50ms
- Parse 1000-line document in <100ms
- Validation completes in <10ms

### Quality Metrics
- Zero crashes on malformed input
- 90%+ test coverage
- Clear error messages (user-testable)

### Functional Success
- Successfully parses ideaforge-template.org
- Extracts all data sections correctly
- Handles refinement iterations smoothly

## 10. Next Steps

### What becomes possible
- CLI commands can process actual project files
- LangGraph agents can analyze parsed data
- Export system can generate output formats
- Refinement loops can track changes

### Which parent tasks should follow
- **Task 3.0**: Build CLI framework (can use parser)
- **Task 4.0**: Implement LangGraph agents (needs parsed data)

### Future Enhancement Opportunities
- Support for custom org-mode properties
- Incremental parsing for large files
- Template migration utilities
- Visual org-mode structure viewer
- Parser plugins for custom sections 