import { ProjectState } from '../state';
import { Requirement } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '../utils/llm-factory';

/**
 * KanoEvaluationNode - Evaluates requirements using the Kano model
 * Categorizes features as Basic, Performance, or Excitement
 */
export class KanoEvaluationNode {
  private llm: ChatOpenAI;
  
  constructor() {
    this.llm = createLLM(0.2, 2000); // Slightly higher for creative evaluation
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Skip if no requirements to evaluate
      if (!state.requirements || state.requirements.length === 0) {
        return {
          currentNode: 'KanoEvaluationNode',
          nextNode: 'DependencyAnalysisNode',
          messages: [...state.messages, new SystemMessage('No requirements to evaluate')]
        };
      }
      
      // Get MoSCoW categorization from state if available
      const moscowContext = this.extractMoscowContext(state);
      
      // Evaluate requirements using Kano model
      const evaluation = await this.evaluateRequirements(
        state.requirements,
        moscowContext,
        state
      );
      
      // Parse and structure the evaluation
      const kanoAnalysis = this.parseKanoEvaluation(evaluation, state.requirements);
      
      // Add evaluation message
      const evaluationMessage = new SystemMessage(
        `Kano Model Evaluation Complete:
        
Basic Features (${kanoAnalysis.basic.length}):
${kanoAnalysis.basic.map(r => `- ${r.description} [${r.kanoRationale}]`).join('\n')}

Performance Features (${kanoAnalysis.performance.length}):
${kanoAnalysis.performance.map(r => `- ${r.description} [${r.kanoRationale}]`).join('\n')}

Excitement Features (${kanoAnalysis.excitement.length}):
${kanoAnalysis.excitement.map(r => `- ${r.description} [${r.kanoRationale}]`).join('\n')}`
      );
      
      return {
        kanoAnalysis,
        currentNode: 'KanoEvaluationNode',
        nextNode: 'DependencyAnalysisNode',
        messages: [...state.messages, evaluationMessage]
      };
    } catch (error) {
      return {
        errors: [`KanoEvaluationNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'KanoEvaluationNode',
        nextNode: 'DependencyAnalysisNode' // Continue even with errors
      };
    }
  }
  
  private extractMoscowContext(state: ProjectState): string {
    // Extract MoSCoW categorization from state
    if (state.moscowAnalysis) {
      const { must, should, could, wont } = state.moscowAnalysis;
      return `MoSCoW Categorization:
- Must Have: ${must.map(r => r.id).join(', ') || 'None'}
- Should Have: ${should.map(r => r.id).join(', ') || 'None'}
- Could Have: ${could.map(r => r.id).join(', ') || 'None'}
- Won't Have: ${wont.map(r => r.id).join(', ') || 'None'}`;
    }
    return '';
  }
  
  private async evaluateRequirements(
    requirements: Requirement[],
    moscowContext: string,
    state: ProjectState
  ): Promise<string> {
    const systemPrompt = `You are a UX researcher expert in the Kano model for feature evaluation.
The Kano model categorizes features based on user satisfaction:

BASIC (Must-Be Quality):
- Expected by users, taken for granted
- Their absence causes dissatisfaction
- Their presence doesn't increase satisfaction
- Examples: Security, basic functionality, reliability

PERFORMANCE (One-Dimensional Quality):
- The more the better
- Linear relationship with satisfaction
- Users explicitly ask for these
- Examples: Speed, storage capacity, feature richness

EXCITEMENT (Attractive Quality):
- Unexpected delighters
- Their absence doesn't cause dissatisfaction
- Their presence greatly increases satisfaction
- Examples: Innovative features, thoughtful UX touches

For each requirement, evaluate:
1. How users would feel if the feature is present
2. How users would feel if the feature is absent
3. Whether it's expected, desired, or would surprise/delight

Output format:
BASIC: REQ-1 (Users expect this), REQ-2 (Essential functionality)
PERFORMANCE: REQ-3 (More is better), REQ-4 (Direct value correlation)
EXCITEMENT: REQ-5 (Would delight users), REQ-6 (Innovative feature)`;
    
    const userPrompt = `Project: ${state.filePath}

${moscowContext ? `${moscowContext}\n\n` : ''}

Requirements to evaluate:
${requirements.map(req => `${req.id}: ${req.description}`).join('\n')}

${this.includeUserContext(state)}

Apply Kano model evaluation:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private parseKanoEvaluation(evaluation: string, requirements: Requirement[]): {
    basic: Requirement[];
    performance: Requirement[];
    excitement: Requirement[];
  } {
    const result = {
      basic: [] as Requirement[],
      performance: [] as Requirement[],
      excitement: [] as Requirement[]
    };
    
    // Create a map for quick requirement lookup
    const reqMap = new Map<string, Requirement>();
    requirements.forEach(req => reqMap.set(req.id, req));
    
    // Parse each category
    const lines = evaluation.split('\n');
    let currentCategory: keyof typeof result | null = null;
    
    for (const line of lines) {
      const upperLine = line.toUpperCase().trim();
      
      // Check for category headers
      if (upperLine.startsWith('BASIC:')) {
        currentCategory = 'basic';
      } else if (upperLine.startsWith('PERFORMANCE:')) {
        currentCategory = 'performance';
      } else if (upperLine.startsWith('EXCITEMENT:') || upperLine.startsWith('EXCITING:')) {
        currentCategory = 'excitement';
      }
      
      // Extract requirement IDs and rationale from the line
      if (currentCategory !== null) {
        const reqIdPattern = /REQ-\d+/gi;
        const matches = line.match(reqIdPattern);
        
        if (matches) {
          matches.forEach(reqId => {
            const req = reqMap.get(reqId.toUpperCase());
            if (req && currentCategory !== null) {
              // Extract rationale (text in parentheses after the REQ-ID)
              const rationaleMatch = line.match(new RegExp(`${reqId}\\s*\\(([^)]+)\\)`, 'i'));
              const rationale = rationaleMatch ? rationaleMatch[1] : 'Evaluated by Kano model';
              
              // Add Kano category and rationale to the requirement
              const evaluatedReq = {
                ...req,
                kanoCategory: currentCategory as 'basic' | 'performance' | 'excitement',
                kanoRationale: rationale
              };
              
              result[currentCategory].push(evaluatedReq);
              reqMap.delete(reqId.toUpperCase()); // Ensure each req is only categorized once
            }
          });
        }
      }
    }
    
    // Handle any uncategorized requirements (default to performance)
    reqMap.forEach(req => {
      result.performance.push({
        ...req,
        kanoCategory: 'performance',
        kanoRationale: 'Default categorization'
      });
    });
    
    return result;
  }
  
  private includeUserContext(state: ProjectState): string {
    let context = '';
    
    // Include user stories for understanding user expectations
    if (state.userStories && state.userStories.length > 0) {
      context += '\nUser Stories (to understand expectations):\n';
      context += state.userStories
        .slice(0, 5)
        .map(story => `- As ${story.actor}, I want to ${story.action}${story.benefit ? ` so that ${story.benefit}` : ''}`)
        .join('\n');
    }
    
    // Include any excitement-oriented brainstorming ideas
    if (state.brainstormIdeas && state.brainstormIdeas.length > 0) {
      const innovativeIdeas = state.brainstormIdeas.filter(idea => 
        idea.category.toLowerCase().includes('innovat') || 
        idea.category.toLowerCase().includes('delight') ||
        idea.category.toLowerCase().includes('unique')
      );
      
      if (innovativeIdeas.length > 0) {
        context += '\n\nInnovative feature ideas:\n';
        context += innovativeIdeas
          .slice(0, 5)
          .map(idea => `- ${idea.description}`)
          .join('\n');
      }
    }
    
    // Include Q&A that might reveal user expectations
    if (state.questionsAnswers && state.questionsAnswers.length > 0) {
      const expectationQAs = state.questionsAnswers.filter(qa =>
        qa.question.toLowerCase().includes('expect') ||
        qa.question.toLowerCase().includes('must') ||
        qa.question.toLowerCase().includes('surprise')
      );
      
      if (expectationQAs.length > 0) {
        context += '\n\nExpectation-related Q&A:\n';
        context += expectationQAs
          .slice(0, 3)
          .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
          .join('\n\n');
      }
    }
    
    return context;
  }
} 