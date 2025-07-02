/**
 * CLI Executable Tests
 * Verifies the CLI executable works properly on macOS
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

describe('CLI Executable Tests', () => {
  const rootDir = process.cwd();
  const cliPath = path.join(rootDir, 'bin', 'ideaforge');
  const distPath = path.join(rootDir, 'dist');

  beforeAll(() => {
    // Ensure we have a fresh build
    if (!fs.existsSync(distPath)) {
      console.log('[DEBUG] Building project for CLI tests...');
      execSync('npm run build', { stdio: 'ignore' });
    }
  });

  describe('Executable File', () => {
    it('should exist at bin/ideaforge', () => {
      expect(fs.existsSync(cliPath)).toBe(true);
    });

    it('should have correct shebang for Node.js', () => {
      const content = fs.readFileSync(cliPath, 'utf8');
      const firstLine = content.split('\n')[0];
      expect(firstLine).toBe('#!/usr/bin/env node');
    });

    it('should have executable permissions on macOS', () => {
      const stats = fs.statSync(cliPath);
      const isExecutable = (stats.mode & 0o111) !== 0; // Check any execute bit
      expect(isExecutable).toBe(true);
    });

    it('should reference the compiled JavaScript file', () => {
      const content = fs.readFileSync(cliPath, 'utf8');
      expect(content).toContain("require('../dist/cli/index.js')");
    });
  });

  describe('CLI Execution', () => {
    it('should run without errors when dist exists', (done) => {
      const proc = spawn('node', [cliPath, '--help'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toContain('Transform your project ideas');
        expect(errorOutput).toBe('');
        done();
      });
    });

    it('should handle missing dist directory gracefully', (done) => {
      // Temporarily rename dist to simulate missing build
      const distBackup = path.join(rootDir, 'dist_backup');
      
      if (fs.existsSync(distPath)) {
        fs.renameSync(distPath, distBackup);
      }

      const proc = spawn('node', [cliPath], {
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let errorOutput = '';

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        // Restore dist
        if (fs.existsSync(distBackup)) {
          fs.renameSync(distBackup, distPath);
        }

        expect(code).not.toBe(0);
        expect(errorOutput).toContain('Cannot find module');
        done();
      });
    });

    it('should execute directly as ./bin/ideaforge on macOS', (done) => {
      const proc = spawn(cliPath, ['--version'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        expect(output).toMatch(/\d+\.\d+\.\d+/); // Version pattern
        done();
      });
    });
  });

  describe('Environment Handling', () => {
    const testEnvPath = path.join(rootDir, '.env.test');

    afterEach(() => {
      // Clean up test env file
      if (fs.existsSync(testEnvPath)) {
        fs.unlinkSync(testEnvPath);
      }
    });

    it('should show error when .env is missing for actual commands', (done) => {
      const proc = spawn('node', [cliPath, 'init'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let errorOutput = '';

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(1);
        expect(errorOutput).toContain('Configuration error');
        expect(errorOutput).toContain('Missing required environment variable');
        done();
      });
    });

    it('should load successfully with valid .env', (done) => {
      // Create test .env
      fs.writeFileSync(testEnvPath, `
OPENAI_API_KEY=test-key-123
N8N_WEBHOOK_URL=https://test.webhook.url
LOG_LEVEL=info
NODE_ENV=test
`);

      const proc = spawn('node', [cliPath, 'init'], {
        env: { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: testEnvPath }
      });

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).toBe(0);
        // In test mode, config loaded message is suppressed
        expect(output).toContain('init command not yet implemented');
        done();
      });
    });
  });

  describe('Command Availability', () => {
    const commands = ['init', 'analyze', 'refine', 'flow', 'tables', 'export'];

    commands.forEach(cmd => {
      it(`should have '${cmd}' command available`, (done) => {
        const proc = spawn('node', [cliPath, cmd, '--help'], {
          env: { ...process.env, NODE_ENV: 'test' }
        });

        let output = '';

        proc.stdout.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', (code) => {
          expect(code).toBe(0);
          expect(output.toLowerCase()).toContain(cmd);
          done();
        });
      });
    });
  });

  describe('Error Handling', () => {
    const testEnvPath = path.join(rootDir, '.env.test-error');

    beforeEach(() => {
      // Create a valid test env for error handling tests
      fs.writeFileSync(testEnvPath, `
OPENAI_API_KEY=test-key-123
N8N_WEBHOOK_URL=https://test.webhook.url
LOG_LEVEL=info
NODE_ENV=test
`);
    });

    afterEach(() => {
      // Clean up test env file
      if (fs.existsSync(testEnvPath)) {
        fs.unlinkSync(testEnvPath);
      }
    });

    it('should show error for unknown commands', (done) => {
      const proc = spawn('node', [cliPath, 'unknown-command'], {
        env: { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: testEnvPath }
      });

      let errorOutput = '';

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(errorOutput).toContain("error: unknown command 'unknown-command'");
        done();
      });
    });

    it('should handle invalid options gracefully', (done) => {
      const proc = spawn('node', [cliPath, '--invalid-option'], {
        env: { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: testEnvPath }
      });

      let errorOutput = '';

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        expect(code).not.toBe(0);
        expect(errorOutput).toContain("error: unknown option");
        done();
      });
    });
  });

  describe('Performance', () => {
    it('should start up quickly (under 3 seconds)', (done) => {
      const startTime = Date.now();
      
      const proc = spawn('node', [cliPath, '--version'], {
        env: { ...process.env, NODE_ENV: 'test' }
      });

      proc.on('close', () => {
        const duration = Date.now() - startTime;
        console.log(`[DEBUG] CLI startup took ${duration}ms`);
        expect(duration).toBeLessThan(3000);
        done();
      });
    });
  });
}); 