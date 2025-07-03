import { ProjectState } from '../../state';
import { HumanMessage } from '@langchain/core/messages';
import { createLLM } from '../../utils/llm-factory';

export class ResearchSynthesisNode {
  async process(state: ProjectState): Promise<Partial<ProjectState>> {
    const messages = [...state.messages];
    
    // Check if we have any research to synthesize
    const hasResearch = 
      state.hackerNewsResults.length > 0 ||
      state.redditResults.length > 0 ||
      state.additionalResearchResults.length > 0 ||
      state.extractedTechnologies.length > 0;
    
    if (!hasResearch) {
      messages.push(new HumanMessage({
        content: "No research findings to synthesize"
      }));
      
      return {
        messages,
        researchSynthesis: '',
        currentNode: 'ResearchSynthesisNode',
        nextNode: 'ResponseProcessingNode' // Move to refinement phase
      };
    }
    
    try {
      const llm = createLLM(0.7, 3000);
      
      // Build comprehensive research context
      const researchContext = this.buildResearchContext(state);
      
      // Generate synthesis
      const synthesis = await this.generateSynthesis(researchContext, state, llm);
      
      // Extract technology recommendations
      const techRecommendations = await this.extractTechRecommendations(
        synthesis, 
        state.extractedTechnologies,
        llm
      );
      
      // Update tech stack recommendations
      state.techStackRecommendations.push(...techRecommendations);
      
      messages.push(new HumanMessage({
        content: `Research synthesis complete. Analyzed ${this.countResearchItems(state)} research items across ${this.countSources(state)} sources.`
      }));
      
      return {
        messages,
        researchSynthesis: synthesis,
        techStackRecommendations: state.techStackRecommendations,
        currentNode: 'ResearchSynthesisNode',
        nextNode: 'ResponseProcessingNode'
      };
    } catch (error) {
      messages.push(new HumanMessage({
        content: `ResearchSynthesisNode error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
      
      return {
        messages,
        researchSynthesis: '',
        errors: [...state.errors, `ResearchSynthesisNode: ${error instanceof Error ? error.message : 'Unknown error'}`],
        currentNode: 'ResearchSynthesisNode',
        nextNode: 'ResponseProcessingNode'
      };
    }
  }
  
  private buildResearchContext(state: ProjectState): string {
    const parts: string[] = [];
    
    // Project context
    parts.push('## Project Context\n');
    if (state.requirements.length > 0) {
      parts.push(`Requirements: ${state.requirements.length} defined`);
      const mustHaves = state.moscowAnalysis.must.slice(0, 3);
      if (mustHaves.length > 0) {
        parts.push('Key requirements:');
        mustHaves.forEach(req => parts.push(`- ${req.title}`));
      }
    }
    
    // Technologies identified
    if (state.extractedTechnologies.length > 0) {
      parts.push('\n## Technologies Identified');
      parts.push(state.extractedTechnologies.join(', '));
    }
    
    // Hacker News insights
    if (state.hackerNewsResults.length > 0) {
      parts.push('\n## Hacker News Insights');
      parts.push(`Found ${state.hackerNewsResults.length} relevant discussions\n`);
      
      // Group by influence level
      const frontPage = state.hackerNewsResults.filter(r => r.summary.includes('🔥'));
      const trending = state.hackerNewsResults.filter(r => r.summary.includes('📈'));
      const influential = state.hackerNewsResults.filter(r => r.summary.includes('⭐'));
      
      if (frontPage.length > 0) {
        parts.push(`### Must-Read (${frontPage.length})`);
        frontPage.slice(0, 3).forEach(item => {
          parts.push(`- **${item.title}**`);
          if (item.selectionReason) {
            parts.push(`  📎 ${item.selectionReason}`);
          }
          if (item.relationshipToTopic) {
            parts.push(`  🔗 ${item.relationshipToTopic}`);
          }
          parts.push(`  Summary: ${item.summary.split('\n')[0]}`);
        });
      }
      
      if (trending.length > 0) {
        parts.push(`\n### Trending Topics (${trending.length})`);
        trending.slice(0, 3).forEach(item => {
          parts.push(`- **${item.title}**`);
          parts.push(`  Summary: ${item.summary.split('\n')[0]}`);
        });
      }
      
      if (influential.length > 0) {
        parts.push(`\n### Influential Discussions (${influential.length})`);
        influential.slice(0, 3).forEach(item => {
          parts.push(`- **${item.title}**`);
          if (item.relationshipToTopic) {
            parts.push(`  🔗 ${item.relationshipToTopic}`);
          }
          parts.push(`  Summary: ${item.summary.split('\n')[0]}`);
        });
      }
    }
    
    // Reddit discussions
    if (state.redditResults.length > 0) {
      parts.push('\n## Reddit Community Insights');
      parts.push(`Found ${state.redditResults.length} relevant discussions\n`);
      
      // Group by subreddit
      const subredditGroups = this.groupBySubreddit(state.redditResults);
      Object.entries(subredditGroups).slice(0, 5).forEach(([subreddit, posts]) => {
        parts.push(`### r/${subreddit} (${posts.length} posts)`);
        posts.slice(0, 2).forEach(post => {
          parts.push(`- **${post.title}**`);
          if (post.selectionReason) {
            parts.push(`  📎 ${post.selectionReason}`);
          }
          parts.push(`  Summary: ${post.summary.split('\n')[0]}`);
        });
      });
    }
    
    // Additional research findings
    if (state.additionalResearchResults.length > 0) {
      parts.push('\n## Additional Research Findings');
      state.additionalResearchResults.forEach(research => {
        parts.push(`\n### ${research.topic}`);
        parts.push(research.findings);
      });
    }
    
    return parts.join('\n');
  }
  
  private async generateSynthesis(
    researchContext: string,
    state: ProjectState,
    llm: any
  ): Promise<string> {
    const systemPrompt = `You are a technical research analyst synthesizing findings for a software project.
Create a comprehensive yet concise synthesis of all research findings.

Structure your synthesis as follows:
1. **Executive Summary** - Key takeaways in 2-3 sentences
2. **Technology Landscape** - Overview of relevant technologies and their maturity
3. **Community Consensus** - What developers are saying about key technologies/approaches
4. **Implementation Insights** - Practical advice from real-world experiences
5. **Potential Challenges** - Common pitfalls and concerns raised
6. **Recommendations** - Actionable suggestions based on research

Focus on:
- Identifying patterns across multiple sources
- Highlighting contradictions or debates
- Emphasizing practical, actionable insights
- Warning about common pitfalls
- Suggesting proven solutions`;
    
    const userPrompt = `Project: ${state.filePath}

${researchContext}

Please synthesize all research findings into a comprehensive summary that will guide implementation decisions.`;
    
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
    return response.content.toString().trim();
  }
  
  private async extractTechRecommendations(
    synthesis: string,
    technologies: string[],
    llm: any
  ): Promise<ProjectState['techStackRecommendations']> {
    const systemPrompt = `Extract specific technology recommendations from the research synthesis.
For each technology mentioned positively in the synthesis, create a recommendation.

Output format (JSON array):
[
  {
    "technology": "Technology Name",
    "purpose": "What it's recommended for",
    "alternatives": ["Alternative 1", "Alternative 2"]
  }
]

Only include technologies that are explicitly recommended or viewed positively.`;
    
    const userPrompt = `Technologies identified: ${technologies.join(', ')}

Research synthesis:
${synthesis}

Extract technology recommendations:`;
    
    const response = await llm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
    try {
      const recommendations = JSON.parse(response.content.toString());
      return Array.isArray(recommendations) ? recommendations : [];
    } catch {
      // If parsing fails, return empty array
      return [];
    }
  }
  
  private groupBySubreddit(results: ProjectState['redditResults']): Record<string, typeof results> {
    const groups: Record<string, typeof results> = {};
    
    results.forEach(result => {
      if (!groups[result.subreddit]) {
        groups[result.subreddit] = [];
      }
      groups[result.subreddit].push(result);
    });
    
    // Sort by number of posts
    const sorted: Record<string, typeof results> = {};
    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([key, value]) => {
        sorted[key] = value;
      });
    
    return sorted;
  }
  
  private countResearchItems(state: ProjectState): number {
    return (
      state.hackerNewsResults.length +
      state.redditResults.length +
      state.additionalResearchResults.length
    );
  }
  
  private countSources(state: ProjectState): number {
    let sources = 0;
    if (state.hackerNewsResults.length > 0) sources++;
    if (state.redditResults.length > 0) sources++;
    if (state.additionalResearchResults.length > 0) sources++;
    return sources;
  }
} 