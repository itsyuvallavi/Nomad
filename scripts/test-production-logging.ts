#!/usr/bin/env tsx
/**
 * Test Production Logging System
 * Creates sample log data to demonstrate the monitoring system
 */

import { productionLogger, logUserAction, logItinerary, logPerformance } from '../src/lib/production-logger';

async function createSampleLogs() {
  console.log('🧪 Testing Production Logging System...\n');

  // Simulate user session starting
  logUserAction('session_started', {
    referrer: 'https://google.com',
    language: 'en-US',
    timezone: 'America/New_York'
  });

  // Simulate user submitting different travel prompts
  const samplePrompts = [
    'Flying from New York to London for 3 days',
    'Weekend trip from Los Angeles to Paris', 
    'Departing from San Francisco for one week in Tokyo and 3 days in Kyoto',
    'Starting from Boston for 2 weeks across London, Paris, Rome, and Barcelona',
    'Invalid prompt with no destination'
  ];

  for (let i = 0; i < samplePrompts.length; i++) {
    const prompt = samplePrompts[i];
    const isLastPromptInvalid = i === samplePrompts.length - 1;
    
    // Log prompt submission
    logUserAction('prompt_submitted', {
      prompt_length: prompt.length,
      prompt_preview: prompt.slice(0, 50) + '...'
    });

    // Simulate processing time
    const processingTime = Math.random() * 20000 + 5000; // 5-25 seconds
    await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for demo

    if (isLastPromptInvalid) {
      // Simulate failed generation
      logItinerary({
        id: `test_req_${Date.now()}_${i}`,
        input: {
          prompt,
          model: 'gpt-4o-mini',
          strategy: 'ultra-fast'
        },
        error: {
          message: 'No destinations found in prompt',
          code: 'INVALID_INPUT'
        },
        performance: {
          totalDuration: processingTime,
          apiCalls: 1,
          cacheHit: false
        }
      });

      logUserAction('itinerary_generation_error', {
        duration_ms: processingTime,
        error_message: 'No destinations found',
        strategy: 'ultra-fast'
      });

    } else {
      // Simulate successful generation
      const destinations = prompt.includes('London') ? 'London' : 
                          prompt.includes('Paris') ? 'Paris' :
                          prompt.includes('Tokyo') ? 'Tokyo, Kyoto' :
                          'London, Paris, Rome, Barcelona';
      
      const days = prompt.includes('3 days') ? 3 :
                   prompt.includes('weekend') ? 3 :
                   prompt.includes('one week') ? 10 :
                   prompt.includes('2 weeks') ? 14 : 7;

      const activities = days * 5; // ~5 activities per day

      logItinerary({
        id: `test_req_${Date.now()}_${i}`,
        input: {
          prompt,
          model: 'gpt-4o-mini',
          strategy: 'ultra-fast'
        },
        output: {
          destinations,
          days,
          activities,
          title: `${days}-Day Adventure`,
          duration: `${Math.round(processingTime)}ms`,
          success: true
        },
        performance: {
          totalDuration: processingTime,
          apiCalls: Math.floor(Math.random() * 5) + 3, // 3-7 API calls
          cacheHit: Math.random() > 0.7 // 30% cache hit rate
        }
      });

      logUserAction('itinerary_generation_success', {
        duration_ms: processingTime,
        destinations,
        days,
        activities,
        strategy: 'ultra-fast'
      });
    }

    // Log performance metrics
    logPerformance('response_time', processingTime, {
      prompt_complexity: prompt.split(',').length > 2 ? 'high' : 'medium',
      word_count: prompt.split(' ').length
    });
  }

  // Simulate some additional user interactions
  logUserAction('itinerary_viewed', {
    destination: 'Paris',
    view_duration: 45000 // 45 seconds
  });

  logUserAction('itinerary_exported', {
    format: 'PDF',
    destination: 'Tokyo, Kyoto'
  });

  logUserAction('feedback_provided', {
    rating: 5,
    comment: 'Great itinerary!'
  });

  logUserAction('session_ended', {
    session_duration: 300000, // 5 minutes
    total_generations: samplePrompts.length,
    successful_generations: samplePrompts.length - 1
  });

  console.log(`✅ Generated ${samplePrompts.length} sample itinerary requests`);
  console.log(`✅ Created ${samplePrompts.length + 4} user interaction logs`);
  console.log(`✅ Added ${samplePrompts.length} performance metrics\n`);

  // Force flush logs to see them immediately
  console.log('💾 Flushing logs to storage...');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for flush

  console.log('\n🎉 Sample data created! Try these commands:');
  console.log('   npm run logs:production recent');
  console.log('   npm run logs:production stats');  
  console.log('   npm run logs:production sessions');
}

// Run the test
createSampleLogs().catch(console.error);