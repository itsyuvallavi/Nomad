#!/usr/bin/env tsx
/**
 * AI Testing Monitor for Nomad Navigator
 * Properly integrated with actual AI generation functions
 * Tests real API calls and validates actual output structure
 */

import type { GeneratePersonalizedItineraryOutput } from '../../src/ai/schemas';
import fs from 'fs/promises';
import path from 'path';

// Test case interface
interface TestCase {
  id: string;
  input: string;
  description: string;
  expectedStructure: {
    destinations: string[];  // Expected destination names
    totalDays: number;
    minActivities: number;  // Minimum total activities across all days
    maxActivities: number;  // Maximum total activities
  };
  complexity: 'simple' | 'medium' | 'complex';
}

// Test result interface
interface TestResult {
  testId: string;
  input: string;
  response: GeneratePersonalizedItineraryOutput | null;
  passed: boolean;
  errors: string[];
  timestamp: string;
  responseTime: number;
  details: {
    actualDestination?: string;
    actualDays?: number;
    actualActivities?: number;
  };
}

class AITester {
  private testCases: TestCase[] = [
    {
      id: 'london_simple',
      input: 'Flying from New York to London for 3 days',
      description: 'Simple London trip - baseline test',
      expectedStructure: {
        destinations: ['London'],
        totalDays: 3,
        minActivities: 9,   // 3-4 activities per day minimum
        maxActivities: 21   // 7 activities per day maximum (enhanced generation adds more)
      },
      complexity: 'simple'
    },
    {
      id: 'paris_weekend',
      input: 'Weekend trip from Los Angeles to Paris',
      description: 'Simple Paris weekend',
      expectedStructure: {
        destinations: ['Paris'],
        totalDays: 3,  // Weekend can be 3 days (Fri-Sun)
        minActivities: 9,
        maxActivities: 21  // Enhanced generation creates more activities
      },
      complexity: 'simple'
    },
    {
      id: 'tokyo_kyoto',
      input: 'Departing from San Francisco for one week in Tokyo and 3 days in Kyoto',
      description: 'Multi-destination medium complexity',
      expectedStructure: {
        destinations: ['Tokyo', 'Kyoto'],
        totalDays: 10,
        minActivities: 30,
        maxActivities: 70  // Enhanced generation creates more activities
      },
      complexity: 'medium'
    },
    {
      id: 'europe_tour',
      input: 'Starting from Boston for 2 weeks across London, Paris, Rome, and Barcelona',
      description: 'Complex multi-city with constraints',
      expectedStructure: {
        destinations: ['London', 'Paris', 'Rome', 'Barcelona'],
        totalDays: 14,
        minActivities: 42,
        maxActivities: 98  // Enhanced generation creates more activities (7 per day max)
      },
      complexity: 'complex'
    },
    {
      id: 'max_complexity',
      input: 'Leaving from Chicago for 30 days visiting London, Paris, Rome, Barcelona, and Amsterdam',
      description: 'Maximum complexity test - 5 cities, 30 days',
      expectedStructure: {
        destinations: ['London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam'],
        totalDays: 30,
        minActivities: 90,
        maxActivities: 210  // Enhanced generation creates more activities (7 per day max)
      },
      complexity: 'complex'
    },
    {
      id: 'over_limit_destinations',
      input: 'From Miami for 3 weeks in London, Paris, Rome, Barcelona, Amsterdam, and Berlin',
      description: 'Should fail - exceeds 5 destination limit',
      expectedStructure: {
        destinations: [], // Should fail validation
        totalDays: 0,
        minActivities: 0,
        maxActivities: 0
      },
      complexity: 'complex'
    },
    {
      id: 'over_limit_days',
      input: 'From Seattle for 35 days exploring Europe',
      description: 'Should fail - exceeds 30 day limit',
      expectedStructure: {
        destinations: [],
        totalDays: 0,
        minActivities: 0,
        maxActivities: 0
      },
      complexity: 'complex'
    }
  ];

  private logFile = 'ai-test-results.json';
  private isBaselineOnly = false;

