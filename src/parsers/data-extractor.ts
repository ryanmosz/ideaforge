/**
 * Data extraction service for IdeaForge org-mode documents.
 * Extracts structured data from parsed documents into domain models.
 */

import { OrgDocument, OrgSection } from './orgmode-types';
import {
  ParsedDocumentData,
  UserStory,
  Requirement,
  BrainstormIdea,
  TechnologyChoice,
  MoscowTag,
  Note,
  Question,
  ResearchSubject
} from '../models/document-types';

/**
 * Extracts structured data from parsed org-mode documents
 */
export class DataExtractor {
  /**
   * Extract all data from a parsed org-mode document
   * @param document - Parsed org document
   * @returns Structured document data
   */
  extractData(document: OrgDocument): ParsedDocumentData {
    const data: ParsedDocumentData = {
      metadata: document.metadata,
      projectOverview: this.extractProjectOverview(document),
      userStories: this.extractUserStories(document),
      requirements: this.extractRequirements(document),
      technologyChoices: this.extractTechnologyChoices(document),
      brainstormIdeas: this.extractBrainstormingIdeas(document),
      notes: this.extractNotes(document),
      questions: this.extractQuestions(document),
      researchSubjects: this.extractResearchSubjects(document),
      changelog: document.changelog || []
    };

    return data;
  }

  /**
   * Extract project overview content
   */
  private extractProjectOverview(document: OrgDocument): string | undefined {
    const overviewSection = this.findSection(document.sections, 'Project Overview');
    return overviewSection?.content.trim() || undefined;
  }

  /**
   * Extract user stories from the document
   */
  private extractUserStories(document: OrgDocument): UserStory[] {
    const stories: UserStory[] = [];
    const userStoriesSection = this.findSection(document.sections, 'User Stories');
    
    if (!userStoriesSection) {
      return stories;
    }

    // Each child of User Stories is a story
    userStoriesSection.children.forEach(storySection => {
      // Try to parse structured format: "As a [role], I want [feature] so that [benefit]"
      const structuredMatch = storySection.heading.match(
        /^As\s+a\s+(.+?),\s*I\s+want\s+(.+?)(?:\s+so\s+that\s+(.+))?$/i
      );

      if (structuredMatch) {
        stories.push({
          role: structuredMatch[1].trim(),
          action: structuredMatch[2].trim(),
          benefit: structuredMatch[3]?.trim() || '',
          rawText: `${storySection.heading}\n${storySection.content}`.trim()
        });
      } else {
        // Try to extract from content if heading doesn't match
        const contentMatch = storySection.content.match(
          /As\s+a\s+(.+?),\s*I\s+want\s+(.+?)(?:\s+so\s+that\s+(.+?))?\.?$/is
        );
        
        if (contentMatch) {
          stories.push({
            role: contentMatch[1].trim(),
            action: contentMatch[2].trim(),
            benefit: contentMatch[3]?.trim() || '',
            rawText: `${storySection.heading}\n${storySection.content}`.trim()
          });
        }
      }
    });

    return stories;
  }

  /**
   * Extract requirements from the document
   */
  private extractRequirements(document: OrgDocument): Requirement[] {
    const requirements: Requirement[] = [];
    const reqSection = this.findSection(document.sections, 'Requirements');
    
    if (!reqSection) {
      return requirements;
    }

    let funcCounter = 1;
    let techCounter = 1;

    // Process functional requirements
    const functionalSection = this.findSection(reqSection.children, 'Functional Requirements');
    if (functionalSection) {
      functionalSection.children.forEach(req => {
        requirements.push(this.createRequirement(req, 'functional', funcCounter++));
      });
    }

    // Process technical requirements
    const technicalSection = this.findSection(reqSection.children, 'Technical Requirements');
    if (technicalSection) {
      technicalSection.children.forEach(req => {
        requirements.push(this.createRequirement(req, 'technical', techCounter++));
      });
    }

    return requirements;
  }

  /**
   * Create a requirement from an org section
   */
  private createRequirement(
    section: OrgSection, 
    category: 'functional' | 'technical',
    index: number
  ): Requirement {
    const moscowTag = this.extractMoscowTag(section.tags);
    const prefix = category === 'functional' ? 'F' : 'T';
    
    // Remove MoSCoW prefix from heading if present
    let text = section.heading;
    const prefixMatch = text.match(/^(MUST|SHOULD|COULD|WONT)\s+(.+)$/);
    if (prefixMatch) {
      text = prefixMatch[2];
    }
    
    return {
      id: `${prefix}${index}`,
      text: text,
      description: section.content.trim(),
      moscowType: moscowTag,
      category
    };
  }

