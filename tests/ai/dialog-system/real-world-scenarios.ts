#!/usr/bin/env tsx
/**
 * Real-World Scenario Testing
 * Tests with realistic user conversations and behaviors
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

interface ScenarioTurn {
  message: string;
  expectedResponseType: 'clarification' | 'confirmation' | 'error' | 'modification';
  shouldHaveItinerary?: boolean;
}

interface RealWorldScenario {
  id: string;
  name: string;
  description: string;
  turns: ScenarioTurn[];
}

class RealWorldTester {
  private scenarios: RealWorldScenario[] = [
    {
      id: 'honeymoon_planning',
      name: 'Honeymoon Planning',
      description: 'Couple planning romantic honeymoon with modifications',
      turns: [
        {
          message: 'We want to plan our honeymoon somewhere romantic in Europe',
          expectedResponseType: 'clarification'
        },
        {
          message: 'Maybe Italy or France',
          expectedResponseType: 'clarification'
        },
        {
          message: 'Let\'s do 10 days in Paris',
          expectedResponseType: 'clarification'
        },
        {
          message: 'from San Francisco',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        },
        {
          message: 'Can you make it more romantic and add some wine tastings?',
          expectedResponseType: 'modification',
          shouldHaveItinerary: true
        }
      ]
    },
    {
      id: 'business_traveler',
      name: 'Business Traveler',
      description: 'Frequent business traveler with specific needs',
      turns: [
        {
          message: 'I need to go to Singapore for business meetings',
          expectedResponseType: 'clarification'
        },
        {
          message: 'for 4 days',
          expectedResponseType: 'clarification'
        },
        {
          message: 'flying from Chicago',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        },
        {
          message: 'Actually make it 5 days and add some networking events',
          expectedResponseType: 'modification',
          shouldHaveItinerary: true
        }
      ]
    },
    {
      id: 'family_vacation',
      name: 'Family Vacation',
      description: 'Family with kids planning summer vacation',
      turns: [
        {
          message: 'We want a family vacation this summer',
          expectedResponseType: 'clarification'
        },
        {
          message: 'somewhere kid-friendly with beaches',
          expectedResponseType: 'clarification'
        },
        {
          message: '2 weeks in San Diego from Denver',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        },
        {
          message: 'add more activities for teenagers',
          expectedResponseType: 'modification',
          shouldHaveItinerary: true
        }
      ]
    },
    {
      id: 'backpacker_adventure',
      name: 'Backpacker Adventure',
      description: 'Young traveler planning budget adventure',
      turns: [
        {
          message: 'I want to go backpacking in Southeast Asia',
          expectedResponseType: 'clarification'
        },
        {
          message: 'maybe Thailand and Vietnam',
          expectedResponseType: 'clarification'
        },
        {
          message: '3 weeks starting in Bangkok from Los Angeles',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        },
        {
          message: 'make it more budget-friendly and add hostels',
          expectedResponseType: 'modification',
          shouldHaveItinerary: true
        }
      ]
    },
    {
      id: 'last_minute_getaway',
      name: 'Last Minute Getaway',
      description: 'Someone planning a quick weekend trip',
      turns: [
        {
          message: 'I need a quick weekend getaway',
          expectedResponseType: 'clarification'
        },
        {
          message: 'somewhere relaxing within 3 hours flight from NYC',
          expectedResponseType: 'clarification'
        },
        {
          message: '3 days in Miami',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        }
      ]
    },
    {
      id: 'group_trip_organizer',
      name: 'Group Trip Organizer',
      description: 'Someone organizing trip for friends',
      turns: [
        {
          message: 'I\'m organizing a trip for 6 friends',
          expectedResponseType: 'clarification'
        },
        {
          message: 'we want to go to Japan for cherry blossom season',
          expectedResponseType: 'clarification'
        },
        {
          message: '10 days in Tokyo and Kyoto from Seattle',
          expectedResponseType: 'confirmation',
          shouldHaveItinerary: true
        },
        {
          message: 'add more group activities and traditional experiences',
          expectedResponseType: 'modification',
          shouldHaveItinerary: true
        }
      ]
    }
  ];

  async runAllScenarios(): Promise<void> {
    console.log('🌍 Real-World Scenario Testing\n');
    
    const results: any[] = [];
    
    for (const scenario of this.scenarios) {
      console.log(`\n📖 Scenario: ${scenario.name}`);
      console.log(`   ${scenario.description}\n`);
      
      const result = await this.runScenario(scenario);
      results.push(result);
      
      // Clean up
      clearConversationState(result.sessionId);
    }
    
    this.printSummary(results);
  }

  async runScenario(scenario: RealWorldScenario): Promise<any> {
    const sessionId = `scenario-${scenario.id}-${Date.now()}`;
    const startTime = Date.now();
    
    const turnResults: any[] = [];
    let overallSuccess = true;
    
    try {
      for (let i = 0; i < scenario.turns.length; i++) {
        const turn = scenario.turns[i];
        console.log(`   Turn ${i + 1}: "${turn.message}"`);
        
        const turnStart = Date.now();
        const response = await handleChatMessage({
          message: turn.message,
          sessionId,
          userId: 'scenario-user'
        });
        
        const turnTime = Date.now() - turnStart;
        const actualResponseType = response.response.type;
        const hasItinerary = !!response.itinerary;
        
        // Validate response
        const responseTypeMatch = this.isResponseTypeAcceptable(actualResponseType, turn.expectedResponseType);
        const itineraryMatch = turn.shouldHaveItinerary === undefined || hasItinerary === turn.shouldHaveItinerary;
        
        const turnSuccess = responseTypeMatch && itineraryMatch;
        if (!turnSuccess) overallSuccess = false;
        
        turnResults.push({
          turn: i + 1,
          message: turn.message,
          expected: turn.expectedResponseType,
          actual: actualResponseType,
          expectedItinerary: turn.shouldHaveItinerary,
          hasItinerary,
          success: turnSuccess,
          time: turnTime
        });
        
        console.log(`   → ${actualResponseType} (${hasItinerary ? 'with itinerary' : 'no itinerary'}) - ${turnTime}ms ${turnSuccess ? '✅' : '❌'}`);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTurnTime = turnResults.reduce((sum, t) => sum + t.time, 0) / turnResults.length;
      
      console.log(`\n   📊 Summary: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'} - ${totalTime}ms total, ${Math.round(avgTurnTime)}ms avg per turn`);
      
      return {
        scenarioId: scenario.id,
        sessionId,
        success: overallSuccess,
        totalTime,
        avgTurnTime,
        turns: turnResults
      };
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        scenarioId: scenario.id,
        sessionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        turns: turnResults
      };
    }
  }

  private isResponseTypeAcceptable(actual: string, expected: string): boolean {
    // Some flexibility in response types
    if (expected === 'clarification' && (actual === 'clarification' || actual === 'question')) return true;
    if (expected === 'confirmation' && (actual === 'confirmation' || actual === 'success')) return true;
    if (expected === 'modification' && (actual === 'modification' || actual === 'confirmation')) return true;
    return actual === expected;
  }

  private printSummary(results: any[]): void {
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    const avgTotalTime = Math.round(
      results.reduce((sum, r) => sum + (r.totalTime || 0), 0) / total
    );
    
    const avgTurnTime = Math.round(
      results.reduce((sum, r) => sum + (r.avgTurnTime || 0), 0) / total
    );
    
    console.log('\n\n🎯 REAL-WORLD SCENARIO SUMMARY');
    console.log('===============================');
    console.log(`Success Rate: ${passed}/${total} scenarios (${passRate}%)`);
    console.log(`Average Scenario Time: ${avgTotalTime}ms`);
    console.log(`Average Turn Time: ${avgTurnTime}ms`);
    
    console.log('\n📈 Scenario Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const time = result.totalTime ? ` (${result.totalTime}ms)` : '';
      console.log(`${status} ${result.scenarioId}${time}`);
      
      if (!result.success && result.turns) {
        const failedTurns = result.turns.filter((t: any) => !t.success);
        failedTurns.forEach((turn: any) => {
          console.log(`   Turn ${turn.turn}: Expected ${turn.expected}, got ${turn.actual}`);
        });
      }
    });
    
    if (passed === total) {
      console.log('\n🎉 All real-world scenarios passed!');
    } else {
      console.log('\n⚠️  Some scenarios need attention.');
    }
  }
}

async function main() {
  try {
    const tester = new RealWorldTester();
    await tester.runAllScenarios();
  } catch (error) {
    console.error('Fatal error running real-world scenario tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RealWorldTester };