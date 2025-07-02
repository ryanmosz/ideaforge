import { OrgModeParser } from '../../src/parsers/orgmode-parser';

describe('Enhanced Tag and Property Support', () => {
  let parser: OrgModeParser;

  beforeEach(() => {
    parser = new OrgModeParser();
  });

  describe('Property Drawer Support', () => {
    it('should parse property drawers correctly', () => {
      const content = `#+TITLE: Property Test

* Section with Properties
:PROPERTIES:
:ID: unique-id-123
:CREATED: [2024-01-20]
:AUTHOR: John Doe
:CUSTOM: Some value
:END:

This section has properties attached.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const section = result.document!.sections[0];
      expect(section.properties).toBeDefined();
      expect(section.properties!.ID).toBe('unique-id-123');
      expect(section.properties!.CREATED).toBe('[2024-01-20]');
      expect(section.properties!.AUTHOR).toBe('John Doe');
      expect(section.properties!.CUSTOM).toBe('Some value');
    });

    it('should handle nested sections with properties', () => {
      const content = `#+TITLE: Nested Properties

* Parent Section
:PROPERTIES:
:TYPE: parent
:END:

** Child Section
:PROPERTIES:
:TYPE: child
:PARENT_ID: parent-123
:END:

Child content here.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const parent = result.document!.sections[0];
      const child = parent.children[0];
      
      expect(parent.properties!.TYPE).toBe('parent');
      expect(child.properties!.TYPE).toBe('child');
      expect(child.properties!.PARENT_ID).toBe('parent-123');
    });

    it('should report errors for invalid property format', () => {
      const content = `#+TITLE: Invalid Properties

* Section
:PROPERTIES:
:VALID: This is valid
INVALID: This is not valid
:ANOTHER: Valid one
:END:`;

      const result = parser.parse(content);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Invalid property format');
      expect(result.errors![0].line).toBe(6);
    });
  });

  describe('Tag Inheritance', () => {
    it('should inherit tags from parent sections', () => {
      const content = `#+TITLE: Tag Inheritance

* Project Tasks :PROJECT:ACTIVE:

** Development :DEV:

*** Implement Feature :FEATURE:

This task should have PROJECT, ACTIVE, DEV, and FEATURE tags.

*** Fix Bug :BUG:

This should have PROJECT, ACTIVE, DEV, and BUG tags.

** Testing :TEST:

*** Write Unit Tests

This should have PROJECT, ACTIVE, and TEST tags.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const project = result.document!.sections[0];
      const dev = project.children[0];
      const feature = dev.children[0];
      const bug = dev.children[1];
      const testing = project.children[1];
      const unitTests = testing.children[0];
      
      // Check tag inheritance
      expect(feature.tags).toContain('PROJECT');
      expect(feature.tags).toContain('ACTIVE');
      expect(feature.tags).toContain('DEV');
      expect(feature.tags).toContain('FEATURE');
      
      expect(bug.tags).toContain('PROJECT');
      expect(bug.tags).toContain('ACTIVE');
      expect(bug.tags).toContain('DEV');
      expect(bug.tags).toContain('BUG');
      
      expect(unitTests.tags).toContain('PROJECT');
      expect(unitTests.tags).toContain('ACTIVE');
      expect(unitTests.tags).toContain('TEST');
    });

    it('should not inherit special tags', () => {
      const content = `#+TITLE: Special Tags

* Parent Section :RESPONSE:CHANGELOG:

** Child Section :NORMAL:

Child should only have NORMAL tag, not RESPONSE or CHANGELOG.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const parent = result.document!.sections[0];
      const child = parent.children[0];
      
      expect(parent.tags).toContain('RESPONSE');
      expect(parent.tags).toContain('CHANGELOG');
      expect(child.tags).toContain('NORMAL');
      expect(child.tags).not.toContain('RESPONSE');
      expect(child.tags).not.toContain('CHANGELOG');
    });
  });

  describe('Enhanced Tag Support', () => {
    it('should support custom tag characters', () => {
      const content = `#+TITLE: Custom Tags

* Section with Special Tags :TODO@home:PRIORITY#1:AREA%work:

Content here.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const section = result.document!.sections[0];
      expect(section.tags).toContain('TODO@home');
      expect(section.tags).toContain('PRIORITY#1');
      expect(section.tags).toContain('AREA%work');
    });

    it('should detect tag format errors', () => {
      const content = `#+TITLE: Tag Errors

* Section with Bad Tags : TAG1 : TAG2: :TAG3 :

Content here.`;

      const result = parser.parse(content);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toContain('spaces around colons');
    });
  });

  describe('Tag Search Functions', () => {
    it('should find all sections with a specific tag', () => {
      const content = `#+TITLE: Tag Search

* Requirements

** Functional Requirements

*** Login System :MUST:SECURITY:

*** Dashboard :SHOULD:UI:

** Technical Requirements

*** Database Design :MUST:DATABASE:

*** API Security :MUST:SECURITY:

* Brainstorming

** Security Ideas :SECURITY:

Ideas about security.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const securitySections = parser.findSectionsByTag(result.document!.sections, 'SECURITY');
      expect(securitySections).toHaveLength(3);
      expect(securitySections[0].heading).toBe('Login System');
      expect(securitySections[1].heading).toBe('API Security');
      expect(securitySections[2].heading).toBe('Security Ideas');
    });

    it('should get all unique tags in document', () => {
      const content = `#+TITLE: All Tags

* Section 1 :TAG1:TAG2:

** Subsection :TAG2:TAG3:

* Section 2 :TAG1:TAG4:

** Another :TAG5:TAG3:`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const allTags = parser.getAllTags(result.document!.sections);
      expect(allTags).toEqual(['TAG1', 'TAG2', 'TAG3', 'TAG4', 'TAG5']);
    });
  });

  describe('Property Extraction', () => {
    it('should extract section properties', () => {
      const content = `#+TITLE: Property Extraction

* Task
:PROPERTIES:
:ESTIMATE: 5h
:ASSIGNEE: John
:STATUS: In Progress
:END:

Task description.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const section = result.document!.sections[0];
      const properties = parser.getSectionProperties(section);
      
      expect(properties.ESTIMATE).toBe('5h');
      expect(properties.ASSIGNEE).toBe('John');
      expect(properties.STATUS).toBe('In Progress');
    });

    it('should handle sections without properties', () => {
      const content = `#+TITLE: No Properties

* Section Without Properties

Just content.`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      
      const section = result.document!.sections[0];
      const properties = parser.getSectionProperties(section);
      
      expect(properties).toEqual({});
    });
  });
}); 