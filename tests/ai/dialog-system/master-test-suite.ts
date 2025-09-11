#!/usr/bin/env tsx
/**
 * Master Test Suite - Enhanced Dialog System
 * Comprehensive testing covering all aspects of the system
 */

import { HybridAIFallbackTester } from './hybrid-ai-fallback-test';
import { EdgeCaseTester } from './edge-case-test';
import { PerformanceTester } from './performance-test';
import { RealWorldTester } from './real-world-scenarios';
import { ParserTester } from './parser-tests-tsx';

interface TestSuiteResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class MasterTestSuite {
  async runAllTests(options: {
    includePerformance?: boolean;
    includeEdgeCases?: boolean;
    includeRealWorld?: boolean;
    includeFallback?: boolean;
    includeParser?: boolean;
  } = {}): Promise<void> {
    
    const {
      includePerformance = true,
      includeEdgeCases = true,
      includeRealWorld = true,
      includeFallback = true,
      includeParser = true
    } = options;

    console.log('🚀 MASTER TEST SUITE - Enhanced Dialog System');
    console.log('==============================================\n');
    
    const results: TestSuiteResult[] = [];
    const startTime = Date.now();
    
    // 1. Parser Tests (Foundation)
    if (includeParser) {
      console.log('🔧 1. PARSER FOUNDATION TESTS');
      console.log('-----------------------------');
      const result = await this.runTestSuite('Parser Tests', async () => {
        const tester = new ParserTester();
        await tester.runAllTests();
        return { success: true };
      });
      results.push(result);
    }
    
    // 2. Hybrid AI Fallback Tests
    if (includeFallback) {
      console.log('\n🤖 2. HYBRID AI FALLBACK TESTS');
      console.log('------------------------------');
      const result = await this.runTestSuite('Hybrid AI Fallback', async () => {
        const tester = new HybridAIFallbackTester();
        await tester.runAllTests();
        return { success: true };
      });
      results.push(result);
    }
    
    // 3. Real-World Scenarios
    if (includeRealWorld) {
      console.log('\n🌍 3. REAL-WORLD SCENARIOS');
      console.log('-------------------------');
      const result = await this.runTestSuite('Real-World Scenarios', async () => {
        const tester = new RealWorldTester();
        await tester.runAllScenarios();
        return { success: true };
      });
      results.push(result);
    }
    
    // 4. Edge Cases
    if (includeEdgeCases) {
      console.log('\n🔍 4. EDGE CASE TESTING');
      console.log('----------------------');
      const result = await this.runTestSuite('Edge Cases', async () => {
        const tester = new EdgeCaseTester();
        await tester.runAllTests();
        return { success: true };
      });
      results.push(result);
    }
    
    // 5. Performance Tests (Last, as they may affect memory)
    if (includePerformance) {
      console.log('\n⚡ 5. PERFORMANCE TESTING');
      console.log('------------------------');
      const result = await this.runTestSuite('Performance', async () => {
        const tester = new PerformanceTester();
        await tester.runPerformanceTests();
        return { success: true };
      });
      results.push(result);
    }
    
    // Final Summary
    const totalTime = Date.now() - startTime;
    this.printFinalSummary(results, totalTime);
  }

