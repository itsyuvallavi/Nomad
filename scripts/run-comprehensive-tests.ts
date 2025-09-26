#!/usr/bin/env node

/**
 * Comprehensive Test Orchestrator for Nomad Navigator
 * Runs all UI, AI, and Integration tests with detailed reporting
 */

import { testRunner } from '../src/testing/test-runner';
import { uiTestSuite } from '../src/testing/ui-tests';
import { aiTestSuite } from '../src/testing/ai-tests';
import { integrationTestSuite } from '../src/testing/integration-tests';
import { logger } from '../src/lib/monitoring/logger';
import * as fs from 'fs';
import * as path from 'path';

interface TestConfig {
  runUI: boolean;
  runAI: boolean;
  runIntegration: boolean;
  runPerformance: boolean;
  runStress: boolean;
  generateReport: boolean;
  saveResults: boolean;
  verbose: boolean;
}

class ComprehensiveTestRunner {
  private config: TestConfig;
  private results: Map<string, any> = new Map();
  private startTime: number = 0;

  constructor(config?: Partial<TestConfig>) {
    this.config = {
      runUI: true,
      runAI: true,
      runIntegration: true,
      runPerformance: true,
      runStress: false,
      generateReport: true,
      saveResults: true,
      verbose: false,
      ...config
    };
  }

