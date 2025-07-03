import { VersionHelper } from '../../src/utils/version-helper';

describe('VersionHelper', () => {
  describe('extractVersion', () => {
    it('should extract version from versioned filename', () => {
      expect(VersionHelper.extractVersion('project-v2.org')).toBe(2);
      expect(VersionHelper.extractVersion('analysis-v10.md')).toBe(10);
      expect(VersionHelper.extractVersion('file-v999.txt')).toBe(999);
    });

    it('should return 1 for non-versioned filename', () => {
      expect(VersionHelper.extractVersion('project.org')).toBe(1);
      expect(VersionHelper.extractVersion('analysis.md')).toBe(1);
      expect(VersionHelper.extractVersion('no-version-here.txt')).toBe(1);
    });

    it('should handle edge cases', () => {
      expect(VersionHelper.extractVersion('v2-not-a-version.org')).toBe(1);
      expect(VersionHelper.extractVersion('file-v.org')).toBe(1);
      expect(VersionHelper.extractVersion('file-vABC.org')).toBe(1);
      expect(VersionHelper.extractVersion('')).toBe(1);
    });
  });

  describe('generateVersionedPath', () => {
    it('should increment version for versioned files', () => {
      expect(VersionHelper.generateVersionedPath('project-v2.org')).toBe('project-v3.org');
      expect(VersionHelper.generateVersionedPath('path/to/file-v5.md')).toBe('path/to/file-v6.md');
    });

    it('should add version 2 to non-versioned files', () => {
      expect(VersionHelper.generateVersionedPath('project.org')).toBe('project-v2.org');
      expect(VersionHelper.generateVersionedPath('path/to/file.md')).toBe('path/to/file-v2.md');
    });

    it('should use specific version when provided', () => {
      expect(VersionHelper.generateVersionedPath('project.org', 5)).toBe('project-v5.org');
      expect(VersionHelper.generateVersionedPath('file-v2.md', 10)).toBe('file-v10.md');
    });

    it('should remove existing version suffix before adding new one', () => {
      expect(VersionHelper.generateVersionedPath('project-v2.org', 5)).toBe('project-v5.org');
      expect(VersionHelper.generateVersionedPath('file-v999.txt', 1)).toBe('file-v1.txt');
    });

    it('should handle absolute paths', () => {
      expect(VersionHelper.generateVersionedPath('/Users/test/project.org')).toBe('/Users/test/project-v2.org');
      expect(VersionHelper.generateVersionedPath('/Users/test/file-v3.md')).toBe('/Users/test/file-v4.md');
    });

    it('should handle files with multiple dots', () => {
      expect(VersionHelper.generateVersionedPath('project.test.org')).toBe('project.test-v2.org');
      expect(VersionHelper.generateVersionedPath('file.min-v2.js')).toBe('file.min-v3.js');
    });

    it('should handle files without extensions', () => {
      expect(VersionHelper.generateVersionedPath('README')).toBe('README-v2');
      expect(VersionHelper.generateVersionedPath('LICENSE-v3')).toBe('LICENSE-v4');
    });
  });
}); 