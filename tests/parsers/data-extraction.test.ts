import { OrgModeParser } from '../../src/parsers/orgmode-parser';
import { DataExtractor } from '../../src/parsers/data-extractor';

describe('DataExtractor', () => {
  let parser: OrgModeParser;
  let extractor: DataExtractor;

  beforeEach(() => {
    parser = new OrgModeParser();
    extractor = new DataExtractor();
  });

  describe('Project Overview Extraction', () => {
    it('should extract project overview content', () => {
      const content = `#+TITLE: Test Project
#+DATE: 2024-01-20

* Project Overview

This is a test project that demonstrates data extraction.
It has multiple lines of content.

* User Stories`;

      const parseResult = parser.parse(content);
      expect(parseResult.success).toBe(true);
      
      const data = extractor.extractData(parseResult.document!);
      expect(data.projectOverview).toBe(
        'This is a test project that demonstrates data extraction.\nIt has multiple lines of content.'
      );
    });
  });

  describe('User Stories Extraction', () => {
    it('should extract structured user stories', () => {
      const content = `#+TITLE: Test Project

* User Stories

** As a developer, I want to parse org files so that I can extract structured data :MUST:

This will enable automated processing of project documentation.

Acceptance Criteria:
- Files are parsed correctly
- Data is structured properly
- Errors are handled gracefully

** As a user, I want clear error messages :SHOULD:

When something goes wrong, I need to understand what happened.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.userStories).toHaveLength(2);
      
      const firstStory = data.userStories[0];
      expect(firstStory.role).toBe('developer');
      expect(firstStory.action).toBe('to parse org files');
      expect(firstStory.benefit).toBe('I can extract structured data');
      expect(firstStory.rawText).toContain('As a developer');
      expect(firstStory.rawText).toContain('automated processing');
    });

    it('should extract user story from content if not in heading', () => {
      const content = `#+TITLE: Test Project

* User Stories

** Login functionality :MUST:

As a user, I want to log into the system so that I can access my account.

** Dashboard view

The user needs a dashboard.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.userStories).toHaveLength(1);
      
      const firstStory = data.userStories[0];
      expect(firstStory.role).toBe('user');
      expect(firstStory.action).toBe('to log into the system');
      expect(firstStory.benefit).toBe('I can access my account');
    });
  });

  describe('Requirements Extraction', () => {
    it('should extract functional and technical requirements', () => {
      const content = `#+TITLE: Test Project

* Requirements

** Functional Requirements

*** User authentication system :MUST:

The system must support secure user authentication with:
- Username/password login
- Password reset functionality
- Session management

*** Data export functionality :SHOULD:

Users should be able to export their data in multiple formats.

** Technical Requirements

*** RESTful API design :MUST:

All backend endpoints must follow REST principles.

*** 99.9% uptime :COULD:

System should maintain high availability.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.requirements).toHaveLength(4);
      
      // Check functional requirements
      const funcReqs = data.requirements.filter(r => r.category === 'functional');
      expect(funcReqs).toHaveLength(2);
      expect(funcReqs[0].id).toBe('F1');
      expect(funcReqs[0].text).toBe('User authentication system');
      expect(funcReqs[0].moscowType.type).toBe('MUST');
      expect(funcReqs[0].description).toContain('Username/password login');
      
      // Check technical requirements
      const techReqs = data.requirements.filter(r => r.category === 'technical');
      expect(techReqs).toHaveLength(2);
      expect(techReqs[0].id).toBe('T1'); // Technical requirements start at T1
      expect(techReqs[0].text).toBe('RESTful API design');
      expect(techReqs[0].moscowType.type).toBe('MUST');
    });

    it('should remove MoSCoW prefix from requirement text', () => {
      const content = `#+TITLE: Test Project

* Requirements

** Functional Requirements

*** MUST User authentication

Essential feature.

*** SHOULD Faster page loads

Performance improvement.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.requirements[0].text).toBe('User authentication');
      expect(data.requirements[1].text).toBe('Faster page loads');
    });
  });

  describe('Technology Choices Extraction', () => {
    it('should extract technology choices with reasoning', () => {
      const content = `#+TITLE: Test Project

* Technology Choices

** Frontend Framework

React with TypeScript

Chosen for its component-based architecture and strong typing.

Alternatives:
- Vue.js
- Angular
- Svelte

** Database

PostgreSQL

Robust relational database with excellent performance.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.technologyChoices).toHaveLength(2);
      
      const frontend = data.technologyChoices[0];
      expect(frontend.category).toBe('Frontend Framework');
      expect(frontend.choice).toBe('React with TypeScript');
      expect(frontend.reasoning).toContain('component-based architecture');
      
      const database = data.technologyChoices[1];
      expect(database.choice).toBe('PostgreSQL');
      expect(database.reasoning).toContain('Robust relational database');
    });

    it('should handle technology choices without clear selection', () => {
      const content = `#+TITLE: Test Project

* Technology Choices

** Authentication

We need to evaluate different authentication options including JWT, OAuth2, and session-based auth.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      const auth = data.technologyChoices[0];
      expect(auth.choice).toBe('To be determined');
      expect(auth.reasoning).toContain('evaluate different authentication options');
    });
  });

  describe('Brainstorming Ideas Extraction', () => {
    it('should extract ideas from different categories', () => {
      const content = `#+TITLE: Test Project

* Brainstorming

** Core Features

- User dashboard with analytics
- Real-time notifications
- Advanced search functionality

** Architecture Considerations

- Microservices vs monolithic
- Event-driven architecture
- Caching strategy

** UI/UX Ideas

*** Dark mode support :SHOULD:

Modern applications should support dark mode.

*** Responsive design

Must work on all device sizes.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.brainstormIdeas.length).toBeGreaterThan(5);
      
      // Check core features
      const coreFeatures = data.brainstormIdeas.filter(i => i.category === 'Core Features');
      expect(coreFeatures.length).toBeGreaterThanOrEqual(3);
      expect(coreFeatures[0].text).toContain('User dashboard');
      
      // Check subsection ideas
      const darkMode = data.brainstormIdeas.find(i => i.text === 'Dark mode support');
      expect(darkMode).toBeDefined();
      expect(darkMode!.category).toBe('UI/UX Ideas');
      expect(darkMode!.subcategory).toContain('Modern applications');
    });
  });

  describe('Notes Extraction', () => {
    it('should extract notes as separate items', () => {
      const content = `#+TITLE: Test Project

* Project Overview

Test project

* Notes

Remember to check the latest security guidelines.

Consider performance implications.

This is another important note about the project.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.notes).toHaveLength(3);
      expect(data.notes[0].content).toBe('Remember to check the latest security guidelines.');
      expect(data.notes[1].content).toBe('Consider performance implications.');
      expect(data.notes[2].content).toBe('This is another important note about the project.');
    });
  });

  describe('Questions Extraction', () => {
    it('should extract questions with proper formatting', () => {
      const content = `#+TITLE: Test Project

* Project Overview

* Oustanding Questions and Concerns

- How will we handle user data privacy
- What's the expected load?
- Should we use microservices`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.questions).toHaveLength(3);
      expect(data.questions[0].question).toBe('How will we handle user data privacy?');
      expect(data.questions[1].question).toBe('What\'s the expected load?');
      expect(data.questions[2].question).toBe('Should we use microservices?');
    });

    it('should handle correctly spelled "Outstanding Questions"', () => {
      const content = `#+TITLE: Test Project

* Project Overview

* Outstanding Questions and Concerns

- Is this correctly handled?`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.questions).toHaveLength(1);
      expect(data.questions[0].question).toBe('Is this correctly handled?');
    });
  });

  describe('Research Subjects Extraction', () => {
    it('should extract research topics', () => {
      const content = `#+TITLE: Test Project

* Project Overview

* Additional Research Subjects

- Best practices for JWT implementation
- Comparison of cloud providers
- Security audit requirements`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.researchSubjects).toHaveLength(3);
      expect(data.researchSubjects[0].topic).toBe('Best practices for JWT implementation');
      expect(data.researchSubjects[1].topic).toBe('Comparison of cloud providers');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      const content = `#+TITLE: Empty Project

* Project Overview

* User Stories

* Requirements

** Functional Requirements

** Technical Requirements

* Technology Choices

* Brainstorming`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.projectOverview).toBeUndefined();
      expect(data.userStories).toHaveLength(0);
      expect(data.requirements).toHaveLength(0);
      expect(data.technologyChoices).toHaveLength(0);
      expect(data.brainstormIdeas).toHaveLength(0);
      expect(data.notes).toHaveLength(0);
      expect(data.questions).toHaveLength(0);
    });

    it('should handle missing sections', () => {
      const content = `#+TITLE: Minimal Project

* Project Overview

This is a minimal project.`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.projectOverview).toBe('This is a minimal project.');
      expect(data.userStories).toHaveLength(0);
      expect(data.requirements).toHaveLength(0);
      expect(data.notes).toHaveLength(0);
    });
  });

  describe('Metadata and Changelog', () => {
    it('should preserve metadata and changelog info', () => {
      const content = `#+TITLE: Version Test
#+DATE: 2024-01-20
#+AUTHOR: Test Author
#+VERSION: 2.0

* Project Overview

* Changelog :CHANGELOG:

- v2: Added new features
  - Feature A
  - Feature B
- v1: Initial version`;

      const parseResult = parser.parse(content);
      const data = extractor.extractData(parseResult.document!);

      expect(data.metadata.title).toBe('Version Test');
      expect(data.metadata.author).toBe('Test Author');
      expect(data.changelog).toHaveLength(2);
      expect(data.changelog[0].version).toBe('v2');
    });
  });
}); 