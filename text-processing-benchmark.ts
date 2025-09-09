#!/usr/bin/env tsx
/**
 * Text Processing Benchmark Suite
 * Measures improvements in input parsing, validation, and AI response quality
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

// Test case interface
interface TestCase {
  id: string;
  category: 'date-parsing' | 'validation' | 'entity-extraction' | 'complex-request';
  input: string;
  description: string;
  expectedOutput: {
    destinations?: string[];
    startDate?: string;
    endDate?: string;
    duration?: number;
    travelers?: number;
    budget?: number;
    shouldSucceed: boolean;
  };
}

// Benchmark result interface
interface BenchmarkResult {
  testId: string;
  category: string;
  input: string;
  success: boolean;
  processingTime: number;
  aiResponseTime?: number;
  errors: string[];
  actualOutput: {
    destination?: string;
    dates?: any;
    duration?: number;
    activities?: number;
    validationPassed?: boolean;
  };
  expectedVsActual: {
    matched: boolean;
    differences: string[];
  };
}

// Run metadata
interface BenchmarkRun {
  runId: string;
  timestamp: string;
  phase: 'baseline' | 'phase1-complete' | 'phase2-complete';
  environment: {
    nodeVersion: string;
    hasDateFns: boolean;
    hasValidator: boolean;
    hasNLP: boolean;
  };
  results: BenchmarkResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    avgProcessingTime: number;
    avgAIResponseTime: number;
    successRate: number;
    categorySummary: Record<string, {
      total: number;
      passed: number;
      avgTime: number;
    }>;
  };
}

class TextProcessingBenchmark {
  private testCases: TestCase[] = [
    // DATE PARSING TESTS
    {
      id: 'date_1',
      category: 'date-parsing',
      input: 'Trip to Paris next week',
      description: 'Relative date - next week',
      expectedOutput: {
        destinations: ['Paris'],
        duration: 7,
        shouldSucceed: true
      }
    },
    {
      id: 'date_2',
      category: 'date-parsing',
      input: 'Planning vacation to Tokyo mid-January',
      description: 'Partial date - mid-month',
      expectedOutput: {
        destinations: ['Tokyo'],
        startDate: 'January',
        shouldSucceed: true
      }
    },
    {
      id: 'date_3',
      category: 'date-parsing',
      input: 'Christmas holidays in New York',
      description: 'Holiday reference',
      expectedOutput: {
        destinations: ['New York'],
        startDate: 'December',
        shouldSucceed: true
      }
    },
    {
      id: 'date_4',
      category: 'date-parsing',
      input: 'Summer 2024 European tour',
      description: 'Seasonal date',
      expectedOutput: {
        destinations: ['Europe'],
        startDate: 'June',
        shouldSucceed: true
      }
    },
    {
      id: 'date_5',
      category: 'date-parsing',
      input: 'Weekend getaway to Miami starting tomorrow',
      description: 'Immediate travel - tomorrow',
      expectedOutput: {
        destinations: ['Miami'],
        duration: 3,
        shouldSucceed: true
      }
    },

    // INPUT VALIDATION TESTS
    {
      id: 'val_1',
      category: 'validation',
      input: 'Trip to <script>alert("test")</script> for 5 days',
      description: 'XSS attempt in destination',
      expectedOutput: {
        shouldSucceed: false
      }
    },
    {
      id: 'val_2',
      category: 'validation',
      input: 'Travel to Paris\'; DROP TABLE users; -- for a week',
      description: 'SQL injection attempt',
      expectedOutput: {
        shouldSucceed: false
      }
    },
    {
      id: 'val_3',
      category: 'validation',
      input: 'Budget trip to Bali for $$$2000 per person',
      description: 'Malformed budget input',
      expectedOutput: {
        destinations: ['Bali'],
        budget: 2000,
        shouldSucceed: true
      }
    },
    {
      id: 'val_4',
      category: 'validation',
      input: 'Trip for 99999 days to Mars',
      description: 'Invalid duration',
      expectedOutput: {
        shouldSucceed: false
      }
    },
    {
      id: 'val_5',
      category: 'validation',
      input: 'Family trip (2 adults + 2 kids) to Disney World',
      description: 'Complex traveler count',
      expectedOutput: {
        destinations: ['Disney World', 'Orlando'],
        travelers: 4,
        shouldSucceed: true
      }
    },

    // ENTITY EXTRACTION TESTS
    {
      id: 'entity_1',
      category: 'entity-extraction',
      input: 'Two week honeymoon in Bali and Thailand',
      description: 'Multi-destination extraction',
      expectedOutput: {
        destinations: ['Bali', 'Thailand'],
        duration: 14,
        travelers: 2,
        shouldSucceed: true
      }
    },
    {
      id: 'entity_2',
      category: 'entity-extraction',
      input: 'Solo backpacking across Vietnam, Cambodia, and Laos for 3 weeks',
      description: 'Multiple countries with duration',
      expectedOutput: {
        destinations: ['Vietnam', 'Cambodia', 'Laos'],
        duration: 21,
        travelers: 1,
        shouldSucceed: true
      }
    },
    {
      id: 'entity_3',
      category: 'entity-extraction',
      input: 'Business trip to San Francisco from May 15-20',
      description: 'Date range extraction',
      expectedOutput: {
        destinations: ['San Francisco'],
        startDate: 'May 15',
        endDate: 'May 20',
        duration: 6,
        shouldSucceed: true
      }
    },
    {
      id: 'entity_4',
      category: 'entity-extraction',
      input: 'Group tour for 8 people to Iceland northern lights in February',
      description: 'Group size and activity extraction',
      expectedOutput: {
        destinations: ['Iceland'],
        travelers: 8,
        startDate: 'February',
        shouldSucceed: true
      }
    },

    // COMPLEX REQUEST TESTS
    {
      id: 'complex_1',
      category: 'complex-request',
      input: 'Planning a 2-week workation in Lisbon starting mid-March, need good wifi and coworking spaces, budget around €3000',
      description: 'Workation with specific requirements',
      expectedOutput: {
        destinations: ['Lisbon'],
        duration: 14,
        startDate: 'March',
        budget: 3000,
        shouldSucceed: true
      }
    },
    {
      id: 'complex_2',
      category: 'complex-request',
      input: 'Anniversary trip next month: 3 days Paris then 4 days Rome, luxury hotels, romantic activities',
      description: 'Multi-city with preferences',
      expectedOutput: {
        destinations: ['Paris', 'Rome'],
        duration: 7,
        travelers: 2,
        shouldSucceed: true
      }
    },
    {
      id: 'complex_3',
      category: 'complex-request',
      input: 'Family reunion in Orlando during spring break, need accommodation for 12 people near theme parks',
      description: 'Large group with location preferences',
      expectedOutput: {
        destinations: ['Orlando'],
        travelers: 12,
        startDate: 'March',
        shouldSucceed: true
      }
    }
  ];

  private resultsDir = './benchmark-results';
  private currentPhase: 'baseline' | 'phase1-complete' | 'phase2-complete' = 'baseline';

  constructor(phase?: 'baseline' | 'phase1-complete' | 'phase2-complete') {
    if (phase) this.currentPhase = phase;
  }

  async runBenchmark(): Promise<void> {
    console.log(`\n🚀 Starting Text Processing Benchmark - Phase: ${this.currentPhase}\n`);
    console.log('=' .repeat(80));
    
    // Ensure results directory exists
    await fs.mkdir(this.resultsDir, { recursive: true });
    
    const results: BenchmarkResult[] = [];
    const runId = `${this.currentPhase}_${Date.now()}`;
    
    // Run tests by category
    const categories = ['date-parsing', 'validation', 'entity-extraction', 'complex-request'];
    
    for (const category of categories) {
      console.log(`\n📊 Testing Category: ${category.toUpperCase()}`);
      console.log('-'.repeat(60));
      
      const categoryTests = this.testCases.filter(tc => tc.category === category);
      
      for (const testCase of categoryTests) {
        const result = await this.runSingleTest(testCase);
        results.push(result);
        
        // Display result
        const status = result.success ? '✅' : '❌';
        const time = `${result.processingTime}ms`;
        console.log(`${status} ${testCase.id}: ${testCase.description} [${time}]`);
        
        if (!result.success && result.errors.length > 0) {
          console.log(`   └─ Errors: ${result.errors.join(', ')}`);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Calculate and save summary
    const summary = this.calculateSummary(results);
    const runData: BenchmarkRun = {
      runId,
      timestamp: new Date().toISOString(),
      phase: this.currentPhase,
      environment: await this.checkEnvironment(),
      results,
      summary
    };
    
    // Save results
    await this.saveResults(runData);
    
    // Display summary
    this.displaySummary(summary);
    
    // Compare with previous runs if available
    await this.compareWithPrevious(runData);
  }

  private async runSingleTest(testCase: TestCase): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const result: BenchmarkResult = {
      testId: testCase.id,
      category: testCase.category,
      input: testCase.input,
      success: false,
      processingTime: 0,
      errors: [],
      actualOutput: {},
      expectedVsActual: {
        matched: false,
        differences: []
      }
    };

    try {
      // For validation tests that should fail, check if they're properly rejected
      if (!testCase.expectedOutput.shouldSucceed) {
        try {
          const response = await generatePersonalizedItinerary({
            prompt: testCase.input,
            attachedFile: undefined,
            conversationHistory: undefined
          });
          
          // If we get here and it was supposed to fail, that's a failure
          result.errors.push('Input should have been rejected but was processed');
          result.success = false;
        } catch (error) {
          // Expected failure - this is success
          result.success = true;
        }
      } else {
        // Normal test - should succeed
        const aiStartTime = Date.now();
        const response = await generatePersonalizedItinerary({
          prompt: testCase.input,
          attachedFile: undefined,
          conversationHistory: undefined
        });
        result.aiResponseTime = Date.now() - aiStartTime;
        
        // Extract actual output
        result.actualOutput = {
          destination: response?.destination,
          duration: response?.itinerary?.length,
          activities: response?.itinerary?.reduce(
            (sum, day) => sum + (day.activities?.length || 0), 0
          ),
          validationPassed: true
        };
        
        // Compare with expected
        result.success = this.compareOutputs(testCase.expectedOutput, result.actualOutput, result);
      }
    } catch (error: any) {
      if (!testCase.expectedOutput.shouldSucceed) {
        // Expected failure
        result.success = true;
      } else {
        result.errors.push(error.message || 'Unknown error');
        result.success = false;
      }
    }
    
    result.processingTime = Date.now() - startTime;
    return result;
  }

  private compareOutputs(
    expected: TestCase['expectedOutput'], 
    actual: BenchmarkResult['actualOutput'],
    result: BenchmarkResult
  ): boolean {
    const differences: string[] = [];
    
    // Check destinations
    if (expected.destinations) {
      const actualDest = actual.destination?.toLowerCase() || '';
      const hasAllDestinations = expected.destinations.every(dest => 
        actualDest.includes(dest.toLowerCase())
      );
      
      if (!hasAllDestinations) {
        differences.push(`Destinations: expected ${expected.destinations.join(', ')}, got ${actual.destination}`);
      }
    }
    
    // Check duration
    if (expected.duration && actual.duration) {
      // Allow some flexibility (±2 days)
      if (Math.abs(actual.duration - expected.duration) > 2) {
        differences.push(`Duration: expected ${expected.duration} days, got ${actual.duration} days`);
      }
    }
    
    result.expectedVsActual.differences = differences;
    result.expectedVsActual.matched = differences.length === 0;
    
    return differences.length === 0;
  }

  private calculateSummary(results: BenchmarkResult[]): BenchmarkRun['summary'] {
    const total = results.length;
    const passed = results.filter(r => r.success).length;
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / total;
    const aiResults = results.filter(r => r.aiResponseTime);
    const avgAIResponseTime = aiResults.length > 0
      ? aiResults.reduce((sum, r) => sum + (r.aiResponseTime || 0), 0) / aiResults.length
      : 0;
    
    // Category breakdown
    const categorySummary: Record<string, any> = {};
    const categories = ['date-parsing', 'validation', 'entity-extraction', 'complex-request'];
    
    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category);
      categorySummary[category] = {
        total: categoryResults.length,
        passed: categoryResults.filter(r => r.success).length,
        avgTime: categoryResults.reduce((sum, r) => sum + r.processingTime, 0) / categoryResults.length
      };
    }
    
    return {
      totalTests: total,
      passed,
      failed: total - passed,
      avgProcessingTime: Math.round(avgProcessingTime),
      avgAIResponseTime: Math.round(avgAIResponseTime),
      successRate: (passed / total) * 100,
      categorySummary
    };
  }

  private async checkEnvironment(): Promise<BenchmarkRun['environment']> {
    const hasDateFns = await this.checkPackage('date-fns');
    const hasValidator = await this.checkPackage('validator');
    const hasNLP = await this.checkPackage('compromise');
    
    return {
      nodeVersion: process.version,
      hasDateFns,
      hasValidator,
      hasNLP
    };
  }

  private async checkPackage(packageName: string): Promise<boolean> {
    try {
      const packageJson = await fs.readFile('./package.json', 'utf-8');
      const pkg = JSON.parse(packageJson);
      return !!(pkg.dependencies?.[packageName] || pkg.devDependencies?.[packageName]);
    } catch {
      return false;
    }
  }

  private async saveResults(runData: BenchmarkRun): Promise<void> {
    const filename = `${runData.runId}.json`;
    const filepath = path.join(this.resultsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(runData, null, 2));
    
    // Also update the latest results file
    const latestPath = path.join(this.resultsDir, `latest_${this.currentPhase}.json`);
    await fs.writeFile(latestPath, JSON.stringify(runData, null, 2));
    
    console.log(`\n📝 Results saved to ${filepath}`);
  }

  private displaySummary(summary: BenchmarkRun['summary']): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 BENCHMARK SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n✅ Success Rate: ${summary.passed}/${summary.totalTests} (${summary.successRate.toFixed(1)}%)`);
    console.log(`⏱️  Average Processing Time: ${summary.avgProcessingTime}ms`);
    if (summary.avgAIResponseTime > 0) {
      console.log(`🤖 Average AI Response Time: ${summary.avgAIResponseTime}ms`);
    }
    
    console.log('\n📈 Category Breakdown:');
    console.log('-'.repeat(60));
    
    for (const [category, stats] of Object.entries(summary.categorySummary)) {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`${category.padEnd(20)} ${stats.passed}/${stats.total} (${rate}%) - Avg: ${Math.round(stats.avgTime)}ms`);
    }
  }

  private async compareWithPrevious(currentRun: BenchmarkRun): Promise<void> {
    try {
      // Load baseline if exists
      const baselinePath = path.join(this.resultsDir, 'latest_baseline.json');
      const baselineExists = await fs.access(baselinePath).then(() => true).catch(() => false);
      
      if (!baselineExists || this.currentPhase === 'baseline') {
        return;
      }
      
      const baselineData = JSON.parse(await fs.readFile(baselinePath, 'utf-8')) as BenchmarkRun;
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 IMPROVEMENT ANALYSIS (vs Baseline)');
      console.log('='.repeat(80));
      
      // Calculate improvements
      const successImprovement = currentRun.summary.successRate - baselineData.summary.successRate;
      const timeImprovement = baselineData.summary.avgProcessingTime - currentRun.summary.avgProcessingTime;
      const timeImprovementPct = (timeImprovement / baselineData.summary.avgProcessingTime) * 100;
      
      console.log(`\n📈 Success Rate: ${successImprovement >= 0 ? '+' : ''}${successImprovement.toFixed(1)}%`);
      console.log(`⚡ Processing Speed: ${timeImprovement >= 0 ? '+' : ''}${timeImprovement.toFixed(0)}ms (${timeImprovementPct.toFixed(1)}% faster)`);
      
      console.log('\n📊 Category Improvements:');
      console.log('-'.repeat(60));
      
      for (const category of Object.keys(currentRun.summary.categorySummary)) {
        const current = currentRun.summary.categorySummary[category];
        const baseline = baselineData.summary.categorySummary[category];
        
        if (baseline) {
          const successDiff = ((current.passed / current.total) - (baseline.passed / baseline.total)) * 100;
          const timeDiff = baseline.avgTime - current.avgTime;
          
          console.log(`${category.padEnd(20)} Success: ${successDiff >= 0 ? '+' : ''}${successDiff.toFixed(1)}% | Speed: ${timeDiff >= 0 ? '+' : ''}${timeDiff.toFixed(0)}ms`);
        }
      }
      
      // Save comparison report
      const comparisonPath = path.join(this.resultsDir, `comparison_${currentRun.runId}.json`);
      await fs.writeFile(comparisonPath, JSON.stringify({
        baseline: baselineData.summary,
        current: currentRun.summary,
        improvements: {
          successRate: successImprovement,
          processingSpeed: timeImprovement,
          processingSpeedPct: timeImprovementPct
        }
      }, null, 2));
      
      console.log(`\n📊 Comparison report saved to ${comparisonPath}`);
    } catch (error) {
      console.log('\n📝 No baseline data available for comparison');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const phase = args[0] as 'baseline' | 'phase1-complete' | 'phase2-complete' || 'baseline';
  
  console.log('🔍 Text Processing Benchmark Tool');
  console.log('==================================');
  console.log(`Phase: ${phase}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const benchmark = new TextProcessingBenchmark(phase);
  await benchmark.runBenchmark();
  
  console.log('\n✅ Benchmark complete!\n');
}

// Run if main module
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

export { TextProcessingBenchmark };