  /**
   * Extract technology choices from the document
   */
  private extractTechnologyChoices(document: OrgDocument): TechnologyChoice[] {
    const choices: TechnologyChoice[] = [];
    const techSection = this.findSection(document.sections, 'Technology Choices');
    
    if (!techSection) {
      return choices;
    }

    techSection.children.forEach(categorySection => {
      // Extract the main choice from the first line of content
      const lines = categorySection.content.trim().split('\n');
      let choice = '';
      let reasoning = categorySection.content.trim();
      
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Check if first line looks like a technology name
        if (firstLine && (!firstLine.includes(' ') || firstLine.split(' ').length <= 3)) {
          choice = firstLine;
          reasoning = lines.slice(1).join('\n').trim();
        }
      }

      if (choice || reasoning) {
        choices.push({
          category: categorySection.heading,
          choice: choice || 'To be determined',
          reasoning: reasoning || undefined
        });
      }
    });

    return choices;
  }

  /**
   * Extract brainstorming ideas from the document
   */
  private extractBrainstormingIdeas(document: OrgDocument): BrainstormIdea[] {
    const ideas: BrainstormIdea[] = [];
    const brainstormSection = this.findSection(document.sections, 'Brainstorming');
    
    if (!brainstormSection) {
      return ideas;
    }

    // Process each brainstorming category
    brainstormSection.children.forEach(categorySection => {
      const category = categorySection.heading;
      
      // Extract ideas from bullet points in content
      const bulletIdeas = this.extractBulletPoints(categorySection.content);
      bulletIdeas.forEach(idea => {
        ideas.push({
          category,
          text: idea
        });
      });

      // Also process subsections as ideas
      categorySection.children.forEach(subSection => {
        ideas.push({
          category,
          text: subSection.heading,
          subcategory: subSection.content.trim() || undefined
        });
      });
    });

    return ideas;
  }

  /**
   * Extract notes from the document
   */
  private extractNotes(document: OrgDocument): Note[] {
    const notes: Note[] = [];
    const notesSection = this.findSection(document.sections, 'Notes');
    
    if (!notesSection || !notesSection.content.trim()) {
      return notes;
    }

    // Each paragraph or bullet point becomes a note
    const paragraphs = notesSection.content.split(/\n\n+/);
    paragraphs.forEach(paragraph => {
      const trimmed = paragraph.trim();
      if (trimmed) {
        notes.push({
          content: trimmed
        });
      }
    });

    return notes;
  }

  /**
   * Extract questions from the document
   */
  private extractQuestions(document: OrgDocument): Question[] {
    const questions: Question[] = [];
    
    // Look for both spellings
    const questionsSection = this.findSection(document.sections, 'Outstanding Questions and Concerns') ||
                            this.findSection(document.sections, 'Oustanding Questions and Concerns');
    
    if (!questionsSection || !questionsSection.content.trim()) {
      return questions;
    }

    // Extract questions from bullet points
    const bulletQuestions = this.extractBulletPoints(questionsSection.content);
    bulletQuestions.forEach(q => {
      questions.push({
        question: q.replace(/\?$/, '') + '?' // Ensure question mark
      });
    });

    return questions;
  }

  /**
   * Extract research subjects from the document
   */
  private extractResearchSubjects(document: OrgDocument): ResearchSubject[] {
    const subjects: ResearchSubject[] = [];
    const researchSection = this.findSection(document.sections, 'Additional Research Subjects');
    
    if (!researchSection || !researchSection.content.trim()) {
      return subjects;
    }

    // Extract subjects from bullet points
    const bulletSubjects = this.extractBulletPoints(researchSection.content);
    bulletSubjects.forEach(subject => {
      subjects.push({
        topic: subject
      });
    });

    return subjects;
  }

  /**
   * Extract MoSCoW tag information
   */
  private extractMoscowTag(tags: string[]): MoscowTag {
    const moscowTypes = ['MUST', 'SHOULD', 'COULD', 'WONT'];
    const found = tags.find(tag => moscowTypes.includes(tag));
    
    return {
      type: (found || 'SHOULD') as 'MUST' | 'SHOULD' | 'COULD' | 'WONT',
      confidence: found ? 10 : 5
    };
  }

  /**
   * Extract bullet points from content
   */
  private extractBulletPoints(content: string): string[] {
    const points: string[] = [];
    const lines = content.split('\n');
    let currentPoint: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^[-*+]\s+/)) {
        // New bullet point
        if (currentPoint.length > 0) {
          points.push(currentPoint.join(' ').replace(/^[-*+]\s+/, ''));
        }
        currentPoint = [trimmed];
      } else if (trimmed && currentPoint.length > 0) {
        // Continuation of current point
        currentPoint.push(trimmed);
      }
    }

    // Don't forget the last point
    if (currentPoint.length > 0) {
      points.push(currentPoint.join(' ').replace(/^[-*+]\s+/, ''));
    }

    return points;
  }

  /**
   * Find a section by heading (case-insensitive)
   */
  private findSection(sections: OrgSection[], heading: string): OrgSection | undefined {
    const lowerHeading = heading.toLowerCase();
    return sections.find(s => s.heading.toLowerCase() === lowerHeading);
  }
} 