#!/usr/bin/env npx tsx

/**
 * Quick test for improved transportation detection
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { generateUltraFastItinerary } from '../src/ai/enhanced-generator-ultra-fast';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

async function testTransportDetection() {
  console.log(`\n${colors.bright}${colors.cyan}=== QUICK TRANSPORT DETECTION TEST ===${colors.reset}\n`);
  
  const testCases = [
    {
      name: 'London to Paris (Eurostar)',
      prompt: 'Plan 3 days in Paris from London'
    },
    {
      name: 'Greek Islands with Athens',
      prompt: 'Plan 10 days visiting Athens, Santorini, and Mykonos'
    },
    {
      name: 'Japan Shinkansen Route',
      prompt: 'Plan one week from Tokyo to Kyoto and Osaka'
    }
  ];
  
  for (const test of testCases) {
    console.log(`${colors.bright}Testing: ${test.name}${colors.reset}`);
    
    try {
      const result = await generateUltraFastItinerary(test.prompt);
      
      // Check for transportation days
      const transportDays = result.itinerary.filter(day => 
        day.title?.includes('→') || 
        day.title?.toLowerCase().includes('travel')
      );
      
      console.log(`${colors.green}✓ Generated ${result.itinerary.length} days total${colors.reset}`);
      console.log(`${colors.cyan}  Transport days found: ${transportDays.length}${colors.reset}`);
      
      transportDays.forEach(day => {
        const transport = day.activities?.find(a => 
          a.description?.toLowerCase().includes('train') ||
          a.description?.toLowerCase().includes('ferry') ||
          a.description?.toLowerCase().includes('flight') ||
          a.description?.toLowerCase().includes('shinkansen') ||
          a.description?.toLowerCase().includes('eurostar') ||
          a.description?.toLowerCase().includes('bus')
        );
        
        if (transport) {
          console.log(`${colors.yellow}  → ${day.title}: ${transport.description}${colors.reset}`);
        }
      });
      
      console.log('');
      
    } catch (error) {
      console.log(`${colors.yellow}✗ Error: ${error}${colors.reset}\n`);
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testTransportDetection().catch(console.error);