  /**
   * Main test execution
   */
  async run(): Promise<void> {
    this.startTime = Date.now();

    console.log('🧪 Starting Comprehensive Test Suite for Nomad Navigator\n');
    console.log('Configuration:', this.config, '\n');

    try {
      // Phase 1: UI Testing
      if (this.config.runUI) {
        await this.runUITests();
      }

      // Phase 2: AI Testing
      if (this.config.runAI) {
        await this.runAITests();
      }

      // Phase 3: Integration Testing
      if (this.config.runIntegration) {
        await this.runIntegrationTests();
      }

      // Phase 4: Performance Testing
      if (this.config.runPerformance) {
        await this.runPerformanceTests();
      }

      // Phase 5: Stress Testing (optional)
      if (this.config.runStress) {
        await this.runStressTests();
      }

      // Generate and save report
      if (this.config.generateReport) {
        await this.generateAndSaveReport();
      }

      // Final summary
      this.printFinalSummary();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run UI component tests
   */
  private async runUITests(): Promise<void> {
    console.log('📱 Running UI Component Tests...\n');

    const uiComponents = [
      'ChatInterface',
      'ItineraryDisplay',
      'DayTimeline',
      'ActivityCard',
      'TripPlanningForm',
      'TopNavigation',
      'AuthModal',
      'Accessibility'
    ];

    const uiResults = {
      totalPassed: 0,
      totalFailed: 0,
      components: []
    };

    for (const component of uiComponents) {
      if (this.config.verbose) {
        console.log(`  Testing ${component}...`);
      }

      const result = await uiTestSuite.runComponentTests(component);
      uiResults.totalPassed += result.passed;
      uiResults.totalFailed += result.failed;
      uiResults.components.push({
        name: component,
        ...result
      });

      // Run accessibility audit
      const a11yResult = await uiTestSuite.runAccessibilityAudit(component);
      if (a11yResult.score < 90) {
        console.warn(`  ⚠️  ${component} accessibility score: ${a11yResult.score}%`);
      }

      // Run responsive tests
      const responsiveResult = await uiTestSuite.runResponsiveTests(component);
      const failedBreakpoints = responsiveResult.breakpoints.filter(b => !b.passed);
      if (failedBreakpoints.length > 0) {
        console.warn(`  ⚠️  ${component} responsive issues at: ${failedBreakpoints.map(b => b.viewport).join(', ')}`);
      }
    }

    this.results.set('ui', uiResults);

    console.log(`\n✅ UI Tests Complete: ${uiResults.totalPassed} passed, ${uiResults.totalFailed} failed\n`);
  }

  /**
   * Run AI flow tests
   */
  private async runAITests(): Promise<void> {
    console.log('🤖 Running AI Flow Tests...\n');

    const aiCategories = [
      'IntentParsing',
      'CityGeneration',
      'ParallelGeneration',
      'TokenOptimization',
      'Caching',
      'ErrorHandling'
    ];

    const aiResults = {
      totalPassed: 0,
      totalFailed: 0,
      categories: [],
      tokenMetrics: []
    };

    for (const category of aiCategories) {
      if (this.config.verbose) {
        console.log(`  Testing ${category}...`);
      }

      const result = await aiTestSuite.runCategoryTests(category);
      aiResults.totalPassed += result.passed;
      aiResults.totalFailed += result.failed;
      aiResults.categories.push({
        name: category,
        ...result
      });

      // Collect token metrics
      if (result.metrics && result.metrics.length > 0) {
        aiResults.tokenMetrics.push(...result.metrics);

        // Compare with baseline
        for (const metric of result.metrics) {
          const comparison = aiTestSuite.compareWithBaseline(metric);
          if (comparison.status === 'worse') {
            console.warn(`  ⚠️  ${metric.operation} token usage increased: ${comparison.details}`);
          } else if (comparison.status === 'better' && this.config.verbose) {
            console.log(`  ✨ ${metric.operation} improved: ${comparison.details}`);
          }
        }
      }
    }

    this.results.set('ai', aiResults);

    console.log(`\n✅ AI Tests Complete: ${aiResults.totalPassed} passed, ${aiResults.totalFailed} failed\n`);
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...\n');

    const integrationResult = await integrationTestSuite.runAllScenarios();

    this.results.set('integration', integrationResult);

    if (this.config.verbose) {
      for (const scenario of integrationResult.results) {
        const icon = scenario.success ? '✓' : '✗';
        console.log(`  ${icon} ${scenario.name} (${scenario.duration}ms)`);
      }
    }

    console.log(`\n✅ Integration Tests Complete: ${integrationResult.passed} passed, ${integrationResult.failed} failed\n`);
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...\n');

    const perfSuite = await testRunner.runPerformanceTests();

    this.results.set('performance', perfSuite);

    // Analyze performance results
    const criticalFailures = perfSuite.tests.filter(t =>
      t.status === 'failed' &&
      (t.name.includes('Speed') || t.name.includes('Token'))
    );

    if (criticalFailures.length > 0) {
      console.error('  ❌ Critical performance issues detected:');
      for (const failure of criticalFailures) {
        console.error(`    - ${failure.name}: ${failure.error}`);
      }
    } else {
      console.log('  ✅ All performance benchmarks met');
    }

    console.log(`\n✅ Performance Tests Complete: ${perfSuite.passed} passed, ${perfSuite.failed} failed\n`);
  }

  /**
   * Run stress tests
   */
  private async runStressTests(): Promise<void> {
    console.log('💪 Running Stress Tests...\n');

    const stressLevels = [10, 25, 50];
    const stressResults = [];

    for (const level of stressLevels) {
      console.log(`  Testing with ${level} concurrent users...`);

      const result = await aiTestSuite.runStressTest(level);
      stressResults.push({
        concurrentUsers: level,
        ...result
      });

      const successRate = (result.successful / result.totalRequests) * 100;

      if (successRate < 95) {
        console.warn(`  ⚠️  Success rate at ${level} users: ${successRate.toFixed(1)}%`);
      } else {
        console.log(`  ✅ Success rate: ${successRate.toFixed(1)}%`);
      }
    }

    this.results.set('stress', stressResults);

    console.log('\n✅ Stress Tests Complete\n');
  }

  /**
   * Generate and save comprehensive report
   */
  private async generateAndSaveReport(): Promise<void> {
    console.log('📊 Generating Test Report...\n');

    const report: string[] = [
      '# Nomad Navigator - Comprehensive Test Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Duration: ${Date.now() - this.startTime}ms`,
      '',
      '## Executive Summary',
      ''
    ];

    // Calculate overall statistics
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of this.results) {
      if (results.totalPassed !== undefined) {
        totalPassed += results.totalPassed;
        totalFailed += results.totalFailed;
      } else if (results.passed !== undefined) {
        totalPassed += results.passed;
        totalFailed += results.failed || 0;
      }
    }

    totalTests = totalPassed + totalFailed;
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;

    report.push(`- **Total Tests Run**: ${totalTests}`);
    report.push(`- **Passed**: ${totalPassed} (${overallSuccessRate.toFixed(1)}%)`);
    report.push(`- **Failed**: ${totalFailed}`);
    report.push(`- **Test Duration**: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    report.push('');

    // Add detailed results for each category
    if (this.results.has('ui')) {
      report.push('## UI Component Testing');
      report.push('');
      const uiResults = this.results.get('ui');
      report.push(`- Components Tested: ${uiResults.components.length}`);
      report.push(`- Total Passed: ${uiResults.totalPassed}`);
      report.push(`- Total Failed: ${uiResults.totalFailed}`);
      report.push('');
    }

    if (this.results.has('ai')) {
      report.push('## AI Flow Testing');
      report.push('');
      const aiResults = this.results.get('ai');
      report.push(`- Categories Tested: ${aiResults.categories.length}`);
      report.push(`- Total Passed: ${aiResults.totalPassed}`);
      report.push(`- Total Failed: ${aiResults.totalFailed}`);

      // Add token metrics summary
      if (aiResults.tokenMetrics.length > 0) {
        const avgTokens = aiResults.tokenMetrics.reduce((sum, m) => sum + m.totalTokens, 0) / aiResults.tokenMetrics.length;
        const totalCost = aiResults.tokenMetrics.reduce((sum, m) => sum + m.cost, 0);

        report.push('');
        report.push('### Token Usage Summary');
        report.push(`- Average Tokens per Operation: ${avgTokens.toFixed(0)}`);
        report.push(`- Total Estimated Cost: $${totalCost.toFixed(4)}`);
      }
      report.push('');
    }

    if (this.results.has('integration')) {
      report.push('## Integration Testing');
      report.push('');
      const intResults = this.results.get('integration');
      report.push(`- Scenarios Tested: ${intResults.total}`);
      report.push(`- Passed: ${intResults.passed}`);
      report.push(`- Failed: ${intResults.failed}`);
      report.push(`- Total Duration: ${intResults.duration}ms`);
      report.push('');
    }

    if (this.results.has('performance')) {
      report.push('## Performance Testing');
      report.push('');
      const perfResults = this.results.get('performance');
      report.push(`- Benchmarks Tested: ${perfResults.tests.length}`);
      report.push(`- Passed: ${perfResults.passed}`);
      report.push(`- Failed: ${perfResults.failed}`);
      report.push('');
    }

    if (this.results.has('stress')) {
      report.push('## Stress Testing');
      report.push('');
      const stressResults = this.results.get('stress');
      for (const result of stressResults) {
        const successRate = (result.successful / result.totalRequests * 100).toFixed(1);
        report.push(`- **${result.concurrentUsers} Concurrent Users**`);
        report.push(`  - Success Rate: ${successRate}%`);
        report.push(`  - Avg Response Time: ${result.avgResponseTime.toFixed(0)}ms`);
        report.push(`  - Max Response Time: ${result.maxResponseTime.toFixed(0)}ms`);
      }
      report.push('');
    }

    // Add recommendations
    report.push('## Recommendations');
    report.push('');

    const recommendations = this.generateRecommendations();
    for (const rec of recommendations) {
      report.push(`- ${rec}`);
    }

    // Save report
    if (this.config.saveResults) {
      const reportsDir = path.join(process.cwd(), 'test-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, `test-report-${timestamp}.md`);

      fs.writeFileSync(reportPath, report.join('\n'));
      console.log(`📁 Report saved to: ${reportPath}`);

      // Also save JSON results
      const jsonPath = path.join(reportsDir, `test-results-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        config: this.config,
        results: Object.fromEntries(this.results)
      }, null, 2));

