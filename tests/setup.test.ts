import * as fs from 'fs';
import * as path from 'path';

describe('Project Setup Verification', () => {
  const projectRoot = process.cwd();

  it('should have all required directories', () => {
    const requiredDirs = [
      'src',
      'src/cli',
      'src/models',
      'src/services',
      'src/utils',
      'src/config',
      'tests',
      'bin',
      'tasks'
    ];
    
    requiredDirs.forEach(dir => {
      const dirPath = path.join(projectRoot, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  it('should have all config files', () => {
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      '.eslintrc.js',
      '.gitignore',
      '.env.example'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(projectRoot, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have executable bin script', () => {
    const binPath = path.join(projectRoot, 'bin/ideaforge');
    expect(fs.existsSync(binPath)).toBe(true);
    
    // Check if file is executable on macOS
    if (process.platform === 'darwin') {
      const stats = fs.statSync(binPath);
      // Check if any execute bit is set (owner, group, or other)
      expect(stats.mode & 0o111).toBeTruthy();
    }
  });

  it('should have correct package.json configuration', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    
    expect(packageJson.name).toBe('ideaforge');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.bin).toHaveProperty('ideaforge');
    expect(packageJson.engines).toHaveProperty('node');
    expect(packageJson.scripts).toHaveProperty('build');
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts).toHaveProperty('lint');
  });

  it('should have TypeScript configured correctly', () => {
    const tsConfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8')
    );
    
    expect(tsConfig.compilerOptions.strict).toBe(true);
    expect(tsConfig.compilerOptions.target).toBe('ES2022');
    expect(tsConfig.compilerOptions.module).toBe('commonjs');
    expect(tsConfig.compilerOptions.outDir).toBe('./dist');
  });

  it('should have all required dependencies installed', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    
    const requiredDeps = ['commander', 'chalk', 'ora', 'axios', 'dotenv'];
    const requiredDevDeps = ['typescript', 'jest', 'eslint', 'ts-node', '@types/node'];
    
    requiredDeps.forEach(dep => {
      expect(packageJson.dependencies).toHaveProperty(dep);
    });
    
    requiredDevDeps.forEach(dep => {
      expect(packageJson.devDependencies).toHaveProperty(dep);
    });
  });

  it('should have ESLint configured with max-lines rule', () => {
    const eslintConfig = require(path.join(projectRoot, '.eslintrc.js'));
    
    expect(eslintConfig.rules).toHaveProperty('max-lines');
    expect(eslintConfig.rules['max-lines']).toEqual(['error', 500]);
  });

  it('should have environment example file with required variables', () => {
    const envExample = fs.readFileSync(
      path.join(projectRoot, '.env.example'),
      'utf8'
    );
    
    expect(envExample).toContain('OPENAI_API_KEY');
    expect(envExample).toContain('N8N_WEBHOOK_URL');
    expect(envExample).toContain('LOG_LEVEL');
    expect(envExample).toContain('NODE_ENV');
  });
}); 