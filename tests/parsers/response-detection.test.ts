import { OrgModeParser } from '../../src/parsers/orgmode-parser';

describe('Response Section Detection', () => {
  let parser: OrgModeParser;

  beforeEach(() => {
    parser = new OrgModeParser();
  });

  describe('Basic Response Detection', () => {
    it('should detect sections with :RESPONSE: tag', () => {
      const content = `#+TITLE: Document with Responses

* Project Overview

Initial project description.

* Requirements

** Functional Requirements

*** Login System :MUST:

Users need to log in.

*** Re: Login System :RESPONSE:

We should also support social login options like Google and GitHub.

* User Feedback :RESPONSE:

General feedback about the whole document.`;

      const result = parser.parse(content, { extractResponses: true });
      expect(result.success).toBe(true);
      expect(result.document!.responses).toHaveLength(2);
      
      const responses = result.document!.responses!;
      expect(responses[0].heading).toBe('Re: Login System');
      expect(responses[0].isResponse).toBe(true);
      expect(responses[0].targetSection).toBe('Login System');
      
      expect(responses[1].heading).toBe('User Feedback');
      expect(responses[1].targetSection).toBe('General');
    });

    it('should handle nested response sections', () => {
      const content = `#+TITLE: Nested Responses

* Requirements

** Technical Requirements

*** API Design :SHOULD:

REST API with JSON.

**** About API Design :RESPONSE:

Consider GraphQL for complex queries.

***** Nested Response :RESPONSE:

And maybe support both REST and GraphQL.`;

      const result = parser.parse(content, { extractResponses: true });
      expect(result.success).toBe(true);
      expect(result.document!.responses).toHaveLength(2);
      
      const [first, second] = result.document!.responses!;
      expect(first.targetSection).toBe('API Design');
      expect(second.targetSection).toBe('Requirements/Technical Requirements/API Design/About API Design');
    });
  });

  describe('Target Section Inference', () => {
    it('should infer target from heading patterns', () => {
      const testCases = [
        { heading: 'Re: User Stories', expected: 'User Stories' },
        { heading: 'About Requirements', expected: 'Requirements' },
        { heading: 'Regarding Authentication', expected: 'Authentication' },
        { heading: 'For Dashboard Feature', expected: 'Dashboard Feature' },
        { heading: 'On Security Concerns', expected: 'Security Concerns' },
        { heading: 'Response to Technology Choices', expected: 'Technology Choices' }
      ];

      testCases.forEach(({ heading, expected }) => {
        const content = `#+TITLE: Test
* ${heading} :RESPONSE:
Content`;
        
        const result = parser.parse(content, { extractResponses: true });
        expect(result.success).toBe(true);
        expect(result.document!.responses![0].targetSection).toBe(expected);
      });
    });

    it('should use parent path when no pattern matches', () => {
      const content = `#+TITLE: Test

* Requirements

** Functional Requirements

*** Random Thoughts :RESPONSE:

Some feedback here.`;

      const result = parser.parse(content, { extractResponses: true });
      expect(result.success).toBe(true);
      expect(result.document!.responses![0].targetSection).toBe('Requirements/Functional Requirements');
    });
  });

  describe('Response Retrieval Methods', () => {
    it('should check if document has responses', () => {
      const withResponses = `#+TITLE: Test
* Section :RESPONSE:
Content`;
      
      const withoutResponses = `#+TITLE: Test
* Section
Content`;
      
      const result1 = parser.parse(withResponses, { extractResponses: true });
      const result2 = parser.parse(withoutResponses, { extractResponses: true });
      
      expect(parser.hasResponses(result1.document!)).toBe(true);
      expect(parser.hasResponses(result2.document!)).toBe(false);
    });

    it('should get responses for specific section', () => {
      const content = `#+TITLE: Test

* Requirements

** Re: Requirements :RESPONSE:
First response

* User Stories

** About User Stories :RESPONSE:
Second response

* Another Section

** Re: Requirements :RESPONSE:
Third response`;

      const result = parser.parse(content, { extractResponses: true });
      const doc = result.document!;
      
      const reqResponses = parser.getResponsesForSection(doc, 'Requirements');
      expect(reqResponses).toHaveLength(2);
      expect(reqResponses[0].heading).toBe('Re: Requirements');
      expect(reqResponses[1].heading).toBe('Re: Requirements');
      
      const storyResponses = parser.getResponsesForSection(doc, 'User Stories');
      expect(storyResponses).toHaveLength(1);
      expect(storyResponses[0].heading).toBe('About User Stories');
    });

    it('should group responses by target', () => {
      const content = `#+TITLE: Test

* Re: Security :RESPONSE:
First

* About Security :RESPONSE:
Second

* Re: Performance :RESPONSE:
Third

* General Feedback :RESPONSE:
Fourth`;

      const result = parser.parse(content, { extractResponses: true });
      const responseMap = parser.getResponsesByTarget(result.document!);
      
      expect(responseMap.size).toBe(3);
      expect(responseMap.get('Security')).toHaveLength(2);
      expect(responseMap.get('Performance')).toHaveLength(1);
      expect(responseMap.get('General')).toHaveLength(1);
    });
  });

  describe('Response Content Preservation', () => {
    it('should preserve response content and properties', () => {
      const content = `#+TITLE: Test

* Re: Implementation :RESPONSE:
:PROPERTIES:
:AUTHOR: John Doe
:DATE: 2024-01-20
:END:

This is a detailed response with multiple paragraphs.

- Point 1
- Point 2

Some code example:
#+BEGIN_SRC typescript
const example = true;
#+END_SRC`;

      const result = parser.parse(content, { extractResponses: true });
      const response = result.document!.responses![0];
      
      expect(response.responseContent).toContain('detailed response');
      expect(response.responseContent).toContain('Point 1');
      expect(response.responseContent).toContain('const example');
      expect(response.properties?.AUTHOR).toBe('John Doe');
      expect(response.properties?.DATE).toBe('2024-01-20');
    });

    it('should handle responses with multiple tags', () => {
      const content = `#+TITLE: Test

* Re: Architecture :RESPONSE:IMPORTANT:TODO:

Critical feedback here.`;

      const result = parser.parse(content, { extractResponses: true });
      const response = result.document!.responses![0];
      
      expect(response.tags).toContain('RESPONSE');
      expect(response.tags).toContain('IMPORTANT');
      expect(response.tags).toContain('TODO');
      expect(response.isResponse).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty responses', () => {
      const content = `#+TITLE: Test

* Empty Response :RESPONSE:

* Another Section

Content`;

      const result = parser.parse(content, { extractResponses: true });
      expect(result.success).toBe(true);
      expect(result.document!.responses).toHaveLength(1);
      expect(result.document!.responses![0].responseContent).toBe('');
    });

    it('should handle case-insensitive target matching', () => {
      const content = `#+TITLE: Test

* REQUIREMENTS

* Re: requirements :RESPONSE:

Feedback`;

      const result = parser.parse(content, { extractResponses: true });
      const doc = result.document!;
      
      const responses = parser.getResponsesForSection(doc, 'Requirements');
      expect(responses).toHaveLength(1);
    });
  });
}); 