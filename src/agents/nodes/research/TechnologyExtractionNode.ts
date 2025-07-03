import { ProjectState } from '../../state';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLLM } from '../../utils/llm-factory';

/**
 * TechnologyExtractionNode - Extracts technology keywords and concepts from project data
 * Identifies technologies mentioned or implied in requirements, user stories, and ideas
 */
export class TechnologyExtractionNode {
  private llm: ChatOpenAI;
  
  constructor() {
    this.llm = createLLM(0.1, 2000); // Lower temperature for accurate extraction
  }
  
  /**
   * Main node function that processes the state
   */
  async invoke(state: ProjectState): Promise<Partial<ProjectState>> {
    try {
      // Gather all text content for analysis
      const content = this.gatherContent(state);
      
      if (!content.trim()) {
        return {
          extractedTechnologies: [],
          currentNode: 'TechnologyExtractionNode',
          nextNode: 'HackerNewsSearchNode',
          messages: [...state.messages, new SystemMessage('No content available for technology extraction')]
        };
      }
      
      // Extract technologies using AI
      const extractedTechs = await this.extractTechnologies(content, state);
      
      // Also extract from explicit mentions
      const explicitTechs = this.extractExplicitTechnologies(content);
      
      // Combine and deduplicate
      const allTechs = [...new Set([...extractedTechs, ...explicitTechs])];
      
      // Generate research topics based on extracted technologies
      const researchTopics = this.generateResearchTopics(allTechs, state);
      
      // Add analysis message
      const analysisMessage = new SystemMessage(
        `Technology Extraction Complete:
        
Found ${allTechs.length} technologies:
${allTechs.map(tech => `- ${tech}`).join('\n')}

Generated ${researchTopics.length} research topics:
${researchTopics.map(topic => `- ${topic}`).join('\n')}`
      );
      
      return {
        extractedTechnologies: allTechs,
        researchTopics: [...(state.researchTopics || []), ...researchTopics],
        currentNode: 'TechnologyExtractionNode',
        nextNode: 'HackerNewsSearchNode',
        messages: [...state.messages, analysisMessage]
      };
    } catch (error) {
      return {
        errors: [`TechnologyExtractionNode error: ${error instanceof Error ? error.message : String(error)}`],
        currentNode: 'TechnologyExtractionNode',
        nextNode: 'HackerNewsSearchNode' // Continue even with errors
      };
    }
  }
  
