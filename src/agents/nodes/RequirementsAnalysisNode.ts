import { ProjectState } from '../state';
import { Requirement } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '../utils/llm-factory';

/**
 * RequirementsAnalysisNode - Analyzes requirements to understand project goals
 * This node uses AI to analyze requirements and extract key project insights
 */
export class RequirementsAnalysisNode {
  private llm: ChatOpenAI;
  
  constructor() {
    this.llm = createLLM(0.2, 2000);
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Skip if no requirements to analyze
      if (!state.requirements || state.requirements.length === 0) {
        return {
          currentNode: 'RequirementsAnalysisNode',
          nextNode: 'MoscowCategorizationNode',
          messages: [...state.messages, new SystemMessage('No requirements found to analyze')]
        };
      }
      
      // Prepare requirements for analysis
      const requirementsText = this.formatRequirements(state.requirements);
      
      // Analyze project goals
      const projectGoals = await this.analyzeProjectGoals(requirementsText, state);
      
      // Extract key themes
      const keyThemes = await this.extractKeyThemes(requirementsText, state);
      
      // Identify critical success factors
      const criticalFactors = await this.identifyCriticalFactors(requirementsText, state);
      
      // Store analysis in messages for future nodes
      const analysisMessage = new SystemMessage(
        `Requirements Analysis Complete:
        
Project Goals:
${projectGoals}

Key Themes:
${keyThemes}

Critical Success Factors:
${criticalFactors}`
      );
      
      return {
        currentNode: 'RequirementsAnalysisNode',
        nextNode: 'MoscowCategorizationNode',
        messages: [...state.messages, analysisMessage]
      };
    } catch (error) {
      return {
        errors: [`RequirementsAnalysisNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'RequirementsAnalysisNode',
        nextNode: 'MoscowCategorizationNode' // Continue even with errors
      };
    }
  }
  
  private formatRequirements(requirements: Requirement[]): string {
    return requirements
      .map(req => `[${req.id}] ${req.description}`)
      .join('\n');
  }
  
  private async analyzeProjectGoals(requirementsText: string, state: ProjectState): Promise<string> {
    const systemPrompt = `You are a senior project analyst. Analyze the following requirements and identify the main project goals.
Focus on:
1. The primary objective or purpose of the project
2. Key business value or user benefit
3. The problem being solved

Be concise and specific.`;
    
    const userPrompt = `Project: ${state.filePath}

Requirements:
${requirementsText}

${this.includeContext(state)}

Identify the main project goals:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private async extractKeyThemes(requirementsText: string, state: ProjectState): Promise<string> {
    const systemPrompt = `You are a requirements analyst. Identify the key themes or categories in these requirements.
Group related requirements and identify patterns.

Output format:
- Theme 1: Description
- Theme 2: Description
(etc.)`;
    
    const userPrompt = `Requirements:
${requirementsText}

${this.includeContext(state)}

Extract key themes:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private async identifyCriticalFactors(requirementsText: string, state: ProjectState): Promise<string> {
    const systemPrompt = `You are a project strategist. Based on these requirements, identify critical success factors.
These are the elements that MUST work correctly for the project to succeed.

Consider:
- Technical dependencies
- User experience essentials
- Business-critical features
- Performance requirements`;
    
    const userPrompt = `Requirements:
${requirementsText}

${this.includeContext(state)}

List critical success factors:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private includeContext(state: ProjectState): string {
    let context = '';
    
    // Include user stories if available
    if (state.userStories && state.userStories.length > 0) {
      context += '\nUser Stories:\n';
      context += state.userStories
        .map(story => `- As ${story.actor}, I want to ${story.action}${story.benefit ? `, so that ${story.benefit}` : ''}`)
        .join('\n');
    }
    
    // Include Q&A if available
    if (state.questionsAnswers && state.questionsAnswers.length > 0) {
      context += '\n\nProject Q&A:\n';
      context += state.questionsAnswers
        .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join('\n\n');
    }
    
    return context;
  }
} 