# Parent Task 2.0: Implement Org-mode Parsing and File Handling - Detailed Implementation Guide

## Overview
This document provides detailed implementation instructions for each subtask in Parent Task 2.0. Follow these steps carefully to implement the org-mode parsing and file handling system for IdeaForge.

## T201: Create TypeScript interfaces and data models

### Goal
Define all TypeScript types and interfaces that will be used throughout the org-mode parsing system.

### Implementation Steps

1. **Create `src/models/document-types.ts`**:
```typescript
// Base document metadata that appears at the top of org files
export interface DocumentMetadata {
  title: string;
  author?: string;
  date?: string;
  startup?: string;
  [key: string]: string | undefined; // Allow custom properties
}

// MoSCoW prioritization tags
export interface MoscowTag {
  type: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  confidence?: number; // 1-10 scale
  rationale?: string;
}

// User story structure
export interface UserStory {
  role: string;        // "As a..."
  action: string;      // "I want to..."
  benefit: string;     // "So that..."
  rawText: string;     // Original text
}

// Requirement with MoSCoW classification
export interface Requirement {
  id: string;
  text: string;
  description: string;
  moscowType: MoscowTag;
  category: 'functional' | 'technical';
}

// Brainstorming idea
export interface BrainstormIdea {
  category: string; // e.g., "Core Features", "UI/UX Ideas"
  text: string;
  subcategory?: string;
}

// Changelog entry for version tracking
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}
```

2. **Create `src/parsers/orgmode-types.ts`**:
```typescript
import { DocumentMetadata, ChangelogEntry } from '../models/document-types';

// Main org document structure
export interface OrgDocument {
  title: string;
  metadata: DocumentMetadata;
  sections: OrgSection[];
  version: string;
  changelog?: ChangelogEntry[];
  raw: string; // Keep original content
}

// Hierarchical section structure
export interface OrgSection {
  level: number;       // 1 = *, 2 = **, etc.
  heading: string;     // Section title
  content: string;     // Text content under heading
  tags: string[];      // Org-mode tags like :MUST:, :RESPONSE:
  children: OrgSection[];
  properties?: Record<string, string>; // Org properties
  lineNumber: number;  // For error reporting
  isResponse?: boolean; // True if has :RESPONSE: tag
}

// Parser result type
export interface ParseResult {
  success: boolean;
  document?: OrgDocument;
  errors?: ValidationError[];
}

// Validation error details
export interface ValidationError {
  type: 'missing_section' | 'invalid_format' | 'parse_error';
  message: string;
  line?: number;
  section?: string;
  suggestion?: string;
}
```

### Testing
- Ensure TypeScript compiles without errors
- Import types in a test file to verify exports work

### Common Pitfalls
- Don't over-complicate types initially
- Keep interfaces focused on what's actually in the template
- Use optional properties (?) for fields that might not exist

---

## T202: Implement basic org-mode parser

### Goal
Create the core parser that converts org-mode text into our structured format.

### Implementation Steps

1. **Create `src/parsers/orgmode-parser.ts`**:
```typescript
import { OrgDocument, OrgSection, ParseResult, ValidationError } from './orgmode-types';
import { DocumentMetadata } from '../models/document-types';

export class OrgModeParser {
  // Regex patterns for org-mode syntax
  private readonly HEADING_REGEX = /^(\*+)\s+(.+?)(?:\s+(:.+:))?$/;
  private readonly PROPERTY_REGEX = /^#\+(\w+):\s*(.*)$/;
  private readonly PROPERTY_DRAWER_START = /^:PROPERTIES:$/;
  private readonly PROPERTY_DRAWER_END = /^:END:$/;
  
  parse(content: string): ParseResult {
    try {
      const lines = content.split('\n');
      const metadata = this.parseMetadata(lines);
      const sections = this.parseSections(lines);
      
      const document: OrgDocument = {
        title: metadata.title || 'Untitled',
        metadata,
        sections,
        version: 'v1', // Default version
        raw: content
      };
      
      return { success: true, document };
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'parse_error',
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        }]
      };
    }
  }
  
  private parseMetadata(lines: string[]): DocumentMetadata {
    const metadata: DocumentMetadata = { title: '' };
    
    for (const line of lines) {
      const match = line.match(this.PROPERTY_REGEX);
      if (match) {
        const [, key, value] = match;
        metadata[key.toLowerCase()] = value.trim();
      } else if (!line.startsWith('*') && line.trim()) {
        // Stop at first non-property, non-empty line
        break;
      }
    }
    
    return metadata;
  }
  
  private parseSections(lines: string[]): OrgSection[] {
    const sections: OrgSection[] = [];
    const stack: { section: OrgSection; level: number }[] = [];
    let currentContent: string[] = [];
    let inPropertyDrawer = false;
    
    lines.forEach((line, index) => {
      // Check for property drawer
      if (line.match(this.PROPERTY_DRAWER_START)) {
        inPropertyDrawer = true;
        return;
      }
      if (line.match(this.PROPERTY_DRAWER_END)) {
        inPropertyDrawer = false;
        return;
      }
      
      const headingMatch = line.match(this.HEADING_REGEX);
      
      if (headingMatch && !inPropertyDrawer) {
        // Save previous content
        if (stack.length > 0 && currentContent.length > 0) {
          stack[stack.length - 1].section.content = currentContent.join('\n').trim();
        }
        currentContent = [];
        
        const [, stars, heading, tags] = headingMatch;
        const level = stars.length;
        const tagList = tags ? tags.slice(1, -1).split(':').filter(t => t) : [];
        
        const section: OrgSection = {
          level,
          heading: heading.trim(),
          content: '',
          tags: tagList,
          children: [],
          lineNumber: index + 1,
          isResponse: tagList.includes('RESPONSE')
        };
        
        // Find parent
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        
        if (stack.length === 0) {
          sections.push(section);
        } else {
          stack[stack.length - 1].section.children.push(section);
        }
        
        stack.push({ section, level });
      } else if (!line.match(this.PROPERTY_REGEX)) {
        // Collect content
        currentContent.push(line);
      }
    });
    
    // Save final content
    if (stack.length > 0 && currentContent.length > 0) {
      stack[stack.length - 1].section.content = currentContent.join('\n').trim();
    }
    
    return sections;
  }
}
```

### Testing Steps
1. Create a test file with sample org content
2. Parse it and verify the structure
3. Test with the actual `ideaforge-template.org`
4. Check that headings, content, and tags are correctly parsed

### Common Pitfalls
- Org-mode allows many variations - start simple
- Handle Windows vs Unix line endings
- Don't forget to trim whitespace
- Property drawers can appear anywhere, not just at the top

---

## T203: Implement template structure validator

### Goal
Ensure uploaded org files match the expected IdeaForge template structure.

### Implementation Steps

1. **Create `src/parsers/orgmode-validator.ts`**:
```typescript
import { OrgDocument, OrgSection, ValidationError } from './orgmode-types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class OrgModeValidator {
  // Required top-level sections
  private readonly REQUIRED_SECTIONS = [
    'Project Overview',
    'User Stories', 
    'Requirements',
    'Technology Choices',
    'Brainstorming'
  ];
  
  // Required subsections under Brainstorming
  private readonly BRAINSTORM_SECTIONS = [
    'Core Features',
    'Architecture Considerations',
    'UI/UX Ideas',
    'Potential Integrations',
    'Future Possibilities'
  ];
  
  validate(document: OrgDocument): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Check required sections
    for (const required of this.REQUIRED_SECTIONS) {
      const section = this.findSection(document.sections, required);
      if (!section) {
        errors.push({
          type: 'missing_section',
          message: `Missing required section: ${required}`,
          section: required,
          suggestion: `Add a "* ${required}" section to your document`
        });
      }
    }
    
    // Check brainstorming subsections if Brainstorming exists
    const brainstorming = this.findSection(document.sections, 'Brainstorming');
    if (brainstorming) {
      for (const required of this.BRAINSTORM_SECTIONS) {
        const subsection = this.findSection(brainstorming.children, required);
        if (!subsection) {
          errors.push({
            type: 'missing_section',
            message: `Missing brainstorming subsection: ${required}`,
            section: `Brainstorming/${required}`,
            suggestion: `Add "** ${required}" under the Brainstorming section`
          });
        }
      }
    }
    
    // Validate Requirements section structure
    const requirements = this.findSection(document.sections, 'Requirements');
    if (requirements) {
      this.validateRequirements(requirements, errors);
    }
    
    // Check metadata
    if (!document.metadata.title) {
      errors.push({
        type: 'invalid_format',
        message: 'Document missing #+TITLE property',
        line: 1,
        suggestion: 'Add "#+TITLE: Your Project Name" at the top of the file'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    return sections.find(s => 
      s.heading.toLowerCase() === heading.toLowerCase()
    );
  }
  
  private validateRequirements(requirements: OrgSection, errors: ValidationError[]) {
    const functionalReqs = this.findSection(requirements.children, 'Functional Requirements');
    const technicalReqs = this.findSection(requirements.children, 'Technical Requirements');
    
    if (!functionalReqs) {
      errors.push({
        type: 'missing_section',
        message: 'Missing Functional Requirements subsection',
        section: 'Requirements/Functional Requirements',
        suggestion: 'Add "** Functional Requirements" under Requirements'
      });
    }
    
    if (!technicalReqs) {
      errors.push({
        type: 'missing_section', 
        message: 'Missing Technical Requirements subsection',
        section: 'Requirements/Technical Requirements',
        suggestion: 'Add "** Technical Requirements" under Requirements'
      });
    }
    
    // Check for MoSCoW tags
    const allReqs = [...(functionalReqs?.children || []), ...(technicalReqs?.children || [])];
    for (const req of allReqs) {
      const hasMoscow = req.tags.some(tag => 
        ['MUST', 'SHOULD', 'COULD', 'WONT'].includes(tag)
      );
      if (!hasMoscow) {
        errors.push({
          type: 'invalid_format',
          message: `Requirement missing MoSCoW tag: ${req.heading}`,
          line: req.lineNumber,
          section: 'Requirements',
          suggestion: 'Add :MUST:, :SHOULD:, :COULD:, or :WONT: tag'
        });
      }
    }
  }
}
```

### Testing Steps
1. Test with a valid template - should pass
2. Test with missing sections - should report errors
3. Test with missing MoSCoW tags - should catch them
4. Verify error messages are helpful

### Common Pitfalls
- Don't be too strict about exact formatting
- Case-insensitive section matching is important
- Provide actionable error messages
- Consider optional sections for future flexibility

---

## T204: Build data extraction for specific sections

### Goal
Extract structured data from each section type for use by other components.

### Implementation Steps

1. **Update `src/parsers/orgmode-parser.ts`** with extraction methods:
```typescript
import { UserStory, Requirement, BrainstormIdea, MoscowTag } from '../models/document-types';

export class OrgModeParser {
  // ... existing code ...
  
  extractUserStories(document: OrgDocument): UserStory[] {
    const stories: UserStory[] = [];
    const userStoriesSection = this.findSection(document.sections, 'User Stories');
    
    if (userStoriesSection) {
      for (const child of userStoriesSection.children) {
        const story = this.parseUserStory(child);
        if (story) {
          stories.push(story);
        }
      }
    }
    
    return stories;
  }
  
  private parseUserStory(section: OrgSection): UserStory | null {
    // Match "As a [role], I want to [action] so that [benefit]"
    const patterns = [
      /As a (.+?),?\s*I want to (.+?)\s*so that (.+)/i,
      /As an? (.+?),?\s*I want to (.+?)\s*so that (.+)/i
    ];
    
    const text = section.heading + ' ' + section.content;
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          role: match[1].trim(),
          action: match[2].trim(),
          benefit: match[3].trim(),
          rawText: text.trim()
        };
      }
    }
    
    // If no match, still capture the story
    return {
      role: 'user',
      action: section.heading,
      benefit: section.content || 'achieve their goal',
      rawText: text.trim()
    };
  }
  
  extractRequirements(document: OrgDocument): Requirement[] {
    const requirements: Requirement[] = [];
    const reqSection = this.findSection(document.sections, 'Requirements');
    
    if (reqSection) {
      let idCounter = 1;
      
      // Process functional requirements
      const functional = this.findSection(reqSection.children, 'Functional Requirements');
      if (functional) {
        for (const req of functional.children) {
          requirements.push({
            id: `F${idCounter++}`,
            text: req.heading.replace(/^(MUST|SHOULD|COULD|WONT)\s+/i, ''),
            description: req.content,
            moscowType: this.extractMoscowTag(req.tags),
            category: 'functional'
          });
        }
      }
      
      // Process technical requirements
      const technical = this.findSection(reqSection.children, 'Technical Requirements');
      if (technical) {
        idCounter = 1;
        for (const req of technical.children) {
          requirements.push({
            id: `T${idCounter++}`,
            text: req.heading.replace(/^(MUST|SHOULD|COULD|WONT)\s+/i, ''),
            description: req.content,
            moscowType: this.extractMoscowTag(req.tags),
            category: 'technical'
          });
        }
      }
    }
    
    return requirements;
  }
  
  private extractMoscowTag(tags: string[]): MoscowTag {
    const moscowTags = tags.filter(tag => 
      ['MUST', 'SHOULD', 'COULD', 'WONT'].includes(tag)
    );
    
    if (moscowTags.length > 0) {
      return {
        type: moscowTags[0] as 'MUST' | 'SHOULD' | 'COULD' | 'WONT'
      };
    }
    
    // Default if no tag found
    return { type: 'SHOULD' };
  }
  
  extractBrainstormIdeas(document: OrgDocument): BrainstormIdea[] {
    const ideas: BrainstormIdea[] = [];
    const brainstorm = this.findSection(document.sections, 'Brainstorming');
    
    if (brainstorm) {
      for (const category of brainstorm.children) {
        // Extract ideas from category content
        const categoryIdeas = this.parseIdeasFromContent(category.content);
        ideas.push(...categoryIdeas.map(idea => ({
          category: category.heading,
          text: idea
        })));
        
        // Also check sub-items
        for (const subItem of category.children) {
          ideas.push({
            category: category.heading,
            subcategory: subItem.heading,
            text: subItem.content || subItem.heading
          });
        }
      }
    }
    
    return ideas;
  }
  
  private parseIdeasFromContent(content: string): string[] {
    if (!content) return [];
    
    // Split by common list markers
    const lines = content.split('\n');
    const ideas: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[-*+]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/)) {
        // List item
        ideas.push(trimmed.replace(/^[-*+\d]+\.\s+/, ''));
      } else if (trimmed && !trimmed.startsWith('[')) {
        // Non-empty line that's not a comment
        ideas.push(trimmed);
      }
    }
    
    return ideas;
  }
  
  private findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    return sections.find(s => 
      s.heading.toLowerCase() === heading.toLowerCase()
    );
  }
}
```

### Testing Steps
1. Extract user stories and verify structure
2. Extract requirements with proper MoSCoW tags
3. Extract brainstorming ideas by category
4. Test with edge cases (missing content, unusual formatting)

### Common Pitfalls
- User stories might not follow exact format
- Handle missing MoSCoW tags gracefully
- Brainstorming content can be free-form
- Don't lose data when parsing fails

---

## T205: Handle :RESPONSE: tag recognition

### Goal
Identify and process user feedback marked with :RESPONSE: tags for the refinement loop.

### Implementation Steps

1. **Update `src/parsers/orgmode-types.ts`**:
```typescript
export interface ResponseSection extends OrgSection {
  isResponse: true;
  targetSection?: string; // Which section this responds to
  responseContent: string;
}

export interface OrgDocument {
  // ... existing fields ...
  responses?: ResponseSection[]; // Collected responses
}
```

2. **Update parser to handle responses**:
```typescript
export class OrgModeParser {
  // ... existing code ...
  
  parse(content: string): ParseResult {
    try {
      const lines = content.split('\n');
      const metadata = this.parseMetadata(lines);
      const sections = this.parseSections(lines);
      const responses = this.extractResponses(sections);
      
      const document: OrgDocument = {
        title: metadata.title || 'Untitled',
        metadata,
        sections,
        responses,
        version: this.detectVersion(metadata, content),
        raw: content
      };
      
      return { success: true, document };
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'parse_error',
          message: error instanceof Error ? error.message : 'Unknown parsing error'
        }]
      };
    }
  }
  
  private extractResponses(sections: OrgSection[]): ResponseSection[] {
    const responses: ResponseSection[] = [];
    
    const collectResponses = (sectionList: OrgSection[], parentPath: string = '') => {
      for (const section of sectionList) {
        if (section.tags.includes('RESPONSE')) {
          const response: ResponseSection = {
            ...section,
            isResponse: true,
            targetSection: this.inferTargetSection(section, parentPath),
            responseContent: section.content
          };
          responses.push(response);
        }
        
        // Recurse into children
        const currentPath = parentPath ? `${parentPath}/${section.heading}` : section.heading;
        collectResponses(section.children, currentPath);
      }
    };
    
    collectResponses(sections);
    return responses;
  }
  
  private inferTargetSection(response: OrgSection, parentPath: string): string {
    // Try to infer what section this response is about
    // Look for patterns like "Re: Requirements" or "About User Stories"
    const patterns = [
      /^Re:\s*(.+)/i,
      /^About\s+(.+)/i,
      /^Regarding\s+(.+)/i,
      /^For\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = response.heading.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // If no pattern matches, use parent section
    return parentPath;
  }
  
  private detectVersion(metadata: DocumentMetadata, content: string): string {
    // Check metadata first
    if (metadata.version) {
      return metadata.version;
    }
    
    // Look for version in changelog
    const changelogMatch = content.match(/\*+\s+Changelog.*?\n.*?v(\d+)/is);
    if (changelogMatch) {
      return `v${changelogMatch[1]}`;
    }
    
    // Default
    return 'v1';
  }
  
  hasResponses(document: OrgDocument): boolean {
    return (document.responses?.length || 0) > 0;
  }
  
  getResponsesForSection(document: OrgDocument, sectionHeading: string): ResponseSection[] {
    if (!document.responses) return [];
    
    return document.responses.filter(response => 
      response.targetSection?.toLowerCase() === sectionHeading.toLowerCase()
    );
  }
}
```

### Testing Steps
1. Create a test org file with :RESPONSE: tags
2. Verify responses are extracted correctly
3. Test target section inference
4. Ensure regular sections aren't affected

### Common Pitfalls
- :RESPONSE: tags can appear at any level
- Users might format responses differently
- Need to preserve response context
- Don't break existing parsing

---

## T206: Create file versioning system

### Goal
Manage document versions as users iterate through refinements.

### Implementation Steps

1. **Create `src/services/version-manager.ts`**:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { OrgDocument, ChangelogEntry } from '../models/document-types';

export interface VersionInfo {
  version: string;
  filename: string;
  timestamp: string;
  changes?: string[];
}

export class VersionManager {
  private readonly VERSION_PATTERN = /^(.+)-v(\d+)(\..+)?$/;
  
  getNextVersion(baseFilename: string): VersionInfo {
    const dir = path.dirname(baseFilename);
    const ext = path.extname(baseFilename);
    const basename = path.basename(baseFilename, ext);
    
    // Remove existing version suffix if present
    const cleanBase = this.removeVersionSuffix(basename);
    
    // Find highest existing version
    let maxVersion = 0;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const match = file.match(this.VERSION_PATTERN);
        if (match && match[1] === cleanBase) {
          const version = parseInt(match[2], 10);
          maxVersion = Math.max(maxVersion, version);
        }
      }
    }
    
    const nextVersion = maxVersion + 1;
    const filename = `${cleanBase}-v${nextVersion}${ext}`;
    
    return {
      version: `v${nextVersion}`,
      filename: path.join(dir, filename),
      timestamp: new Date().toISOString()
    };
  }
  
  private removeVersionSuffix(basename: string): string {
    const match = basename.match(/^(.+)-v\d+$/);
    return match ? match[1] : basename;
  }
  
  saveVersionedDocument(
    document: OrgDocument, 
    baseFilename: string,
    changes?: string[]
  ): string {
    const versionInfo = this.getNextVersion(baseFilename);
    
    // Update document with new version
    document.version = versionInfo.version;
    
    // Add changelog entry
    const changelogEntry: ChangelogEntry = {
      version: versionInfo.version,
      date: new Date().toISOString().split('T')[0],
      changes: changes || ['Updated based on feedback']
    };
    
    if (!document.changelog) {
      document.changelog = [];
    }
    document.changelog.unshift(changelogEntry);
    
    // Convert back to org-mode format
    const orgContent = this.documentToOrgMode(document);
    
    // Save file
    fs.writeFileSync(versionInfo.filename, orgContent, 'utf-8');
    
    return versionInfo.filename;
  }
  
  private documentToOrgMode(document: OrgDocument): string {
    const lines: string[] = [];
    
    // Write metadata
    lines.push(`#+TITLE: ${document.metadata.title}`);
    if (document.metadata.date) {
      lines.push(`#+DATE: ${document.metadata.date}`);
    }
    if (document.metadata.author) {
      lines.push(`#+AUTHOR: ${document.metadata.author}`);
    }
    lines.push('#+STARTUP: overview');
    lines.push('');
    
    // Write sections
    this.writeSections(document.sections, lines);
    
    // Write changelog if exists
    if (document.changelog && document.changelog.length > 0) {
      lines.push('');
      lines.push('* Changelog                                                        :CHANGELOG:');
      lines.push('  ** Version History');
      
      for (const entry of document.changelog) {
        lines.push(`     - ${entry.version} (${entry.date}):`);
        for (const change of entry.changes) {
          lines.push(`       - ${change}`);
        }
      }
    }
    
    return lines.join('\n');
  }
  
  private writeSections(sections: OrgSection[], lines: string[], level: number = 1) {
    for (const section of sections) {
      const stars = '*'.repeat(section.level);
      const tags = section.tags.length > 0 ? ` :${section.tags.join(':')}:` : '';
      
      lines.push(`${stars} ${section.heading}${tags}`);
      
      if (section.content) {
        lines.push(section.content);
      }
      
      if (section.children.length > 0) {
        this.writeSections(section.children, lines, level + 1);
      }
    }
  }
  
  loadVersion(filename: string): OrgDocument | null {
    if (!fs.existsSync(filename)) {
      return null;
    }
    
    const content = fs.readFileSync(filename, 'utf-8');
    const parser = new OrgModeParser();
    const result = parser.parse(content);
    
    return result.success ? result.document! : null;
  }
  
  listVersions(baseFilename: string): VersionInfo[] {
    const dir = path.dirname(baseFilename);
    const ext = path.extname(baseFilename);
    const basename = path.basename(baseFilename, ext);
    const cleanBase = this.removeVersionSuffix(basename);
    
    const versions: VersionInfo[] = [];
    
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const match = file.match(this.VERSION_PATTERN);
        if (match && match[1] === cleanBase) {
          const version = parseInt(match[2], 10);
          const fullPath = path.join(dir, file);
          const stats = fs.statSync(fullPath);
          
          versions.push({
            version: `v${version}`,
            filename: fullPath,
            timestamp: stats.mtime.toISOString()
          });
        }
      }
    }
    
    // Sort by version number descending
    versions.sort((a, b) => {
      const aNum = parseInt(a.version.substring(1), 10);
      const bNum = parseInt(b.version.substring(1), 10);
      return bNum - aNum;
    });
    
    return versions;
  }
}
```

### Testing Steps
1. Test version number generation
2. Save multiple versions and verify naming
3. Load previous versions
4. Test changelog generation
5. Verify org-mode output format

### Common Pitfalls
- Handle first version (no previous files)
- Preserve all org-mode formatting
- Don't lose data during conversion
- Handle concurrent version creation

---

## T207: Implement error handling and recovery

### Goal
Provide graceful error handling and helpful messages for users.

### Implementation Steps

1. **Create error handling utilities**:
```typescript
// src/utils/error-handler.ts
export class OrgParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly section?: string,
    public readonly suggestion?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OrgParseError';
  }
  
  toUserMessage(): string {
    let msg = this.message;
    
    if (this.line) {
      msg = `Line ${this.line}: ${msg}`;
    }
    
    if (this.section) {
      msg = `[${this.section}] ${msg}`;
    }
    
    if (this.suggestion) {
      msg += `\n  💡 Suggestion: ${this.suggestion}`;
    }
    
    return msg;
  }
}

