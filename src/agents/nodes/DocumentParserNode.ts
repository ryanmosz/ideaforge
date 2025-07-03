import { ProjectState } from '../state';
import { Requirement, UserStory, BrainstormIdea, QuestionAnswer } from '../types';
import { OrgModeParser } from '../../parsers/orgmode-parser';
import { OrgDocument, OrgSection } from '../../parsers/orgmode-types';

/**
 * DocumentParserNode - Parses org-mode structure and extracts initial data
 * This is typically the first node in the graph after receiving input
 */
export class DocumentParserNode {
  private parser: OrgModeParser;
  
  constructor() {
    this.parser = new OrgModeParser();
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Parse the org-mode document
      const parseResult = this.parser.parse(state.fileContent);
      
      // Handle parse errors but still try to extract what we can
      if (!parseResult.document) {
        return {
          requirements: [],
          userStories: [],
          brainstormIdeas: [],
          questionsAnswers: [],
          errors: parseResult.errors ? [`DocumentParserNode: ${parseResult.errors.map(e => e.message).join('; ')}`] : [],
          currentNode: 'DocumentParserNode',
          nextNode: 'RequirementsAnalysisNode'
        };
      }
      
      const parsedDoc: OrgDocument = parseResult.document;
      
      // Extract requirements
      const requirements = this.extractRequirements(parsedDoc);
      
      // Extract user stories
      const userStories = this.extractUserStories(parsedDoc);
      
      // Extract brainstorming ideas
      const brainstormIdeas = this.extractBrainstormIdeas(parsedDoc);
      
      // Extract Q&A
      const questionsAnswers = this.extractQuestionsAnswers(parsedDoc);
      
      // Return updated state
      return {
        requirements,
        userStories,
        brainstormIdeas,
        questionsAnswers,
        currentNode: 'DocumentParserNode',
        nextNode: 'RequirementsAnalysisNode',
        errors: parseResult.errors ? parseResult.errors.map(e => `DocumentParserNode: ${e.message}`) : undefined
      };
    } catch (error) {
      return {
        requirements: [],
        userStories: [],
        brainstormIdeas: [],
        questionsAnswers: [],
        errors: [`DocumentParserNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'DocumentParserNode',
        nextNode: null
      };
    }
  }
  
  private extractRequirements(doc: OrgDocument): Requirement[] {
    const requirements: Requirement[] = [];
    
    // Find requirements section
    const reqSection = this.findSectionByHeading(doc.sections, 'Requirements');
    
    if (reqSection && reqSection.content) {
      // Parse requirements from content
      const lines = reqSection.content.split('\n');
      let currentId = 1;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          // Simple parsing - could be enhanced
          requirements.push({
            id: `REQ-${currentId}`,
            title: trimmed.substring(0, 50),
            description: trimmed
          });
          currentId++;
        }
      }
    }
    
    return requirements;
  }
  
  private extractUserStories(doc: OrgDocument): UserStory[] {
    const userStories: UserStory[] = [];
    
    // Find user stories section
    const storySection = this.findSectionByHeading(doc.sections, 'User Stories');
    
    if (storySection && storySection.content) {
      // Split content into lines and process each line individually
      const lines = storySection.content.split('\n');
      let currentId = 1;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Parse user stories looking for "As a... I want... So that..." pattern
        const storyRegex = /As (?:a|an) ([^,]+), I want to ([^,]+?)(?:, so that (.+))?$/i;
        const match = storyRegex.exec(trimmed);
        
        if (match) {
          userStories.push({
            id: `US-${currentId}`,
            actor: match[1].trim(),
            action: match[2].trim(),
            benefit: match[3]?.trim() || ''
          });
          currentId++;
        }
      }
    }
    
    return userStories;
  }
  
  private extractBrainstormIdeas(doc: OrgDocument): BrainstormIdea[] {
    const ideas: BrainstormIdea[] = [];
    
    // Find brainstorming section
    const brainstormSection = this.findSectionByHeading(doc.sections, 'Brainstorming');
    
    if (brainstormSection) {
      let currentId = 1;
      
      // Process the section itself if it has content
      if (brainstormSection.content) {
        const lines = brainstormSection.content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            ideas.push({
              id: `IDEA-${currentId}`,
              category: 'General',
              title: trimmed.substring(0, 50),
              description: trimmed
            });
            currentId++;
          }
        }
      }
      
      // Process child sections as categories
      for (const child of brainstormSection.children) {
        if (child.content) {
          const lines = child.content.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              ideas.push({
                id: `IDEA-${currentId}`,
                category: child.heading,
                title: trimmed.substring(0, 50),
                description: trimmed
              });
              currentId++;
            }
          }
        }
      }
    }
    
    return ideas;
  }
  
  private extractQuestionsAnswers(doc: OrgDocument): QuestionAnswer[] {
    const qas: QuestionAnswer[] = [];
    
    // Find Q&A section
    const qaSection = this.findSectionByHeading(doc.sections, 'Questions and Answers');
    
    if (qaSection && qaSection.content) {
      // Parse Q&A pairs
      const lines = qaSection.content.split('\n');
      let currentQuestion = '';
      let currentAnswer = '';
      let inAnswer = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('Q:') || trimmed.startsWith('Question:')) {
          // Save previous Q&A if exists
          if (currentQuestion && currentAnswer) {
            qas.push({
              id: `QA-${qas.length + 1}`,
              question: currentQuestion,
              answer: currentAnswer
            });
          }
          
          currentQuestion = trimmed.replace(/^(Q:|Question:)\s*/i, '');
          currentAnswer = '';
          inAnswer = false;
        } else if (trimmed.startsWith('A:') || trimmed.startsWith('Answer:')) {
          currentAnswer = trimmed.replace(/^(A:|Answer:)\s*/i, '');
          inAnswer = true;
        } else if (inAnswer && trimmed) {
          currentAnswer += ' ' + trimmed;
        } else if (!inAnswer && trimmed && currentQuestion) {
          currentQuestion += ' ' + trimmed;
        }
      }
      
      // Save last Q&A pair
      if (currentQuestion.trim() && currentAnswer.trim()) {
        qas.push({
          id: `QA-${qas.length + 1}`,
          question: currentQuestion.trim(),
          answer: currentAnswer.trim()
        });
      }
    }
    
    return qas;
  }
  
  private findSectionByHeading(sections: OrgSection[], heading: string): OrgSection | undefined {
    for (const section of sections) {
      if (section.heading.toLowerCase().includes(heading.toLowerCase())) {
        return section;
      }
      // Recursively search children
      const found = this.findSectionByHeading(section.children, heading);
      if (found) return found;
    }
    return undefined;
  }
} 