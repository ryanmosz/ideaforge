import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';
import { createLLM } from '../../utils/llm-factory';

interface FeedbackIntegration {
  requirementUpdates: Array<{
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }>;
  categoryChanges: Array<{
    itemId: string;
    fromCategory: string;
    toCategory: string;
    reason: string;
  }>;
  newRequirements: Array<{
    title: string;
    description: string;
    source: string;
  }>;
  clarifications: Array<{
    section: string;
    clarification: string;
  }>;
}

export class FeedbackIntegrationNode {
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    messages.push(new HumanMessage({
      content: `Integrating ${state.userResponses.length} feedback responses...`
    }));
    
    try {
      if (state.userResponses.length === 0) {
        messages.push(new HumanMessage({
          content: "No feedback to integrate"
        }));
        
        return {
          messages,
          currentNode: 'FeedbackIntegrationNode',
          nextNode: 'ChangelogGenerationNode'
        };
      }
      
      // Use AI to analyze how to apply the feedback
      const integration = await this.analyzeFeedback(state);
      
      // Apply requirement updates
      const updatedRequirements = this.applyRequirementUpdates(
        state.requirements,
        integration.requirementUpdates
      );
      
      // Apply category changes
      const updatedMoscow = this.applyMoscowChanges(
        state.moscowAnalysis,
        integration.categoryChanges
      );
      
      const updatedKano = this.applyKanoChanges(
        state.kanoAnalysis,
        integration.categoryChanges
      );
      
      // Add new requirements from feedback
      const allRequirements = [
        ...updatedRequirements,
        ...integration.newRequirements.map((req, idx) => ({
          id: `REQ-${updatedRequirements.length + idx + 1}`,
          title: req.title,
          description: req.description
        }))
      ];
      
      // Create summary of changes
      const changesSummary = this.createChangesSummary(integration);
      
      messages.push(new HumanMessage({
        content: `Feedback integrated successfully:\n${changesSummary}`
      }));
      
      return {
        messages,
        requirements: allRequirements,
        moscowAnalysis: updatedMoscow,
        kanoAnalysis: updatedKano,
        currentNode: 'FeedbackIntegrationNode',
        nextNode: 'ChangelogGenerationNode'
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `FeedbackIntegrationNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        errors: [...state.errors, `FeedbackIntegrationNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'FeedbackIntegrationNode',
        nextNode: null
      };
    }
  }
  
  private async analyzeFeedback(state: ProjectState): Promise<FeedbackIntegration> {
    const llm = createLLM();
    
    const systemPrompt = `You are analyzing user feedback on a project planning document.
    Your task is to determine how to integrate the feedback into the existing analysis.
    
    You should identify:
    1. Updates to existing requirements (title, description changes)
    2. Changes to MoSCoW or Kano categorizations
    3. New requirements that should be added
    4. General clarifications that affect understanding
    
    Respond with a JSON object matching the FeedbackIntegration interface.`;
    
    const userPrompt = this.buildFeedbackPrompt(state);
    
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
    const content = response.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid LLM response format');
    }
    
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]) as FeedbackIntegration;
    } catch (error) {
      // Fallback: create minimal integration
      return {
        requirementUpdates: [],
        categoryChanges: [],
        newRequirements: [],
        clarifications: state.userResponses.map(r => ({
          section: r.section,
          clarification: r.response
        }))
      };
    }
  }
  
  private buildFeedbackPrompt(state: ProjectState): string {
    const sections: string[] = [];
    
    // Current requirements
    sections.push('CURRENT REQUIREMENTS:');
    state.requirements.forEach(req => {
      sections.push(`- ${req.id}: ${req.title}`);
      if (req.description && req.description !== req.title) {
        sections.push(`  Description: ${req.description}`);
      }
    });
    
    // Current categorizations
    if (state.moscowAnalysis.must.length > 0 || state.moscowAnalysis.should.length > 0) {
      sections.push('\nCURRENT MOSCOW CATEGORIZATION:');
      sections.push(`Must Have: ${state.moscowAnalysis.must.map(r => r.id).join(', ')}`);
      sections.push(`Should Have: ${state.moscowAnalysis.should.map(r => r.id).join(', ')}`);
      sections.push(`Could Have: ${state.moscowAnalysis.could.map(r => r.id).join(', ')}`);
      sections.push(`Won't Have: ${state.moscowAnalysis.wont.map(r => r.id).join(', ')}`);
    }
    
    // User feedback
    sections.push('\nUSER FEEDBACK:');
    state.userResponses.forEach(response => {
      sections.push(`\nSection: ${response.section}`);
      sections.push(`Tag: ${response.tag}`);
      sections.push(`Feedback: ${response.response}`);
    });
    
    sections.push('\nAnalyze how to integrate this feedback into the project analysis.');
    
    return sections.join('\n');
  }
  
  private applyRequirementUpdates(
    requirements: ProjectState['requirements'],
    updates: FeedbackIntegration['requirementUpdates']
  ): ProjectState['requirements'] {
    const updatedReqs = [...requirements];
    
    updates.forEach(update => {
      const reqIndex = updatedReqs.findIndex(r => r.id === update.id);
      if (reqIndex >= 0) {
        const req = { ...updatedReqs[reqIndex] };
        
        if (update.field === 'title') {
          req.title = update.newValue;
        } else if (update.field === 'description') {
          req.description = update.newValue;
        }
        
        // Add feedback note
        req.description = `${req.description}\n\n[Updated based on feedback: ${update.reason}]`;
        
        updatedReqs[reqIndex] = req;
      }
    });
    
    return updatedReqs;
  }
  
  private applyMoscowChanges(
    moscowAnalysis: ProjectState['moscowAnalysis'],
    changes: FeedbackIntegration['categoryChanges']
  ): ProjectState['moscowAnalysis'] {
    const updated = {
      must: [...moscowAnalysis.must],
      should: [...moscowAnalysis.should],
      could: [...moscowAnalysis.could],
      wont: [...moscowAnalysis.wont]
    };
    
    changes.forEach(change => {
      // Remove from old category
      const fromKey = change.fromCategory.toLowerCase() as keyof typeof updated;
      if (fromKey in updated) {
        updated[fromKey] = updated[fromKey].filter(r => r.id !== change.itemId);
      }
      
      // Add to new category
      const toKey = change.toCategory.toLowerCase() as keyof typeof updated;
      if (toKey in updated) {
        // Find the requirement
        const req = [...moscowAnalysis.must, ...moscowAnalysis.should, 
                     ...moscowAnalysis.could, ...moscowAnalysis.wont]
                     .find(r => r.id === change.itemId);
        
        if (req) {
          updated[toKey].push({
            ...req,
            moscowCategory: toKey
          });
        }
      }
    });
    
    return updated;
  }
  
  private applyKanoChanges(
    kanoAnalysis: ProjectState['kanoAnalysis'],
    changes: FeedbackIntegration['categoryChanges']
  ): ProjectState['kanoAnalysis'] {
    const updated = {
      basic: [...kanoAnalysis.basic],
      performance: [...kanoAnalysis.performance],
      excitement: [...kanoAnalysis.excitement]
    };
    
    changes.forEach(change => {
      // Check if this is a Kano category change
      const kanoCategories = ['basic', 'performance', 'excitement'];
      if (!kanoCategories.includes(change.toCategory.toLowerCase())) {
        return;
      }
      
      // Remove from all categories
      Object.keys(updated).forEach(key => {
        const k = key as keyof typeof updated;
        updated[k] = updated[k].filter(r => r.id !== change.itemId);
      });
      
      // Add to new category
      const toKey = change.toCategory.toLowerCase() as keyof typeof updated;
      const req = [...kanoAnalysis.basic, ...kanoAnalysis.performance, 
                   ...kanoAnalysis.excitement].find(r => r.id === change.itemId);
      
      if (req) {
        updated[toKey].push({
          ...req,
          kanoCategory: toKey
        });
      }
    });
    
    return updated;
  }
  
  private createChangesSummary(integration: FeedbackIntegration): string {
    const lines: string[] = [];
    
    if (integration.requirementUpdates.length > 0) {
      lines.push(`- Updated ${integration.requirementUpdates.length} requirements`);
      integration.requirementUpdates.slice(0, 3).forEach(update => {
        lines.push(`  • ${update.id}: ${update.field} changed`);
      });
      if (integration.requirementUpdates.length > 3) {
        lines.push(`  • ... and ${integration.requirementUpdates.length - 3} more`);
      }
    }
    
    if (integration.categoryChanges.length > 0) {
      lines.push(`- Recategorized ${integration.categoryChanges.length} items`);
      integration.categoryChanges.slice(0, 2).forEach(change => {
        lines.push(`  • ${change.itemId}: ${change.fromCategory} → ${change.toCategory}`);
      });
    }
    
    if (integration.newRequirements.length > 0) {
      lines.push(`- Added ${integration.newRequirements.length} new requirements`);
      integration.newRequirements.slice(0, 2).forEach(req => {
        lines.push(`  • ${req.title}`);
      });
    }
    
    if (integration.clarifications.length > 0) {
      lines.push(`- Processed ${integration.clarifications.length} clarifications`);
    }
    
    return lines.length > 0 ? lines.join('\n') : 'No changes required';
  }
} 