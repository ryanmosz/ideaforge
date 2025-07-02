/**
 * Template structure validator for IdeaForge org-mode documents.
 * Ensures documents follow the expected template format.
 */

import { 
  OrgDocument, 
  OrgSection, 
  ValidationError, 
  ValidationResult,
  ValidationWarning 
} from './orgmode-types';

/**
 * Validates org-mode documents against the IdeaForge template structure
 */
export class OrgModeValidator {
  /** Required top-level sections in order */
  private readonly REQUIRED_SECTIONS = [
    'Project Overview',
    'User Stories',
    'Requirements',
    'Technology Choices',
    'Brainstorming'
  ];

  /** Optional but recommended sections */
  private readonly OPTIONAL_SECTIONS = [
    'Notes',
    'Oustanding Questions and Concerns', // Note: keeping the typo to match template
    'Outstanding Questions and Concerns', // Also accept correct spelling
    'Additional Research Subjects',
    'Changelog'
  ];

  /** Required subsections under specific parents */
  private readonly REQUIRED_SUBSECTIONS: Record<string, string[]> = {
    'Requirements': ['Functional Requirements', 'Technical Requirements'],
    'Brainstorming': [
      'Core Features',
      'Architecture Considerations',
      'UI/UX Ideas',
      'Potential Integrations',
      'Future Possibilities'
    ]
  };

  /** Expected technology choice categories */
  private readonly TECHNOLOGY_CATEGORIES = [
    'Frontend Framework',
    'Backend/Hosting',
    'Database',
    'Authentication'
  ];

  /**
   * Validate an org-mode document against the template structure
   * @param document - Parsed org document to validate
   * @returns ValidationResult with errors and warnings
   */
  validate(document: OrgDocument): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate metadata
    this.validateMetadata(document, errors, warnings);

    // Validate required sections
    this.validateRequiredSections(document, errors);

    // Validate section structure
    this.validateSectionStructure(document, errors, warnings);

    // Validate requirements format
    this.validateRequirements(document, errors, warnings);

    // Validate technology choices
    this.validateTechnologyChoices(document, warnings);

    // Check for optional sections
    this.checkOptionalSections(document, warnings);

    // Calculate validation score
    const score = this.calculateScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
      score
    };
  }

  /**
   * Validate document metadata
   */
  private validateMetadata(
    document: OrgDocument, 
    _errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    const { metadata } = document;

    // Title is required and already checked by parser
    if (!metadata.title || metadata.title.includes('[Project Name]')) {
      warnings.push({
        type: 'missing_optional',
        message: 'Document title contains placeholder text',
        line: 1,
        section: 'Metadata'
      });
    }

    // Check for placeholder values
    if (metadata.author === '[Your Name]') {
      warnings.push({
        type: 'missing_optional',
        message: 'Author field contains placeholder text',
        line: 3,
        section: 'Metadata'
      });
    }

    if (metadata.date === '[DATE]') {
      warnings.push({
        type: 'missing_optional',
        message: 'Date field contains placeholder text',
        line: 2,
        section: 'Metadata'
      });
    }
  }

  /**
   * Validate all required sections are present
   */
  private validateRequiredSections(document: OrgDocument, errors: ValidationError[]): void {
    for (const requiredSection of this.REQUIRED_SECTIONS) {
      const section = this.findSection(document.sections, requiredSection);
      
      if (!section) {
        errors.push({
          type: 'missing_section',
          message: `Missing required section: "${requiredSection}"`,
          section: requiredSection,
          suggestion: `Add a "* ${requiredSection}" section to your document`
        });
      }
    }
  }

  /**
   * Validate internal structure of sections
   */
  private validateSectionStructure(
    document: OrgDocument, 
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check each parent that should have specific subsections
    for (const [parent, requiredChildren] of Object.entries(this.REQUIRED_SUBSECTIONS)) {
      const parentSection = this.findSection(document.sections, parent);
      
      if (parentSection) {
        for (const childName of requiredChildren) {
          const child = this.findSection(parentSection.children, childName);
          
          if (!child) {
            errors.push({
              type: 'missing_section',
              message: `Missing required subsection: "${childName}" under "${parent}"`,
              section: `${parent}/${childName}`,
              suggestion: `Add "** ${childName}" under the ${parent} section`
            });
          }
        }

        // Check for extra subsections (just warn)
        const expectedSet = new Set(requiredChildren.map(c => c.toLowerCase()));
        parentSection.children.forEach(child => {
          if (!expectedSet.has(child.heading.toLowerCase())) {
            warnings.push({
              type: 'style_issue',
              message: `Unexpected subsection "${child.heading}" under "${parent}"`,
              line: child.lineNumber,
              section: `${parent}/${child.heading}`
            });
          }
        });
      }
    }
  }

  /**
   * Validate requirements have proper MoSCoW tags
   */
  private validateRequirements(
    document: OrgDocument, 
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const reqSection = this.findSection(document.sections, 'Requirements');
    if (!reqSection) return;

    const functionalReqs = this.findSection(reqSection.children, 'Functional Requirements');
    const technicalReqs = this.findSection(reqSection.children, 'Technical Requirements');

    const allReqSections = [
      ...(functionalReqs?.children || []),
      ...(technicalReqs?.children || [])
    ];

    for (const req of allReqSections) {
      // Check for MoSCoW tags
      const moscowTags = req.tags.filter(tag => 
        ['MUST', 'SHOULD', 'COULD', 'WONT'].includes(tag)
      );

      if (moscowTags.length === 0) {
        errors.push({
          type: 'invalid_format',
          message: `Requirement missing MoSCoW tag: "${req.heading}"`,
          line: req.lineNumber,
          section: 'Requirements',
          suggestion: 'Add one of :MUST:, :SHOULD:, :COULD:, or :WONT: tags'
        });
      } else if (moscowTags.length > 1) {
        warnings.push({
          type: 'style_issue',
          message: `Requirement has multiple MoSCoW tags: "${req.heading}"`,
          line: req.lineNumber,
          section: 'Requirements'
        });
      }

      // Check for placeholder text
      if (req.heading.includes('[') && req.heading.includes(']')) {
        warnings.push({
          type: 'missing_optional',
          message: `Requirement contains placeholder text: "${req.heading}"`,
          line: req.lineNumber,
          section: 'Requirements'
        });
      }

      // Check for empty descriptions
      if (!req.content.trim()) {
        warnings.push({
          type: 'missing_optional',
          message: `Requirement lacks description: "${req.heading}"`,
          line: req.lineNumber,
          section: 'Requirements'
        });
      }
    }

    // Check requirement count
    if (allReqSections.length === 0) {
      warnings.push({
        type: 'missing_optional',
        message: 'No requirements defined in the document',
        section: 'Requirements'
      });
    }
  }

  /**
   * Validate technology choices section
   */
  private validateTechnologyChoices(document: OrgDocument, warnings: ValidationWarning[]): void {
    const techSection = this.findSection(document.sections, 'Technology Choices');
    if (!techSection) return;

    // Check for expected categories
    const existingCategories = techSection.children.map(c => c.heading);
    const existingSet = new Set(existingCategories.map(c => c.toLowerCase()));

    for (const expected of this.TECHNOLOGY_CATEGORIES) {
      if (!existingSet.has(expected.toLowerCase())) {
        warnings.push({
          type: 'missing_optional',
          message: `Missing technology category: "${expected}"`,
          section: 'Technology Choices'
        });
      }
    }

    // Check for empty technology sections
    techSection.children.forEach(category => {
      if (!category.content.trim() && category.children.length === 0) {
        warnings.push({
          type: 'missing_optional',
          message: `Empty technology category: "${category.heading}"`,
          line: category.lineNumber,
          section: `Technology Choices/${category.heading}`
        });
      }
    });
  }

  /**
   * Check for optional sections
   */
  private checkOptionalSections(document: OrgDocument, warnings: ValidationWarning[]): void {
    // Check changelog has proper tag
    const changelogSection = document.sections.find(s => 
      s.heading.toLowerCase() === 'changelog'
    );
    
    if (changelogSection && !changelogSection.tags.includes('CHANGELOG')) {
      warnings.push({
        type: 'style_issue',
        message: 'Changelog section missing :CHANGELOG: tag',
        line: changelogSection.lineNumber,
        section: 'Changelog'
      });
    }

    // Check for empty optional sections
    for (const section of document.sections) {
      if (this.OPTIONAL_SECTIONS.some(opt => 
        section.heading.toLowerCase() === opt.toLowerCase()
      )) {
        if (!section.content.trim() && section.children.length === 0) {
          warnings.push({
            type: 'missing_optional',
            message: `Empty section: "${section.heading}"`,
            line: section.lineNumber,
            section: section.heading
          });
        }
      }
    }
  }

  /**
   * Calculate validation score (0-100)
   */
  private calculateScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    const baseScore = 100;
    const errorPenalty = 10;
    const warningPenalty = 2;

    const score = baseScore - (errors.length * errorPenalty) - (warnings.length * warningPenalty);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Find a section by heading (case-insensitive)
   */
  private findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    const lowerHeading = heading.toLowerCase();
    return sections.find(s => s.heading.toLowerCase() === lowerHeading);
  }

  /**
   * Get a summary of validation results
   */
  getSummary(result: ValidationResult): string {
    const lines: string[] = [];
    
    if (result.isValid) {
      lines.push('✅ Document structure is valid!');
    } else {
      lines.push(`❌ Document has ${result.errors.length} error(s)`);
    }

    if (result.warnings && result.warnings.length > 0) {
      lines.push(`⚠️  ${result.warnings.length} warning(s) found`);
    }

    if (result.score !== undefined) {
      lines.push(`📊 Validation score: ${result.score}/100`);
    }

    return lines.join('\n');
  }
}