  constructor() {
    // Check if running baseline only
    const args = process.argv.slice(2);
    this.isBaselineOnly = args.includes('--baseline');
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AI Consistency Tests...\n');
    
    // Filter test cases if baseline only
    const casesToRun = this.isBaselineOnly 
      ? this.testCases.filter(tc => tc.id === 'london_simple')
      : this.testCases;
    
    const results: TestResult[] = [];
    
    for (const testCase of casesToRun) {
      console.log(`Testing: ${testCase.description}`);
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.responseTime}ms`);
      
      if (!result.passed) {
        console.log(`\nErrors: ${result.errors.join(', ')}`);
      }
      
      if (result.details.actualDestination) {
        console.log(`Details: ${result.details.actualDestination} - ${result.details.actualDays} days, ${result.details.actualActivities} activities\n`);
      }
    }

    await this.saveResults(results);
    this.printSummary(results);
  }

  async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔄 Starting test: ${testCase.id}`);
      console.log(`   Input: "${testCase.input}"`);
      
      // Check if this test is expected to fail
      const isOverLimitTest = testCase.id.includes('over_limit');
      
      if (isOverLimitTest) {
        console.log(`   Expected: Should FAIL validation`);
      } else {
        console.log(`   Expected: ${testCase.expectedStructure.destinations.join(', ')} - ${testCase.expectedStructure.totalDays} days`);
      }
      
      // Dynamically import the AI generation function to avoid module issues
      const { generatePersonalizedItinerary } = await import('@/ai/flows/generate-personalized-itinerary');
      
      console.log(`   Calling AI generation function...`);
      
      // Call the actual AI generation function
      const response = await generatePersonalizedItinerary({
        prompt: testCase.input,
        attachedFile: undefined,
        conversationHistory: undefined
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   Response received in ${responseTime}ms`);
      console.log(`   Actual destination: ${response?.destination || 'NONE'}`);
      console.log(`   Actual days: ${response?.itinerary?.length || 0}`);
      console.log(`   Actual title: ${response?.title || 'NONE'}`);
      
      // Validate the response structure
      const validation = this.validateResponse(response, testCase.expectedStructure);
      
      // Calculate actual values for debugging
      const actualDays = response?.itinerary?.length || 0;
      const actualActivities = response?.itinerary?.reduce(
        (sum, day) => sum + (day.activities?.length || 0), 0
      ) || 0;
      
      return {
        testId: testCase.id,
        input: testCase.input,
        response,
        passed: validation.passed,
        errors: validation.errors,
        timestamp: new Date().toISOString(),
        responseTime,
        details: {
          actualDestination: response?.destination,
          actualDays,
          actualActivities
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isOverLimitTest = testCase.id.includes('over_limit');
      
      // Check if this is an expected failure
      if (isOverLimitTest && errorMessage.includes('exceeds maximum')) {
        console.log(`   ✅ Expected failure: ${errorMessage}`);
        return {
          testId: testCase.id,
          input: testCase.input,
          response: null,
          passed: true, // Pass because it correctly rejected over-limit
          errors: [],
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            actualDestination: 'N/A - Validation failed as expected',
            actualDays: 0,
            actualActivities: 0
          }
        };
      }
      
      console.error(`\n❌ Test failed with error:`, errorMessage);
      console.error(`   Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
      
      return {
        testId: testCase.id,
        input: testCase.input,
        response: null,
        passed: false,
        errors: [`Error: ${errorMessage}`],
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {}
      };
    }
  }

  private validateResponse(
    response: GeneratePersonalizedItineraryOutput | null, 
    expected: TestCase['expectedStructure']
  ): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if response exists
    if (!response) {
      errors.push('No response received');
      return { passed: false, errors };
    }

    // Validate structure - check required fields
    if (!response.destination) {
      errors.push('Missing destination field');
    }
    
    if (!response.title) {
      errors.push('Missing title field');
    }
    
    if (!response.itinerary || !Array.isArray(response.itinerary)) {
      errors.push('Missing or invalid itinerary array');
      return { passed: false, errors };
    }

    // Validate destination matches expected
    // Special handling for validation responses
    const isValidationResponse = response.destination === 'Input Validation' || response.needsMoreInfo;
    const expectedValidationFailure = expected.destinations.length === 0 && expected.totalDays === 0;
    
