/**
 * TypeScript Compilation Pipeline Tests
 * Verifies that TypeScript features compile correctly and generate proper output
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Test interfaces
interface TestInterface {
  name: string;
  value: number;
  optional?: string;
}

// Test types
type TestUnion = 'option1' | 'option2' | 'option3';
type TestIntersection = TestInterface & { extra: boolean };

// Test enums
enum TestEnum {
  First = 'FIRST',
  Second = 'SECOND',
  Third = 'THIRD'
}

// Test generics
function testGeneric<T extends { id: string }>(item: T): T {
  return { ...item, processed: true } as T;
}

// Test async function
async function testAsync(): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 10));
  return 'async result';
}

// Test class
class TestClass {
  constructor(private readonly name: string) {}
  
  getName(): string {
    return this.name;
  }
}

describe('TypeScript Compilation Features', () => {
  it('should support interfaces with optional properties', () => {
    const obj: TestInterface = { 
      name: 'test', 
      value: 42 
    };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
    expect(obj.optional).toBeUndefined();
  });

  it('should support union types', () => {
    const value: TestUnion = 'option1';
    expect(['option1', 'option2', 'option3']).toContain(value);
  });

  it('should support intersection types', () => {
    const obj: TestIntersection = {
      name: 'test',
      value: 42,
      extra: true
    };
    expect(obj.extra).toBe(true);
  });

  it('should support string enums', () => {
    const value: TestEnum = TestEnum.First;
    expect(value).toBe('FIRST');
  });

  it('should support generics', () => {
    const result = testGeneric({ id: '123', name: 'test' });
    expect(result.id).toBe('123');
  });

  it('should support async/await', async () => {
    const result = await testAsync();
    expect(result).toBe('async result');
  });

  it('should support classes', () => {
    const instance = new TestClass('TestName');
    expect(instance.getName()).toBe('TestName');
  });

  it('should support strict null checks', () => {
    let nullable: string | null = null;
    expect(nullable).toBeNull();
    
    nullable = 'value';
    expect(nullable).toBe('value');
  });
});

describe('TypeScript Build Output', () => {
  const distDir = path.join(process.cwd(), 'dist');

  beforeAll(() => {
    // Ensure fresh build
    console.log('[DEBUG] Running TypeScript build...');
    execSync('npm run build', { stdio: 'ignore' });
  });

  it('should generate JavaScript files in dist/', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    
    const jsFiles = fs.readdirSync(path.join(distDir, 'cli'))
      .filter(f => f.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
    expect(jsFiles).toContain('index.js');
  });

  it('should generate declaration files (.d.ts)', () => {
    const dtsFiles = fs.readdirSync(path.join(distDir, 'cli'))
      .filter(f => f.endsWith('.d.ts'));
    
    expect(dtsFiles.length).toBeGreaterThan(0);
    expect(dtsFiles).toContain('index.d.ts');
  });

  it('should generate source maps', () => {
    const mapFiles = fs.readdirSync(path.join(distDir, 'cli'))
      .filter(f => f.endsWith('.js.map'));
    
    expect(mapFiles.length).toBeGreaterThan(0);
    expect(mapFiles).toContain('index.js.map');
  });

  it('should have valid source map references', () => {
    const jsContent = fs.readFileSync(
      path.join(distDir, 'cli', 'index.js'), 
      'utf8'
    );
    
    expect(jsContent).toContain('//# sourceMappingURL=index.js.map');
  });
});

describe('TypeScript Incremental Compilation', () => {
  it('should support incremental builds', () => {
    // First build (already done in beforeAll)
    const startTime = Date.now();
    
    // Touch a source file to trigger rebuild
    const sourceFile = path.join(process.cwd(), 'src', 'cli', 'index.ts');
    const originalContent = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(sourceFile, originalContent + '\n// Test comment');
    
    // Rebuild
    console.log('[DEBUG] Testing incremental compilation...');
    execSync('npm run build', { stdio: 'ignore' });
    
    const rebuildTime = Date.now() - startTime;
    console.log(`[DEBUG] Incremental build took ${rebuildTime}ms`);
    
    // Restore original
    fs.writeFileSync(sourceFile, originalContent);
    
    // Incremental builds should be reasonably fast
    expect(rebuildTime).toBeLessThan(10000); // 10 seconds max
  });
}); 