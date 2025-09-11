/**
 * Jest Configuration for Enhanced Dialog System Tests - Phase 5.1
 * Specialized configuration for AI dialog system testing
 */

module.exports = {
  displayName: 'Enhanced Dialog System Tests',
  
  // Test file patterns
  testMatch: [
    '**/tests/ai/dialog-system/**/*.test.ts',
    '**/tests/ai/dialog-system/**/*-tests.ts',
    '**/tests/ai/dialog-system/scenarios/**/*.ts'
  ],
  
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/ai/dialog-system/setup.ts'
  ],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/ai/utils/**/*.ts',
    'src/ai/flows/**/*.ts',
    'src/ai/services/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  
  coverageDirectory: 'coverage/dialog-system',
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/ai/utils/destination-parser.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/ai/flows/chat-conversation.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Test timeouts
  testTimeout: 30000, // 30 seconds for AI operations
  
  // Retry configuration for flaky AI tests
  retryTimes: 2,
  
  // Verbose output for debugging
  verbose: true,
  
  // Bail on first failure in CI
  bail: process.env.CI ? 1 : 0,
  
  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: true,
  
  // Test result reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/dialog-system',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › '
    }],
    ['jest-html-reporter', {
      outputPath: 'test-results/dialog-system/report.html',
      pageTitle: 'Enhanced Dialog System Test Report'
    }]
  ],
  
  // Global test variables
  globals: {
    'ts-jest': {
      tsconfig: 'tests/tsconfig.json'
    }
  }
};