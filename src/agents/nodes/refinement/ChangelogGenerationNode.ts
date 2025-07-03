import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';

interface ChangelogEntry {
  iteration: number;
  changes: string[];
  timestamp: string;
  // Extended fields for new format
  summary?: string;
  sections?: {
    title: string;
    changes: string[];
  }[];
  responsesProcessed?: number;
}

export class ChangelogGenerationNode {
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    messages.push(new HumanMessage({
      content: 'Generating changelog for refinement iteration...'
    }));
    
    try {
      // Create new changelog entry
      const changelogEntry = this.generateChangelogEntry(state);
      
      // Update changelog
      const updatedChangelog = [...state.changelog, changelogEntry];
      
      // Create formatted changelog text
      const formattedChangelog = this.formatChangelog(updatedChangelog);
      
      messages.push(new HumanMessage({
        content: `Changelog updated for iteration ${state.refinementIteration}:\n${
          changelogEntry.sections?.map(s => `- ${s.title}: ${s.changes.length} changes`).join('\n') || 
          `${changelogEntry.changes.length} changes recorded`
        }`
      }));
      
      return {
        messages,
        changelog: updatedChangelog,
        formattedChangelog,
        currentNode: 'ChangelogGenerationNode',
        nextNode: null // End of refinement flow
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `ChangelogGenerationNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        errors: [...state.errors, `ChangelogGenerationNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'ChangelogGenerationNode',
        nextNode: null
      };
    }
  }
  
  private generateChangelogEntry(state: ProjectState): ChangelogEntry {
    const sections: ChangelogEntry['sections'] = [];
    
    // Document response processing
    if (state.userResponses.length > 0) {
      const responseChanges: string[] = [];
      
      // Group responses by section
      const responsesBySection = new Map<string, typeof state.userResponses>();
      state.userResponses.forEach(response => {
        const existing = responsesBySection.get(response.section) || [];
        existing.push(response);
        responsesBySection.set(response.section, existing);
      });
      
      responsesBySection.forEach((responses, section) => {
        responseChanges.push(
          `Processed ${responses.length} feedback response(s) in "${section}" section`
        );
        
        // Add specific tags processed
        const tags = responses.map(r => r.tag).slice(0, 3);
        if (tags.length > 0) {
          responseChanges.push(
            `Tags processed: ${tags.join(', ')}${responses.length > 3 ? ` (and ${responses.length - 3} more)` : ''}`
          );
        }
      });
      
      sections.push({
        title: 'User Feedback Processing',
        changes: responseChanges
      });
    }
    
    // Document requirement changes
    const requirementChanges = this.detectRequirementChanges(state);
    if (requirementChanges.length > 0) {
      sections.push({
        title: 'Requirement Updates',
        changes: requirementChanges
      });
    }
    
    // Document categorization changes
    const categorizationChanges = this.detectCategorizationChanges(state);
    if (categorizationChanges.length > 0) {
      sections.push({
        title: 'Categorization Changes',
        changes: categorizationChanges
      });
    }
    
    // Document research updates
    const researchChanges = this.detectResearchChanges(state);
    if (researchChanges.length > 0) {
      sections.push({
        title: 'Research Updates',
        changes: researchChanges
      });
    }
    
    // If no specific changes detected, add general update
    if (sections.length === 0) {
      sections.push({
        title: 'General Updates',
        changes: ['Refinement iteration completed with no specific changes']
      });
    }
    
    // Create changes array from sections for base format compatibility
    const changes: string[] = [];
    sections.forEach(section => {
      changes.push(`${section.title}:`);
      section.changes.forEach(change => {
        changes.push(`  ${change}`);
      });
    });
    
    return {
      iteration: state.refinementIteration,
      changes,
      timestamp: new Date().toISOString(),
      // Extended fields
      summary: this.generateSummary(sections, state.userResponses.length),
      sections,
      responsesProcessed: state.userResponses.length
    };
  }
  
  private detectRequirementChanges(state: ProjectState): string[] {
    const changes: string[] = [];
    
    // Check for new requirements (comparing with initial count would require tracking)
    // For now, we'll note if requirements exist
    if (state.requirements.length > 0) {
      const withDescriptions = state.requirements.filter(r => 
        r.description && r.description !== r.title
      ).length;
      
      changes.push(`Total requirements: ${state.requirements.length}`);
      if (withDescriptions > 0) {
        changes.push(`Requirements with detailed descriptions: ${withDescriptions}`);
      }
      
      // Check for feedback markers in descriptions
      const withFeedback = state.requirements.filter(r => 
        r.description && r.description.includes('[Updated based on feedback:')
      ).length;
      
      if (withFeedback > 0) {
        changes.push(`Requirements updated based on feedback: ${withFeedback}`);
      }
    }
    
    return changes;
  }
  
  private detectCategorizationChanges(state: ProjectState): string[] {
    const changes: string[] = [];
    
    // MoSCoW distribution
    const moscowTotal = state.moscowAnalysis.must.length + 
                       state.moscowAnalysis.should.length +
                       state.moscowAnalysis.could.length +
                       state.moscowAnalysis.wont.length;
    
    if (moscowTotal > 0) {
      changes.push(
        `MoSCoW distribution: Must(${state.moscowAnalysis.must.length}), ` +
        `Should(${state.moscowAnalysis.should.length}), ` +
        `Could(${state.moscowAnalysis.could.length}), ` +
        `Won't(${state.moscowAnalysis.wont.length})`
      );
    }
    
    // Kano distribution
    const kanoTotal = state.kanoAnalysis.basic.length +
                     state.kanoAnalysis.performance.length +
                     state.kanoAnalysis.excitement.length;
    
    if (kanoTotal > 0) {
      changes.push(
        `Kano distribution: Basic(${state.kanoAnalysis.basic.length}), ` +
        `Performance(${state.kanoAnalysis.performance.length}), ` +
        `Excitement(${state.kanoAnalysis.excitement.length})`
      );
    }
    
    return changes;
  }
  
  private detectResearchChanges(state: ProjectState): string[] {
    const changes: string[] = [];
    
    if (state.extractedTechnologies.length > 0) {
      changes.push(`Technologies identified: ${state.extractedTechnologies.length}`);
      const techPreview = state.extractedTechnologies.slice(0, 5);
      changes.push(`Including: ${techPreview.join(', ')}${
        state.extractedTechnologies.length > 5 ? ' ...' : ''
      }`);
    }
    
    if (state.hackerNewsResults.length > 0) {
      changes.push(`Hacker News discussions analyzed: ${state.hackerNewsResults.length}`);
    }
    
    if (state.redditResults.length > 0) {
      changes.push(`Reddit threads analyzed: ${state.redditResults.length}`);
    }
    
    if (state.additionalResearchResults.length > 0) {
      changes.push(`Additional research topics explored: ${state.additionalResearchResults.length}`);
    }
    
    return changes;
  }
  
  private generateSummary(sections: ChangelogEntry['sections'], responsesProcessed: number): string {
    if (responsesProcessed === 0) {
      return 'Refinement iteration completed with no user feedback';
    }
    
    if (!sections) {
      return `Processed ${responsesProcessed} user response(s)`;
    }
    
    const totalChanges = sections.reduce((sum, section) => sum + section.changes.length, 0);
    const sectionNames = sections.map(s => s.title);
    
    if (sectionNames.length === 1) {
      return `Processed ${responsesProcessed} user response(s) with ${totalChanges} change(s) in ${sectionNames[0]}`;
    }
    
    return `Processed ${responsesProcessed} user response(s) with ${totalChanges} total change(s) across ${sectionNames.length} areas`;
  }
  
  private formatChangelog(changelog: any[]): string {
    const lines: string[] = ['# IdeaForge Analysis Changelog\n'];
    
    // Sort by iteration descending (newest first)
    const sortedEntries = [...changelog].sort((a, b) => 
      ((b.version || b.iteration) || 0) - ((a.version || a.iteration) || 0)
    );
    
    sortedEntries.forEach(entry => {
      const iteration = entry.version || entry.iteration || 0;
      lines.push(`## Version ${iteration} - ${
        entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Initial'
      }`);
      
      // Handle new format with sections
      if (entry.sections && entry.summary) {
        lines.push(`**Summary:** ${entry.summary}\n`);
        
        entry.sections.forEach((section: any) => {
          lines.push(`### ${section.title}`);
          section.changes.forEach((change: string) => {
            lines.push(`- ${change}`);
          });
          lines.push('');
        });
      } else if (entry.changes) {
        // Handle basic format
        entry.changes.forEach((change: string) => {
          if (change.endsWith(':')) {
            // Section header
            lines.push(`\n**${change}**`);
          } else {
            // Regular change
            lines.push(change);
          }
        });
        
        if (entry.responsesProcessed !== undefined) {
          lines.push(`\n*Responses processed: ${entry.responsesProcessed}*`);
        }
      }
      
      lines.push('');
      
      lines.push('---\n');
    });
    
    return lines.join('\n');
  }
} 