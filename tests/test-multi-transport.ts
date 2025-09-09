#!/usr/bin/env npx tsx

/**
 * Comprehensive Multi-Transport Test
 * Tests various transportation methods: trains, flights, buses, ferries
 * Tests complex multi-city trips with realistic transport detection
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { generateUltraFastItinerary } from '../src/ai/enhanced-generator-ultra-fast';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function log(message: string, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logTransport(transport: string, route: string, duration: string) {
  const transportIcons: Record<string, string> = {
    'Flight': '✈️',
    'Train': '🚂',
    'High-Speed Train': '🚄',
    'Bus': '🚌',
    'Ferry': '⛴️',
    'High-Speed Ferry': '🚤',
    'Overnight Ferry': '🛳️',
    'Shinkansen': '🚅',
    'Eurostar': '🚆',
    'Thalys': '🚆',
    'AVE': '🚆',
    'TGV': '🚆',
  };
  
  const icon = transportIcons[transport] || '🚗';
  console.log(`${colors.bright}${icon}  ${transport}${colors.reset}: ${colors.yellow}${route}${colors.reset} (${colors.dim}${duration}${colors.reset})`);
}

async function testMultiTransport() {
  logSection('COMPREHENSIVE MULTI-TRANSPORT TEST');
  
  const testCases = [
    {
      name: 'European Grand Tour (Multiple Trains)',
      prompt: 'Plan 2 weeks traveling from London to Paris, then Amsterdam, Berlin, Prague, and Vienna',
      expectedTransport: [
        { from: 'London', to: 'Paris', method: 'Eurostar' },
        { from: 'Paris', to: 'Amsterdam', method: 'Thalys' },
        { from: 'Amsterdam', to: 'Berlin', method: 'Train' },
        { from: 'Berlin', to: 'Prague', method: 'Train' },
        { from: 'Prague', to: 'Vienna', method: 'Train' }
      ]
    },
    {
      name: 'Greek Island Hopping (Ferries)',
      prompt: 'Plan 10 days visiting Athens, Santorini, Mykonos, and Crete',
      expectedTransport: [
        { from: 'Athens', to: 'Santorini', method: 'Ferry' },
        { from: 'Santorini', to: 'Mykonos', method: 'High-Speed Ferry' },
        { from: 'Mykonos', to: 'Crete', method: 'Ferry' }
      ]
    },
    {
      name: 'Japan Rail Adventure (Shinkansen)',
      prompt: 'Plan one week traveling from Tokyo to Kyoto, Osaka, Hiroshima, and back to Tokyo',
      expectedTransport: [
        { from: 'Tokyo', to: 'Kyoto', method: 'Shinkansen' },
        { from: 'Kyoto', to: 'Osaka', method: 'Train' },
        { from: 'Osaka', to: 'Hiroshima', method: 'Shinkansen' },
        { from: 'Hiroshima', to: 'Tokyo', method: 'Shinkansen' }
      ]
    },
    {
      name: 'Nordic Journey (Mixed Transport)',
      prompt: 'Plan 12 days from Copenhagen to Stockholm, Helsinki, and Oslo',
      expectedTransport: [
        { from: 'Copenhagen', to: 'Stockholm', method: 'Train' },
        { from: 'Stockholm', to: 'Helsinki', method: 'Overnight Ferry' },
        { from: 'Helsinki', to: 'Oslo', method: 'Flight' }
      ]
    },
    {
      name: 'Southeast Asia Backpacking (Buses & Flights)',
      prompt: 'Plan 2 weeks from Bangkok to Chiang Mai, then Siem Reap, Phnom Penh, and Ho Chi Minh City',
      expectedTransport: [
        { from: 'Bangkok', to: 'Chiang Mai', method: 'Bus' },
        { from: 'Chiang Mai', to: 'Siem Reap', method: 'Flight' },
        { from: 'Siem Reap', to: 'Phnom Penh', method: 'Bus' },
        { from: 'Phnom Penh', to: 'Ho Chi Minh City', method: 'Bus' }
      ]
    },
    {
      name: 'Eastern Europe Budget Trip (Bus Heavy)',
      prompt: 'Plan 10 days from Prague to Budapest, Bucharest, and Sofia',
      expectedTransport: [
        { from: 'Prague', to: 'Budapest', method: 'Bus' },
        { from: 'Budapest', to: 'Bucharest', method: 'Bus' },
        { from: 'Bucharest', to: 'Sofia', method: 'Bus' }
      ]
    },
    {
      name: 'Spain & Portugal (High-Speed Rail)',
      prompt: 'Plan one week from Madrid to Barcelona, then Valencia and Seville',
      expectedTransport: [
        { from: 'Madrid', to: 'Barcelona', method: 'AVE' },
        { from: 'Barcelona', to: 'Valencia', method: 'Train' },
        { from: 'Valencia', to: 'Seville', method: 'Train' }
      ]
    },
    {
      name: 'Indonesia Island Adventure (Ferries & Flights)',
      prompt: 'Plan 2 weeks visiting Jakarta, Bali, Lombok, and the Gili Islands',
      expectedTransport: [
        { from: 'Jakarta', to: 'Bali', method: 'Flight' },
        { from: 'Bali', to: 'Lombok', method: 'Ferry' },
        { from: 'Lombok', to: 'Gili Islands', method: 'High-Speed Ferry' }
      ]
    }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  const results: any[] = [];
  
  for (const testCase of testCases) {
    log(`\n${colors.bright}Testing: ${testCase.name}${colors.reset}`);
    log(`Prompt: "${testCase.prompt}"`, colors.dim);
    
    const startTime = Date.now();
    
    try {
      const result = await generateUltraFastItinerary(testCase.prompt);
      const elapsed = Date.now() - startTime;
      
      if (result.itinerary && result.itinerary.length > 0) {
        log(`✅ Success in ${elapsed}ms`, colors.green);
        
        // Extract transportation days
        const transportDays = result.itinerary.filter(day => 
          day.title?.toLowerCase().includes('travel') || 
          day.title?.toLowerCase().includes('transit') ||
          day.activities?.some(a => 
            a.category === 'Travel' || 
            a.description?.toLowerCase().includes('train') ||
            a.description?.toLowerCase().includes('flight') ||
            a.description?.toLowerCase().includes('bus') ||
            a.description?.toLowerCase().includes('ferry')
          )
        );
        
        log(`\n${colors.bright}Transportation Found:${colors.reset}`);
        
        transportDays.forEach(day => {
          const transportActivity = day.activities?.find(a => 
            a.category === 'Travel' || 
            a.description?.toLowerCase().match(/train|flight|bus|ferry|shinkansen|eurostar|thalys|ave|tgv/)
          );
          
          if (transportActivity) {
            // Extract transport method from description
            const desc = transportActivity.description || '';
            let method = 'Unknown';
            
            if (desc.toLowerCase().includes('shinkansen')) method = 'Shinkansen';
            else if (desc.toLowerCase().includes('eurostar')) method = 'Eurostar';
            else if (desc.toLowerCase().includes('thalys')) method = 'Thalys';
            else if (desc.toLowerCase().includes('ave')) method = 'AVE';
            else if (desc.toLowerCase().includes('tgv')) method = 'TGV';
            else if (desc.toLowerCase().includes('overnight ferry')) method = 'Overnight Ferry';
            else if (desc.toLowerCase().includes('high-speed ferry')) method = 'High-Speed Ferry';
            else if (desc.toLowerCase().includes('ferry')) method = 'Ferry';
            else if (desc.toLowerCase().includes('high-speed train')) method = 'High-Speed Train';
            else if (desc.toLowerCase().includes('train')) method = 'Train';
            else if (desc.toLowerCase().includes('flight')) method = 'Flight';
            else if (desc.toLowerCase().includes('bus')) method = 'Bus';
            
            logTransport(method, day.title || '', transportActivity.time || '');
          }
        });
        
        // Validate expected transport methods
        let transportMatches = 0;
        for (const expected of testCase.expectedTransport) {
          const found = transportDays.some(day => {
            const dayText = JSON.stringify(day).toLowerCase();
            return dayText.includes(expected.from.toLowerCase()) && 
                   dayText.includes(expected.to.toLowerCase());
          });
          
          if (found) {
            transportMatches++;
            log(`  ✓ Found route: ${expected.from} → ${expected.to}`, colors.green);
          } else {
            log(`  ✗ Missing route: ${expected.from} → ${expected.to}`, colors.yellow);
          }
        }
        
        const matchPercentage = (transportMatches / testCase.expectedTransport.length) * 100;
        log(`\nTransport Coverage: ${matchPercentage.toFixed(0)}%`, 
            matchPercentage >= 70 ? colors.green : colors.yellow);
        
        if (matchPercentage >= 70) {
          passedTests++;
        }
        
        results.push({
          test: testCase.name,
          success: true,
          transportCoverage: matchPercentage,
          responseTime: elapsed,
          destinations: result.destination,
          days: result.itinerary.length
        });
        
      } else {
        log(`❌ Failed: Invalid response structure`, colors.red);
        results.push({
          test: testCase.name,
          success: false,
          error: 'Invalid response structure'
        });
      }
      
    } catch (error) {
      log(`❌ Error: ${error}`, colors.red);
      results.push({
        test: testCase.name,
        success: false,
        error: String(error)
      });
    }
    
    totalTests++;
    
    // Brief pause between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  logSection('TEST SUMMARY');
  
  const successRate = (passedTests / totalTests) * 100;
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.responseTime).length;
  
  log(`Total Tests: ${totalTests}`, colors.bright);
  log(`Passed: ${passedTests} (${successRate.toFixed(1)}%)`, 
      successRate >= 70 ? colors.green : colors.red);
  log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`, colors.cyan);
  
  console.log('\n' + colors.bright + 'Detailed Results:' + colors.reset);
  console.table(results.map(r => ({
    Test: r.test.substring(0, 30),
    Success: r.success ? '✅' : '❌',
    Coverage: r.transportCoverage ? `${r.transportCoverage.toFixed(0)}%` : 'N/A',
    Time: r.responseTime ? `${r.responseTime}ms` : 'N/A',
    Days: r.days || 'N/A'
  })));
  
  // Save results
  const timestamp = new Date().toISOString();
  const testResult = {
    timestamp,
    test: 'multi-transport',
    totalTests,
    passed: passedTests,
    successRate,
    avgResponseTime,
    details: results
  };
  
  try {
    const fs = await import('fs/promises');
    const existingResults = JSON.parse(
      await fs.readFile('ai-test-results.json', 'utf-8').catch(() => '[]')
    );
    existingResults.push(testResult);
    await fs.writeFile('ai-test-results.json', JSON.stringify(existingResults, null, 2));
    log('\n✅ Results saved to ai-test-results.json', colors.green);
  } catch (error) {
    log('\n⚠️ Could not save results to file', colors.yellow);
  }
}

// Run the test
testMultiTransport().catch(console.error);