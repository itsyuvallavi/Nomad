#!/usr/bin/env tsx
/**
 * Comprehensive AI Test Runner
 * Tests the AI generation with golden test cases and logs results
 */

import fs from 'fs/promises';
import path from 'path';
import { generatePersonalizedItinerary } from '../../src/ai/flows/generate-personalized-itinerary';
import type { GeneratePersonalizedItineraryOutput } from '../../src/ai/schemas';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

interface TestCase {
  id: string;
  input: string;
  expected?: {
    destinations?: string[];
    totalDays?: number;
    minActivities?: number;
    maxActivities?: number;
    origin?: string;
    mustInclude?: string[];
    allowFlexible?: boolean;
    originOptional?: boolean;
  };
  shouldFail?: boolean;
  expectedError?: string;
}

interface TestResult {
  testId: string;
  suite: string;
  input: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
  timestamp: string;
  response?: GeneratePersonalizedItineraryOutput;
  metrics: {
    destinations?: string[];
    totalDays?: number;
    totalActivities?: number;
    hasAllRequiredFields?: boolean;
  };
}

class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private logDir = path.join(process.cwd(), 'logs', 'ai-tests');
  
  async initialize() {
    // Create log directory
    await fs.mkdir(this.logDir, { recursive: true });
    console.log(`${colors.cyan}📁 Log directory: ${this.logDir}${colors.reset}`);
  }

  async loadGoldenTests(): Promise<any> {
    const testsPath = path.join(process.cwd(), 'tests', 'ai', 'golden-tests.json');
    const content = await fs.readFile(testsPath, 'utf-8');
    return JSON.parse(content);
  }

  async runTest(testCase: TestCase, suiteName: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      testId: testCase.id,
      suite: suiteName,
      input: testCase.input,
      passed: false,
      errors: [],
      warnings: [],
      duration: 0,
      timestamp: new Date().toISOString(),
      metrics: {}
    };

    console.log(`\n${colors.blue}🧪 Testing: ${testCase.id}${colors.reset}`);
    console.log(`   Input: "${testCase.input.substring(0, 80)}${testCase.input.length > 80 ? '...' : ''}"`);

    try {
      // Call the AI generation function with proper input format
      const response = await generatePersonalizedItinerary({
        prompt: testCase.input,
        attachedFile: undefined,
        conversationHistory: undefined
      });
      result.response = response;

      // Calculate metrics
      result.metrics = {
        destinations: [response.destination],
        totalDays: response.itinerary?.length || 0,
        totalActivities: response.itinerary?.reduce((sum, day) => 
          sum + (day.activities?.length || 0), 0) || 0,
        hasAllRequiredFields: !!(response.destination && response.title && 
          response.itinerary && response.quickTips)
      };

      // Check for validation errors
      if (response.validationError) {
        if (testCase.shouldFail) {
          result.passed = true;
          console.log(`   ${colors.green}✓ Failed as expected (validation error)${colors.reset}`);
        } else {
          result.errors.push(`Validation error: ${response.errorMessage}`);
          result.passed = false;
        }
      } else {
        // Validate against expectations
        if (testCase.expected) {
          result.passed = this.validateResponse(response, testCase.expected, result);
        } else if (testCase.shouldFail) {
          result.errors.push('Test should have failed but succeeded');
          result.passed = false;
        } else {
          // If no specific expectations, just check structure
          result.passed = result.metrics.hasAllRequiredFields || false;
        }
      }

      // Check performance
      const duration = Date.now() - startTime;
      if (duration > 30000) {
        result.warnings.push(`Slow response: ${duration}ms`);
      }

    } catch (error) {
      if (testCase.shouldFail) {
        result.passed = true;
        console.log(`   ${colors.green}✓ Failed as expected${colors.reset}`);
      } else {
        result.errors.push(error instanceof Error ? error.message : String(error));
        result.passed = false;
      }
    }

    result.duration = Date.now() - startTime;

    // Display result
    if (result.passed) {
      console.log(`   ${colors.green}✅ PASS${colors.reset} - ${result.duration}ms`);
    } else {
      console.log(`   ${colors.red}❌ FAIL${colors.reset} - ${result.duration}ms`);
      result.errors.forEach(err => 
        console.log(`      ${colors.red}Error: ${err}${colors.reset}`));
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => 
        console.log(`      ${colors.yellow}⚠️  ${warn}${colors.reset}`));
    }

    // Log metrics
    if (result.metrics.totalDays) {
      console.log(`   ${colors.cyan}Metrics: ${result.metrics.totalDays} days, ${result.metrics.totalActivities} activities${colors.reset}`);
    }

    return result;
  }

  private validateResponse(
    response: GeneratePersonalizedItineraryOutput,
    expected: TestCase['expected'],
    result: TestResult
  ): boolean {
    if (!expected) return true;

    let valid = true;

    // Check destinations
    if (expected.destinations) {
      const responseDestinations = response.destination.split(',').map(d => d.trim());
      const hasAllDestinations = expected.destinations.every(dest =>
        responseDestinations.some(rd => rd.toLowerCase().includes(dest.toLowerCase()))
      );
      if (!hasAllDestinations) {
        result.errors.push(`Missing destinations. Expected: ${expected.destinations.join(', ')}, Got: ${response.destination}`);
        valid = false;
      }
    }

    // Check total days
    if (expected.totalDays !== undefined) {
      const actualDays = response.itinerary?.length || 0;
      if (actualDays !== expected.totalDays) {
        result.errors.push(`Day count mismatch. Expected: ${expected.totalDays}, Got: ${actualDays}`);
        valid = false;
      }
    }

    // Check activities count
    if (expected.minActivities !== undefined) {
      const totalActivities = result.metrics.totalActivities || 0;
      if (totalActivities < expected.minActivities) {
        result.errors.push(`Too few activities. Expected min: ${expected.minActivities}, Got: ${totalActivities}`);
        valid = false;
      }
    }

    // Check for must-include content
    if (expected.mustInclude) {
      const fullText = JSON.stringify(response).toLowerCase();
      const missing = expected.mustInclude.filter(term => 
        !fullText.includes(term.toLowerCase())
      );
      if (missing.length > 0) {
        result.warnings.push(`Missing expected content: ${missing.join(', ')}`);
      }
    }

    return valid;
  }

  async runSuite(suiteName: string, tests: TestCase[]): Promise<void> {
    console.log(`\n${colors.bright}${colors.magenta}━━━ Test Suite: ${suiteName} ━━━${colors.reset}`);
    
    for (const test of tests) {
      const result = await this.runTest(test, suiteName);
      this.results.push(result);
      
      // Add delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async saveResults(): Promise<void> {
    const now = new Date();
    // Convert to LA time (PST/PDT) using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const p: any = {};
    parts.forEach(part => {
      if (part.type !== 'literal') p[part.type] = part.value;
    });
    
    const dateStr = `${p.year}-${p.month}-${p.day}`;
    const timeStr = `${p.hour}-${p.minute}-${p.second}`;
    const resultFile = path.join(this.logDir, `ai-test-results-${dateStr}-at-${timeStr}.json`);
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      avgDuration: Math.round(
        this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
      ),
      results: this.results
    };

    await fs.writeFile(resultFile, JSON.stringify(summary, null, 2));
    
    // Also append to a master log file
    const masterLog = path.join(this.logDir, 'test-history.jsonl');
    const logEntry = {
      timestamp: summary.timestamp,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.totalTests,
      avgDuration: summary.avgDuration
    };
    await fs.appendFile(masterLog, JSON.stringify(logEntry) + '\n');

    console.log(`\n${colors.cyan}📝 Results saved to: ${resultFile}${colors.reset}`);
  }

  displaySummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const avgDuration = Math.round(
      this.results.reduce((sum, r) => sum + r.duration, 0) / total
    );

    console.log(`\n${colors.bright}${'═'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}📊 TEST SUMMARY${colors.reset}`);
    console.log(`${'═'.repeat(50)}`);
    
    const passRate = ((passed / total) * 100).toFixed(1);
    const color = passed === total ? colors.green : 
                  passed > total * 0.8 ? colors.yellow : colors.red;
    
    console.log(`${color}Pass Rate: ${passed}/${total} (${passRate}%)${colors.reset}`);
    console.log(`Average Duration: ${avgDuration}ms`);
    
    if (failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testId}: ${r.errors[0] || 'Unknown error'}`);
        });
    }

    // Show warnings
    const warnings = this.results.filter(r => r.warnings.length > 0);
    if (warnings.length > 0) {
      console.log(`\n${colors.yellow}Tests with Warnings:${colors.reset}`);
      warnings.forEach(r => {
        console.log(`  - ${r.testId}: ${r.warnings.join(', ')}`);
      });
    }
  }
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}🚀 Comprehensive AI Test Runner${colors.reset}`);
  console.log(`${'─'.repeat(50)}`);

  const runner = new ComprehensiveTestRunner();
  
  try {
    await runner.initialize();
    
    // Check for API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    
    console.log(`\n${colors.cyan}🔑 API Keys:${colors.reset}`);
    console.log(`  OpenAI: ${hasOpenAI ? '✅' : '❌'}`);
    console.log(`  Gemini: ${hasGemini ? '✅' : '❌'}`);
    
    if (!hasOpenAI && !hasGemini) {
      console.error(`${colors.red}❌ No API keys found. Please set OPENAI_API_KEY or GEMINI_API_KEY${colors.reset}`);
      process.exit(1);
    }

    // Load and run tests
    const goldenTests = await runner.loadGoldenTests();
    
    // Run test suites based on command line argument
    const testFilter = process.argv[2]; // e.g., --basic, --edge, --all
    
    if (!testFilter || testFilter === '--all') {
      // Run all test suites
      for (const [suiteName, suite] of Object.entries(goldenTests.testSuites)) {
        if (typeof suite === 'object' && 'tests' in suite) {
          await runner.runSuite(suiteName, (suite as any).tests);
        }
      }
    } else {
      // Run specific suite
      const suiteName = testFilter.replace('--', '');
      const suite = goldenTests.testSuites[suiteName];
      if (suite && suite.tests) {
        await runner.runSuite(suiteName, suite.tests);
      } else {
        console.error(`${colors.red}Suite '${suiteName}' not found${colors.reset}`);
        console.log(`Available suites: ${Object.keys(goldenTests.testSuites).join(', ')}`);
        process.exit(1);
      }
    }

    // Save results and show summary
    await runner.saveResults();
    runner.displaySummary();

  } catch (error) {
    console.error(`${colors.red}Test runner error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveTestRunner };