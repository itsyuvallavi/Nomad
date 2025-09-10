#!/usr/bin/env tsx

/**
 * Run Itinerary Generation Diagnostics
 * Execute this file to test all components
 */

// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { diagnostics } from './itinerary-diagnostics.test';

async function main() {
  console.log('🚀 Nomad Navigator - System Diagnostics');
  console.log('=' .repeat(60));
  console.log('Testing API integrations and itinerary generation...\n');
  
  try {
    const results = await diagnostics.runFullDiagnostics();
    
    // Exit with error code if tests failed
    const failed = results.filter(r => r.status === 'fail').length;
    if (failed > 0) {
      console.error(`\n❌ ${failed} tests failed. Please check the errors above.`);
      process.exit(1);
    } else {
      console.log('\n✅ All critical tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Diagnostics crashed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}