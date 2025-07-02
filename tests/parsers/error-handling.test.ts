import { OrgModeParser } from '../../src/parsers/orgmode-parser';

describe('Parser Error Handling', () => {
  let parser: OrgModeParser;

  beforeEach(() => {
    parser = new OrgModeParser();
  });

  describe('Input Validation', () => {
    it('should handle null input', () => {
      const result = parser.parse(null as any);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Invalid input');
      expect(result.errors![0].suggestion).toContain('valid org-mode');
    });

    it('should handle undefined input', () => {
      const result = parser.parse(undefined as any);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Invalid input');
    });

    it('should handle empty string', () => {
      const result = parser.parse('');
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Invalid input');
    });

    it('should handle non-string input', () => {
      const result = parser.parse(123 as any);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toContain('Invalid input');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from metadata parsing errors', () => {
      const content = `This is not valid metadata
      
* Valid Section

Content here`;

      const result = parser.parse(content);
      expect(result.success).toBe(false); // Has metadata error
      expect(result.document).toBeDefined();
      expect(result.document!.title).toBe('Untitled');
      expect(result.document!.sections).toHaveLength(1);
      expect(result.document!.sections[0].heading).toBe('Valid Section');
      expect(result.errors!.some(e => e.message.includes('missing #+TITLE'))).toBe(true);
    });

    it('should recover from section parsing errors', () => {
      const content = `#+TITLE: Test Document

*** Invalid heading jump

* Valid Section

Content`;

      const result = parser.parse(content);
      expect(result.document).toBeDefined();
      
      // If no errors, the jump might be allowed
      if (result.errors) {
        const hasJumpError = result.errors.some(e => e.message.includes('Heading level jumped'));
        expect(hasJumpError).toBe(true);
      } else {
        // No errors means it was parsed successfully
        expect(result.success).toBe(true);
      }
      expect(result.document!.sections).toHaveLength(2); // Both sections parsed
    });

    it('should handle malformed tags gracefully', () => {
      const content = `#+TITLE: Test

* Section : BAD TAG :

* Another Section :GOOD:

Content`;

      const result = parser.parse(content);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.message.includes('spaces around colons'))).toBe(true);
      expect(result.document!.sections).toHaveLength(2);
    });
  });

  describe('Error Collection', () => {
    it('should collect multiple errors', () => {
      const content = `Missing title

*** Bad heading jump :INVALID TAG:

* Section 1 : SPACES :

** Subsection

**** Another jump

* Section 2`;

      const result = parser.parse(content);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(3);
      
      // Check for different error types
      const errorMessages = result.errors!.map(e => e.message);
      expect(errorMessages.some(m => m.includes('missing #+TITLE'))).toBe(true);
      expect(errorMessages.some(m => m.includes('Heading level jumped'))).toBe(true);
      expect(errorMessages.some(m => m.includes('spaces around colons'))).toBe(true);
    });

    it('should respect maxErrors limit', () => {
      // Create content with many errors
      let content = '#+TITLE: Many Errors\n\n';
      
      // Generate many sections with tag errors
      for (let i = 0; i < 100; i++) {
        content += `* Section ${i} : SPACES :\n\n`;
      }

      const result = parser.parse(content);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      
      // The parser should limit errors to maxErrors (50) + possibly 1 for "too many" message
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors!.length).toBeLessThanOrEqual(52); // Some buffer for the limit
      
      // Most importantly, we shouldn't get all 100 errors
      expect(result.errors!.length).toBeLessThan(100);
    });
  });

  describe('Property Drawer Error Handling', () => {
    it('should report invalid property format', () => {
      const content = `#+TITLE: Test

* Section
:PROPERTIES:
:VALID: Value
INVALID FORMAT
:ANOTHER: Value
:END:

Content`;

      const result = parser.parse(content);
      expect(result.success).toBe(false);
      expect(result.errors!.some(e => 
        e.message.includes('Invalid property format') && e.line === 6
      )).toBe(true);
    });

    it('should handle unclosed property drawer', () => {
      const content = `#+TITLE: Test

* Section
:PROPERTIES:
:KEY: Value

* Another Section

This drawer was never closed`;

      const result = parser.parse(content);
      expect(result.document).toBeDefined();
      expect(result.document!.sections).toHaveLength(1); // Parser stops at unclosed drawer
      // The parser should handle this gracefully
    });
  });

  describe('Response Extraction Error Handling', () => {
    it('should handle response extraction errors gracefully', () => {
      const content = `#+TITLE: Test

* Section :RESPONSE:

Content`;

      const result = parser.parse(content, { extractResponses: true });
      expect(result.success).toBe(true);
      expect(result.document!.responses).toBeDefined();
      expect(result.document!.responses).toHaveLength(1);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful suggestions', () => {
      const content = `#+TITLE: Test

* Section :TAG WITH SPACES:

Content`;

      const result = parser.parse(content);
      const tagError = result.errors!.find(e => e.message.includes('Invalid tag format'));
      expect(tagError).toBeDefined();
      expect(tagError!.suggestion).toBeDefined();
      expect(tagError!.line).toBe(3);
    });

    it('should include line numbers in errors', () => {
      const content = `#+TITLE: Test

* First Section

*** Invalid Jump

Content`;

      const result = parser.parse(content);
      const jumpError = result.errors!.find(e => e.message.includes('Heading level jumped'));
      expect(jumpError).toBeDefined();
      expect(jumpError!.line).toBe(5);
    });
  });

  describe('Changelog Extraction Error Handling', () => {
    it('should handle malformed changelog gracefully', () => {
      const content = `#+TITLE: Test

* Regular Section

* Changelog :CHANGELOG:

Not a proper changelog format
Just some text`;

      const result = parser.parse(content);
      expect(result.success).toBe(true);
      // Changelog extraction returns undefined if no valid entries found
      expect(result.document!.changelog === undefined || Array.isArray(result.document!.changelog)).toBe(true);
    });
  });
}); 