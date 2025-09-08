const testPattern = /(\d+\s*(?:days?|nights?))\s+in\s+([A-Z][a-zA-Z\s,]+?)(?:,|then|after|and|before|\.|$)/gi;
const input = "3 days in London";

console.log("Testing pattern on:", input);
const match = testPattern.exec(input);

if (match) {
  console.log("Full match:", match[0]);
  console.log("Group 1 (duration):", match[1]);
  console.log("Group 2 (destination):", match[2]);
}

// Now test pattern detection
const patternSource = testPattern.source;
console.log("\nPattern source:", patternSource);
console.log("Contains ')\\s+in\\s+'?", patternSource.includes(')\\s+in\\s+'));
