/**
 * Comprehensive GPT-5 AI Test Suite
 * Tests various scenarios to understand AI behavior and performance
 * Run with: npx tsx scripts/test-ai-direct.ts
 */

import { config } from 'dotenv';
import OpenAI from 'openai';
import { AIController } from '../src/services/ai/ai-controller';
config({ path: '.env.local' });

interface TestCase {
  category: string;
  prompt: string;
  expectedFields: {
    destination?: boolean;
    duration?: boolean;
    startDate?: boolean;
    endDate?: boolean;
    travelers?: boolean;
    preferences?: boolean;
  };
  complexity: 'simple' | 'medium' | 'complex';
}

interface TestResult {
  prompt: string;
  category: string;
  success: boolean;
  extracted: any;
  missing: string[];
  responseTime: number;
  error?: string;
}

class AITestSuite {
  private client: OpenAI;
  private controller: AIController;
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    this.controller = new AIController();
  }

  // Test cases covering various scenarios
  private testCases: TestCase[] = [
    // SIMPLE CASES - Should always work
    {
      category: 'Simple Direct',
      prompt: 'plan a 3 day trip to london',
      expectedFields: { destination: true, duration: true },
      complexity: 'simple'
    },
    {
      category: 'Simple with Date',
      prompt: 'plan a 5 day trip to paris starting october 15',
      expectedFields: { destination: true, duration: true, startDate: true },
      complexity: 'simple'
    },
    {
      category: 'Weekend Trip',
      prompt: 'weekend trip to tokyo',
      expectedFields: { destination: true, duration: true },
      complexity: 'simple'
    },

    // MEDIUM COMPLEXITY
    {
      category: 'Natural Language',
      prompt: 'I want to visit Barcelona for a week in March',
      expectedFields: { destination: true, duration: true, startDate: true },
      complexity: 'medium'
    },
    {
      category: 'Date Range',
      prompt: 'trip to Rome from December 20 to December 27',
      expectedFields: { destination: true, startDate: true, endDate: true, duration: true },
      complexity: 'medium'
    },
    {
      category: 'With Travelers',
      prompt: 'planning a trip to Dubai for 4 days with my wife and 2 kids',
      expectedFields: { destination: true, duration: true, travelers: true },
      complexity: 'medium'
    },
    {
      category: 'Vague Duration',
      prompt: 'quick trip to Amsterdam next month',
      expectedFields: { destination: true, startDate: true },
      complexity: 'medium'
    },
    {
      category: 'Multiple Destinations',
      prompt: 'I want to visit London and Paris for 7 days total',
      expectedFields: { destination: true, duration: true },
      complexity: 'medium'
    },

    // COMPLEX CASES
    {
      category: 'Full Details',
      prompt: 'family vacation to Bali from July 15-22 for 2 adults and 3 children, budget friendly with beach activities',
      expectedFields: {
        destination: true,
        startDate: true,
        endDate: true,
        duration: true,
        travelers: true,
        preferences: true
      },
      complexity: 'complex'
    },
    {
      category: 'Conversational',
      prompt: 'We are thinking about going somewhere warm in February, maybe 10 days, could be Caribbean or Southeast Asia',
      expectedFields: { duration: true, startDate: true, preferences: true },
      complexity: 'complex'
    },
    {
      category: 'Business Trip',
      prompt: 'business trip to Singapore next quarter for conference, need 3 nights hotel near Marina Bay',
      expectedFields: { destination: true, duration: true, preferences: true },
      complexity: 'complex'
    },
    {
      category: 'Ambiguous',
      prompt: 'somewhere nice for the holidays',
      expectedFields: { preferences: true },
      complexity: 'complex'
    },

    // EDGE CASES
    {
      category: 'Typos',
      prompt: 'plan a 3 day trip to londn',  // Typo in London
      expectedFields: { destination: true, duration: true },
      complexity: 'simple'
    },
    {
      category: 'Mixed Format',
      prompt: '5d Paris trip on 15/3',
      expectedFields: { destination: true, duration: true, startDate: true },
      complexity: 'medium'
    },
    {
      category: 'Non-English Mix',
      prompt: 'viaje a México for cinco días',  // Spanish mixed with English
      expectedFields: { destination: true, duration: true },
      complexity: 'medium'
    },
    {
      category: 'Very Long',
      prompt: 'So I was thinking, maybe it would be nice to take a trip, you know, somewhere interesting, perhaps Europe or Asia, I\'m not really sure yet, but definitely want to go for about a week or so, maybe 8-9 days if we can manage it, and it should be sometime in the spring, like April or May when the weather is nice',
      expectedFields: { duration: true, startDate: true, preferences: true },
      complexity: 'complex'
    },
    {
      category: 'Just Destination',
      prompt: 'Paris',
      expectedFields: { destination: true },
      complexity: 'simple'
    },
    {
      category: 'Just Duration',
      prompt: '5 days trip',
      expectedFields: { duration: true },
      complexity: 'simple'
    }
  ];

  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      prompt: testCase.prompt,
      category: testCase.category,
      success: false,
      extracted: {},
      missing: [],
      responseTime: 0
    };

    try {
      // Use AIController for extraction (includes pattern matching + GPT-5)
      const extracted = await this.controller.extractIntent(testCase.prompt);

      result.responseTime = Date.now() - startTime;
      result.extracted = extracted;

      // Check for expected fields
      for (const [field, expected] of Object.entries(testCase.expectedFields)) {
        if (expected && !result.extracted[field]) {
          result.missing.push(field);
        }
      }

      result.success = result.missing.length === 0;

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;

      // If GPT-5 isn't available, provide meaningful error
      if (error.message?.includes('model') || error.status === 404) {
        result.error = 'GPT-5 not available';
      }
    }

    return result;
  }

  async runAllTests() {
    console.log('🧪 Comprehensive GPT-5 AI Test Suite');
    console.log('=' .repeat(60));
    console.log(`📋 Running ${this.testCases.length} test cases across multiple categories\n`);

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY not found in .env.local');
      console.log('   Please add your OpenAI API key to continue');
      return;
    }

    // Run tests by complexity
    const complexityGroups = {
      simple: this.testCases.filter(tc => tc.complexity === 'simple'),
      medium: this.testCases.filter(tc => tc.complexity === 'medium'),
      complex: this.testCases.filter(tc => tc.complexity === 'complex')
    };

    for (const [complexity, cases] of Object.entries(complexityGroups)) {
      console.log(`\n📊 Testing ${complexity.toUpperCase()} cases (${cases.length} tests):`);
      console.log('-'.repeat(60));

      for (const testCase of cases) {
        process.stdout.write(`Testing "${testCase.category}"... `);
        const result = await this.runTest(testCase);
        this.results.push(result);

        if (result.success) {
          console.log(`✅ Success (${result.responseTime}ms)`);
        } else if (result.error) {
          console.log(`❌ Error: ${result.error}`);
        } else {
          console.log(`⚠️  Missing: ${result.missing.join(', ')} (${result.responseTime}ms)`);
        }

        // Show extracted data for failed cases
        if (!result.success && !result.error && Object.keys(result.extracted).length > 0) {
          console.log(`   Extracted: ${JSON.stringify(result.extracted)}`);
        }

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.printSummary();
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const totalTime = Date.now() - this.startTime;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success && !r.error).length;
    const errors = this.results.filter(r => r.error).length;

    // Overall stats
    console.log('\n📊 Overall Statistics:');
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   ✅ Successful: ${successful} (${(successful/this.results.length*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Partial: ${failed} (${(failed/this.results.length*100).toFixed(1)}%)`);
    console.log(`   ❌ Errors: ${errors} (${(errors/this.results.length*100).toFixed(1)}%)`);
    console.log(`   ⏱️  Total Time: ${(totalTime/1000).toFixed(1)}s`);

    // Performance metrics
    const validResults = this.results.filter(r => !r.error);
    if (validResults.length > 0) {
      const avgTime = validResults.reduce((sum, r) => sum + r.responseTime, 0) / validResults.length;
      const minTime = Math.min(...validResults.map(r => r.responseTime));
      const maxTime = Math.max(...validResults.map(r => r.responseTime));

      console.log('\n⏱️  Performance Metrics:');
      console.log(`   Average Response: ${avgTime.toFixed(0)}ms`);
      console.log(`   Fastest Response: ${minTime}ms`);
      console.log(`   Slowest Response: ${maxTime}ms`);
    }

    // Success by complexity
    console.log('\n📈 Success Rate by Complexity:');
    for (const complexity of ['simple', 'medium', 'complex']) {
      const complexResults = this.results.filter(r =>
        this.testCases.find(tc => tc.prompt === r.prompt)?.complexity === complexity
      );
      const complexSuccess = complexResults.filter(r => r.success).length;
      const rate = complexResults.length > 0 ? (complexSuccess/complexResults.length*100).toFixed(1) : 0;
      console.log(`   ${complexity.padEnd(10)}: ${rate}% (${complexSuccess}/${complexResults.length})`);
    }

    // Most common missing fields
    const missingFields: Record<string, number> = {};
    this.results.forEach(r => {
      r.missing.forEach(field => {
        missingFields[field] = (missingFields[field] || 0) + 1;
      });
    });

    if (Object.keys(missingFields).length > 0) {
      console.log('\n❓ Most Commonly Missing Fields:');
      Object.entries(missingFields)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([field, count]) => {
          console.log(`   ${field.padEnd(15)}: ${count} times`);
        });
    }

    // Problem categories
    const problemCategories = this.results
      .filter(r => !r.success)
      .map(r => r.category);

    if (problemCategories.length > 0) {
      console.log('\n⚠️  Categories with Issues:');
      const uniqueCategories = [...new Set(problemCategories)];
      uniqueCategories.slice(0, 5).forEach(cat => {
        console.log(`   - ${cat}`);
      });
    }

    // Insights
    console.log('\n💡 Key Insights:');

    if (successful === this.results.length) {
      console.log('   ✅ Perfect! All tests passed successfully.');
    } else {
      // Analyze patterns
      const simpleSuccess = this.results.filter(r =>
        this.testCases.find(tc => tc.prompt === r.prompt)?.complexity === 'simple' && r.success
      ).length;
      const simpleTotal = this.testCases.filter(tc => tc.complexity === 'simple').length;

      if (simpleSuccess < simpleTotal) {
        console.log('   ⚠️  Some simple cases are failing - investigate prompt parsing');
      }

      if (missingFields['startDate'] > 3) {
        console.log('   📅 Date extraction needs improvement');
      }

      if (missingFields['travelers'] > 2) {
        console.log('   👥 Traveler count extraction could be enhanced');
      }

      const avgSuccessTime = validResults.filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / validResults.filter(r => r.success).length || 0;

      if (avgSuccessTime > 2000) {
        console.log(`   ⏱️  Response times are slow (avg ${avgSuccessTime.toFixed(0)}ms)`);
      } else if (avgSuccessTime < 500) {
        console.log(`   ⚡ Excellent response times (avg ${avgSuccessTime.toFixed(0)}ms)`);
      }
    }

    // Recommendations
    console.log('\n🔧 Recommendations:');
    if (errors > 0) {
      if (this.results.some(r => r.error === 'GPT-5 not available')) {
        console.log('   1. Ensure GPT-5 API access is configured');
        console.log('   2. Check if API key has GPT-5 permissions');
      }
    }

    if (failed > 0) {
      console.log('   - Review prompt engineering for better extraction');
      console.log('   - Consider adding fallback logic for missing fields');
      console.log('   - Implement retry mechanism for failed extractions');
    }

    // Save detailed results
    this.saveResults();
  }

  private saveResults() {
    const fs = require('fs');
    const resultFile = `/home/user/studio/scripts/test-results-${Date.now()}.json`;

    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        errors: this.results.filter(r => r.error).length
      },
      results: this.results,
      testCases: this.testCases
    };

    fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultFile}`);
  }
}

// Run the comprehensive test suite
async function main() {
  const suite = new AITestSuite();
  await suite.runAllTests();
}

main().catch(console.error);