export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write',
    public readonly path: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export function handleParseError(error: unknown): ValidationError[] {
  if (error instanceof OrgParseError) {
    return [{
      type: 'parse_error',
      message: error.message,
      line: error.line,
      section: error.section,
      suggestion: error.suggestion
    }];
  }
  
  if (error instanceof Error) {
    return [{
      type: 'parse_error',
      message: error.message
    }];
  }
  
  return [{
    type: 'parse_error',
    message: 'An unknown error occurred while parsing the document'
  }];
}
```

2. **Update parser with error recovery**:
```typescript
export class OrgModeParser {
  // Add configuration for error handling
  private readonly config = {
    continueOnError: true,
    maxErrors: 10
  };
  
  parse(content: string): ParseResult {
    const errors: ValidationError[] = [];
    let document: Partial<OrgDocument> = {};
    
    try {
      const lines = content.split('\n');
      
      // Parse with error recovery
      try {
        document.metadata = this.parseMetadata(lines);
      } catch (error) {
        errors.push(...handleParseError(error));
        document.metadata = { title: 'Untitled' }; // Provide default
      }
      
      try {
        document.sections = this.parseSections(lines, errors);
      } catch (error) {
        errors.push(...handleParseError(error));
        document.sections = []; // Empty sections on failure
      }
      
      try {
        document.responses = this.extractResponses(document.sections || []);
      } catch (error) {
        errors.push(...handleParseError(error));
      }
      
      document.version = this.detectVersion(document.metadata || {}, content);
      document.raw = content;
      
      // If too many errors, fail completely
      if (errors.length > this.config.maxErrors) {
        return {
          success: false,
          errors: [
            ...errors.slice(0, this.config.maxErrors),
            {
              type: 'parse_error',
              message: `Too many errors (${errors.length}). Please fix the document structure.`
            }
          ]
        };
      }
      
      return {
        success: errors.length === 0,
        document: document as OrgDocument,
        errors
      };
      
    } catch (fatalError) {
      // Unrecoverable error
      return {
        success: false,
        errors: [{
          type: 'parse_error',
          message: 'Fatal error: ' + (fatalError instanceof Error ? fatalError.message : 'Unknown error'),
          suggestion: 'Please ensure the file is a valid org-mode document'
        }]
      };
    }
  }
  
