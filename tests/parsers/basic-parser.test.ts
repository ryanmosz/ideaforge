/**
 * Basic tests for the org-mode parser to verify Phase 1 functionality
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { OrgModeParser } from '../../src/parsers/orgmode-parser';

describe('OrgModeParser - Basic Functionality', () => {
  let parser: OrgModeParser;
  
  beforeEach(() => {
    parser = new OrgModeParser();
  });

  describe('Basic Parsing', () => {
    it('should parse a simple org document', () => {
      const content = `#+TITLE: Test Project
#+AUTHOR: Test User
#+DATE: 2024-01-01

* Section One
This is section one content.

** Subsection 1.1
Content for subsection.

* Section Two                                                          :TAG1:TAG2:
This section has tags.`;

      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.title).toBe('Test Project');
      expect(result.document!.metadata.author).toBe('Test User');
      expect(result.document!.sections).toHaveLength(2);
      expect(result.document!.sections[0].heading).toBe('Section One');
      expect(result.document!.sections[0].children).toHaveLength(1);
      expect(result.document!.sections[1].tags).toEqual(['TAG1', 'TAG2']);
    });

    it('should handle metadata extraction', () => {
      const content = `#+TITLE: IdeaForge Test
#+AUTHOR: Developer
#+DATE: 2024-01-01
#+STARTUP: overview

* Content`;

      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      const metadata = result.document!.metadata;
      expect(metadata.title).toBe('IdeaForge Test');
      expect(metadata.author).toBe('Developer');
      expect(metadata.date).toBe('2024-01-01');
      expect(metadata.startup).toBe('overview');
    });

    it('should build hierarchical structure correctly', () => {
      const content = `#+TITLE: Hierarchy Test

* Level 1
** Level 2
*** Level 3
** Another Level 2
* Another Level 1`;

      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      const sections = result.document!.sections;
      expect(sections).toHaveLength(2);
      expect(sections[0].children).toHaveLength(2);
      expect(sections[0].children[0].children).toHaveLength(1);
      expect(sections[0].children[0].children[0].level).toBe(3);
    });

    it('should parse MoSCoW tags correctly', () => {
      const content = `#+TITLE: MoSCoW Test

* Requirements
** MUST Have this feature                                              :MUST:
** SHOULD Have this                                                 :SHOULD:
** COULD Have this                                                   :COULD:
** WONT Have this                                                     :WONT:`;

      const result = parser.parse(content);
      
      expect(result.success).toBe(true);
      const requirements = result.document!.sections[0].children;
      expect(requirements[0].tags).toContain('MUST');
      expect(requirements[1].tags).toContain('SHOULD');
      expect(requirements[2].tags).toContain('COULD');
      expect(requirements[3].tags).toContain('WONT');
    });
  });

  describe('Template Parsing', () => {
    it('should parse the ideaforge-template.org successfully', () => {
      const templatePath = join(__dirname, '../../ideaforge-template.org');
      const content = readFileSync(templatePath, 'utf-8');
      
      const result = parser.parse(content);
      
      // Should parse with some errors due to placeholders
      expect(result.document).toBeDefined();
      expect(result.document!.sections.length).toBeGreaterThan(0);
      
      // Check main sections exist
      const sectionHeadings = result.document!.sections.map(s => s.heading);
      expect(sectionHeadings).toContain('Project Overview');
      expect(sectionHeadings).toContain('User Stories');
      expect(sectionHeadings).toContain('Requirements');
      expect(sectionHeadings).toContain('Technology Choices');
      expect(sectionHeadings).toContain('Brainstorming');
      expect(sectionHeadings).toContain('Notes');
      expect(sectionHeadings).toContain('Oustanding Questions and Concerns');
      expect(sectionHeadings).toContain('Additional Research Subjects');
      expect(sectionHeadings).toContain('Changelog');
      
      // Check changelog has the right tag
      const changelogSection = result.document!.sections.find(s => s.heading === 'Changelog');
      expect(changelogSection?.tags).toContain('CHANGELOG');
    });

    it('should extract sections with proper hierarchy', () => {
      const templatePath = join(__dirname, '../../ideaforge-template.org');
      const content = readFileSync(templatePath, 'utf-8');
      
      const result = parser.parse(content);
      const doc = result.document!;
      
      // Find Requirements section
      const reqSection = parser.findSection(doc.sections, 'Requirements');
      expect(reqSection).toBeDefined();
      expect(reqSection!.children.length).toBeGreaterThan(0);
      
      // Check for Functional/Technical subsections
      const functionalReqs = parser.findSection(reqSection!.children, 'Functional Requirements');
      const technicalReqs = parser.findSection(reqSection!.children, 'Technical Requirements');
      expect(functionalReqs).toBeDefined();
      expect(technicalReqs).toBeDefined();
      
      // Find Brainstorming section
      const brainstormSection = parser.findSection(doc.sections, 'Brainstorming');
      expect(brainstormSection).toBeDefined();
      expect(brainstormSection!.children.length).toBe(5); // Should have 5 subsections
    });
  });

  describe('Error Handling', () => {
    it('should handle missing title gracefully', () => {
      const content = `* Section without metadata
Content here.`;

      const result = parser.parse(content);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].type).toBe('missing_section');
      expect(result.errors![0].message).toContain('#+TITLE');
    });

    it('should detect heading level jumps', () => {
      const content = `#+TITLE: Level Jump Test

* Level 1
*** Level 3 (jumped from 1 to 3!)`;

      const result = parser.parse(content);
      
      expect(result.document).toBeDefined(); // Should still parse
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.type === 'invalid_structure')).toBe(true);
    });

    it('should validate tag format', () => {
      const content = `#+TITLE: Tag Test

* Section with bad tag                                              :BAD TAG:`;

      const result = parser.parse(content);
      
      expect(result.document).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.message.includes('Invalid tag format'))).toBe(true);
    });
  });

  describe('Response Handling', () => {
    it('should identify and extract response sections', () => {
      const content = `#+TITLE: Response Test

* Requirements
** MUST Have feature X                                                :MUST:

* Re: Requirements                                               :RESPONSE:
I think we should reconsider feature X.

* About User Stories                                             :RESPONSE:
We need more detail here.`;

      const result = parser.parse(content, { extractResponses: true });
      
      expect(result.success).toBe(true);
      expect(result.document!.responses).toBeDefined();
      expect(result.document!.responses!).toHaveLength(2);
      expect(result.document!.responses![0].targetSection).toBe('Requirements');
      expect(result.document!.responses![1].targetSection).toBe('User Stories');
    });
  });
}); 