/**
 * Parser-specific types for org-mode document parsing.
 * These types represent the intermediate structures used during parsing.
 */

import { DocumentMetadata, ChangelogEntry } from '../models/document-types';

/**
 * Represents a hierarchical section in an org-mode document
 */
export interface OrgSection {
  /** Heading level (1 = *, 2 = **, etc.) */
  level: number;
  /** Section heading text (without stars and tags) */
  heading: string;
  /** Content under this heading (before any subsections) */
  content: string;
  /** Org-mode tags (e.g., :MUST:, :RESPONSE:, :CHANGELOG:) */
  tags: string[];
  /** Child sections */
  children: OrgSection[];
  /** Org-mode properties drawer content */
  properties?: Record<string, string>;
  /** Line number where this section starts (for error reporting) */
  lineNumber: number;
  /** Whether this section has the :RESPONSE: tag */
  isResponse?: boolean;
}

/**
 * Main org-mode document structure
 */
export interface OrgDocument {
  /** Document title (from metadata or first heading) */
  title: string;
  /** All metadata from document header */
  metadata: DocumentMetadata;
  /** Top-level sections in the document */
  sections: OrgSection[];
  /** Document version (from metadata or changelog) */
  version: string;
  /** Parsed changelog entries */
  changelog?: ChangelogEntry[];
  /** Original raw content (for reference) */
  raw: string;
  /** Extracted response sections for refinement */
  responses?: ResponseSection[];
}

/**
 * A section marked with :RESPONSE: tag
 */
export interface ResponseSection extends OrgSection {
  /** Always true for response sections */
  isResponse: true;
  /** The section this response is targeting */
  targetSection?: string;
  /** The response content */
  responseContent: string;
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