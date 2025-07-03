module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^ora$': '<rootDir>/tests/__mocks__/ora.ts',
    '^chalk$': '<rootDir>/tests/__mocks__/chalk.ts'
  },
  // Global test timeout - 15 seconds by default
  testTimeout: 15000,
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup-timeout.ts'],
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        esModuleInterop: true,
        skipLibCheck: true,
        downlevelIteration: true
      }
    }]
  }
}; 