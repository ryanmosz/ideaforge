import * as path from 'path';

export class VersionHelper {
  /**
   * Extract version number from filename
   * @example "project-v2.org" -> 2
   */
  static extractVersion(filename: string): number {
    const match = filename.match(/-v(\d+)(\.|$)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Generate versioned filename
   * @example ("project.org", 2) -> "project-v2.org"
   */
  static generateVersionedPath(originalPath: string, version?: number): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    
    // Remove existing version suffix
    const cleanBase = base.replace(/-v\d+$/, '');
    
    // Determine new version
    const newVersion = version || this.extractVersion(originalPath) + 1;
    
    return path.join(dir, `${cleanBase}-v${newVersion}${ext}`);
  }
} 