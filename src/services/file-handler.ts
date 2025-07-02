import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, extname, basename, join } from 'path';
import { ParsedDocumentData, ExportFormat, ExportResult } from '../models/document-types';
import { OrgModeParser } from '../parsers/orgmode-parser';
import { DataExtractor } from '../parsers/data-extractor';
import { FileOperationError } from '../utils/error-handler';

export interface FileHandlerOptions {
  createDirectories?: boolean;
  encoding?: BufferEncoding;
  preserveBackup?: boolean;
}

export class FileHandler {
  private parser: OrgModeParser;
  private extractor: DataExtractor;
  
  constructor() {
    this.parser = new OrgModeParser();
    this.extractor = new DataExtractor();
  }
  
  /**
   * Reads an org-mode file from disk and parses it
   * @param filePath Path to the org file
   * @param options File reading options
   * @returns Parsed document data
   */
  readOrgFile(filePath: string, options: FileHandlerOptions = {}): ParsedDocumentData {
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        throw new FileOperationError(
          `File not found: ${filePath}`,
          'read',
          filePath
        );
      }
      
      // Read file content
      const content = readFileSync(filePath, options.encoding || 'utf-8');
      
      // Parse the content
      const parseResult = this.parser.parse(content);
      
      if (!parseResult.success || !parseResult.document) {
        const errorMessages = parseResult.errors?.map(e => e.message).join('; ') || 'Unknown parse error';
        throw new FileOperationError(
          `Failed to parse org file: ${errorMessages}`,
          'read',
          filePath
        );
      }
      
      // Extract structured data
      const extractedData = this.extractor.extractData(parseResult.document);
      
      return extractedData;
    } catch (error) {
      if (error instanceof FileOperationError) {
        throw error;
      }
      
      throw new FileOperationError(
        `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'read',
        filePath
      );
    }
  }
  
  /**
   * Writes document data to a file in the specified format
   * @param data Document data to write
   * @param filePath Output file path
   * @param format Export format ('orgmode' or 'cursor')
   * @param options File writing options
   * @returns Export result with file path and statistics
   */
  writeDocument(
    data: ParsedDocumentData,
    filePath: string,
    format: ExportFormat,
    options: FileHandlerOptions = {}
  ): ExportResult {
    try {
      // Create directory if needed
      if (options.createDirectories) {
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }
      
      // Backup existing file if requested
      if (options.preserveBackup && existsSync(filePath)) {
        const backupPath = this.generateBackupPath(filePath);
        const existingContent = readFileSync(filePath, 'utf-8');
        writeFileSync(backupPath, existingContent, 'utf-8');
      }
      
      // Generate content based on format
      let content: string;
      let statistics: Record<string, number>;
      
      switch (format) {
        case 'orgmode':
          const orgResult = this.generateOrgMode(data);
          content = orgResult.content;
          statistics = orgResult.statistics;
          break;
          
        case 'cursor':
          const cursorResult = this.generateCursorMarkdown(data);
          content = cursorResult.content;
          statistics = cursorResult.statistics;
          break;
          
        default:
          throw new FileOperationError(
            `Unsupported export format: ${format}`,
            'write',
            filePath
          );
      }
      
      // Write file
      writeFileSync(filePath, content, options.encoding || 'utf-8');
      
      return {
        success: true,
        filePath,
        format,
        statistics
      };
    } catch (error) {
      if (error instanceof FileOperationError) {
        throw error;
      }
      
      throw new FileOperationError(
        `Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'write',
        filePath
      );
    }
  }
  
  /**
   * Generates org-mode content from parsed data
   */
  private generateOrgMode(data: ParsedDocumentData): { content: string; statistics: Record<string, number> } {
    const lines: string[] = [];
    let sectionCount = 0;
    let wordCount = 0;
    
    // Add metadata
    if (data.metadata.title) {
      lines.push(`#+TITLE: ${data.metadata.title}`);
    }
    if (data.metadata.author) {
      lines.push(`#+AUTHOR: ${data.metadata.author}`);
    }
    if (data.metadata.date) {
      lines.push(`#+DATE: ${data.metadata.date}`);
    }
    if (data.metadata.startup) {
      lines.push(`#+STARTUP: ${data.metadata.startup}`);
    }
    
    lines.push(''); // Empty line after metadata
    
    // Add changelog if present
    if (data.changelog && data.changelog.length > 0) {
      lines.push('* Changelog                                                    :CHANGELOG:');
      data.changelog.forEach(entry => {
        lines.push(`** ${entry.version} - ${entry.date}`);
        entry.changes.forEach(change => {
          lines.push(`   - ${change}`);
        });
      });
      lines.push('');
      sectionCount++;
    }
    
    // Add project overview
    lines.push('* Project Overview');
    lines.push(data.projectOverview || '[Project description needed]');
    lines.push('');
    sectionCount++;
    
    // Add user stories
    if (data.userStories && data.userStories.length > 0) {
      lines.push('* User Stories');
      data.userStories.forEach(story => {
        lines.push(`** As a ${story.role}`);
        lines.push(`   I want ${story.action}`);
        lines.push(`   So that ${story.benefit}`);
        lines.push('');
      });
      sectionCount++;
    }
    
    // Add requirements
    if (data.requirements && data.requirements.length > 0) {
      lines.push('* Requirements');
      
      // Group by category
      const functional = data.requirements.filter(r => r.category === 'functional');
      const technical = data.requirements.filter(r => r.category === 'technical');
      
      if (functional.length > 0) {
        lines.push('** Functional Requirements');
        functional.forEach(req => {
          const tags = `:${req.moscowType.type}:`;
          lines.push(`*** ${req.text}${' '.repeat(Math.max(1, 70 - req.text.length))}${tags}`);
          if (req.description) {
            lines.push(`    ${req.description}`);
          }
          lines.push('');
        });
      }
      
      if (technical.length > 0) {
        lines.push('** Technical Requirements');
        technical.forEach(req => {
          const tags = `:${req.moscowType.type}:`;
          lines.push(`*** ${req.text}${' '.repeat(Math.max(1, 70 - req.text.length))}${tags}`);
          if (req.description) {
            lines.push(`    ${req.description}`);
          }
          lines.push('');
        });
      }
      sectionCount++;
    }
    
    // Add brainstorming
    if (data.brainstormIdeas && data.brainstormIdeas.length > 0) {
      lines.push('* Brainstorming');
      
      // Group by category
      const categories = new Map<string, typeof data.brainstormIdeas>();
      data.brainstormIdeas.forEach(idea => {
        const existing = categories.get(idea.category) || [];
        existing.push(idea);
        categories.set(idea.category, existing);
      });
      
      categories.forEach((ideas, category) => {
        lines.push(`** ${category}`);
        ideas.forEach(idea => {
          lines.push(`   - ${idea.text}`);
        });
        lines.push('');
      });
      sectionCount++;
    }
    
    // Calculate word count
    const content = lines.join('\n');
    wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      content,
      statistics: {
        sections: sectionCount,
        userStories: data.userStories?.length || 0,
        requirements: data.requirements?.length || 0,
        brainstormingIdeas: data.brainstormIdeas?.length || 0,
        words: wordCount
      }
    };
  }
  
  /**
   * Generates Cursor-optimized markdown from parsed data
   */
  private generateCursorMarkdown(data: ParsedDocumentData): { content: string; statistics: Record<string, number> } {
    const lines: string[] = [];
    let taskCount = 0;
    
    // Add header
    lines.push(`# ${data.metadata.title || 'Project Tasks'}`);
    lines.push('');
    lines.push('## Project Overview');
    lines.push(data.projectOverview || '[Project description needed]');
    lines.push('');
    
    // Convert user stories to tasks
    if (data.userStories && data.userStories.length > 0) {
      lines.push('## User Story Tasks');
      lines.push('');
      data.userStories.forEach((story, index) => {
        lines.push(`### Task US${index + 1}: ${story.role} - ${story.action}`);
        lines.push(`**Goal**: ${story.benefit}`);
        lines.push('**Implementation**: [Define implementation steps]');
        lines.push('');
        taskCount++;
      });
    }
    
    // Convert requirements to implementation tasks
    if (data.requirements && data.requirements.length > 0) {
      lines.push('## Requirement Implementation Tasks');
      lines.push('');
      
      data.requirements.forEach(req => {
        if (req.moscowType.type === 'MUST' || req.moscowType.type === 'SHOULD') {
          lines.push(`### Task ${req.id}: ${req.text}`);
          lines.push(`**Priority**: ${req.moscowType.type}`);
          lines.push(`**Type**: ${req.category}`);
          if (req.description) {
            lines.push(`**Description**: ${req.description}`);
          }
          lines.push('**Implementation Steps**:');
          lines.push('1. [Step 1]');
          lines.push('2. [Step 2]');
          lines.push('3. [Step 3]');
          lines.push('');
          taskCount++;
        }
      });
    }
    
    // Add implementation notes from brainstorming
    if (data.brainstormIdeas && data.brainstormIdeas.length > 0) {
      lines.push('## Implementation Notes');
      lines.push('');
      
      const architectureIdeas = data.brainstormIdeas.filter(
        idea => idea.category.toLowerCase().includes('architecture')
      );
      
      if (architectureIdeas.length > 0) {
        lines.push('### Architecture Considerations');
        architectureIdeas.forEach(idea => {
          lines.push(`- ${idea.text}`);
        });
        lines.push('');
      }
    }
    
    const content = lines.join('\n');
    
    return {
      content,
      statistics: {
        totalTasks: taskCount,
        userStoryTasks: data.userStories?.length || 0,
        requirementTasks: data.requirements?.filter(
          r => r.moscowType.type === 'MUST' || r.moscowType.type === 'SHOULD'
        ).length || 0
      }
    };
  }
  
  /**
   * Generates a backup file path
   */
  private generateBackupPath(filePath: string): string {
    const ext = extname(filePath);
    const base = basename(filePath, ext);
    const dir = dirname(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return join(dir, `${base}.backup-${timestamp}${ext}`);
  }
} 