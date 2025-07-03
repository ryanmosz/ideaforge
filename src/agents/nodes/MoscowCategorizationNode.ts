import { ProjectState } from '../state';
import { Requirement } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * MoscowCategorizationNode - Applies MoSCoW framework to categorize requirements
 * Must have, Should have, Could have, Won't have (this release)
 */
export class MoscowCategorizationNode {
  private llm: ChatOpenAI;
  
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1, // Lower temperature for more consistent categorization
      maxTokens: 2000
    });
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Skip if no requirements to categorize
      if (!state.requirements || state.requirements.length === 0) {
        return {
          currentNode: 'MoscowCategorizationNode',
          nextNode: 'KanoEvaluationNode',
          messages: [...state.messages, new SystemMessage('No requirements to categorize')]
        };
      }
      
      // Get previous analysis from messages if available
      const analysisContext = this.extractAnalysisContext(state.messages);
      
      // Categorize requirements
      const categorization = await this.categorizeRequirements(
        state.requirements,
        analysisContext,
        state
      );
      
      // Parse and validate categorization
      const moscowAnalysis = this.parseCategorization(categorization, state.requirements);
      
      // Add categorization message
      const categorizationMessage = new SystemMessage(
        `MoSCoW Categorization Complete:
        
Must Have (${moscowAnalysis.must.length}):
${moscowAnalysis.must.map(r => `- ${r.description}`).join('\n')}

Should Have (${moscowAnalysis.should.length}):
${moscowAnalysis.should.map(r => `- ${r.description}`).join('\n')}

Could Have (${moscowAnalysis.could.length}):
${moscowAnalysis.could.map(r => `- ${r.description}`).join('\n')}

Won't Have (${moscowAnalysis.wont.length}):
${moscowAnalysis.wont.map(r => `- ${r.description}`).join('\n')}`
      );
      
      return {
        moscowAnalysis,
        currentNode: 'MoscowCategorizationNode',
        nextNode: 'KanoEvaluationNode',
        messages: [...state.messages, categorizationMessage]
      };
    } catch (error) {
      return {
        errors: [`MoscowCategorizationNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'MoscowCategorizationNode',
        nextNode: 'KanoEvaluationNode' // Continue even with errors
      };
    }
  }
  
  private extractAnalysisContext(messages: any[]): string {
    // Find the requirements analysis message
    const analysisMessage = messages
      .reverse()
      .find(msg => {
        if (msg instanceof SystemMessage) {
          const content = typeof msg.content === 'string' ? msg.content : '';
          return content.includes('Requirements Analysis Complete');
        }
        return false;
      });
    
    if (analysisMessage) {
      return typeof analysisMessage.content === 'string' ? analysisMessage.content : '';
    }
    return '';
  }
  
  private async categorizeRequirements(
    requirements: Requirement[],
    analysisContext: string,
    state: ProjectState
  ): Promise<string> {
    const systemPrompt = `You are a product prioritization expert specializing in the MoSCoW method.
Categorize each requirement into one of four categories:

MUST HAVE: Critical for launch, project fails without it
SHOULD HAVE: Important but project can succeed without it temporarily
COULD HAVE: Nice to have, adds value but not critical
WON'T HAVE: Out of scope for this release

Consider:
- Project goals and critical success factors from the analysis
- Technical dependencies between requirements
- User impact and business value
- Implementation complexity vs benefit

Output format (use exact requirement IDs):
MUST: REQ-1, REQ-3
SHOULD: REQ-2
COULD: REQ-4, REQ-5
WONT: REQ-6`;
    
    const userPrompt = `Project: ${state.filePath}

${analysisContext ? `Previous Analysis:\n${analysisContext}\n\n` : ''}

Requirements to categorize:
${requirements.map(req => `${req.id}: ${req.description}`).join('\n')}

${this.includeAdditionalContext(state)}

Apply MoSCoW categorization:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private parseCategorization(categorization: string, requirements: Requirement[]): {
    must: Requirement[];
    should: Requirement[];
    could: Requirement[];
    wont: Requirement[];
  } {
    const result = {
      must: [] as Requirement[],
      should: [] as Requirement[],
      could: [] as Requirement[],
      wont: [] as Requirement[]
    };
    
    // Create a map for quick requirement lookup
    const reqMap = new Map<string, Requirement>();
    requirements.forEach(req => reqMap.set(req.id, req));
    
    // Parse each category
    const lines = categorization.split('\n');
    let currentCategory: keyof typeof result | null = null;
    
    for (const line of lines) {
      const upperLine = line.toUpperCase().trim();
      
      // Check for category headers
      if (upperLine.startsWith('MUST:') || upperLine.startsWith('MUST HAVE:')) {
        currentCategory = 'must';
      } else if (upperLine.startsWith('SHOULD:') || upperLine.startsWith('SHOULD HAVE:')) {
        currentCategory = 'should';
      } else if (upperLine.startsWith('COULD:') || upperLine.startsWith('COULD HAVE:')) {
        currentCategory = 'could';
      } else if (upperLine.startsWith('WONT:') || upperLine.startsWith("WON'T:") || upperLine.startsWith("WON'T HAVE:")) {
        currentCategory = 'wont';
      }
      
      // Extract requirement IDs from the line
      if (currentCategory !== null) {
        const reqIdPattern = /REQ-\d+/gi;
        const matches = line.match(reqIdPattern);
        
        if (matches) {
          matches.forEach(reqId => {
            const req = reqMap.get(reqId.toUpperCase());
            if (req && currentCategory !== null) {
              // Add MoSCoW category to the requirement
              const categorizedReq = {
                ...req,
                moscowCategory: currentCategory as 'must' | 'should' | 'could' | 'wont'
              };
              result[currentCategory].push(categorizedReq);
              reqMap.delete(reqId.toUpperCase()); // Ensure each req is only categorized once
            }
          });
        }
      }
    }
    
    // Handle any uncategorized requirements (put in 'could' by default)
    reqMap.forEach(req => {
      result.could.push({
        ...req,
        moscowCategory: 'could'
      });
    });
    
    return result;
  }
  
  private includeAdditionalContext(state: ProjectState): string {
    let context = '';
    
    // Include user stories for better understanding of user needs
    if (state.userStories && state.userStories.length > 0) {
      context += '\nUser Stories for context:\n';
      context += state.userStories
        .slice(0, 5) // Limit to avoid token overflow
        .map(story => `- As ${story.actor}, I want to ${story.action}`)
        .join('\n');
    }
    
    // Include brainstorming ideas that might influence prioritization
    if (state.brainstormIdeas && state.brainstormIdeas.length > 0) {
      const coreIdeas = state.brainstormIdeas.filter(idea => 
        idea.category.toLowerCase().includes('core') || 
        idea.category.toLowerCase().includes('essential')
      );
      
      if (coreIdeas.length > 0) {
        context += '\n\nCore feature ideas:\n';
        context += coreIdeas
          .slice(0, 5)
          .map(idea => `- ${idea.description}`)
          .join('\n');
      }
    }
    
    return context;
  }
} 