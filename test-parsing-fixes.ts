// Test parsing fixes for problematic inputs
import { parseDestinations } from './src/ai/utils/destination-parser';

console.log('Testing parsing fixes...\n');

// Test 1: "4 days in days from New York" should fail validation
console.log('Test 1: "4 days in days from New York"');
const result1 = parseDestinations("4 days in days from New York");
console.log('Result:', JSON.stringify(result1, null, 2));
if (result1.destinations.length === 0) {
  console.log('✅ PASS - Correctly rejected "days" as invalid destination\n');
} else {
  console.log('❌ FAIL - Should not have parsed "days" as destination\n');
}

// Test 2: "21 days in Peru starting from Chicago" should parse "Peru" not "Peru starting"
console.log('Test 2: "21 days in Peru starting from Chicago"');
const result2 = parseDestinations("21 days in Peru starting from Chicago");
console.log('Result:', JSON.stringify(result2, null, 2));
if (result2.destinations.length > 0 && result2.destinations[0].name === 'Peru') {
  console.log('✅ PASS - Correctly parsed "Peru" without "starting"\n');
} else {
  console.log('❌ FAIL - Should have parsed "Peru" not "' + (result2.destinations[0]?.name || 'nothing') + '"\n');
}

// Test 3: Complex multi-destination should work
console.log('Test 3: "I\'d like to visit Korea Next month, i want to spend one week in Seoul, then i want to visit Tokyo for a week"');
const result3 = parseDestinations("I'd like to visit Korea Next month, i want to spend one week in Seoul, then i want to visit Tokyo for a week");
console.log('Result:', JSON.stringify(result3, null, 2));
if (result3.destinations.length >= 1 && result3.destinations[0].name === 'Seoul') {
  console.log('✅ PASS - Correctly parsed Seoul\n');
} else {
  console.log('❌ FAIL - Should have parsed Seoul not "' + (result3.destinations[0]?.name || 'nothing') + '"\n');
}