  private gatherContent(state: ProjectState): string {
    const parts: string[] = [];
    
    // Include requirements
    if (state.requirements && state.requirements.length > 0) {
      parts.push('Requirements:');
      parts.push(...state.requirements.map(r => `${r.title}: ${r.description}`));
    }
    
    // Include user stories
    if (state.userStories && state.userStories.length > 0) {
      parts.push('\nUser Stories:');
      parts.push(...state.userStories.map(s => `${s.actor} wants to ${s.action} so that ${s.benefit}`));
    }
    
    // Include brainstorming ideas
    if (state.brainstormIdeas && state.brainstormIdeas.length > 0) {
      parts.push('\nBrainstorming Ideas:');
      parts.push(...state.brainstormIdeas.map(i => `${i.title}: ${i.description}`));
    }
    
    // Include Q&A for technical context
    if (state.questionsAnswers && state.questionsAnswers.length > 0) {
      const techQAs = state.questionsAnswers.filter(qa => 
        qa.question.toLowerCase().includes('tech') ||
        qa.question.toLowerCase().includes('stack') ||
        qa.question.toLowerCase().includes('framework') ||
        qa.question.toLowerCase().includes('language') ||
        qa.question.toLowerCase().includes('database') ||
        qa.question.toLowerCase().includes('api')
      );
      
      if (techQAs.length > 0) {
        parts.push('\nTechnical Q&A:');
        parts.push(...techQAs.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`));
      }
    }
    
    return parts.join('\n');
  }
  
  private async extractTechnologies(content: string, state: ProjectState): Promise<string[]> {
    const systemPrompt = `You are a technology expert who identifies technical keywords and concepts.
Extract technology-related terms from the project description.

Categories to identify:
1. Programming Languages (e.g., Python, JavaScript, TypeScript, Java)
2. Frameworks & Libraries (e.g., React, Django, Express, Spring)
3. Databases (e.g., PostgreSQL, MongoDB, Redis, MySQL)
4. Cloud & Infrastructure (e.g., AWS, Docker, Kubernetes, Azure)
5. APIs & Protocols (e.g., REST, GraphQL, WebSocket, gRPC)
6. Tools & Services (e.g., Git, CI/CD, Monitoring, Analytics)
7. Concepts & Patterns (e.g., Microservices, Serverless, MVC, Event-driven)
8. Frontend Technologies (e.g., CSS frameworks, Build tools, State management)
9. Security & Auth (e.g., OAuth, JWT, SSL/TLS, Encryption)
10. Data Processing (e.g., ETL, Streaming, ML/AI frameworks)

Rules:
- Extract both explicitly mentioned and implied technologies
- Include version numbers if specified (e.g., "React 18")
- Normalize names (e.g., "node.js" -> "Node.js")
- Include related/similar technologies that might be relevant
- Focus on implementable technologies, not generic concepts

Output format: One technology per line, no bullets or numbers`;
    
    const userPrompt = `Project: ${state.filePath}

${content}

Extract all technology keywords and related technologies:`;
    
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);
    
    // Parse response into array
    return response.content.toString()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('-') && !line.match(/^\d+\./));
  }
  
  private extractExplicitTechnologies(content: string): string[] {
    const technologies: string[] = [];
    
    // Common technology patterns
    const patterns = [
      // Programming languages
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Ruby|Go|Rust|Swift|Kotlin|PHP|Scala)\b/gi,
      // Frameworks - updated to handle dots properly
      /\b(React(?:\.js)?|Angular(?:\.js)?|Vue(?:\.js)?|Next\.js|Nuxt\.js|Django|Flask|Express(?:\.js)?|Spring|Rails|Laravel)\b/gi,
      // Node.js specific pattern
      /\b(node(?:\.js)?|Node(?:\.js)?)\b/gi,
      // Databases
      /\b(PostgreSQL|Postgres|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|SQLite)\b/gi,
      // Cloud providers
      /\b(AWS|Amazon Web Services|Azure|Google Cloud|GCP|Heroku|Vercel|Netlify)\b/gi,
      // Tools
      /\b(Docker|Kubernetes|k8s|Jenkins|GitHub Actions|GitLab CI|CircleCI|Terraform)\b/gi,
      // APIs
      /\b(REST|RESTful|GraphQL|WebSocket|gRPC|SOAP|JSON-RPC)\b/gi,
      // Frontend
      /\b(Tailwind|Bootstrap|Material-UI|Webpack|Vite|Rollup|Babel|ESLint)\b/gi,
      // Mobile
      /\b(React Native|Flutter|Ionic|Xamarin|Swift UI|Jetpack Compose)\b/gi,
      // Data/ML
      /\b(TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|Spark|Kafka|RabbitMQ)\b/gi,
      // Version control
      /\b(Git|GitHub|GitLab|Bitbucket|SVN|Mercurial)\b/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        technologies.push(...matches.map(m => this.normalizeTechName(m)));
      }
    });
    
    // Extract technologies from specific phrases
    const phrasePatterns = [
      /built with (\w+(?:\s+\w+)*)/gi,
      /using (\w+(?:\s+\w+)*) framework/gi,
      /(\w+(?:\s+\w+)*) database/gi,
      /(\w+(?:\s+\w+)*) API/gi,
      /deployed on (\w+(?:\s+\w+)*)/gi
    ];
    
    phrasePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        technologies.push(this.normalizeTechName(match[1]));
      }
    });
    
    return [...new Set(technologies)]; // Remove duplicates
  }
  
  private normalizeTechName(tech: string): string {
    const normalizations: Record<string, string> = {
      'node.js': 'Node.js',
      'node': 'Node.js',
      'nodejs': 'Node.js',
      'react.js': 'React',
      'react': 'React',
      'vue.js': 'Vue.js',
      'vue': 'Vue.js',
      'next.js': 'Next.js',
      'nuxt.js': 'Nuxt.js',
      'express.js': 'Express.js',
      'express': 'Express.js',
      'angular.js': 'Angular',
      'angular': 'Angular',
      'k8s': 'Kubernetes',
      'postgres': 'PostgreSQL',
      'mongo': 'MongoDB',
      'elasticsearch': 'Elasticsearch',
      'github actions': 'GitHub Actions',
      'gitlab ci': 'GitLab CI',
      'material-ui': 'Material-UI',
      'material ui': 'Material-UI',
      'scikit-learn': 'Scikit-learn',
      'scikit learn': 'Scikit-learn'
    };
    
    const lower = tech.toLowerCase();
    return normalizations[lower] || tech;
  }
  
  private generateResearchTopics(technologies: string[], state: ProjectState): string[] {
    const topics: string[] = [];
    
    // Generate comparison topics for similar technologies
    const comparisons = this.generateComparisons(technologies);
    topics.push(...comparisons);
    
    // Generate best practices topics
    const bestPractices = technologies
      .slice(0, 5) // Top 5 technologies
      .map(tech => `${tech} best practices ${new Date().getFullYear()}`);
    topics.push(...bestPractices);
    
    // Generate integration topics based on combinations
    const integrations = this.generateIntegrations(technologies);
    topics.push(...integrations);
    
    // Add project-specific topics based on requirements
    if (state.requirements && state.requirements.length > 0) {
      const projectTopics = this.generateProjectSpecificTopics(technologies, state);
      topics.push(...projectTopics);
    }
    
    return [...new Set(topics)]; // Remove duplicates
  }
  
  private generateComparisons(technologies: string[]): string[] {
    const comparisons: string[] = [];
    
    // Frontend frameworks
    const frontendFrameworks = technologies.filter(t => 
      ['React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js'].includes(t)
    );
    if (frontendFrameworks.length >= 2) {
      comparisons.push(`${frontendFrameworks.join(' vs ')} comparison`);
    }
    
    // Databases
    const databases = technologies.filter(t => 
      ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra'].includes(t)
    );
    if (databases.length >= 2) {
      comparisons.push(`${databases.slice(0, 2).join(' vs ')} for web applications`);
    }
    
    // Cloud providers
    const cloudProviders = technologies.filter(t => 
      ['AWS', 'Azure', 'Google Cloud', 'Heroku', 'Vercel'].includes(t)
    );
    if (cloudProviders.length >= 2) {
      comparisons.push(`${cloudProviders.slice(0, 2).join(' vs ')} pricing and features`);
    }
    
    return comparisons;
  }
  
  private generateIntegrations(technologies: string[]): string[] {
    const integrations: string[] = [];
    
    // Common integration patterns
    if (technologies.includes('React') && technologies.includes('Node.js')) {
      integrations.push('React Node.js full stack setup');
    }
    
    if (technologies.includes('Docker') && technologies.includes('Kubernetes')) {
      integrations.push('Docker Kubernetes deployment guide');
    }
    
    if (technologies.some(t => ['PostgreSQL', 'MySQL', 'MongoDB'].includes(t)) && 
        technologies.some(t => ['Node.js', 'Python', 'Java'].includes(t))) {
      integrations.push('Database ORM best practices');
    }
    
    if (technologies.includes('GraphQL')) {
      integrations.push('GraphQL server implementation');
    }
    
    return integrations;
  }
  
  private generateProjectSpecificTopics(technologies: string[], state: ProjectState): string[] {
    const topics: string[] = [];
    
    // Real-time features
    if (state.requirements.some(r => r.description.toLowerCase().includes('real-time'))) {
      topics.push('WebSocket vs Server-Sent Events');
      if (technologies.includes('Node.js')) {
        topics.push('Socket.io real-time implementation');
      }
    }
    
    // Authentication
    if (state.requirements.some(r => r.description.toLowerCase().includes('auth'))) {
      topics.push('JWT vs session authentication');
      topics.push('OAuth 2.0 implementation guide');
    }
    
    // Scalability
    if (state.requirements.some(r => 
      r.description.toLowerCase().includes('scale') || 
      r.description.toLowerCase().includes('performance')
    )) {
      topics.push('Microservices architecture patterns');
      topics.push('Caching strategies Redis vs Memcached');
    }
    
    return topics;
  }
} 