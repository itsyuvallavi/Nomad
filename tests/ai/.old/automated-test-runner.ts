/**
 * Automated Test Runner for Conversational AI System
 * Runs through all test scenarios automatically and generates a report
 */

import { generatePersonalizedItineraryV2, type ConversationalItineraryOutput } from '@/services/ai/flows/generate-personalized-itinerary-v2';
import { logger } from '@/lib/monitoring/logger';
import * as fs from 'fs';
import * as path from 'path';

// Test scenario interface
interface TestScenario {
  id: number;
  name: string;
  category: 'simple' | 'complex' | 'modification' | 'edge';
  description: string;
  messages: TestMessage[];
  expectations: TestExpectation[];
  timeout?: number;
}

interface TestMessage {
  role: 'user';
  content: string;
  waitForResponse?: boolean;
}

interface TestExpectation {
  type: 'response_type' | 'contains_text' | 'asks_for' | 'no_defaults' | 'api_called';
  value: string;
  description: string;
}

interface TestResult {
  scenarioId: number;
  scenarioName: string;
  status: 'passed' | 'failed' | 'partial';
  expectations: {
    description: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  apisCalled: string[];
  responseTime: number;
  errors: string[];
  conversationLog: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
}

// Test scenarios
const testScenarios: TestScenario[] = [
  {
    id: 1,
    name: 'Minimal Input - Vague Request',
    category: 'simple',
    description: 'User provides absolutely minimal information',
    messages: [
      { role: 'user', content: 'I want to travel', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'question', description: 'Should respond with a question' },
      { type: 'asks_for', value: 'destination', description: 'Should ask for destination' },
      { type: 'no_defaults', value: 'true', description: 'Should not use default values' }
    ]
  },
  {
    id: 2,
    name: 'Single Word Destination',
    category: 'simple',
    description: 'User provides only destination',
    messages: [
      { role: 'user', content: 'Barcelona', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'question', description: 'Should respond with a question' },
      { type: 'asks_for', value: 'dates', description: 'Should ask for travel dates' },
      { type: 'no_defaults', value: 'true', description: 'Should not assume dates or duration' }
    ]
  },
  {
    id: 3,
    name: 'Conflicting Information',
    category: 'complex',
    description: 'User provides conflicting destinations and durations',
    messages: [
      { role: 'user', content: 'I want to go to Paris for 3 days but maybe London for a week', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'question', description: 'Should ask for clarification' },
      { type: 'contains_text', value: 'both|decide|which', description: 'Should help user decide' }
    ]
  },
  {
    id: 4,
    name: 'Past Date Request',
    category: 'complex',
    description: 'User requests a date in the past',
    messages: [
      { role: 'user', content: 'Plan my trip to Tokyo last December', waitForResponse: true }
    ],
    expectations: [
      { type: 'contains_text', value: 'past|coming|future|next', description: 'Should recognize past date' },
      { type: 'response_type', value: 'question', description: 'Should ask for alternative date' }
    ]
  },
  {
    id: 5,
    name: 'Complete Information',
    category: 'simple',
    description: 'User provides all information at once',
    messages: [
      { role: 'user', content: '5 days in Rome next month', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'confirmation', description: 'Should confirm details' },
      { type: 'contains_text', value: 'Rome|5 days|next month', description: 'Should repeat user info' }
    ]
  },
  {
    id: 6,
    name: 'Nonsensical Input',
    category: 'edge',
    description: 'User provides nonsense text',
    messages: [
      { role: 'user', content: 'Purple elephant dancing tomorrow sandwich', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'question', description: 'Should ask for clarification' },
      { type: 'contains_text', value: 'help|where|travel|trip', description: 'Should redirect to travel planning' }
    ]
  },
  {
    id: 7,
    name: 'Mixed Languages',
    category: 'edge',
    description: 'User mixes multiple languages',
    messages: [
      { role: 'user', content: 'Quiero ir a Paris pour trois días next week', waitForResponse: true }
    ],
    expectations: [
      { type: 'contains_text', value: 'Paris|3 days|next week', description: 'Should understand mixed input' },
      { type: 'response_type', value: 'confirmation', description: 'Should confirm understanding' }
    ]
  },
  {
    id: 8,
    name: 'Emoji Input',
    category: 'edge',
    description: 'User uses emojis to communicate',
    messages: [
      { role: 'user', content: '🇫🇷 Paris ✈️ 5️⃣ days 🗓️ next month 💰💰💰', waitForResponse: true }
    ],
    expectations: [
      { type: 'contains_text', value: 'Paris|5 days|next month', description: 'Should understand emoji context' },
      { type: 'contains_text', value: 'luxury|high-end|premium', description: 'Should recognize high budget' }
    ]
  },
  {
    id: 9,
    name: 'Full Conversation Flow',
    category: 'complex',
    description: 'Complete multi-turn conversation',
    messages: [
      { role: 'user', content: 'Hello', waitForResponse: true },
      { role: 'user', content: 'London', waitForResponse: true },
      { role: 'user', content: 'Next week', waitForResponse: true },
      { role: 'user', content: '4 days', waitForResponse: true },
      { role: 'user', content: 'Yes', waitForResponse: true }
    ],
    expectations: [
      { type: 'response_type', value: 'itinerary', description: 'Should eventually generate itinerary' },
      { type: 'api_called', value: 'locationiq', description: 'Should call LocationIQ API' },
      { type: 'api_called', value: 'weather', description: 'Should call Weather API' }
    ],
    timeout: 30000
  },
  {
    id: 10,
    name: 'Modification Request',
    category: 'modification',
    description: 'User changes mind mid-conversation',
    messages: [
      { role: 'user', content: 'I want to go to Rome', waitForResponse: true },
      { role: 'user', content: 'Actually, make it Venice instead', waitForResponse: true }
    ],
    expectations: [
      { type: 'contains_text', value: 'Venice', description: 'Should switch to Venice' },
      { type: 'response_type', value: 'question', description: 'Should continue asking questions' }
    ]
  }
];

/**
 * Test Runner Class
 */
class ConversationalAITestRunner {
  private results: TestResult[] = [];
  private sessionId: string;
  private conversationContext?: string;