  private parseSections(lines: string[], errors: ValidationError[]): OrgSection[] {
    const sections: OrgSection[] = [];
    const stack: { section: OrgSection; level: number }[] = [];
    let currentContent: string[] = [];
    let inPropertyDrawer = false;
    
    lines.forEach((line, index) => {
      try {
        // Property drawer handling
        if (line.match(this.PROPERTY_DRAWER_START)) {
          inPropertyDrawer = true;
          return;
        }
        if (line.match(this.PROPERTY_DRAWER_END)) {
          inPropertyDrawer = false;
          return;
        }
        
        const headingMatch = line.match(this.HEADING_REGEX);
        
        if (headingMatch && !inPropertyDrawer) {
          // Save previous content
          if (stack.length > 0 && currentContent.length > 0) {
            stack[stack.length - 1].section.content = currentContent.join('\n').trim();
          }
          currentContent = [];
          
          const [, stars, heading, tags] = headingMatch;
          const level = stars.length;
          
          // Validate heading level jump
          if (stack.length > 0 && level > stack[stack.length - 1].level + 1) {
            errors.push({
              type: 'invalid_format',
              message: `Heading level jumped from ${stack[stack.length - 1].level} to ${level}`,
              line: index + 1,
              suggestion: 'Use sequential heading levels (*, **, ***, etc.)'
            });
          }
          
          const tagList = tags ? this.parseTags(tags, index + 1, errors) : [];
          
          const section: OrgSection = {
            level,
            heading: heading.trim(),
            content: '',
            tags: tagList,
            children: [],
            lineNumber: index + 1,
            isResponse: tagList.includes('RESPONSE')
          };
          
          // Find parent
          while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
          }
          
          if (stack.length === 0) {
            sections.push(section);
          } else {
            stack[stack.length - 1].section.children.push(section);
          }
          
          stack.push({ section, level });
        } else if (!line.match(this.PROPERTY_REGEX)) {
          currentContent.push(line);
        }
      } catch (error) {
        errors.push({
          type: 'parse_error',
          message: `Error parsing line ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: index + 1
        });
      }
    });
    
    // Save final content
    if (stack.length > 0 && currentContent.length > 0) {
      stack[stack.length - 1].section.content = currentContent.join('\n').trim();
    }
    
    return sections;
  }
  
  private parseTags(tagString: string, line: number, errors: ValidationError[]): string[] {
    try {
      // Remove surrounding colons and split
      const tags = tagString.slice(1, -1).split(':').filter(t => t);
      
      // Validate tag format
      for (const tag of tags) {
        if (!/^[A-Za-z0-9_-]+$/.test(tag)) {
          errors.push({
            type: 'invalid_format',
            message: `Invalid tag format: ${tag}`,
            line,
            suggestion: 'Tags should only contain letters, numbers, hyphens, and underscores'
          });
        }
      }
      
      return tags;
    } catch (error) {
      errors.push({
        type: 'parse_error',
        message: 'Failed to parse tags',
        line
      });
      return [];
    }
  }
}
```

### Testing Steps
1. Test with malformed org files
2. Verify partial parsing works
3. Check error messages are helpful
4. Test error recovery scenarios
5. Ensure valid files still parse correctly

### Common Pitfalls
- Don't fail completely on minor errors
- Provide context in error messages
- Keep parsing even with some bad sections
- Don't lose user data on errors

---

## T208: Optimize parser performance

### Goal  
Ensure the parser can handle large documents efficiently.

### Implementation Steps

1. **Add performance monitoring**:
```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private timings: Map<string, number> = new Map();
  
  start(label: string): void {
    this.timings.set(label, Date.now());
  }
  
  end(label: string): number {
    const start = this.timings.get(label);
    if (!start) return 0;
    
    const duration = Date.now() - start;
    this.timings.delete(label);
    return duration;
  }
  
  measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      const duration = this.end(label);
      if (duration > 100) {
        console.warn(`${label} took ${duration}ms`);
      }
    }
  }
}
```

2. **Optimize parser implementation**:
```typescript
export class OrgModeParser {
  private readonly perf = new PerformanceMonitor();
  
  // Pre-compile regex patterns
  private static readonly PATTERNS = {
    heading: /^(\*+)\s+(.+?)(?:\s+(:.+:))?$/,
    property: /^#\+(\w+):\s*(.*)$/,
    listItem: /^[-*+]\s+(.+)/,
    numberedList: /^\d+\.\s+(.+)/
  };
  
  parse(content: string): ParseResult {
    return this.perf.measure('parse', () => {
      try {
        // Use more efficient string splitting
        const lines = this.splitIntoLines(content);
        
        const metadata = this.perf.measure('parseMetadata', 
          () => this.parseMetadata(lines)
        );
        
        const sections = this.perf.measure('parseSections',
          () => this.parseSectionsOptimized(lines)
        );
        
        const responses = this.perf.measure('extractResponses',
          () => this.extractResponses(sections)
        );
        
        const document: OrgDocument = {
          title: metadata.title || 'Untitled',
          metadata,
          sections,
          responses,
          version: this.detectVersion(metadata, content),
          raw: content
        };
        
        return { success: true, document };
      } catch (error) {
        return {
          success: false,
          errors: [{
            type: 'parse_error',
            message: error instanceof Error ? error.message : 'Unknown parsing error'
          }]
        };
      }
    });
  }
  
  private splitIntoLines(content: string): string[] {
    // Handle different line endings efficiently
    return content.split(/\r?\n/);
  }
  
  private parseSectionsOptimized(lines: string[]): OrgSection[] {
    const sections: OrgSection[] = [];
    const sectionMap = new Map<number, OrgSection>();
    let currentSection: OrgSection | null = null;
    let contentBuffer: string[] = [];
    
    // Single pass through lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(OrgModeParser.PATTERNS.heading);
      
      if (headingMatch) {
        // Process previous section's content
        if (currentSection && contentBuffer.length > 0) {
          currentSection.content = contentBuffer.join('\n').trim();
          contentBuffer = [];
        }
        
        const [, stars, heading, tags] = headingMatch;
        const level = stars.length;
        const tagList = tags ? tags.slice(1, -1).split(':').filter(t => t) : [];
        
        const section: OrgSection = {
          level,
          heading: heading.trim(),
          content: '',
          tags: tagList,
          children: [],
          lineNumber: i + 1,
          isResponse: tagList.includes('RESPONSE')
        };
        
        // Find parent using map for O(1) lookup
        let parent: OrgSection | null = null;
        for (let l = level - 1; l > 0; l--) {
          if (sectionMap.has(l)) {
            parent = sectionMap.get(l)!;
            break;
          }
        }
        
        if (parent) {
          parent.children.push(section);
        } else {
          sections.push(section);
        }
        
        // Update map
        sectionMap.set(level, section);
        // Clear deeper levels
        for (let l = level + 1; l <= 10; l++) {
          sectionMap.delete(l);
        }
        
        currentSection = section;
      } else if (currentSection && !line.match(OrgModeParser.PATTERNS.property)) {
        contentBuffer.push(line);
      }
    }
    
    // Process final section's content
    if (currentSection && contentBuffer.length > 0) {
      currentSection.content = contentBuffer.join('\n').trim();
    }
    
    return sections;
  }
  
  // Add caching for repeated operations
  private cache = new Map<string, any>();
  
  findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    const cacheKey = `find:${heading}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = this.findSectionRecursive(sections, heading.toLowerCase());
    this.cache.set(cacheKey, result);
    return result;
  }
  
  private findSectionRecursive(
    sections: OrgSection[], 
    headingLower: string
  ): OrgSection | undefined {
    for (const section of sections) {
      if (section.heading.toLowerCase() === headingLower) {
        return section;
      }
      const found = this.findSectionRecursive(section.children, headingLower);
      if (found) return found;
    }
    return undefined;
  }
}
```

### Testing Steps
1. Create large test files (1000+ lines)
2. Measure parsing time
3. Profile memory usage
4. Test with deeply nested structures
5. Verify optimization doesn't break functionality

### Common Pitfalls
- Premature optimization
- Breaking edge cases while optimizing
- Not measuring actual bottlenecks
- Over-caching causing memory issues

---

## T209: Write comprehensive unit tests

### Goal
Ensure all parser functionality is thoroughly tested.

### Implementation Steps

1. **Create test files**:
```typescript
// src/parsers/orgmode-parser.test.ts
import { OrgModeParser } from './orgmode-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('OrgModeParser', () => {
  let parser: OrgModeParser;
  
  beforeEach(() => {
    parser = new OrgModeParser();
  });
  
  describe('Basic parsing', () => {
    it('should parse simple org document', () => {
      const content = `#+TITLE: Test Document
#+AUTHOR: Test Author

* Section 1
Some content here.

** Subsection 1.1
More content.

* Section 2                                                          :TAG1:TAG2:
Content with tags.`;
      
      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.title).toBe('Test Document');
      expect(result.document!.metadata.author).toBe('Test Author');
      expect(result.document!.sections).toHaveLength(2);
      expect(result.document!.sections[0].heading).toBe('Section 1');
      expect(result.document!.sections[0].children).toHaveLength(1);
      expect(result.document!.sections[1].tags).toEqual(['TAG1', 'TAG2']);
    });
    
    it('should handle empty document', () => {
      const result = parser.parse('');
      expect(result.success).toBe(true);
      expect(result.document!.sections).toHaveLength(0);
    });
    
    it('should parse ideaforge template', () => {
      const templatePath = join(__dirname, '../../ideaforge-template.org');
      const content = readFileSync(templatePath, 'utf-8');
      
      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      expect(result.document!.sections.length).toBeGreaterThan(0);
      
      // Check required sections exist
      const sectionHeadings = result.document!.sections.map(s => s.heading);
      expect(sectionHeadings).toContain('Project Overview');
      expect(sectionHeadings).toContain('User Stories');
      expect(sectionHeadings).toContain('Requirements');
      expect(sectionHeadings).toContain('Brainstorming');
    });
  });
  
  describe('Data extraction', () => {
    it('should extract user stories', () => {
      const content = `* User Stories
** As a developer
   I want to parse org files
   So that I can extract structured data
   
** As a user, I want to validate templates so that errors are caught early`;
      
      const result = parser.parse(content);
      const stories = parser.extractUserStories(result.document!);
      
      expect(stories).toHaveLength(2);
      expect(stories[0]).toEqual({
        role: 'developer',
        action: 'parse org files',
        benefit: 'I can extract structured data',
        rawText: expect.any(String)
      });
    });
    
    it('should extract requirements with MoSCoW tags', () => {
      const content = `* Requirements
** Functional Requirements
*** MUST Parse org-mode files                                          :MUST:
    The system must be able to parse standard org-mode syntax.
    
*** SHOULD Support custom tags                                       :SHOULD:
    Support for user-defined tags would be nice.

** Technical Requirements  
*** MUST Use TypeScript                                                :MUST:
    The parser must be written in TypeScript.`;
      
      const result = parser.parse(content);
      const requirements = parser.extractRequirements(result.document!);
      
      expect(requirements).toHaveLength(3);
      expect(requirements[0].id).toBe('F1');
      expect(requirements[0].text).toBe('Parse org-mode files');
      expect(requirements[0].moscowType.type).toBe('MUST');
      expect(requirements[0].category).toBe('functional');
      
      expect(requirements[2].id).toBe('T1');
      expect(requirements[2].category).toBe('technical');
    });
  });
  
  describe('Response handling', () => {
    it('should identify response sections', () => {
      const content = `* Requirements
** MUST Have feature X                                                :MUST:

* Re: Requirements                                               :RESPONSE:
I think feature X should be split into two parts.

* About User Stories                                             :RESPONSE:
We need more detail on the admin user stories.`;
      
      const result = parser.parse(content);
      
      expect(result.document!.responses).toHaveLength(2);
      expect(result.document!.responses![0].targetSection).toBe('Requirements');
      expect(result.document!.responses![1].targetSection).toBe('User Stories');
    });
  });
  
  describe('Error handling', () => {
    it('should report helpful errors for invalid structure', () => {
      const content = `#+TITLE: Test
* Level 1
*** Level 3 (skipped level 2!)
Content`;
      
      const result = parser.parse(content);
      
      expect(result.success).toBe(true); // Parser continues
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].type).toBe('invalid_format');
      expect(result.errors![0].line).toBe(3);
    });
    
    it('should handle malformed tags gracefully', () => {
      const content = `* Section :INVALID TAG:OTHER:
Content`;
      
      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toContain('Invalid tag format');
    });
  });
  
