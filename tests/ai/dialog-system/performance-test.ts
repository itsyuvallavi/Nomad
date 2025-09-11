#!/usr/bin/env tsx
/**
 * Performance Testing for Enhanced Dialog System
 * Tests response times, concurrent users, and system limits
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  classification: string;
  parseSuccess: boolean;
  hasItinerary: boolean;
}

class PerformanceTester {
  async runPerformanceTests(): Promise<void> {
    console.log('⚡ Performance Testing Suite\n');
    
    await this.testResponseTimes();
    await this.testConcurrentSessions();
    await this.testMemoryUsage();
    await this.testLongConversations();
  }

  async testResponseTimes(): Promise<void> {
    console.log('📊 Testing Response Times...');
    
    const testCases = [
      '5 days in London from NYC',
      'I want to visit Tokyo for a week',
      '2 weeks in Barcelona',
      'from Los Angeles'
    ];
    
    const metrics: PerformanceMetrics[] = [];
    
    for (const input of testCases) {
      const sessionId = `perf-${Date.now()}-${Math.random()}`;
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        const response = await handleChatMessage({
          message: input,
          sessionId,
          userId: 'perf-test'
        });
        
        const responseTime = Date.now() - startTime;
        const endMemory = process.memoryUsage().heapUsed;
        
        metrics.push({
          responseTime,
          memoryUsage: endMemory - startMemory,
          classification: response.metadata?.classification?.type || 'unknown',
          parseSuccess: !!response.metadata?.parseResult?.success,
          hasItinerary: !!response.itinerary
        });
        
        console.log(`   "${input.substring(0, 30)}..." - ${responseTime}ms`);
        
      } catch (error) {
        console.log(`   ❌ Failed: ${input.substring(0, 30)}...`);
      } finally {
        clearConversationState(sessionId);
      }
    }
    
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    const maxResponseTime = Math.max(...metrics.map(m => m.responseTime));
    
    console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Max Response Time: ${maxResponseTime}ms`);
    console.log(`   ${avgResponseTime < 2000 ? '✅' : '⚠️'} Performance: ${avgResponseTime < 2000 ? 'Good' : 'Needs Improvement'}\n`);
  }

  async testConcurrentSessions(): Promise<void> {
    console.log('🔄 Testing Concurrent Sessions...');
    
    const concurrentUsers = 5;
    const messagesPerUser = 3;
    
    const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const sessionId = `concurrent-user-${userIndex}-${Date.now()}`;
      const results: number[] = [];
      
      try {
        for (let msgIndex = 0; msgIndex < messagesPerUser; msgIndex++) {
          const startTime = Date.now();
          
          await handleChatMessage({
            message: `${msgIndex + 2} days in Tokyo from NYC`,
            sessionId,
            userId: `user-${userIndex}`
          });
          
          results.push(Date.now() - startTime);
        }
        
        return { userId: userIndex, times: results, success: true };
      } catch (error) {
        return { userId: userIndex, times: [], success: false, error };
      } finally {
        clearConversationState(sessionId);
      }
    });
    
    const startTime = Date.now();
    const results = await Promise.all(userPromises);
    const totalTime = Date.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    const avgTimePerMessage = results
      .filter(r => r.success)
      .flatMap(r => r.times)
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);
    
    console.log(`   ${successful}/${concurrentUsers} users completed successfully`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average per message: ${Math.round(avgTimePerMessage)}ms`);
    console.log(`   ${successful === concurrentUsers ? '✅' : '⚠️'} Concurrency: ${successful === concurrentUsers ? 'Good' : 'Some failures'}\n`);
  }

  async testMemoryUsage(): Promise<void> {
    console.log('💾 Testing Memory Usage...');
    
    const initialMemory = process.memoryUsage();
    const sessionCount = 20;
    const sessions: string[] = [];
    
    // Create multiple conversations
    for (let i = 0; i < sessionCount; i++) {
      const sessionId = `memory-test-${i}-${Date.now()}`;
      sessions.push(sessionId);
      
      await handleChatMessage({
        message: `${i + 1} days in Paris from London`,
        sessionId,
        userId: `memory-user-${i}`
      });
      
      await handleChatMessage({
        message: 'make it more romantic',
        sessionId,
        userId: `memory-user-${i}`
      });
    }
    
    const afterCreation = process.memoryUsage();
    
    // Clean up sessions
    sessions.forEach(sessionId => clearConversationState(sessionId));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const afterCleanup = process.memoryUsage();
    
    const memoryIncrease = (afterCreation.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
    const memoryRecovered = (afterCreation.heapUsed - afterCleanup.heapUsed) / 1024 / 1024;
    
    console.log(`   Initial Memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
    console.log(`   After ${sessionCount} sessions: ${Math.round(afterCreation.heapUsed / 1024 / 1024)}MB (+${Math.round(memoryIncrease)}MB)`);
    console.log(`   After cleanup: ${Math.round(afterCleanup.heapUsed / 1024 / 1024)}MB (recovered ${Math.round(memoryRecovered)}MB)`);
    console.log(`   ${memoryIncrease < 50 ? '✅' : '⚠️'} Memory usage: ${memoryIncrease < 50 ? 'Acceptable' : 'High'}\n`);
  }

  async testLongConversations(): Promise<void> {
    console.log('💬 Testing Long Conversations...');
    
    const sessionId = `long-conversation-${Date.now()}`;
    const messageCount = 10;
    let totalTime = 0;
    
    try {
      for (let i = 0; i < messageCount; i++) {
        const startTime = Date.now();
        
        const message = i === 0 ? 'I want to plan a trip' :
                       i === 1 ? 'to Tokyo' :
                       i === 2 ? 'for 5 days' :
                       i === 3 ? 'from New York' :
                       i === 4 ? 'make it more cultural' :
                       i === 5 ? 'add some museums' :
                       i === 6 ? 'I also like food tours' :
                       i === 7 ? 'what about temples?' :
                       i === 8 ? 'extend it to 7 days' :
                       'that looks perfect';
        
        await handleChatMessage({
          message,
          sessionId,
          userId: 'long-conversation-user'
        });
        
        const responseTime = Date.now() - startTime;
        totalTime += responseTime;
        
        console.log(`   Turn ${i + 1}: ${responseTime}ms`);
      }
      
      const avgTime = totalTime / messageCount;
      console.log(`   Average time per turn: ${Math.round(avgTime)}ms`);
      console.log(`   Total conversation time: ${totalTime}ms`);
      console.log(`   ${avgTime < 3000 ? '✅' : '⚠️'} Long conversation performance: ${avgTime < 3000 ? 'Good' : 'Degraded'}\n`);
      
    } finally {
      clearConversationState(sessionId);
    }
  }
}

async function main() {
  try {
    const tester = new PerformanceTester();
    await tester.runPerformanceTests();
  } catch (error) {
    console.error('Fatal error running performance tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PerformanceTester };