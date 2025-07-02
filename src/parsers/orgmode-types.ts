/**
 * Parser-specific types for org-mode document parsing.
 * These types represent the intermediate structures used during parsing.
 */

import { DocumentMetadata, ChangelogEntry } from '../models/document-types';

/**
 * Represents a section in an org-mode document with full context
 */
export interface OrgSection {
  /** Section level (1 = *, 2 = **, etc.) */
  level: number;
  
  /** Section heading text */
  heading: string;
  
  /** Section content (everything after heading until next section) */
  content: string;
  
  /** Tags attached to this section */
  tags: string[];
  
  /** Child sections */
  children: OrgSection[];
  
  /** Line number where this section starts */
  lineNumber?: number;
  
  /** Whether this section has :RESPONSE: tag */
  isResponse?: boolean;
  
  /** Properties defined in :PROPERTIES: drawer */
  properties?: Record<string, string>;
}

/**
 * Represents a response section marked with :RESPONSE: tag
 */
export interface ResponseSection extends OrgSection {
  /** Always true for response sections */
  isResponse: true;
  
  /** Which section this response targets */
  targetSection?: string;
  
  /** The response content */
  responseContent: string;
}

/**
 * Complete parsed org-mode document
 */
export interface OrgDocument {
  /** Document title from #+TITLE: */
  title: string;
  
  /** All metadata from document header */
  metadata: DocumentMetadata;
  
  /** Hierarchical section structure */
  sections: OrgSection[];
  
  /** Document version (from metadata or changelog) */
  version?: string;
  
  /** Changelog entries if present */
  changelog?: ChangelogEntry[];
  
  /** Original raw content */
  raw: string;
  
  /** Collected response sections */
  responses?: ResponseSection[];
}

/**
 * Result of parsing an org-mode document
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed document if successful */
  document?: OrgDocument;
  /** Validation errors encountered */
  errors?: ValidationError[];
  /** Warnings that don't prevent parsing */
  warnings?: ValidationWarning[];
}

/**
 * Validation error that prevents or complicates parsing
 */
export interface ValidationError {
  /** Type of error */
  type: 'missing_section' | 'invalid_format' | 'parse_error' | 'invalid_structure';
  /** Human-readable error message */
  message: string;
  /** Line number where error occurred */
  line?: number;
  /** Section path where error occurred */
  section?: string;
  /** Suggested fix for the error */
  suggestion?: string;
  /** Error code for programmatic handling */
  code?: string;
}

/**
 * Non-critical validation warning
 */
export interface ValidationWarning {
  /** Type of warning */
  type: 'deprecated_syntax' | 'missing_optional' | 'style_issue';
  /** Human-readable warning message */
  message: string;
  /** Line number where warning occurred */
  line?: number;
  /** Section path where warning occurred */
  section?: string;
}

/**
 * Result of template validation
 */
export interface ValidationResult {
  /** Whether the document is valid according to template rules */
  isValid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
  /** List of validation warnings */
  warnings?: ValidationWarning[];
  /** Overall validation score (0-100) */
  score?: number;
}

/**
 * Options for parsing org-mode documents
 */
export interface ParseOptions {
  /** Whether to validate against template structure */
  validateTemplate?: boolean;
  /** Whether to extract responses */
  extractResponses?: boolean;
  /** Whether to continue parsing on non-fatal errors */
  continueOnError?: boolean;
  /** Maximum number of errors before stopping */
  maxErrors?: number;
  /** Whether to include raw content in result */
  includeRaw?: boolean;
}

/**
 * Version information for a document
 */
export interface VersionInfo {
  /** Version string (e.g., "v1", "v2") */
  version: string;
  /** Full filename with version */
  filename: string;
  /** Timestamp of this version */
  timestamp: string;
  /** Changes in this version */
  changes?: string[];
  /** Previous version reference */
  previousVersion?: string;
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  /** Whether to continue parsing on errors */
  continueOnError: boolean;
  /** Maximum errors before stopping */
  maxErrors: number;
  /** Whether to validate structure */
  validateStructure: boolean;
  /** Whether to extract metadata */
  extractMetadata: boolean;
  /** Custom section patterns to recognize */
  customSections?: string[];
} 