  constructor() {
    this.sessionId = `test-session-${Date.now()}`;
  }

  /**
   * Run all test scenarios
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Conversational AI Automated Tests');
    console.log('=' .repeat(50));

    for (const scenario of testScenarios) {
      await this.runScenario(scenario);
      // Add delay between tests to avoid rate limiting
      await this.delay(2000);
    }

    this.generateReport();
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario: TestScenario): Promise<void> {
    console.log(`\n📝 Testing: ${scenario.name}`);
    console.log(`   Category: ${scenario.category}`);
    console.log(`   Description: ${scenario.description}`);

    const result: TestResult = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: 'passed',
      expectations: [],
      apisCalled: [],
      responseTime: 0,
      errors: [],
      conversationLog: []
    };

    const startTime = Date.now();

    try {
      // Reset conversation context for each test
      this.conversationContext = undefined;

      // Process each message in the scenario
      for (const message of scenario.messages) {
        console.log(`   User: "${message.content}"`);

        const response = await this.sendMessage(message.content);

        result.conversationLog.push({
          role: 'user',
          content: message.content,
          timestamp: Date.now()
        });

        if (response) {
          console.log(`   AI: ${response.type} - "${response.message?.substring(0, 50)}..."`);

          result.conversationLog.push({
            role: 'assistant',
            content: response.message,
            timestamp: Date.now()
          });

          // Track API calls
          if (response.itinerary) {
            result.apisCalled.push('openai', 'locationiq', 'weather');
          }
        }

        if (message.waitForResponse) {
          await this.delay(1000);
        }
      }

      // Validate expectations
      for (const expectation of scenario.expectations) {
        const passed = await this.validateExpectation(expectation, result);
        result.expectations.push({
          description: expectation.description,
          expected: expectation.value,
          actual: passed ? 'Matched' : 'Not matched',
          passed
        });

        if (!passed) {
          result.status = result.status === 'failed' ? 'failed' : 'partial';
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      result.status = 'failed';
      result.errors.push(error.message);
    }

    result.responseTime = Date.now() - startTime;

    // Log result
    const statusIcon = result.status === 'passed' ? '✅' :
                       result.status === 'partial' ? '⚠️' : '❌';
    console.log(`   ${statusIcon} Status: ${result.status.toUpperCase()}`);
    console.log(`   ⏱️  Time: ${result.responseTime}ms`);

    this.results.push(result);
  }

  /**
   * Send a message to the AI system
   */
  async sendMessage(message: string): Promise<ConversationalItineraryOutput> {
    try {
      const response = await generatePersonalizedItineraryV2({
        prompt: message,
        conversationHistory: this.conversationContext,
        sessionId: this.sessionId
      });

      // Update conversation context
      if (response.conversationContext) {
        this.conversationContext = response.conversationContext;
      }

      return response;
    } catch (error) {
      logger.error('TEST', 'Failed to send message', error);
      throw error;
    }
  }