      console.log(`📁 JSON results saved to: ${jsonPath}`);
    }

    console.log('');
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check UI results
    const uiResults = this.results.get('ui');
    if (uiResults && uiResults.totalFailed > 0) {
      recommendations.push(`Fix ${uiResults.totalFailed} failing UI tests before deployment`);
    }

    // Check AI results
    const aiResults = this.results.get('ai');
    if (aiResults && aiResults.tokenMetrics) {
      const highTokenOps = aiResults.tokenMetrics.filter(m => !m.withinLimit);
      if (highTokenOps.length > 0) {
        recommendations.push(`Optimize token usage for ${highTokenOps.length} operations exceeding limits`);
      }
    }

    // Check integration results
    const intResults = this.results.get('integration');
    if (intResults && intResults.failed > 0) {
      recommendations.push(`Address ${intResults.failed} integration test failures`);
    }

    // Check performance results
    const perfResults = this.results.get('performance');
    if (perfResults && perfResults.failed > 0) {
      recommendations.push('Performance optimization needed - benchmarks not met');
    }

    // Check stress test results
    const stressResults = this.results.get('stress');
    if (stressResults) {
      const failingLevels = stressResults.filter(r =>
        (r.successful / r.totalRequests) < 0.95
      );
      if (failingLevels.length > 0) {
        recommendations.push(`Improve system resilience - fails at ${failingLevels[0].concurrentUsers} concurrent users`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests passing - system ready for production');
      recommendations.push('Consider adding more edge case tests');
      recommendations.push('Set up continuous testing in CI/CD pipeline');
    }

    return recommendations;
  }

  /**
   * Print final summary
   */
  private printFinalSummary(): void {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);

    console.log('=' .repeat(60));
    console.log('📈 TEST EXECUTION COMPLETE');
    console.log('='.repeat(60));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of this.results) {
      if (results.totalPassed !== undefined) {
        totalPassed += results.totalPassed;
        totalFailed += results.totalFailed;
      } else if (results.passed !== undefined) {
        totalPassed += results.passed;
        totalFailed += results.failed || 0;
      }
    }

    totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? (totalPassed / totalTests * 100) : 0;

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} (${successRate.toFixed(1)}%)`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Duration: ${duration}s`);

    if (successRate === 100) {
      console.log('\n🎉 All tests passed! System is ready for deployment.');
    } else if (successRate >= 95) {
      console.log('\n✅ Tests mostly passing. Minor issues to address.');
    } else if (successRate >= 80) {
      console.log('\n⚠️  Several test failures. Review and fix before deployment.');
    } else {
      console.log('\n❌ Significant test failures. Major issues need resolution.');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const config: Partial<TestConfig> = {};

if (args.includes('--ui-only')) {
  config.runUI = true;
  config.runAI = false;
  config.runIntegration = false;
}

if (args.includes('--ai-only')) {
  config.runUI = false;
  config.runAI = true;
  config.runIntegration = false;
}

if (args.includes('--no-stress')) {
  config.runStress = false;
}

if (args.includes('--stress')) {
  config.runStress = true;
}

if (args.includes('--verbose')) {
  config.verbose = true;
}

if (args.includes('--no-report')) {
  config.generateReport = false;
  config.saveResults = false;
}

// Run tests
const runner = new ComprehensiveTestRunner(config);
runner.run().catch(console.error);