import { createIdeaForgeAgent } from '../../src/agents';

describe('IdeaForge Agent', () => {
  it('should create agent without errors', () => {
    expect(() => createIdeaForgeAgent()).not.toThrow();
  });
  
  it('should return a StateGraph instance', () => {
    const agent = createIdeaForgeAgent();
    expect(agent).toBeDefined();
    expect(agent.constructor.name).toBe('StateGraph');
  });
}); 