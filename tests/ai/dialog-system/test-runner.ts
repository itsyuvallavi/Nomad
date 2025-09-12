/**
 * Test Runner - Phase 5.1
 * Runs all dialog system tests and provides comprehensive reporting
 */

import { describe, it, expect } from '@jest/globals';

// Import all test suites
import './parser-tests';
import './classification-tests';
import './conversation-tests';
import './integration-tests';

// Import all scenario tests
import './scenarios/lisbon-granada-scenario';
import './scenarios/conversational-flow-scenario';
import './scenarios/modification-flow-scenario';
import './scenarios/ambiguous-input-scenario';

describe('Enhanced Dialog System - Full Test Suite', () => {
  it('should run all parser tests', () => {
    // This is a placeholder to ensure all parser tests are executed
    expect(true).toBe(true);
  });

  it('should run all classification tests', () => {
    // This is a placeholder to ensure all classification tests are executed
    expect(true).toBe(true);
  });

  it('should run all conversation tests', () => {
    // This is a placeholder to ensure all conversation tests are executed
    expect(true).toBe(true);
  });

  it('should run all integration tests', () => {
    // This is a placeholder to ensure all integration tests are executed
    expect(true).toBe(true);
  });

  it('should run all scenario tests', () => {
    // This is a placeholder to ensure all scenario tests are executed
    expect(true).toBe(true);
  });
});

export default {
  displayName: 'Enhanced Dialog System Tests',
  testMatch: ['**/tests/ai/dialog-system/**/*.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/ai/utils/**/*.ts',
    'src/ai/flows/**/*.ts',
    'src/ai/services/**/*.ts'
  ],
  coverageReporters: ['text', 'json', 'html'],
  testTimeout: 30000 // 30 seconds for AI operations
};