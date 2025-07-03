import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';
import { createLLM } from '../../utils/llm-factory';

interface ResearchResult {
  topic: string;
  findings: string;
}

export class AdditionalResearchNode {
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    // Get user-specified research topics from the state
    // These come from the "Additional Research Subjects" section
    const userSpecifiedTopics = this.extractUserSpecifiedTopics(state);
    
    if (userSpecifiedTopics.length === 0) {
      messages.push(new HumanMessage({
        content: "No additional research topics specified by user"
      }));
      
      return {
        messages,
        additionalResearchResults: [],
        currentNode: 'AdditionalResearchNode',
        nextNode: 'ResearchSynthesisNode'
      };
    }
    
    try {
      const llm = createLLM(0.7, 2000);
      const researchResults: ResearchResult[] = [];
      
      // Research each topic
      for (const topic of userSpecifiedTopics) {
        try {
          const findings = await this.researchTopic(topic, state, llm);
          researchResults.push({ topic, findings });
        } catch (error) {
          messages.push(new HumanMessage({
            content: `Error researching topic "${topic}": ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
      }
      
      // Create summary message
      messages.push(new HumanMessage({
        content: `Completed additional research on ${researchResults.length} topics:\n${
          researchResults.map(r => `- ${r.topic}`).join('\n')
        }`
      }));
      
      return {
        messages,
        additionalResearchResults: researchResults,
        currentNode: 'AdditionalResearchNode',
        nextNode: 'ResearchSynthesisNode'
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `AdditionalResearchNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        additionalResearchResults: [],
        errors: [...state.errors, `AdditionalResearchNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'AdditionalResearchNode',
        nextNode: 'ResearchSynthesisNode'
      };
    }
  }
  
  private extractUserSpecifiedTopics(state: ProjectState): string[] {
    // The researchTopics array may contain both auto-generated topics and user-specified ones
    // We need to identify which ones came from the "Additional Research Subjects" section
    
    // If we have questionsAnswers that include research subjects, use those
    const researchQuestions = state.questionsAnswers.filter(qa => 
      qa.question.toLowerCase().includes('additional research') ||
      qa.question.toLowerCase().includes('research subject')
    );
    
    if (researchQuestions.length > 0) {
      // Extract topics from the answers
      const topics: string[] = [];
      researchQuestions.forEach(qa => {
        const lines = qa.answer.split('\n');
        lines.forEach(line => {
          const cleaned = line.trim().replace(/^[-*]\s*/, '');
          if (cleaned && !cleaned.toLowerCase().includes('list specific topics')) {
            topics.push(cleaned);
          }
        });
      });
      return topics;
    }
    
    // Otherwise, try to identify user-specified topics from the researchTopics array
    // User-specified topics typically don't follow patterns like "X vs Y" or "best practices"
    return state.researchTopics.filter(topic => {
      const isComparison = topic.includes(' vs ') || topic.includes(' versus ');
      const isBestPractice = topic.toLowerCase().includes('best practice');
      const isGuide = topic.toLowerCase().includes('guide') || topic.toLowerCase().includes('implementation');
      const isIntegration = topic.toLowerCase().includes('integration') || topic.toLowerCase().includes('setup');
      
      // If it doesn't match common auto-generated patterns, it's likely user-specified
      return !isComparison && !isBestPractice && !isGuide && !isIntegration;
    });
  }
  
  private async researchTopic(
    topic: string, 
    state: ProjectState, 
    llm: any
  ): Promise<string> {
    // Gather project context for better research
    const projectContext = this.buildProjectContext(state);
    
    const systemPrompt = `You are a technical research assistant helping with project planning.
Research the given topic in the context of the project being planned.

Guidelines:
1. Provide current, accurate information (as of your knowledge cutoff)
2. Focus on practical insights relevant to software development
3. Include pros/cons when applicable
4. Mention popular tools, frameworks, or solutions
5. Consider scalability, performance, and maintainability
6. Keep findings concise but comprehensive (2-3 paragraphs)
7. Include specific examples or case studies when relevant`;
    
    const userPrompt = `Project Context:
${projectContext}

Research Topic: ${topic}

Please provide comprehensive findings on this topic as it relates to the project:`;
    
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
    return response.content.toString().trim();
  }
  
  private buildProjectContext(state: ProjectState): string {
    const parts: string[] = [];
    
    // Include project overview if available
    if (state.fileContent) {
      const overviewMatch = state.fileContent.match(/\* Project Overview\s*\n([\s\S]*?)(?=\n\*|$)/);
      if (overviewMatch) {
        parts.push(`Project Overview: ${overviewMatch[1].trim()}`);
      }
    }
    
    // Include key requirements
    if (state.requirements.length > 0) {
      const mustHaves = state.requirements
        .filter(r => state.moscowAnalysis.must.some(m => m.id === r.id))
        .slice(0, 3);
      
      if (mustHaves.length > 0) {
        parts.push('Key Requirements:');
        parts.push(...mustHaves.map(r => `- ${r.title}`));
      }
    }
    
    // Include primary technologies
    if (state.extractedTechnologies.length > 0) {
      parts.push(`Technologies: ${state.extractedTechnologies.slice(0, 5).join(', ')}`);
    }
    
    // Include main user story
    if (state.userStories.length > 0) {
      const mainStory = state.userStories[0];
      parts.push(`Primary User Story: As a ${mainStory.actor}, I want to ${mainStory.action} so that ${mainStory.benefit}`);
    }
    
    return parts.join('\n\n');
  }
} 