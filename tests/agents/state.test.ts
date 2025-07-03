import { ProjectState } from '../../src/agents/state';
import { stateChannels } from '../../src/agents/state-annotations';

describe('ProjectState Schema', () => {
  describe('State Structure', () => {
    it('should have all required fields', () => {
      const stateKeys = Object.keys(stateChannels);
      
      // Check key fields exist
      expect(stateKeys).toContain('filePath');
      expect(stateKeys).toContain('fileContent');
      expect(stateKeys).toContain('requirements');
      expect(stateKeys).toContain('moscowAnalysis');
      expect(stateKeys).toContain('currentNode');
      expect(stateKeys).toContain('messages');
    });
    
    it('should have correct number of state channels', () => {
      const stateKeys = Object.keys(stateChannels);
      expect(stateKeys.length).toBe(26);
    });
  });
  
  describe('Channel Defaults', () => {
    it('should provide correct default values', () => {
      expect(stateChannels.filePath.default()).toBe('');
      expect(stateChannels.requirements.default()).toEqual([]);
      expect(stateChannels.moscowAnalysis.default()).toEqual({
        must: [],
        should: [],
        could: [],
        wont: []
      });
      expect(stateChannels.currentNode.default()).toBe('start');
      expect(stateChannels.refinementIteration.default()).toBe(0);
    });
  });
  
  describe('Channel Value Functions', () => {
    it('should handle string updates correctly', () => {
      const { filePath } = stateChannels;
      expect(filePath.value('old', 'new')).toBe('new');
      expect(filePath.value('old', undefined)).toBe('old');
    });
    
    it('should handle array replacement correctly', () => {
      const { requirements } = stateChannels;
      const old = [{ id: '1', title: 'Old', description: 'Old req' }];
      const update = [{ id: '2', title: 'New', description: 'New req' }];
      
      expect(requirements.value(old, update)).toEqual(update);
      expect(requirements.value(old, undefined)).toEqual(old);
    });
    
    it('should handle array appending correctly', () => {
      const { changelog, errors } = stateChannels;
      
      // Test changelog appending
      const oldChanges = [{ iteration: 1, changes: ['change1'], timestamp: '2024-01-01' }];
      const newChanges = [{ iteration: 2, changes: ['change2'], timestamp: '2024-01-02' }];
      expect(changelog.value(oldChanges, newChanges)).toHaveLength(2);
      
      // Test error appending
      const oldErrors = ['error1'];
      const newErrors = ['error2'];
      expect(errors.value(oldErrors, newErrors)).toEqual(['error1', 'error2']);
      
      // Test messages appending separately
      const messagesChannel = stateChannels.messages;
      expect(messagesChannel.default()).toEqual([]);
    });
  });
  
  describe('State Type Safety', () => {
    it('should enforce correct types for analysis fields', () => {
      const testState: Partial<ProjectState> = {
        moscowAnalysis: {
          must: [],
          should: [],
          could: [],
          wont: []
        },
        kanoAnalysis: {
          basic: [],
          performance: [],
          excitement: []
        }
      };
      
      expect(testState.moscowAnalysis).toBeDefined();
      expect(testState.kanoAnalysis).toBeDefined();
    });
    
    it('should enforce correct types for research fields', () => {
      const testState: Partial<ProjectState> = {
        extractedTechnologies: ['React', 'Node.js'],
        hackerNewsResults: [{
          title: 'Test',
          url: 'https://test.com',
          summary: 'Summary',
          relevance: 0.8
        }]
      };
      
      expect(testState.extractedTechnologies).toHaveLength(2);
      expect(testState.hackerNewsResults![0].relevance).toBe(0.8);
    });
  });
}); 