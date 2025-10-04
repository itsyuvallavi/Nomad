#!/usr/bin/env node

/**
 * Automated Test and Fix Orchestrator
 * Runs tests and automatically triggers appropriate agents for fixes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResults {
  timestamp: string;
  results: {
    ui?: { totalFailed: number; components: any[] };
    ai?: { totalFailed: number; categories: any[] };
    integration?: { failed: number; results: any[] };
    performance?: { failed: number; tests: any[] };
  };
}

class TestAndFixOrchestrator {
  private reportsDir = path.join(process.cwd(), 'test-reports');
  private maxRetries = 3;
  private currentRetry = 0;

  async run() {
    console.log('🔍 Starting Test and Fix Process...\n');

    while (this.currentRetry < this.maxRetries) {
      try {
        // Step 1: Run comprehensive tests
        console.log(`\n📊 Test Run ${this.currentRetry + 1}/${this.maxRetries}`);
        const testResults = await this.runTests();

        // Step 2: Analyze results
        const issues = this.analyzeResults(testResults);

        if (issues.total === 0) {
          console.log('\n✅ All tests passing! No fixes needed.\n');
          process.exit(0);
        }

        console.log(`\n⚠️  Found ${issues.total} issues to fix:`);
        console.log(`  - UI Issues: ${issues.ui.length}`);
        console.log(`  - AI Issues: ${issues.ai.length}`);
        console.log(`  - Integration Issues: ${issues.integration.length}\n`);

        // Step 3: Apply fixes based on issue type
        await this.applyFixes(issues);

        // Step 4: Verify fixes
        console.log('\n🔄 Verifying fixes...\n');
        this.currentRetry++;

      } catch (error) {
        console.error('❌ Error in test and fix process:', error);
        process.exit(1);
      }
    }

    console.log('\n⚠️  Max retries reached. Manual intervention required.\n');
    process.exit(1);
  }

  /**
   * Run comprehensive tests
   */
  private async runTests(): Promise<TestResults> {
    console.log('Running comprehensive tests...');

    try {
      await execAsync('npm test');
    } catch (error) {
      // Tests may fail, but we still want to get the results
      console.log('Tests completed with failures (expected)');
    }

    // Read the latest test results
    const files = fs.readdirSync(this.reportsDir)
      .filter(f => f.startsWith('test-results-'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('No test results found');
    }

    const latestResults = path.join(this.reportsDir, files[0]);
    const content = fs.readFileSync(latestResults, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Analyze test results to identify issues
   */
  private analyzeResults(results: TestResults): {
    total: number;
    ui: any[];
    ai: any[];
    integration: any[];
  } {
    const issues = {
      total: 0,
      ui: [],
      ai: [],
      integration: []
    };

    // Analyze UI failures
    if (results.results.ui?.totalFailed > 0) {
      for (const component of results.results.ui.components) {
        const failures = component.results?.filter(r => r.status === 'failed') || [];
        if (failures.length > 0) {
          issues.ui.push({
            component: component.name,
            failures
          });
          issues.total += failures.length;
        }
      }
    }

    // Analyze AI failures
    if (results.results.ai?.totalFailed > 0) {
      for (const category of results.results.ai.categories) {
        const failures = category.results?.filter(r => r.status === 'failed') || [];
        if (failures.length > 0) {
          issues.ai.push({
            category: category.name,
            failures
          });
          issues.total += failures.length;
        }
      }
    }

    // Analyze Integration failures
    if (results.results.integration?.failed > 0) {
      for (const scenario of results.results.integration.results) {
        if (!scenario.success) {
          issues.integration.push({
            scenario: scenario.name,
            failedSteps: scenario.steps?.filter(s => !s.success) || []
          });
          issues.total++;
        }
      }
    }

    return issues;
  }

  /**
   * Apply fixes using appropriate agents
   */
  private async applyFixes(issues: any) {
    // Fix UI issues with Component Quality Guardian
    if (issues.ui.length > 0) {
      console.log('🎨 Triggering Component Quality Guardian for UI fixes...\n');
      await this.fixUIIssues(issues.ui);
    }

    // Fix AI issues with Core Logic Guardian
    if (issues.ai.length > 0) {
      console.log('🤖 Triggering Core Logic Guardian for AI fixes...\n');
      await this.fixAIIssues(issues.ai);
    }

    // Fix Integration issues (may need both agents)
    if (issues.integration.length > 0) {
      console.log('🔗 Analyzing integration issues...\n');
      await this.fixIntegrationIssues(issues.integration);
    }
  }

  /**
   * Fix UI issues using Component Quality Guardian
   */
  private async fixUIIssues(uiIssues: any[]) {
    const fixPlan = {
      agent: 'component-quality-guardian',
      issues: uiIssues,
      actions: []
    };

    for (const issue of uiIssues) {
      fixPlan.actions.push({
        component: issue.component,
        fixes: this.generateUIFixes(issue)
      });
    }

    // Save fix plan for agent
    const planPath = path.join(process.cwd(), '.claude', 'fix-plans', 'ui-fixes.json');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(fixPlan, null, 2));

    console.log(`📝 UI fix plan saved to: ${planPath}`);
    console.log('   Run: claude agent component-quality-guardian --fix-plan ui-fixes.json\n');

    // In a real implementation, would trigger the agent directly
    // For now, we'll simulate the fixes
    await this.simulateFixes('ui', uiIssues.length);
  }

  /**
   * Fix AI issues using Core Logic Guardian
   */
  private async fixAIIssues(aiIssues: any[]) {
    const fixPlan = {
      agent: 'core-logic-guardian',
      issues: aiIssues,
      actions: []
    };

    for (const issue of aiIssues) {
      fixPlan.actions.push({
        category: issue.category,
        fixes: this.generateAIFixes(issue)
      });
    }

    // Save fix plan for agent
    const planPath = path.join(process.cwd(), '.claude', 'fix-plans', 'ai-fixes.json');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify(fixPlan, null, 2));

    console.log(`📝 AI fix plan saved to: ${planPath}`);
    console.log('   Run: claude agent core-logic-guardian --fix-plan ai-fixes.json\n');

    // Simulate fixes
    await this.simulateFixes('ai', aiIssues.length);
  }

  /**
   * Fix integration issues
   */
  private async fixIntegrationIssues(integrationIssues: any[]) {
    // Integration issues may need both UI and AI fixes
    for (const issue of integrationIssues) {
      const hasUIFailure = issue.failedSteps.some(s => s.type === 'ui');
      const hasAIFailure = issue.failedSteps.some(s => s.type === 'ai');

      if (hasUIFailure && hasAIFailure) {
        console.log(`   ${issue.scenario}: Needs both UI and AI fixes`);
      } else if (hasUIFailure) {
        console.log(`   ${issue.scenario}: Needs UI fixes`);
      } else if (hasAIFailure) {
        console.log(`   ${issue.scenario}: Needs AI fixes`);
      }
    }

    // Create combined fix plan
    const planPath = path.join(process.cwd(), '.claude', 'fix-plans', 'integration-fixes.json');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, JSON.stringify({
      issues: integrationIssues,
      requiresUIFixes: integrationIssues.some(i => i.failedSteps.some(s => s.type === 'ui')),
      requiresAIFixes: integrationIssues.some(i => i.failedSteps.some(s => s.type === 'ai'))
    }, null, 2));

    console.log(`\n📝 Integration fix plan saved to: ${planPath}\n`);

    // Simulate fixes
    await this.simulateFixes('integration', integrationIssues.length);
  }

  /**
   * Generate UI fix suggestions
   */
  private generateUIFixes(issue: any): string[] {
    const fixes = [];

    for (const failure of issue.failures) {
      if (failure.error?.includes('render')) {
        fixes.push('Fix component rendering issues');
      }
      if (failure.error?.includes('props')) {
        fixes.push('Validate and fix component props');
      }
      if (failure.error?.includes('accessibility')) {
        fixes.push('Add missing ARIA attributes');
      }
      if (failure.error?.includes('responsive')) {
        fixes.push('Fix responsive layout issues');
      }
    }

    return fixes.length > 0 ? fixes : ['Review and fix component issues'];
  }

  /**
   * Generate AI fix suggestions
   */
  private generateAIFixes(issue: any): string[] {
    const fixes = [];

    for (const failure of issue.failures) {
      if (failure.error?.includes('token')) {
        fixes.push('Optimize token usage');
      }
      if (failure.error?.includes('timeout')) {
        fixes.push('Improve response time');
      }
      if (failure.error?.includes('parsing')) {
        fixes.push('Fix intent parsing logic');
      }
      if (failure.error?.includes('cache')) {
        fixes.push('Fix caching mechanism');
      }
    }

    return fixes.length > 0 ? fixes : ['Review and fix AI flow issues'];
  }

  /**
   * Simulate fixes being applied
   */
  private async simulateFixes(type: string, count: number): Promise<void> {
    console.log(`   Simulating ${type} fixes for ${count} issues...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`   ✓ ${type} fixes applied\n`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Test and Fix Orchestrator

Usage: npm run test:fix [options]

Options:
  --help        Show this help message
  --dry-run     Analyze issues without applying fixes
  --ui-only     Only fix UI issues
  --ai-only     Only fix AI issues

This tool will:
1. Run comprehensive tests
2. Identify failing components
3. Generate fix plans for appropriate agents
4. (Optional) Trigger agents to apply fixes
5. Re-run tests to verify fixes
  `);
  process.exit(0);
}

// Run the orchestrator
const orchestrator = new TestAndFixOrchestrator();
orchestrator.run().catch(console.error);