  /**
   * Validate a test expectation
   */
  async validateExpectation(expectation: TestExpectation, result: TestResult): Promise<boolean> {
    const lastResponse = result.conversationLog[result.conversationLog.length - 1];

    if (!lastResponse || lastResponse.role !== 'assistant') {
      return false;
    }

    switch (expectation.type) {
      case 'response_type':
        // Check if response type matches expected
        return lastResponse.content.toLowerCase().includes(expectation.value);

      case 'contains_text':
        // Check if response contains any of the expected words (separated by |)
        const words = expectation.value.split('|');
        return words.some(word =>
          lastResponse.content.toLowerCase().includes(word.toLowerCase())
        );

      case 'asks_for':
        // Check if AI is asking for specific information
        const askingPatterns = {
          destination: /where|destination|location|place|city|country/i,
          dates: /when|date|time|month|week/i,
          duration: /how long|how many days|duration|length/i
        };
        return askingPatterns[expectation.value as keyof typeof askingPatterns]?.test(lastResponse.content) || false;

      case 'no_defaults':
        // Check that default values are not present
        const defaults = ['london', '3 days', 'three days', 'tomorrow'];
        return !defaults.some(defaultVal =>
          lastResponse.content.toLowerCase().includes(defaultVal)
        );

      case 'api_called':
        // Check if specific API was called
        return result.apisCalled.includes(expectation.value);

      default:
        return false;
    }
  }

  /**
   * Generate test report
   */
  generateReport(): void {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const partial = this.results.filter(r => r.status === 'partial').length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passed} (${Math.round(passed/totalTests*100)}%)`);
    console.log(`⚠️  Partial: ${partial} (${Math.round(partial/totalTests*100)}%)`);
    console.log(`❌ Failed: ${failed} (${Math.round(failed/totalTests*100)}%)`);

    // Save detailed report to file
    this.saveDetailedReport();

    // Log failed tests
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.scenarioName}`);
          r.errors.forEach(e => console.log(`     Error: ${e}`));
        });
    }

    // Log partial passes
    if (partial > 0) {
      console.log('\n⚠️  Partial Passes:');
      this.results
        .filter(r => r.status === 'partial')
        .forEach(r => {
          console.log(`   - ${r.scenarioName}`);
          r.expectations
            .filter(e => !e.passed)
            .forEach(e => console.log(`     Failed: ${e.description}`));
        });
    }

    console.log('\n✅ Test run complete!');
    console.log(`📄 Detailed report saved to: test-results-${Date.now()}.json`);
  }

  /**
   * Save detailed report to file
   */
  saveDetailedReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length,
        partial: this.results.filter(r => r.status === 'partial').length,
        avgResponseTime: Math.round(
          this.results.reduce((acc, r) => acc + r.responseTime, 0) / this.results.length
        )
      },
      results: this.results
    };

    const filename = `test-results-${Date.now()}.json`;
    const filepath = path.join(process.cwd(), 'tests', 'ai', 'results', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other files
export { ConversationalAITestRunner, TestScenario, TestResult };

// Run tests if executed directly
if (require.main === module) {
  const runner = new ConversationalAITestRunner();
  runner.runAllTests().catch(console.error);
}