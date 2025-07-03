// Load test environment configuration
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test-specific environment variables
dotenv.config({ path: path.join(__dirname, 'test.env') });

// Global test timeout configuration
// Tests that involve external calls should complete within 15 seconds

// Helper to set custom timeout for specific tests
declare global {
  function withTimeout(fn: () => Promise<any>, timeout: number): Promise<any>;
}

// Add a global helper for tests that need custom timeouts
global.withTimeout = async (fn: () => Promise<any>, timeout: number): Promise<any> => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Test timed out after ${timeout}ms. External services may be unavailable.`));
    }, timeout);
  });

  return Promise.race([fn(), timeoutPromise]);
};

// Configure jest to fail fast on unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in test:', error);
  process.exit(1);
});

// Log test suite information
beforeAll(() => {
  console.log('Test environment loaded with timeout:', process.env.N8N_TIMEOUT || '10000ms');
}); 