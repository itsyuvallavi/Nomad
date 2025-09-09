/**
 * UI Simulation Test
 * Simulates user interaction with the chat interface
 * Tests the same flow as if typed manually in the website
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

interface UITestResult {
  testId: string;
  testName: string;
  timestamp: string;
  simulationType: string;
  
  // User Input
  userInput: {
    prompt: string;
    conversationHistory: string;
    hasAttachment: boolean;
  };
  
  // System Response
  response: {
    success: boolean;
    generationTime: number;
    error?: string;
    data?: {
      title: string;
      destination: string;
      duration: string;
      quickTips: string[];
      estimatedCost?: any;
      days: Array<{
        dayNumber: number;
        date: string;
        title: string;
        location: string;
        weather?: any;
        activities: any[];
        meals: any[];
        accommodation?: any;
        transportation?: any[];
      }>;
    };
  };
  
  // UI Metrics
  uiMetrics: {
    promptLength: number;
    responseSize: number;
    totalActivities: number;
    totalMeals: number;
    hasRealAddresses: boolean;
    hasWeather: boolean;
    hasPricing: boolean;
  };
  
  // API Tracking
  apiTracking: {
    startTime: string;
    endTime: string;
    duration: number;
    apisUsed: string[];
  };
}

async function simulateUIInteraction(
  testName: string,
  userPrompt: string,
  conversationHistory: string = ''
): Promise<UITestResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testId = `ui_test_${Date.now()}`;
  
  console.log('═'.repeat(80));
  console.log('🖥️  UI SIMULATION TEST');
  console.log('═'.repeat(80));
  console.log(`Test: ${testName}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('─'.repeat(80));
  console.log('USER INPUT:');
  console.log(`"${userPrompt}"`);
  console.log('─'.repeat(80));
  
  const result: UITestResult = {
    testId,
    testName,
    timestamp: new Date().toISOString(),
    simulationType: 'Chat Interface',
    userInput: {
      prompt: userPrompt,
      conversationHistory,
      hasAttachment: false
    },
    response: {
      success: false,
      generationTime: 0
    },
    uiMetrics: {
      promptLength: userPrompt.length,
      responseSize: 0,
      totalActivities: 0,
      totalMeals: 0,
      hasRealAddresses: false,
      hasWeather: false,
      hasPricing: false
    },
    apiTracking: {
      startTime: new Date().toISOString(),
      endTime: '',
      duration: 0,
      apisUsed: []
    }
  };
  
  const startTime = Date.now();
  
  try {
    console.log('\n🤖 SIMULATING CHAT INTERFACE...\n');
    
    // This is exactly what happens when user clicks "Send" in the UI
    const response = await generatePersonalizedItinerary({
      prompt: userPrompt,
      conversationHistory,
      fileContent: null
    });
    
    const endTime = Date.now();
    result.apiTracking.endTime = new Date().toISOString();
    result.apiTracking.duration = endTime - startTime;
    result.response.generationTime = endTime - startTime;
    
    if (response.success && response.data) {
      result.response.success = true;
      result.response.data = response.data;
      
      // Calculate UI metrics
      result.uiMetrics.responseSize = JSON.stringify(response.data).length;
      result.uiMetrics.totalActivities = response.data.days.reduce(
        (sum, day) => sum + day.activities.length, 0
      );
      result.uiMetrics.totalMeals = response.data.days.reduce(
        (sum, day) => sum + (day.meals?.length || 0), 0
      );
      
      // Check for real data
      const firstActivity = response.data.days[0]?.activities[0];
      result.uiMetrics.hasRealAddresses = !!(firstActivity?.location?.address && 
        !firstActivity.location.address.includes('Address'));
      result.uiMetrics.hasWeather = !!response.data.days[0]?.weather;
      result.uiMetrics.hasPricing = !!response.data.estimatedCost;
      
      // Track which APIs were used
      if (result.uiMetrics.hasRealAddresses) result.apiTracking.apisUsed.push('GooglePlaces');
      if (result.uiMetrics.hasWeather) result.apiTracking.apisUsed.push('OpenWeatherMap');
      if (result.uiMetrics.hasPricing) result.apiTracking.apisUsed.push('OpenAI-Pricing');
      result.apiTracking.apisUsed.push('Gemini/OpenAI-Generation');
      
      console.log('✅ GENERATION SUCCESSFUL');
      console.log(`   Title: ${response.data.title}`);
      console.log(`   Destination: ${response.data.destination}`);
      console.log(`   Duration: ${response.data.duration}`);
      console.log(`   Days: ${response.data.days.length}`);
      console.log(`   Activities: ${result.uiMetrics.totalActivities}`);
      console.log(`   Generation Time: ${(result.response.generationTime / 1000).toFixed(2)}s`);
    } else {
      result.response.success = false;
      result.response.error = response.error || 'Unknown error';
      console.log(`❌ GENERATION FAILED: ${result.response.error}`);
    }
    
  } catch (error: any) {
    result.response.success = false;
    result.response.error = error.message;
    console.log(`❌ ERROR: ${error.message}`);
  }
  
  // Save results
  const filename = path.join('.searches', `${timestamp}_${testName.replace(/\s+/g, '_')}_UI.json`);
  fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  
  // Print summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 UI TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Status: ${result.response.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Generation Time: ${(result.response.generationTime / 1000).toFixed(2)}s`);
  console.log(`Response Size: ${(result.uiMetrics.responseSize / 1024).toFixed(2)} KB`);
  console.log('\nData Quality:');
  console.log(`  • Real Addresses: ${result.uiMetrics.hasRealAddresses ? '✅' : '❌'}`);
  console.log(`  • Weather Data: ${result.uiMetrics.hasWeather ? '✅' : '❌'}`);
  console.log(`  • Pricing Info: ${result.uiMetrics.hasPricing ? '✅' : '❌'}`);
  console.log(`\nAPIs Used: ${result.apiTracking.apisUsed.join(', ')}`);
  console.log(`\n💾 Results saved to: ${filename}`);
  console.log('═'.repeat(80));
  
  return result;
}

// Run multiple UI test scenarios
async function runUITests() {
  console.log('🚀 Starting UI Simulation Tests\n');
  
  const testCases = [
    {
      name: 'Simple_Weekend_Trip',
      prompt: 'Plan a weekend in Paris from London'
    },
    {
      name: 'Complex_Workation',
      prompt: `Plan a 2-week workation from New York to Europe. 
        Visit Amsterdam (5 days), Berlin (5 days), and Prague (4 days).
        I need coworking spaces on weekdays, travel between cities on weekends.
        Include good cafes for working, restaurants, and weekend activities.
        Budget-conscious but comfortable for remote work.`
    },
    {
      name: 'Asia_Adventure',
      prompt: 'Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka. I want to experience culture, food, and technology.'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Test ${i + 1}/${testCases.length}: ${testCase.name}\n`);
    
    const result = await simulateUIInteraction(
      testCase.name,
      testCase.prompt
    );
    
    results.push({
      name: testCase.name,
      success: result.response.success,
      time: result.response.generationTime,
      activities: result.uiMetrics.totalActivities,
      hasRealData: result.uiMetrics.hasRealAddresses
    });
    
    // Add delay between tests
    if (i < testCases.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('🏁 ALL UI TESTS COMPLETE');
  console.log('═'.repeat(80));
  
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.name}:`);
    console.log(`   Status: ${r.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Time: ${(r.time / 1000).toFixed(2)}s`);
    console.log(`   Activities: ${r.activities}`);
    console.log(`   Real Data: ${r.hasRealData ? '✅' : '❌'}`);
  });
  
  const successRate = (results.filter(r => r.success).length / results.length * 100).toFixed(0);
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length / 1000;
  
  console.log('\n📈 Overall Stats:');
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Avg Generation Time: ${avgTime.toFixed(2)}s`);
  console.log('═'.repeat(80));
}

// Run specific test or all tests
const args = process.argv.slice(2);

if (args[0] === '--all') {
  runUITests().catch(console.error);
} else if (args[0]) {
  // Run single test with custom prompt
  simulateUIInteraction('Custom_Test', args.join(' ')).catch(console.error);
} else {
  // Default: run single European workation test
  const prompt = `Plan a 2-week workation from New York to Europe. 
    Visit Amsterdam (5 days), Berlin (5 days), and Prague (4 days).
    I need coworking spaces on weekdays, travel between cities on weekends.
    Include good cafes for working, restaurants, and weekend activities.
    Budget-conscious but comfortable for remote work.`;
  
  simulateUIInteraction('European_Workation_UI_Test', prompt).catch(console.error);
}