    if (expectedValidationFailure && isValidationResponse) {
      // This is a validation test that's working correctly - don't check destination match
    } else {
      const actualDestination = response.destination?.toLowerCase() || '';
      const destinationMatches = expected.destinations.some(dest => 
        actualDestination.includes(dest.toLowerCase())
      );
      
      if (!destinationMatches) {
        errors.push(`Destination "${response.destination}" doesn't match expected: ${expected.destinations.join(', ')}`);
      }
    }

    // Validate days count
    const actualDays = response.itinerary.length;
    if (actualDays !== expected.totalDays) {
      errors.push(`Expected ${expected.totalDays} days, got ${actualDays}`);
    }

    // Validate total activities count
    const totalActivities = response.itinerary.reduce(
      (sum, day) => sum + (day.activities?.length || 0), 0
    );
    
    if (totalActivities < expected.minActivities || totalActivities > expected.maxActivities) {
      errors.push(`Expected ${expected.minActivities}-${expected.maxActivities} activities, got ${totalActivities}`);
    }

    // Validate each day structure
    response.itinerary.forEach((day, index) => {
      if (typeof day.day !== 'number') {
        errors.push(`Day ${index + 1}: missing or invalid day number`);
      }
      
      if (!day.date || typeof day.date !== 'string') {
        errors.push(`Day ${index + 1}: missing or invalid date`);
      }
      
      if (!day.title || typeof day.title !== 'string') {
        errors.push(`Day ${index + 1}: missing or invalid title`);
      }
      
      if (!Array.isArray(day.activities)) {
        errors.push(`Day ${index + 1}: missing or invalid activities array`);
      } else if (day.activities.length < 3) {
        errors.push(`Day ${index + 1}: insufficient activities (${day.activities.length} < 3)`);
      }
      
      // Validate each activity
      day.activities?.forEach((activity, actIndex) => {
        if (!activity.time || !activity.description || !activity.category || !activity.address) {
          errors.push(`Day ${index + 1}, Activity ${actIndex + 1}: missing required fields`);
        }
      });
    });

    // Validate quickTips
    if (!response.quickTips || !Array.isArray(response.quickTips)) {
      errors.push('Missing or invalid quickTips array');
    } else if (response.quickTips.length < 3) {
      errors.push(`Insufficient quick tips (${response.quickTips.length} < 3)`);
    }

    return { passed: errors.length === 0, errors };
  }

  private async saveResults(results: TestResult[]): Promise<void> {
    try {
      const existingData = await this.loadExistingResults();
      
      // Add run metadata
      const runSummary = {
        runId: Date.now(),
        timestamp: new Date().toISOString(),
        isBaseline: this.isBaselineOnly,
        results: results
      };
      
      const allRuns = [...existingData, runSummary];
      
      // Keep only last 10 runs
      const recentRuns = allRuns.slice(-10);
      
      await fs.writeFile(this.logFile, JSON.stringify(recentRuns, null, 2));
      console.log(`\n📝 Results saved to ${this.logFile}`);
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }

  private async loadExistingResults(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.logFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    const avgResponseTime = Math.round(
      results.reduce((sum, r) => sum + r.responseTime, 0) / total
    );
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);
    console.log(`Average Response Time: ${avgResponseTime}ms`);
    
    // Show failed tests
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`- ${result.testId}: ${result.errors.join(', ')}`);
      });
    }
    
    // Performance warnings
    if (avgResponseTime > 10000) {
      console.log('\n⚠️  WARNING: Average response time exceeds 10 seconds');
    }
    
    // Baseline status
    if (this.isBaselineOnly) {
      const baseline = results.find(r => r.testId === 'london_simple');
      if (baseline?.passed) {
        console.log('\n✅ BASELINE PASSED - Safe to proceed with complex changes');
      } else {
        console.log('\n🔴 BASELINE FAILED - DO NOT make complex changes until fixed');
      }
    }
  }
}

// Run the tests
async function main() {
  try {
    console.log('🔍 Checking environment...');
    
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();
    
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ ERROR: OPENAI_API_KEY not found in environment');
      console.error('Please ensure your .env file contains OPENAI_API_KEY');
      process.exit(1);
    } else {
      console.log('✅ OPENAI_API_KEY found');
    }
    
    console.log('🚀 Initializing AI Tester...\n');
    const tester = new AITester();
    await tester.runAllTests();
  } catch (error) {
    console.error('Fatal error running tests:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main();
}

export { AITester };
export type { TestCase, TestResult };