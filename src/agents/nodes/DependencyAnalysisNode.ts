import { ProjectState } from '../state';
import { Requirement } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '../utils/llm-factory';

/**
 * DependencyAnalysisNode - Maps relationships and dependencies between features
 * Identifies which features depend on others and potential conflicts
 */
export class DependencyAnalysisNode {
  private llm: ChatOpenAI;
  
  constructor() {
    this.llm = createLLM(0.1, 2500); // Lower temperature for accurate dependency mapping
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Skip if no requirements to analyze
      if (!state.requirements || state.requirements.length === 0) {
        return {
          currentNode: 'DependencyAnalysisNode',
          nextNode: 'TechnologyExtractionNode', // Next in the workflow
          messages: [...state.messages, new SystemMessage('No requirements to analyze for dependencies')]
        };
      }
      
      // Get previous analysis context
      const context = this.buildContext(state);
      
      // Analyze dependencies
      const dependencyAnalysis = await this.analyzeDependencies(
        state.requirements,
        context,
        state
      );
      
      // Parse and structure the dependencies
      const dependencies = this.parseDependencies(dependencyAnalysis, state.requirements);
      
      // Convert to the state format
      const stateDependencies = this.convertToStateDependencies(dependencies);
      
      // Identify potential conflicts
      const conflicts = this.identifyConflicts(dependencies);
      
      // Generate risk assessment based on dependencies
      const risks = this.assessDependencyRisks(dependencies, conflicts);
      
      // Add analysis message
      const analysisMessage = new SystemMessage(
        `Dependency Analysis Complete:
        
Found ${dependencies.length} dependencies:
${dependencies.map(dep => `- ${dep.from} → ${dep.to}: ${dep.type}`).join('\n')}

${conflicts.length > 0 ? `\nPotential Conflicts:\n${conflicts.map(c => `- ${c}`).join('\n')}` : '\nNo conflicts detected.'}

${risks.length > 0 ? `\nDependency Risks:\n${risks.map(r => `- ${r.impact}: ${r.risk}`).join('\n')}` : ''}`
      );
      
      return {
        dependencies: stateDependencies,
        riskAssessment: [...(state.riskAssessment || []), ...risks],
        currentNode: 'DependencyAnalysisNode',
        nextNode: 'TechnologyExtractionNode',
        messages: [...state.messages, analysisMessage]
      };
    } catch (error) {
      return {
        errors: [`DependencyAnalysisNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'DependencyAnalysisNode',
        nextNode: 'TechnologyExtractionNode' // Continue even with errors
      };
    }
  }
  
  private buildContext(state: ProjectState): string {
    let context = '';
    
    // Include MoSCoW categorization
    if (state.moscowAnalysis) {
      const { must, should } = state.moscowAnalysis;
      context += 'High Priority Requirements:\n';
      context += [...must, ...should]
        .map(r => `${r.id}: ${r.description}`)
        .join('\n');
      context += '\n\n';
    }
    
    // Include Kano analysis
    if (state.kanoAnalysis) {
      const { basic } = state.kanoAnalysis;
      context += 'Basic/Expected Features:\n';
      context += basic
        .map(r => `${r.id}: ${r.description}`)
        .join('\n');
      context += '\n\n';
    }
    
    return context;
  }
  
  private async analyzeDependencies(
    requirements: Requirement[],
    context: string,
    state: ProjectState
  ): Promise<string> {
    const systemPrompt = `You are a software architect expert in dependency analysis and system design.
Analyze the requirements to identify dependencies between them.

Types of dependencies to identify:
1. REQUIRES: Feature A needs Feature B to function
2. EXTENDS: Feature A builds upon Feature B
3. CONFLICTS: Feature A and B cannot coexist or have conflicting requirements
4. RELATED: Features share common components or data
5. BLOCKS: Feature A must be completed before Feature B can start

For each dependency, consider:
- Technical dependencies (shared code, data, APIs)
- Logical dependencies (business logic, workflow)
- User experience dependencies (UI/UX consistency)
- Performance dependencies (resource constraints)

Output format:
DEP: <from_id> -> <to_id> [TYPE] <reason>
Example:
DEP: REQ-2 -> REQ-1 [REQUIRES] Real-time updates require authenticated users
DEP: REQ-4 -> REQ-3 [EXTENDS] Advanced analytics extends basic reporting
DEP: REQ-5 -> REQ-6 [CONFLICTS] Offline mode conflicts with real-time sync`;
    
    const userPrompt = `Project: ${state.filePath}

${context}

All Requirements:
${requirements.map(req => `${req.id}: ${req.description}`).join('\n')}

${this.includeAdditionalContext(state)}

Analyze dependencies between these requirements:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    return response.content.toString();
  }
  
  private parseDependencies(analysis: string, requirements: Requirement[]): Array<{
    from: string;
    to: string;
    type: 'requires' | 'extends' | 'conflicts' | 'related' | 'blocks';
    reason: string;
  }> {
    const dependencies: Array<{
      from: string;
      to: string;
      type: 'requires' | 'extends' | 'conflicts' | 'related' | 'blocks';
      reason: string;
    }> = [];
    
    // Create requirement ID set for validation
    const validIds = new Set(requirements.map(r => r.id));
    
    // Parse dependency lines
    const lines = analysis.split('\n');
    const depPattern = /DEP:\s*(\S+)\s*->\s*(\S+)\s*\[(\w+)\]\s*(.+)/i;
    
    for (const line of lines) {
      const match = line.match(depPattern);
      if (match) {
        const [, from, to, type, reason] = match;
        const fromId = from.toUpperCase();
        const toId = to.toUpperCase();
        const depType = type.toLowerCase() as any;
        
        // Validate IDs and type
        if (validIds.has(fromId) && validIds.has(toId) && 
            ['requires', 'extends', 'conflicts', 'related', 'blocks'].includes(depType)) {
          dependencies.push({
            from: fromId,
            to: toId,
            type: depType,
            reason: reason.trim()
          });
        }
      }
    }
    
    return dependencies;
  }
  
  private convertToStateDependencies(
    parsedDeps: Array<{ from: string; to: string; type: string; reason: string }>
  ): Array<{ requirementId: string; dependsOn: string[] }> {
    // Group by requirement ID
    const depMap = new Map<string, Set<string>>();
    
    parsedDeps.forEach(dep => {
      if (!depMap.has(dep.from)) {
        depMap.set(dep.from, new Set());
      }
      // Only add non-conflict dependencies
      if (dep.type !== 'conflicts') {
        depMap.get(dep.from)!.add(dep.to);
      }
    });
    
    // Convert to state format - only include requirements with actual dependencies
    return Array.from(depMap.entries())
      .filter(([, deps]) => deps.size > 0)
      .map(([reqId, deps]) => ({
        requirementId: reqId,
        dependsOn: Array.from(deps)
      }));
  }
  
  private identifyConflicts(dependencies: Array<{
    from: string;
    to: string;
    type: string;
    reason: string;
  }>): string[] {
    const conflicts: string[] = [];
    
    // Direct conflicts
    dependencies
      .filter(dep => dep.type === 'conflicts')
      .forEach(dep => {
        conflicts.push(`${dep.from} conflicts with ${dep.to}: ${dep.reason}`);
      });
    
    // Circular dependencies
    const circular = this.findCircularDependencies(dependencies);
    circular.forEach(cycle => {
      conflicts.push(`Circular dependency detected: ${cycle.join(' → ')}`);
    });
    
    return conflicts;
  }
  
  private findCircularDependencies(dependencies: Array<{
    from: string;
    to: string;
    type: string;
  }>): string[][] {
    const graph = new Map<string, Set<string>>();
    const cycles: string[][] = [];
    
    // Build adjacency list (excluding conflicts)
    dependencies
      .filter(dep => dep.type !== 'conflicts')
      .forEach(dep => {
        if (!graph.has(dep.from)) {
          graph.set(dep.from, new Set());
        }
        graph.get(dep.from)!.add(dep.to);
      });
    
    // DFS to find cycles
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];
    
    function dfs(node: string): void {
      visited.add(node);
      recStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
      
      path.pop();
      recStack.delete(node);
    }
    
    // Check all nodes
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
    
    return cycles;
  }
  
  private assessDependencyRisks(
    dependencies: Array<{ from: string; to: string; type: string; reason: string }>,
    conflicts: string[]
  ): Array<{ risk: string; impact: 'high' | 'medium' | 'low'; likelihood: 'high' | 'medium' | 'low'; mitigation: string }> {
    const risks: Array<{ risk: string; impact: 'high' | 'medium' | 'low'; likelihood: 'high' | 'medium' | 'low'; mitigation: string }> = [];
    
    // High risk for conflicts
    conflicts.forEach(conflict => {
      risks.push({
        risk: conflict,
        impact: 'high',
        likelihood: 'high',
        mitigation: 'Resolve architectural conflicts before implementation'
      });
    });
    
    // Count dependencies per requirement
    const depCount = new Map<string, number>();
    dependencies.forEach(dep => {
      depCount.set(dep.from, (depCount.get(dep.from) || 0) + 1);
      depCount.set(dep.to, (depCount.get(dep.to) || 0) + 1);
    });
    
    // High dependency requirements are risky
    depCount.forEach((count, reqId) => {
      if (count >= 4) {
        risks.push({
          risk: `${reqId} has ${count} dependencies - high coupling risk`,
          impact: 'high',
          likelihood: 'medium',
          mitigation: 'Consider refactoring to reduce coupling and improve modularity'
        });
      } else if (count >= 3) {
        risks.push({
          risk: `${reqId} has ${count} dependencies - moderate coupling`,
          impact: 'medium',
          likelihood: 'medium',
          mitigation: 'Monitor for complexity and consider interface abstraction'
        });
      }
    });
    
    // Blocking dependencies create schedule risks
    const blockingDeps = dependencies.filter(dep => dep.type === 'blocks');
    if (blockingDeps.length > 2) {
      risks.push({
        risk: `${blockingDeps.length} blocking dependencies may create scheduling bottlenecks`,
        impact: 'medium',
        likelihood: 'high',
        mitigation: 'Plan parallel development tracks where possible'
      });
    }
    
    return risks;
  }
  
  private includeAdditionalContext(state: ProjectState): string {
    let context = '';
    
    // Include technical brainstorming ideas that might reveal dependencies
    if (state.brainstormIdeas && state.brainstormIdeas.length > 0) {
      const technicalIdeas = state.brainstormIdeas.filter(idea =>
        idea.category.toLowerCase().includes('tech') ||
        idea.category.toLowerCase().includes('architecture') ||
        idea.category.toLowerCase().includes('integration')
      );
      
      if (technicalIdeas.length > 0) {
        context += '\nTechnical Considerations:\n';
        context += technicalIdeas
          .map(idea => `- ${idea.description}`)
          .join('\n');
      }
    }
    
    return context;
  }
} 