  describe('Performance', () => {
    it('should parse large documents quickly', () => {
      // Generate large document
      const sections = [];
      for (let i = 0; i < 100; i++) {
        sections.push(`* Section ${i}
Content for section ${i}.

** Subsection ${i}.1
More content.

** Subsection ${i}.2
Even more content.
`);
      }
      
      const content = '#+TITLE: Large Document\n\n' + sections.join('\n');
      
      const start = Date.now();
      const result = parser.parse(content);
      const duration = Date.now() - start;
      
      expect(result.success).toBe(true);
      expect(result.document!.sections).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should parse in under 100ms
    });
  });
});
```

2. **Create validator tests**:
```typescript
// src/parsers/orgmode-validator.test.ts
import { OrgModeValidator } from './orgmode-validator';
import { OrgModeParser } from './orgmode-parser';

describe('OrgModeValidator', () => {
  let validator: OrgModeValidator;
  let parser: OrgModeParser;
  
  beforeEach(() => {
    validator = new OrgModeValidator();
    parser = new OrgModeParser();
  });
  
  it('should validate correct template structure', () => {
    const content = `#+TITLE: Valid Project
    
* Project Overview
Description here.

* User Stories
** As a user
   I want features.

* Requirements
** Functional Requirements
*** MUST Have this                                                    :MUST:
** Technical Requirements
*** SHOULD Use this tech                                           :SHOULD:

* Technology Choices
Some choices.

* Brainstorming
** Core Features
** Architecture Considerations  
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;
    
    const parseResult = parser.parse(content);
    const validation = validator.validate(parseResult.document!);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
  
  it('should detect missing required sections', () => {
    const content = `#+TITLE: Incomplete Project
    
* Project Overview
* User Stories`;
    
    const parseResult = parser.parse(content);
    const validation = validator.validate(parseResult.document!);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors.some(e => e.section === 'Requirements')).toBe(true);
    expect(validation.errors.some(e => e.section === 'Brainstorming')).toBe(true);
  });
  
  it('should check for MoSCoW tags on requirements', () => {
    const content = `#+TITLE: Test
    
* Requirements
** Functional Requirements
*** Have this feature (missing tag!)
    Description.`;
    
    const parseResult = parser.parse(content);
    const validation = validator.validate(parseResult.document!);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => 
      e.message.includes('missing MoSCoW tag')
    )).toBe(true);
  });
});
```

### Testing Steps
1. Run all tests with coverage
2. Aim for 90%+ coverage
3. Test edge cases and error paths
4. Mock file system operations
5. Test with real-world examples

### Common Pitfalls
- Testing implementation details
- Not testing error cases
- Brittle tests that break with refactoring
- Not testing integration between modules

---

## T210: Create integration tests

### Goal
Test the complete parsing system working together.

### Implementation Steps

1. **Create integration tests**:
```typescript
// tests/integration/parser-integration.test.ts
import { OrgModeParser } from '../../src/parsers/orgmode-parser';
import { OrgModeValidator } from '../../src/parsers/orgmode-validator';
import { VersionManager } from '../../src/services/version-manager';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Parser Integration', () => {
  const testDir = join(__dirname, 'test-output');
  let parser: OrgModeParser;
  let validator: OrgModeValidator;
  let versionManager: VersionManager;
  
  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });
  
  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });
  
  beforeEach(() => {
    parser = new OrgModeParser();
    validator = new OrgModeValidator();
    versionManager = new VersionManager();
  });
  
  it('should handle complete workflow: parse → validate → extract → version', () => {
    // 1. Parse template
    const templatePath = join(__dirname, '../../ideaforge-template.org');
    const content = readFileSync(templatePath, 'utf-8');
    
    const parseResult = parser.parse(content);
    expect(parseResult.success).toBe(true);
    
    // 2. Validate structure
    const validation = validator.validate(parseResult.document!);
    expect(validation.isValid).toBe(false); // Template has placeholders
    
    // 3. Extract data
    const stories = parser.extractUserStories(parseResult.document!);
    const requirements = parser.extractRequirements(parseResult.document!);
    const ideas = parser.extractBrainstormIdeas(parseResult.document!);
    
    expect(stories.length).toBeGreaterThan(0);
    expect(requirements.length).toBeGreaterThan(0);
    expect(ideas.length).toBeGreaterThan(0);
    
    // 4. Save versioned
    const outputPath = join(testDir, 'project.org');
    const savedPath = versionManager.saveVersionedDocument(
      parseResult.document!,
      outputPath,
      ['Initial import']
    );
    
    expect(savedPath).toContain('-v1.org');
    
    // 5. Load and verify
    const loaded = versionManager.loadVersion(savedPath);
    expect(loaded).toBeDefined();
    expect(loaded!.version).toBe('v1');
    expect(loaded!.changelog).toHaveLength(1);
  });
  
  it('should handle refinement workflow with responses', () => {
    // Create initial document
    const doc1 = `#+TITLE: Test Project
    
* Requirements
** Functional Requirements
*** MUST Have feature A                                               :MUST:
    Description of feature A.
    
* User Stories
** As a user
   I want to use the system.`;
    
    // Parse and save v1
    const result1 = parser.parse(doc1);
    const path1 = versionManager.saveVersionedDocument(
      result1.document!,
      join(testDir, 'refine.org')
    );
    
    // Create v2 with responses
    const doc2 = `#+TITLE: Test Project
    
* Requirements
** Functional Requirements
*** MUST Have feature A                                               :MUST:
    Description of feature A.
    
* Re: Requirements                                               :RESPONSE:
Feature A should be split into A1 and A2 for better modularity.

* User Stories  
** As a user
   I want to use the system.
   
* About User Stories                                             :RESPONSE:
Need more specific user stories for admin users.`;
    
    // Parse v2
    const result2 = parser.parse(doc2);
    expect(result2.document!.responses).toHaveLength(2);
    
    // Save v2
    const path2 = versionManager.saveVersionedDocument(
      result2.document!,
      join(testDir, 'refine.org'),
      ['Added feedback via :RESPONSE: tags']
    );
    
    expect(path2).toContain('-v2.org');
    
    // List versions
    const versions = versionManager.listVersions(join(testDir, 'refine.org'));
    expect(versions).toHaveLength(2);
    expect(versions[0].version).toBe('v2'); // Most recent first
    expect(versions[1].version).toBe('v1');
  });
  
  it('should handle error recovery in parsing workflow', () => {
    const badDoc = `#+TITLE: Broken Document
    
* Requirements
*** MUST Skipped a level!                                             :MUST:

* User Stories
** As a user
   I want 

* Invalid :TAG WITH SPACES:
Content here.`;
    
    const result = parser.parse(badDoc);
    
    // Should still parse with errors
    expect(result.success).toBe(true);
    expect(result.document).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    
    // Should still extract what it can
    const requirements = parser.extractRequirements(result.document!);
    expect(requirements.length).toBeGreaterThan(0);
    
    // Validator should catch issues
    const validation = validator.validate(result.document!);
    expect(validation.isValid).toBe(false);
  });
});
```

### Testing Steps
1. Test complete workflows end-to-end
2. Test file I/O operations
3. Test version management flows
4. Test error scenarios
5. Clean up test files after

### Common Pitfalls
- Not cleaning up test files
- Tests depending on file system state
- Not testing actual integration points
- Missing cross-platform issues

---

## Summary

This completes the detailed implementation guide for Parent Task 2.0. Each subtask builds upon the previous ones to create a robust org-mode parsing system. Key points to remember:

1. Start with T201 (types) as the foundation
2. Build incrementally - basic parsing before advanced features
3. Test thoroughly at each step
4. Handle errors gracefully
5. Optimize only after functionality is complete
6. Document as you go

The parser will be the foundation for all other IdeaForge features, so taking time to build it properly is essential. 