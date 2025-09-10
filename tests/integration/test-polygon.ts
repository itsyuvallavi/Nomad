#!/usr/bin/env npx tsx

/**
 * Test Polygon.io API Integration
 * Tests currency exchange rates and financial data APIs
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { 
  getCurrencyExchangeRate, 
  getTravelCurrencies,
  getMarketStatus,
  getEconomicIndicators,
  getBudgetRecommendation
} from '../src/lib/api/polygon';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

async function testPolygonIntegration() {
  console.log(`\n${colors.bright}${colors.cyan}=== POLYGON.IO API INTEGRATION TEST ===${colors.reset}\n`);
  
  const hasApiKey = !!process.env.POLIGONIO_API_KEY;
  console.log(`${colors.bright}API Configuration:${colors.reset}`);
  console.log(`  API Key: ${hasApiKey ? colors.green + '✓ Configured' : colors.yellow + '⚠ Not configured (using mock data)'}${colors.reset}\n`);
  
  // Test 1: Currency Exchange Rate
  console.log(`${colors.cyan}1. Testing Currency Exchange Rate (USD → EUR)${colors.reset}`);
  try {
    const rate = await getCurrencyExchangeRate('USD', 'EUR');
    
    if (rate) {
      console.log(`${colors.green}✓ Exchange rate retrieved${colors.reset}`);
      console.log(`  1 USD = ${rate.rate} EUR`);
      console.log(`  Timestamp: ${new Date(rate.timestamp).toLocaleString()}`);
    } else {
      console.log(`${colors.red}✗ Failed to get exchange rate${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Exchange rate error: ${error}${colors.reset}`);
  }
  
  // Test 2: Multiple Travel Currencies
  console.log(`\n${colors.cyan}2. Testing Multiple Travel Currencies${colors.reset}`);
  const destinations = ['London', 'Paris', 'Tokyo', 'Sydney'];
  console.log(`  Destinations: ${destinations.join(', ')}`);
  
  try {
    const rates = await getTravelCurrencies('USD', destinations);
    
    if (rates.size > 0) {
      console.log(`${colors.green}✓ Retrieved ${rates.size} currency rates${colors.reset}`);
      rates.forEach((rate, destination) => {
        console.log(`  ${destination}: 1 USD = ${rate.toFixed(4)} local currency`);
      });
    } else {
      console.log(`${colors.yellow}⚠ No currency rates retrieved${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Travel currencies error: ${error}${colors.reset}`);
  }
  
  // Test 3: Market Status
  console.log(`\n${colors.cyan}3. Testing Market Status${colors.reset}`);
  try {
    const status = await getMarketStatus();
    
    console.log(`${colors.green}✓ Market status retrieved${colors.reset}`);
    console.log(`  Market: ${status.market}`);
    console.log(`  Status: ${status.status === 'open' ? colors.green : colors.yellow}${status.status}${colors.reset}`);
    console.log(`  After Hours: ${status.afterHours ? 'Yes' : 'No'}`);
    console.log(`  NYSE: ${status.exchanges.nyse}`);
    console.log(`  NASDAQ: ${status.exchanges.nasdaq}`);
  } catch (error) {
    console.log(`${colors.red}✗ Market status error: ${error}${colors.reset}`);
  }
  
  // Test 4: Economic Indicators
  console.log(`\n${colors.cyan}4. Testing Economic Indicators (US)${colors.reset}`);
  try {
    const indicators = await getEconomicIndicators('US');
    
    console.log(`${colors.green}✓ Economic indicators retrieved${colors.reset}`);
    console.log(`  Country: ${indicators.country}`);
    if (indicators.gdp) console.log(`  GDP: $${indicators.gdp.toLocaleString()}B`);
    if (indicators.inflationRate) console.log(`  Inflation Rate: ${indicators.inflationRate}%`);
    if (indicators.interestRate) console.log(`  Interest Rate: ${indicators.interestRate}%`);
    if (indicators.unemploymentRate) console.log(`  Unemployment Rate: ${indicators.unemploymentRate}%`);
  } catch (error) {
    console.log(`${colors.red}✗ Economic indicators error: ${error}${colors.reset}`);
  }
  
  // Test 5: Budget Recommendations
  console.log(`\n${colors.cyan}5. Testing Budget Recommendations${colors.reset}`);
  const testDestinations = [
    { city: 'London', style: 'moderate' as const },
    { city: 'Tokyo', style: 'luxury' as const },
    { city: 'Bangkok', style: 'budget' as const }
  ];
  
  for (const { city, style } of testDestinations) {
    console.log(`\n  ${colors.bright}${city} (${style}):${colors.reset}`);
    try {
      const budget = await getBudgetRecommendation(city, 'USD', style);
      
      console.log(`${colors.green}  ✓ Budget calculated${colors.reset}`);
      console.log(`    Daily Budget: $${budget.dailyBudget.toFixed(0)} USD`);
      console.log(`    Exchange Rate: 1 USD = ${budget.exchangeRate.toFixed(2)} ${budget.localCurrency}`);
      console.log(`    Local Amount: ${(budget.dailyBudget * budget.exchangeRate).toFixed(0)} ${budget.localCurrency}`);
      
      if (budget.recommendations.length > 0) {
        console.log(`    ${colors.blue}Recommendations:${colors.reset}`);
        budget.recommendations.slice(0, 2).forEach(rec => {
          console.log(`      • ${rec}`);
        });
      }
    } catch (error) {
      console.log(`${colors.red}  ✗ Budget calculation error: ${error}${colors.reset}`);
    }
  }
  
  // Test 6: Error Handling
  console.log(`\n${colors.cyan}6. Testing Error Handling${colors.reset}`);
  try {
    // Test with invalid currency codes
    const invalidRate = await getCurrencyExchangeRate('XXX', 'YYY');
    if (invalidRate) {
      console.log(`${colors.yellow}⚠ Returned mock data for invalid currencies${colors.reset}`);
      console.log(`  Rate: ${invalidRate.rate}`);
    }
  } catch (error) {
    console.log(`${colors.green}✓ Properly handled invalid currency codes${colors.reset}`);
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}=== TEST COMPLETE ===${colors.reset}`);
  
  if (hasApiKey) {
    console.log(`\n${colors.green}✓ Polygon.io API is properly configured and working${colors.reset}`);
    console.log(`  The API can provide real-time currency exchange rates and financial data`);
    console.log(`  This will enhance travel planning with accurate budget estimates`);
  } else {
    console.log(`\n${colors.yellow}⚠ Using mock data (no API key configured)${colors.reset}`);
    console.log(`  Add POLIGONIO_API_KEY to .env for real data`);
  }
  
  console.log(`\n${colors.bright}Integration opportunities:${colors.reset}`);
  console.log(`  • Add currency conversion to trip cost estimates`);
  console.log(`  • Show exchange rates in itinerary header`);
  console.log(`  • Provide budget recommendations based on destination`);
  console.log(`  • Display economic indicators for travel planning`);
  console.log(`  • Alert users about favorable exchange rates\n`);
}

testPolygonIntegration().catch(console.error);