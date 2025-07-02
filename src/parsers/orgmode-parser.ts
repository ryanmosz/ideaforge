/**
 * Core org-mode parser implementation for IdeaForge.
 * Parses org-mode documents into structured data.
 */

import {
  OrgDocument,
  OrgSection,
  ParseResult,
  ParseOptions,
  ParserConfig,
  ValidationError,
  ResponseSection
} from './orgmode-types';
import { DocumentMetadata, ChangelogEntry } from '../models/document-types';

/**
 * Main org-mode parser class
 */
export class OrgModeParser {
  /** Regex patterns for org-mode syntax */
  private readonly HEADING_REGEX = /^(\*+)\s+(.+?)(?:\s+(:.+:))?$/;
  private readonly PROPERTY_REGEX = /^#\+(\w+):\s*(.*)$/;
  private readonly PROPERTY_DRAWER_START = /^:PROPERTIES:$/;
  private readonly PROPERTY_DRAWER_END = /^:END:$/;

  /** Default parser configuration */
  private readonly config: ParserConfig = {
    continueOnError: true,
    maxErrors: 10,
    validateStructure: true,
    extractMetadata: true
  };

  /**
   * Parse an org-mode document into structured data
   * @param content - Raw org-mode file content
   * @param options - Optional parsing configuration
   * @returns ParseResult with document or errors
   */
  parse(content: string, options?: ParseOptions): ParseResult {
    const errors: ValidationError[] = [];
    
    try {
      const lines = this.normalizeLineEndings(content).split('\n');
      
      // Parse metadata from header
      const metadata = this.parseMetadata(lines, errors);
      
      // Parse sections hierarchically
      const sections = this.parseSections(lines, errors);
      
      // Extract responses if requested
      const responses = options?.extractResponses 
        ? this.extractResponses(sections) 
        : undefined;
      
      // Detect version
      const version = this.detectVersion(metadata, content);
      
      // Extract changelog if present
      const changelog = this.extractChangelog(sections);
      
      // Create document
      const document: OrgDocument = {
        title: metadata.title || 'Untitled',
        metadata,
        sections,
        version,
        changelog,
        raw: options?.includeRaw !== false ? content : '',
        responses
      };
      
      // Check error threshold
      if (!this.config.continueOnError && errors.length > 0) {
        return { success: false, errors };
      }
      
      if (errors.length > this.config.maxErrors) {
        errors.push({
          type: 'parse_error',
          message: `Too many errors (${errors.length}). Parsing stopped.`,
          suggestion: 'Fix the document structure and try again'
        });
        return { success: false, errors: errors.slice(0, this.config.maxErrors + 1) };
      }
      
      return { 
        success: errors.length === 0, 
        document,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'parse_error',
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          suggestion: 'Ensure the file is a valid org-mode document'
        }]
      };
    }
  }

  /**
   * Normalize line endings to Unix style
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Parse metadata from document header
   */
  private parseMetadata(lines: string[], errors: ValidationError[]): DocumentMetadata {
    const metadata: DocumentMetadata = { title: '' };
    let lineIndex = 0;
    
    // Skip empty lines at start
    while (lineIndex < lines.length && lines[lineIndex].trim() === '') {
      lineIndex++;
    }
    
    // Parse properties until we hit content or heading
    while (lineIndex < lines.length) {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      // Stop at first heading or non-empty non-property line
      if (trimmed.startsWith('*') || (trimmed && !trimmed.startsWith('#+'))) {
        break;
      }
      
      const propertyMatch = line.match(this.PROPERTY_REGEX);
      if (propertyMatch) {
        const [, key, value] = propertyMatch;
        const normalizedKey = key.toLowerCase();
        metadata[normalizedKey] = value.trim();
      }
      
      lineIndex++;
    }
    
    // Validate required metadata
    if (!metadata.title) {
      errors.push({
        type: 'missing_section',
        message: 'Document missing #+TITLE property',
        line: 1,
        suggestion: 'Add "#+TITLE: Your Project Name" at the top of the file'
      });
    }
    
    return metadata;
  }

  /**
   * Parse document sections hierarchically
   */
  private parseSections(lines: string[], errors: ValidationError[]): OrgSection[] {
    const sections: OrgSection[] = [];
    const sectionStack: { section: OrgSection; level: number }[] = [];
    let currentContent: string[] = [];
    let inPropertyDrawer = false;
    let currentProperties: Record<string, string> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Handle property drawers
      if (trimmed.match(this.PROPERTY_DRAWER_START)) {
        inPropertyDrawer = true;
        currentProperties = {};
        continue;
      }
      
      if (trimmed.match(this.PROPERTY_DRAWER_END)) {
        inPropertyDrawer = false;
        if (sectionStack.length > 0) {
          sectionStack[sectionStack.length - 1].section.properties = { ...currentProperties };
        }
        currentProperties = {};
        continue;
      }
      
      if (inPropertyDrawer) {
        const propMatch = trimmed.match(/^:(\w+):\s*(.*)$/);
        if (propMatch) {
          currentProperties[propMatch[1]] = propMatch[2];
        }
        continue;
      }
      
      // Check for heading
      const headingMatch = line.match(this.HEADING_REGEX);
      
      if (headingMatch) {
        // Save content to previous section
        if (sectionStack.length > 0 && currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          sectionStack[sectionStack.length - 1].section.content = content;
        }
        currentContent = [];
        
        const [, stars, headingText, tagString] = headingMatch;
        const level = stars.length;
        
        // Validate heading level jump
        if (sectionStack.length > 0) {
          const parentLevel = sectionStack[sectionStack.length - 1].level;
          if (level > parentLevel + 1) {
            errors.push({
              type: 'invalid_structure',
              message: `Heading level jumped from ${parentLevel} to ${level}`,
              line: i + 1,
              suggestion: 'Use sequential heading levels (*, **, ***, etc.)'
            });
          }
        }
        
        // Parse tags
        const tags = tagString ? this.parseTags(tagString, i + 1, errors) : [];
        
        // Create section
        const section: OrgSection = {
          level,
          heading: headingText.trim(),
          content: '',
          tags,
          children: [],
          lineNumber: i + 1,
          isResponse: tags.includes('RESPONSE')
        };
        
        // Find parent section
        while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].level >= level) {
          sectionStack.pop();
        }
        
        // Add to parent or root
        if (sectionStack.length === 0) {
          sections.push(section);
        } else {
          sectionStack[sectionStack.length - 1].section.children.push(section);
        }
        
        // Add to stack
        sectionStack.push({ section, level });
        
      } else if (!line.match(this.PROPERTY_REGEX)) {
        // Collect content (skip property lines in header)
        currentContent.push(line);
      }
    }
    
    // Save final content
    if (sectionStack.length > 0 && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      sectionStack[sectionStack.length - 1].section.content = content;
    }
    
    return sections;
  }

  /**
   * Parse org-mode tags from tag string
   */
  private parseTags(tagString: string, line: number, errors: ValidationError[]): string[] {
    try {
      // Remove surrounding colons and split
      const tags = tagString.slice(1, -1).split(':').filter(t => t);
      
      // Validate each tag
      for (const tag of tags) {
        if (!/^[A-Za-z0-9_-]+$/.test(tag)) {
          errors.push({
            type: 'invalid_format',
            message: `Invalid tag format: "${tag}"`,
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

  /**
   * Extract response sections marked with :RESPONSE: tag
   */
  private extractResponses(sections: OrgSection[]): ResponseSection[] {
    const responses: ResponseSection[] = [];
    
    const collectResponses = (sectionList: OrgSection[], parentPath: string = '') => {
      for (const section of sectionList) {
        if (section.isResponse && section.tags.includes('RESPONSE')) {
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

  /**
   * Infer which section a response is targeting
   */
  private inferTargetSection(response: OrgSection, parentPath: string): string {
    // Patterns for identifying target
    const patterns = [
      /^Re:\s*(.+)/i,
      /^About\s+(.+)/i,
      /^Regarding\s+(.+)/i,
      /^For\s+(.+)/i,
      /^Response to\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = response.heading.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Default to parent section path
    return parentPath || 'General';
  }

  /**
   * Detect document version from metadata or changelog
   */
  private detectVersion(metadata: DocumentMetadata, content: string): string {
    // Check metadata first
    if (metadata.version) {
      return metadata.version;
    }
    
    // Look for version in changelog
    const changelogMatch = content.match(/\*+\s+Changelog.*?\n.*?-\s*v(\d+)/is);
    if (changelogMatch) {
      return `v${changelogMatch[1]}`;
    }
    
    // Default to v1
    return 'v1';
  }

  /**
   * Extract changelog entries from document
   */
  private extractChangelog(sections: OrgSection[]): ChangelogEntry[] | undefined {
    const changelogSection = this.findSectionByTag(sections, 'CHANGELOG');
    if (!changelogSection) {
      return undefined;
    }
    
    const entries: ChangelogEntry[] = [];
    const lines = changelogSection.content.split('\n');
    
    let currentEntry: ChangelogEntry | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Match version line (e.g., "- v1: Initial document" or "- v2 (2024-01-01):")
      const versionMatch = trimmed.match(/^-\s*v(\d+)(?:\s*\(([^)]+)\))?:?\s*(.*)$/);
      if (versionMatch) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        
        currentEntry = {
          version: `v${versionMatch[1]}`,
          date: versionMatch[2] || new Date().toISOString().split('T')[0],
          changes: versionMatch[3] ? [versionMatch[3]] : []
        };
      } else if (currentEntry && trimmed.startsWith('- ')) {
        // Sub-item under version
        currentEntry.changes.push(trimmed.substring(2).trim());
      }
    }
    
    if (currentEntry) {
      entries.push(currentEntry);
    }
    
    return entries.length > 0 ? entries : undefined;
  }

  /**
   * Find a section by tag
   */
  private findSectionByTag(sections: OrgSection[], tag: string): OrgSection | undefined {
    for (const section of sections) {
      if (section.tags.includes(tag)) {
        return section;
      }
      
      const found = this.findSectionByTag(section.children, tag);
      if (found) {
        return found;
      }
    }
    
    return undefined;
  }

  /**
   * Find a section by heading (case-insensitive)
   */
  findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    const lowerHeading = heading.toLowerCase();
    
    for (const section of sections) {
      if (section.heading.toLowerCase() === lowerHeading) {
        return section;
      }
      
      const found = this.findSection(section.children, heading);
      if (found) {
        return found;
      }
    }
    
    return undefined;
  }
} 