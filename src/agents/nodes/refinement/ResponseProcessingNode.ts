import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';

interface ResponseTag {
  id: string;
  tag: string;
  response: string;
  section: string;
  lineNumber: number;
}

export class ResponseProcessingNode {
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    messages.push(new HumanMessage({
      content: `Processing user feedback (iteration ${state.refinementIteration + 1})...`
    }));
    
    try {
      // Extract :RESPONSE: tags from the file content
      const responseTags = this.extractResponseTags(state.fileContent);
      
      if (responseTags.length === 0) {
        messages.push(new HumanMessage({
          content: "No :RESPONSE: tags found in document"
        }));
        
        return {
          messages,
          userResponses: [],
          currentNode: 'ResponseProcessingNode',
          nextNode: null // No refinement needed
        };
      }
      
      // Process and validate response tags
      const validResponses = this.validateResponses(responseTags);
      
      // Map to state format
      const userResponses = validResponses.map(r => ({
        tag: r.tag,
        response: r.response,
        section: r.section
      }));
      
      // Update refinement iteration
      const newIteration = state.refinementIteration + 1;
      
      // Create changelog entry for this refinement
      const changelogEntry = {
        iteration: newIteration,
        changes: [
          `Processed ${validResponses.length} user feedback responses`,
          ...this.summarizeResponses(validResponses)
        ],
        timestamp: new Date().toISOString()
      };
      
      messages.push(new HumanMessage({
        content: `Found and processed ${validResponses.length} :RESPONSE: tags:\n${
          validResponses.map(r => `- ${r.tag} in ${r.section}`).join('\n')
        }`
      }));
      
      return {
        messages,
        userResponses,
        refinementIteration: newIteration,
        changelog: [...state.changelog, changelogEntry],
        currentNode: 'ResponseProcessingNode',
        nextNode: 'FeedbackIntegrationNode' // Next step in refinement
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `ResponseProcessingNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        errors: [...state.errors, `ResponseProcessingNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'ResponseProcessingNode',
        nextNode: null
      };
    }
  }
  
  private extractResponseTags(content: string): ResponseTag[] {
    const responseTags: ResponseTag[] = [];
    const lines = content.split('\n');
    let currentSection = 'Unknown';
    let responseId = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track current section (org-mode headers)
      if (line.match(/^\*+\s+/)) {
        currentSection = line.replace(/^\*+\s+/, '').trim();
      }
      
      // Look for :RESPONSE: tags
      const responseMatch = line.match(/:RESPONSE:\s*(.+)/);
      if (responseMatch) {
        const tag = responseMatch[1].trim();
        
        // Extract the response content (lines following the tag until next heading or tag)
        const responseLines: string[] = [];
        let j = i + 1;
        
        while (j < lines.length) {
          const nextLine = lines[j];
          
          // Stop at next heading, tag, or empty section
          if (nextLine.match(/^\*+\s+/) || 
              nextLine.match(/:RESPONSE:/) ||
              nextLine.match(/:END:/)) {
            break;
          }
          
          // Skip :PROPERTIES: drawer lines
          if (nextLine.match(/:PROPERTIES:/) || nextLine.match(/^:\w+:/)) {
            j++;
            continue;
          }
          
          responseLines.push(nextLine);
          j++;
        }
        
        const responseContent = responseLines
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .join('\n');
        
        if (responseContent) {
          responseTags.push({
            id: `response-${responseId++}`,
            tag,
            response: responseContent,
            section: currentSection,
            lineNumber: i + 1
          });
        }
      }
    }
    
    return responseTags;
  }
  
  private validateResponses(responses: ResponseTag[]): ResponseTag[] {
    // Filter out invalid responses
    return responses.filter(r => {
      // Must have non-empty tag
      if (!r.tag || r.tag.trim().length === 0) {
        return false;
      }
      
      // Must have non-empty response
      if (!r.response || r.response.trim().length === 0) {
        return false;
      }
      
      // Tag should be meaningful (not just punctuation)
      if (r.tag.match(/^[^a-zA-Z0-9]+$/)) {
        return false;
      }
      
      return true;
    });
  }
  
  private summarizeResponses(responses: ResponseTag[]): string[] {
    const summaries: string[] = [];
    
    // Group by section
    const bySection = new Map<string, ResponseTag[]>();
    responses.forEach(r => {
      const existing = bySection.get(r.section) || [];
      existing.push(r);
      bySection.set(r.section, existing);
    });
    
    // Create summaries
    bySection.forEach((sectionResponses, section) => {
      summaries.push(`${section}: ${sectionResponses.length} response(s)`);
      
      // Add tag summaries for important sections
      if (section.toLowerCase().includes('requirement') || 
          section.toLowerCase().includes('user stor')) {
        const tags = sectionResponses.map(r => r.tag).slice(0, 3);
        summaries.push(`  Tags: ${tags.join(', ')}${sectionResponses.length > 3 ? '...' : ''}`);
      }
    });
    
    return summaries;
  }
} 