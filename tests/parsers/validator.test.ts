import { OrgModeParser } from '../../src/parsers/orgmode-parser';
import { OrgModeValidator } from '../../src/parsers/orgmode-validator';

describe('OrgModeValidator', () => {
  let parser: OrgModeParser;
  let validator: OrgModeValidator;

  beforeEach(() => {
    parser = new OrgModeParser();
    validator = new OrgModeValidator();
  });

  describe('Valid Documents', () => {
    it('should validate a complete and correct template', () => {
      const content = `#+TITLE: Perfect Project
#+DATE: 2024-01-20
#+AUTHOR: John Doe
#+VERSION: 1.0

* Project Overview

This is a great project that does amazing things.

* User Stories

** As a user, I want to login :MUST:

So that I can access my personal data.

* Requirements

** Functional Requirements

*** User authentication system :MUST:

Users should be able to create accounts and login.

** Technical Requirements

*** RESTful API design :SHOULD:

The backend should follow REST principles.

* Technology Choices

** Frontend Framework

React with TypeScript

** Backend/Hosting

Node.js on AWS

** Database

PostgreSQL

** Authentication

JWT tokens

* Brainstorming

** Core Features

- User management
- Dashboard

** Architecture Considerations

Microservices vs monolith

** UI/UX Ideas

Modern, clean interface

** Potential Integrations

Third-party APIs

** Future Possibilities

Mobile app`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.warnings).toBeUndefined();
      expect(validationResult.score).toBe(100);
    });
  });

  describe('Missing Sections', () => {
    it('should error on missing required sections', () => {
      const content = `#+TITLE: Incomplete Project
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview

Description here.

* Technology Choices

** Frontend Framework

React`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(3); // Missing User Stories, Requirements, Brainstorming
      expect(validationResult.errors[0].type).toBe('missing_section');
      expect(validationResult.errors[0].section).toBe('User Stories');
    });

    it('should error on missing required subsections', () => {
      const content = `#+TITLE: Missing Subsections
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements

** Functional Requirements

*** Login system :MUST:

* Technology Choices
* Brainstorming

** Core Features

Some features`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.isValid).toBe(false);
      // Missing Technical Requirements and 4 brainstorming subsections
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      const techReqError = validationResult.errors.find(
        e => e.section === 'Requirements/Technical Requirements'
      );
      expect(techReqError).toBeDefined();
      expect(techReqError?.type).toBe('missing_section');
    });
  });

  describe('Metadata Validation', () => {
    it('should warn about placeholder metadata', () => {
      const content = `#+TITLE: [Project Name]
#+DATE: [DATE]
#+AUTHOR: [Your Name]

* Project Overview
* User Stories
* Requirements
** Functional Requirements
** Technical Requirements
* Technology Choices
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.isValid).toBe(true); // Structure is valid
      expect(validationResult.warnings).toBeDefined();
      // We get more warnings: 3 metadata + requirements warnings + tech warnings
      expect(validationResult.warnings!.length).toBeGreaterThan(3);
      // Check for the metadata warnings specifically
      const metadataWarnings = validationResult.warnings!.filter(
        w => w.section === 'Metadata'
      );
      expect(metadataWarnings).toHaveLength(3); // Title, date, author placeholders
      expect(metadataWarnings[0].type).toBe('missing_optional');
    });
  });

  describe('Requirements Validation', () => {
    it('should error on requirements without MoSCoW tags', () => {
      const content = `#+TITLE: Bad Requirements
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements

** Functional Requirements

*** Login system

No MoSCoW tag here!

** Technical Requirements

*** API design :INVALID:

Wrong tag type

* Technology Choices
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      
      const moscowErrors = validationResult.errors.filter(
        e => e.message.includes('MoSCoW tag')
      );
      expect(moscowErrors).toHaveLength(2);
    });

    it('should warn on multiple MoSCoW tags', () => {
      const content = `#+TITLE: Multiple Tags
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview

Content here

* User Stories

Some stories

* Requirements

** Functional Requirements

*** Login system :MUST:SHOULD:

Too many tags!

** Technical Requirements

Need some content

* Technology Choices

Tech choices

* Brainstorming

Ideas

** Core Features

Features

** Architecture Considerations

Architecture

** UI/UX Ideas

UI ideas

** Potential Integrations

Integrations

** Future Possibilities

Future`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.warnings).toBeDefined();
      const multiTagWarning = validationResult.warnings!.find(
        w => w.message.includes('multiple MoSCoW tags')
      );
      expect(multiTagWarning).toBeDefined();
    });

    it('should warn on empty requirement descriptions', () => {
      const content = `#+TITLE: Empty Requirements
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements

** Functional Requirements

*** Login system :MUST:

** Technical Requirements
* Technology Choices
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.warnings).toBeDefined();
      const emptyWarning = validationResult.warnings!.find(
        w => w.message.includes('lacks description')
      );
      expect(emptyWarning).toBeDefined();
    });
  });

  describe('Technology Choices Validation', () => {
    it('should warn about missing technology categories', () => {
      const content = `#+TITLE: Missing Tech
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements
** Functional Requirements
** Technical Requirements
* Technology Choices

** Frontend Framework

React

* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.warnings).toBeDefined();
      const techWarnings = validationResult.warnings!.filter(
        w => w.message.includes('Missing technology category')
      );
      expect(techWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Sections', () => {
    it('should warn about changelog without tag', () => {
      const content = `#+TITLE: Changelog Test
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements
** Functional Requirements
** Technical Requirements
* Technology Choices
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities

* Changelog

- Initial version`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.warnings).toBeDefined();
      const changelogWarning = validationResult.warnings!.find(
        w => w.message.includes('Changelog section missing :CHANGELOG: tag')
      );
      expect(changelogWarning).toBeDefined();
    });

    it('should handle typo in "Outstanding Questions"', () => {
      const content = `#+TITLE: Typo Test
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements
** Functional Requirements
** Technical Requirements
* Technology Choices
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities

* Oustanding Questions and Concerns

Is this typo handled?`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      // Should not warn about the typo since it's expected
      expect(validationResult.isValid).toBe(true);
    });
  });

  describe('Validation Scoring', () => {
    it('should calculate appropriate scores', () => {
      const content = `#+TITLE: Scoring Test
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories
* Requirements
** Functional Requirements
*** Feature without tag
** Technical Requirements
* Technology Choices
** Frontend Framework
* Brainstorming
** Core Features
** Architecture Considerations
** UI/UX Ideas
** Potential Integrations
** Future Possibilities`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);

      expect(validationResult.score).toBeDefined();
      expect(validationResult.score).toBeLessThan(100);
      expect(validationResult.score).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    it('should generate helpful summaries', () => {
      const content = `#+TITLE: Summary Test
#+DATE: 2024-01-20
#+AUTHOR: John Doe

* Project Overview
* User Stories`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      expect(parseResult.document).toBeDefined();
      
      const validationResult = validator.validate(parseResult.document!);
      const summary = validator.getSummary(validationResult);

      expect(summary).toContain('❌');
      expect(summary).toContain('error(s)');
      expect(summary).toContain('score:');
    });
  });
}); 