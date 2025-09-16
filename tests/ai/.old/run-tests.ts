#!/usr/bin/env tsx

/**
 * Simple test runner script for the conversational AI
 * Run with: npm run test:conversational
 */

import { ConversationalAITestRunner } from '../.old/automated-test-runner';

console.log('🚀 Launching Conversational AI Test Suite');
console.log('This will test the new conversational AI system automatically\n');

const runner = new ConversationalAITestRunner();

runner.runAllTests()
  .then(() => {
    console.log('\n✅ All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test runner failed:', error);
    process.exit(1);
  });