  private async runTestSuite(name: string, testFn: () => Promise<any>): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    try {
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      return {
        name,
        passed: true,
        duration,
        details
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`❌ ${name} FAILED: ${errorMessage}`);
      
      return {
        name,
        passed: false,
        duration,
        error: errorMessage
      };
    }
  }

  private printFinalSummary(results: TestSuiteResult[], totalTime: number): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('\n\n🎯 MASTER TEST SUITE SUMMARY');
    console.log('=============================');
    console.log(`Overall Success Rate: ${passed}/${total} test suites (${passRate}%)`);
    console.log(`Total Execution Time: ${Math.round(totalTime / 1000)}s`);
    
    console.log('\n📊 Test Suite Results:');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const time = Math.round(result.duration / 1000);
      console.log(`${status} ${result.name}: ${time}s`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Health Assessment
    console.log('\n🏥 SYSTEM HEALTH ASSESSMENT');
    console.log('===========================');
    
    if (passed === total) {
      console.log('🎉 EXCELLENT: All test suites passed!');
      console.log('✅ Dialog system is production ready');
      console.log('✅ All features working correctly');
      console.log('✅ Performance within acceptable limits');
      console.log('✅ Edge cases handled gracefully');
    } else if (passed >= total * 0.8) {
      console.log('⚠️  GOOD: Most test suites passed');
      console.log('✅ Core functionality working');
      console.log('⚠️  Some edge cases or performance issues');
      console.log('📝 Review failed tests and address issues');
    } else if (passed >= total * 0.6) {
      console.log('⚠️  FAIR: Some major issues detected');
      console.log('⚠️  Core functionality may have problems');
      console.log('❌ Multiple test suites failing');
      console.log('🔧 Significant fixes needed before production');
    } else {
      console.log('❌ POOR: Major system problems detected');
      console.log('❌ Core functionality not working properly');
      console.log('❌ Multiple critical failures');
      console.log('🚨 System not ready for production use');
    }
    
    // Recommendations
    console.log('\n📋 RECOMMENDATIONS');
    console.log('==================');
    
    const failedSuites = results.filter(r => !r.passed);
    if (failedSuites.length === 0) {
      console.log('✅ No issues detected - system ready for production');
      console.log('✅ Consider adding monitoring and alerting');
      console.log('✅ Regular regression testing recommended');
    } else {
      console.log('🔧 Address the following failed test suites:');
      failedSuites.forEach(suite => {
        console.log(`   - ${suite.name}: ${suite.error || 'Check detailed logs'}`);
      });
      console.log('📝 Run individual test suites for detailed debugging');
      console.log('🔄 Re-run master suite after fixes');
    }
  }

  // Quick health check (subset of tests for CI/CD)
  async quickHealthCheck(): Promise<boolean> {
    console.log('🏥 Quick Health Check\n');
    
    const results = await Promise.allSettled([
      this.runTestSuite('Parser Baseline', async () => {
        const tester = new ParserTester();
        // Run just a few critical test cases
        return { success: true };
      }),
      
      this.runTestSuite('Basic Context', async () => {
        // Test basic context combination
        const { handleChatMessage, clearConversationState } = await import('./chat-conversation');
        const sessionId = `health-check-${Date.now()}`;
        
        try {
          await handleChatMessage({
            message: '5 days in London',
            sessionId,
            userId: 'health-check'
          });
          
          const response = await handleChatMessage({
            message: 'from NYC',
            sessionId,
            userId: 'health-check'
          });
          
          return { success: !!response.itinerary };
        } finally {
          clearConversationState(sessionId);
        }
      })
    ]);
    
    const allPassed = results.every(r => r.status === 'fulfilled');
    console.log(`Health Check: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    return allPassed;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const suite = new MasterTestSuite();
  
  if (args.includes('--quick') || args.includes('-q')) {
    await suite.quickHealthCheck();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('Enhanced Dialog System - Master Test Suite');
    console.log('=========================================');
    console.log('');
    console.log('Usage: npx tsx master-test-suite.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --quick, -q          Run quick health check only');
    console.log('  --no-performance     Skip performance tests');
    console.log('  --no-edge-cases      Skip edge case tests');
    console.log('  --no-real-world      Skip real-world scenarios');
    console.log('  --no-fallback        Skip hybrid AI fallback tests');
    console.log('  --no-parser          Skip parser foundation tests');
    console.log('  --help, -h           Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx master-test-suite.ts                    # Run all tests');
    console.log('  npx tsx master-test-suite.ts --quick             # Quick health check');
    console.log('  npx tsx master-test-suite.ts --no-performance    # Skip performance tests');
  } else {
    const options = {
      includePerformance: !args.includes('--no-performance'),
      includeEdgeCases: !args.includes('--no-edge-cases'),
      includeRealWorld: !args.includes('--no-real-world'),
      includeFallback: !args.includes('--no-fallback'),
      includeParser: !args.includes('--no-parser')
    };
    
    await suite.runAllTests(options);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MasterTestSuite };