/**
 * Core document types and interfaces used throughout the IdeaForge system.
 * These types represent the structured data extracted from org-mode documents.
 */

/**
 * Metadata that appears at the top of org-mode files
 */
export interface DocumentMetadata {
  /** Document title from #+TITLE */
  title: string;
  /** Author name from #+AUTHOR */
  author?: string;
  /** Creation/modification date from #+DATE */
  date?: string;
  /** Startup visibility setting from #+STARTUP */
  startup?: string;
  /** Allow for custom org-mode properties */
  [key: string]: string | undefined;
}

/**
 * MoSCoW prioritization tag for requirements
 */
export interface MoscowTag {
  /** The MoSCoW category */
  type: 'MUST' | 'SHOULD' | 'COULD' | 'WONT';
  /** Confidence level in the categorization (1-10) */
  confidence?: number;
  /** Explanation for the categorization */
  rationale?: string;
}

/**
 * User story following the standard format
 */
export interface UserStory {
  /** The role/persona (e.g., "developer", "user") */
  role: string;
  /** The desired action or feature */
  action: string;
  /** The benefit or value provided */
  benefit: string;
  /** Original text as written in the document */
  rawText: string;
}

/**
 * A requirement with MoSCoW classification
 */
export interface Requirement {
  /** Unique identifier (e.g., "F1" for functional, "T1" for technical) */
  id: string;
  /** Brief requirement text (heading without MoSCoW prefix) */
  text: string;
  /** Detailed description of the requirement */
  description: string;
  /** MoSCoW classification */
  moscowType: MoscowTag;
  /** Whether this is functional or technical */
  category: 'functional' | 'technical';
}

/**
 * A brainstorming idea from any category
 */
export interface BrainstormIdea {
  /** Category like "Core Features", "UI/UX Ideas", etc. */
  category: string;
  /** The idea text */
  text: string;
  /** Optional subcategory for nested ideas */
  subcategory?: string;
}

/**
 * Technology choice or option
 */
export interface TechnologyChoice {
  /** Category like "Frontend Framework", "Database", etc. */
  category: string;
  /** The chosen or considered technology */
  choice: string;
  /** Pros and cons or reasoning */
  reasoning?: string;
}

/**
 * Changelog entry for tracking document versions
 */
export interface ChangelogEntry {
  /** Version identifier (e.g., "v1", "v2") */
  version: string;
  /** Date of the change */
  date: string;
  /** List of changes made in this version */
  changes: string[];
}

/**
 * Research subject for additional investigation
 */
export interface ResearchSubject {
  /** Topic to research */
  topic: string;
  /** Why this research is needed */
  reason?: string;
}

/**
 * A note or consideration
 */
export interface Note {
  /** Note content */
  content: string;
  /** Optional category or type */
  category?: string;
}

/**
 * Outstanding question or concern
 */
export interface Question {
  /** The question text */
  question: string;
  /** Priority or urgency */
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Complete parsed document data
 */
export interface ParsedDocumentData {
  /** Document metadata from header */
  metadata: DocumentMetadata;
  /** Project overview text */
  projectOverview?: string;
  /** All user stories */
  userStories: UserStory[];
  /** All requirements (functional and technical) */
  requirements: Requirement[];
  /** Technology choices */
  technologyChoices: TechnologyChoice[];
  /** All brainstorming ideas */
  brainstormIdeas: BrainstormIdea[];
  /** Notes section content */
  notes: Note[];
  /** Outstanding questions */
  questions: Question[];
  /** Additional research subjects */
  researchSubjects: ResearchSubject[];
  /** Document changelog */
  changelog: ChangelogEntry[];
}

/**
 * Export result for different formats
 */
export interface ExportResult {
  /** Whether export succeeded */
  success: boolean;
  /** Output file path if successful */
  filePath?: string;
  /** Error message if failed */
  error?: string;
  /** Export format used */
  format: ExportFormat;
  /** Statistics about the exported content */
  statistics?: Record<string, number>;
}

/**
 * Supported export formats
 */
export type ExportFormat = 'markdown' | 'json' | 'orgmode' | 'cursor'; 