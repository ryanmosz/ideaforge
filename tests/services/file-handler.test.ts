import { FileHandler } from '../../src/services/file-handler';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { FileOperationError } from '../../src/utils/error-handler';

// Mock fs module
jest.mock('fs');

describe('FileHandler', () => {
  let fileHandler: FileHandler;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
  const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
  const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
  
  beforeEach(() => {
    fileHandler = new FileHandler();
    jest.clearAllMocks();
  });
  
  describe('readOrgFile', () => {
    const testOrgContent = `#+TITLE: Test Project
#+AUTHOR: Test Author
#+DATE: 2024-01-01

* Project Overview
This is a test project.

* User Stories
** As a developer
   I want to test the file handler
   So that I can ensure it works correctly

* Requirements
** Functional Requirements
*** MUST Parse files correctly                                         :MUST:
    The system must parse org files.
    
** Technical Requirements
*** SHOULD Use TypeScript                                           :SHOULD:
    The system should be written in TypeScript.

* Brainstorming
** Core Features
   - File reading
   - File writing
   - Format conversion`;
    
    it('should read and parse an org file successfully', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(testOrgContent);
      
      const result = fileHandler.readOrgFile('/test/file.org');
      
      expect(mockExistsSync).toHaveBeenCalledWith('/test/file.org');
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/file.org', 'utf-8');
      
      expect(result.metadata.title).toBe('Test Project');
      expect(result.metadata.author).toBe('Test Author');
      expect(result.userStories).toHaveLength(1);
      expect(result.requirements).toHaveLength(2);
      expect(result.brainstormIdeas).toHaveLength(3);
    });
    
    it('should throw error if file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      
      expect(() => fileHandler.readOrgFile('/test/nonexistent.org')).toThrow(FileOperationError);
      expect(() => fileHandler.readOrgFile('/test/nonexistent.org')).toThrow('File not found');
    });
    
    it('should throw error if file cannot be parsed', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('Invalid org content ***');
      
      expect(() => fileHandler.readOrgFile('/test/invalid.org')).toThrow(FileOperationError);
      expect(() => fileHandler.readOrgFile('/test/invalid.org')).toThrow('Failed to parse org file');
    });
    
    it('should use custom encoding if specified', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(testOrgContent);
      
      fileHandler.readOrgFile('/test/file.org', { encoding: 'latin1' });
      
      expect(mockReadFileSync).toHaveBeenCalledWith('/test/file.org', 'latin1');
    });
  });
  
  describe('writeDocument', () => {
    const testData = {
      metadata: {
        title: 'Test Project',
        author: 'Test Author',
        date: '2024-01-01'
      },
      projectOverview: 'Test project description',
      userStories: [{
        role: 'developer',
        action: 'write tests',
        benefit: 'ensure quality',
        rawText: 'As a developer, I want to write tests so that I can ensure quality'
      }],
      requirements: [{
        id: 'F1',
        text: 'Parse files',
        moscowType: { type: 'MUST' as const },
        category: 'functional' as const,
        description: 'The system must parse files'
      }],
      brainstormIdeas: [{
        category: 'Core Features',
        text: 'File handling'
      }],
      technologyChoices: [],
      notes: [],
      questions: [],
      researchSubjects: [],
      changelog: []
    };
    
    describe('org-mode export', () => {
      it('should write org-mode format successfully', () => {
        mockExistsSync.mockReturnValue(false);
        
        const result = fileHandler.writeDocument(
          testData,
          '/output/test.org',
          'orgmode'
        );
        
        expect(mockWriteFileSync).toHaveBeenCalled();
        const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
        
        expect(writtenContent).toContain('#+TITLE: Test Project');
        expect(writtenContent).toContain('#+AUTHOR: Test Author');
        expect(writtenContent).toContain('* Project Overview');
        expect(writtenContent).toContain('* User Stories');
        expect(writtenContent).toContain('** As a developer');
        expect(writtenContent).toContain('* Requirements');
        expect(writtenContent).toContain('*** Parse files');
        expect(writtenContent).toContain(':MUST:');
        
        expect(result.success).toBe(true);
        expect(result.filePath).toBe('/output/test.org');
        expect(result.format).toBe('orgmode');
        expect(result.statistics!.sections).toBeGreaterThan(0);
      });
      
      it('should create directory if requested', () => {
        mockExistsSync.mockReturnValue(false);
        
        fileHandler.writeDocument(
          testData,
          '/new/dir/test.org',
          'orgmode',
          { createDirectories: true }
        );
        
        expect(mockMkdirSync).toHaveBeenCalledWith('/new/dir', { recursive: true });
      });
      
      it('should create backup if file exists and backup requested', () => {
        mockExistsSync.mockImplementation(path => {
          return path === '/output/test.org';
        });
        mockReadFileSync.mockReturnValue('Old content');
        
        fileHandler.writeDocument(
          testData,
          '/output/test.org',
          'orgmode',
          { preserveBackup: true }
        );
        
        // Check that backup was created
        const backupCalls = mockWriteFileSync.mock.calls.filter(
          call => (call[0] as string).includes('backup')
        );
        expect(backupCalls).toHaveLength(1);
        expect(backupCalls[0][1]).toBe('Old content');
      });
    });
    
    describe('cursor markdown export', () => {
      it('should write cursor format successfully', () => {
        mockExistsSync.mockReturnValue(false);
        
        const result = fileHandler.writeDocument(
          testData,
          '/output/test.md',
          'cursor'
        );
        
        expect(mockWriteFileSync).toHaveBeenCalled();
        const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
        
        expect(writtenContent).toContain('# Test Project');
        expect(writtenContent).toContain('## Project Overview');
        expect(writtenContent).toContain('## User Story Tasks');
        expect(writtenContent).toContain('### Task US1:');
        expect(writtenContent).toContain('## Requirement Implementation Tasks');
        expect(writtenContent).toContain('### Task F1: Parse files');
        expect(writtenContent).toContain('**Priority**: MUST');
        
        expect(result.success).toBe(true);
        expect(result.statistics!.totalTasks).toBeGreaterThan(0);
      });
      
      it('should only include MUST and SHOULD requirements as tasks', () => {
        const dataWithVariedReqs = {
          ...testData,
          requirements: [
            { ...testData.requirements[0], moscowType: { type: 'MUST' as const } },
            { id: 'F2', text: 'Nice feature', moscowType: { type: 'COULD' as const }, category: 'functional' as const, description: '' },
            { id: 'F3', text: 'Important feature', moscowType: { type: 'SHOULD' as const }, category: 'functional' as const, description: '' }
          ]
        };
        
        mockExistsSync.mockReturnValue(false);
        
        fileHandler.writeDocument(dataWithVariedReqs, '/output/test.md', 'cursor');
        
        const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
        
        expect(writtenContent).toContain('Task F1:'); // MUST
        expect(writtenContent).toContain('Task F3:'); // SHOULD
        expect(writtenContent).not.toContain('Task F2:'); // COULD - excluded
      });
    });
    
    it('should throw error for unsupported format', () => {
      mockExistsSync.mockReturnValue(false);
      
      expect(() => fileHandler.writeDocument(
        testData,
        '/output/test.txt',
        'invalid' as any
      )).toThrow(FileOperationError);
      expect(() => fileHandler.writeDocument(
        testData,
        '/output/test.txt',
        'invalid' as any
      )).toThrow('Unsupported export format');
    });
    
    it('should handle write errors gracefully', () => {
      mockExistsSync.mockReturnValue(false);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => fileHandler.writeDocument(
        testData,
        '/output/test.org',
        'orgmode'
      )).toThrow(FileOperationError);
      
      // Reset mock to test the error message in a separate call
      expect(() => fileHandler.writeDocument(
        testData,
        '/output/test.org',
        'orgmode'
      )).toThrow('Error writing file');
      
      // Clean up the mock
      mockWriteFileSync.mockReset();
    });
  });
  
  describe('edge cases', () => {
    const testData = {
      metadata: {
        title: 'Test Project',
        author: 'Test Author',
        date: '2024-01-01'
      },
      projectOverview: 'Test project description',
      userStories: [{
        role: 'developer',
        action: 'write tests',
        benefit: 'ensure quality',
        rawText: 'As a developer, I want to write tests so that I can ensure quality'
      }],
      requirements: [{
        id: 'F1',
        text: 'Parse files',
        moscowType: { type: 'MUST' as const },
        category: 'functional' as const,
        description: 'The system must parse files'
      }],
      brainstormIdeas: [{
        category: 'Core Features',
        text: 'File handling'
      }],
      technologyChoices: [],
      notes: [],
      questions: [],
      researchSubjects: [],
      changelog: []
    };
    
    beforeEach(() => {
      // Reset mocks for edge case tests
      mockWriteFileSync.mockReset();
      mockExistsSync.mockReset();
    });
    
    it('should handle empty document data', () => {
      const emptyData = {
        metadata: {
          title: '' // Title is required, but can be empty string
        },
        projectOverview: '',
        userStories: [],
        requirements: [],
        brainstormIdeas: [],
        technologyChoices: [],
        notes: [],
        questions: [],
        researchSubjects: [],
        changelog: []
      };
      
      mockExistsSync.mockReturnValue(false);
      
      const result = fileHandler.writeDocument(emptyData, '/output/empty.org', 'orgmode');
      
      expect(result.success).toBe(true);
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('* Project Overview');
      expect(writtenContent).toContain('[Project description needed]');
    });
    
    it('should handle documents with changelog', () => {
      const dataWithChangelog = {
        ...testData,
        changelog: [{
          version: 'v1',
          date: '2024-01-01',
          changes: ['Initial version', 'Added basic structure']
        }]
      };
      
      mockExistsSync.mockReturnValue(false);
      
      fileHandler.writeDocument(dataWithChangelog, '/output/changelog.org', 'orgmode');
      
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('* Changelog');
      expect(writtenContent).toContain(':CHANGELOG:');
      expect(writtenContent).toContain('** v1 - 2024-01-01');
      expect(writtenContent).toContain('- Initial version');
    });
  });
}); 