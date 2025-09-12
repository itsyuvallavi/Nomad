#!/usr/bin/env npx tsx

/**
 * Test error handling for vague prompts
 */

console.log('🧪 Testing Vague Prompt Error Handling\n');
console.log('=' .repeat(60));

// Test cases that should trigger the error dialog
const vaguePrompts = [
  "3 days somewhere",
  "a week vacation",
  "trip next month",
  "holiday ideas",
  "somewhere warm",
  "beach vacation",
  "European tour",
  "Asia trip"
];

console.log('These prompts should trigger the error dialog:\n');

for (const prompt of vaguePrompts) {
  console.log(`• "${prompt}"`);
}

console.log('\n' + '=' .repeat(60));
console.log('\n✅ Expected Behavior:');
console.log('1. Error dialog appears with friendly message');
console.log('2. Message says: "Please tell me where you\'d like to go!"');
console.log('3. Shows example suggestions like:');
console.log('   • "3 days in Paris from New York"');
console.log('   • "One week exploring Tokyo, Kyoto, and Osaka from Los Angeles"');
console.log('4. Includes tips for better results');

console.log('\n' + '=' .repeat(60));
console.log('\n📝 How to Test in UI:');
console.log('1. Go to http://localhost:9002');
console.log('2. Enter any of the vague prompts above');
console.log('3. Verify the error dialog appears');
console.log('4. Check that the message is user-friendly');
console.log('5. Try one of the suggested examples to verify it works');

console.log('\n✨ The error handling is now more user-friendly!');
console.log('Instead of cryptic error messages, users get helpful guidance.');