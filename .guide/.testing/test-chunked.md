
# File Explanation: `.test-files/test-chunked.js`

## Summary

This script is a targeted unit/integration test for the **chunked itinerary generator** (`src/ai/openai-chunked.ts`). It bypasses the UI and server, directly calling the `generateChunkedItinerary` function to verify its ability to handle complex, multi-destination prompts.

Its primary purpose is to test the most complex part of the AI logic in isolation, ensuring that it correctly parses the input, generates each destination segment ("chunk"), and assembles the final itinerary.

---

## Detailed Breakdown

### Setup

```javascript
require('dotenv').config();
const { parseDestinations } = require('../src/ai/utils/destination-parser.ts');
```
- **`dotenv`**: Loads the `OPENAI_API_KEY` from the `.env` file, which is required to make API calls.
- **`parseDestinations`**: Imports the utility function to pre-process the prompt, simulating the first step of a real request.

### `testChunkedGeneration` Function

This is the main async function that runs the test.

#### 1. Define Prompt and Parse

```javascript
const testPrompt = `I want to travel from Melbourne for 31 days...`;
const parsedTrip = parseDestinations(testPrompt);
```
- It defines a complex test prompt with 5 destinations and specific durations.
- It then immediately calls `parseDestinations` on this prompt to ensure the pre-processing step is working as expected. The result is logged to the console.

#### 2. Import and Run the Generator

```javascript
const { generateChunkedItinerary } = await import('../src/ai/openai-chunked.ts');
const itinerary = await generateChunkedItinerary(testPrompt);
```
- **`import()`**: It uses a dynamic `import()` to load the `generateChunkedItinerary` function.
- It then calls this function, passing the raw prompt. This triggers the entire chunked generation process: multiple calls to the OpenAI API for each destination, followed by assembly of the final object.

#### 3. Verification and Analysis

```javascript
console.log('📊 Results:');
console.log('- Total Days:', itinerary.itinerary.length);
// ...

const daysByCountry = {};
itinerary.itinerary.forEach(day => { /* ... */ });
```
- After receiving the `itinerary` object, the script performs several checks:
    - It prints the total number of days generated.
    - It attempts to group the returned days by country by analyzing the text content of the activities. This is a check to see if the generated content is relevant to the correct destination.
    - It logs a summary of how many days were generated for each country.

#### 4. Save Output

```javascript
const fs = require('fs');
fs.writeFileSync('test-chunked-output.json', JSON.stringify(itinerary, null, 2));
```
- **This is a crucial step.** The script saves the entire, successfully generated itinerary object to the `test-chunked-output.json` file. This creates a static artifact that can be inspected later for debugging.

### How to Run

1.  Make sure your `.env` file contains a valid `OPENAI_API_KEY`.
2.  Run the script directly from your terminal: `node .test-files/test-chunked.js`
3.  The test will print its progress to the console and, upon success, create/overwrite the `test-chunked-output.json` file.
