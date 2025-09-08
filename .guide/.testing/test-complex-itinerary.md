
# File Explanation: `.test-files/test-complex-itinerary.js`

## Summary

This script is a direct-to-API test focused on validating OpenAI's ability to handle the specific, complex, multi-destination prompt that was previously causing the application to fail.

It bypasses all of the application's internal logic (like the chunked generator) and sends a carefully constructed prompt directly to the `gpt-4o-mini` model. Its purpose is to act as a baseline, proving that the underlying AI model *is capable* of generating the required itinerary in a single call if given very clear and structured instructions.

---

## Detailed Breakdown

### Setup

```javascript
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```
- This section initializes the official OpenAI SDK using the API key from the `.env` file.

### `testComplexItinerary` Function

#### 1. Define Prompt

```javascript
const prompt = `plan a trip to Zimbabwe from Melbourne...`;
```
- It defines the exact, problematic user prompt that was causing failures.

#### 2. Construct the API Payload

```javascript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: `You are a travel agent... CRITICAL: Include ALL destinations...`
    },
    {
      role: 'user',
      content: prompt
    }
  ],
  response_format: { type: 'json_object' }
});
```
- This is the core of the test. It constructs the payload for the OpenAI API call.
- **`system` message**: This is the most important part. It contains a highly-structured "meta-prompt" that gives the AI very specific instructions.
    - It tells the AI its role ("You are a travel agent").
    - It provides a **CRITICAL** instruction to include all 5 specific destinations in the correct order and with the correct durations. This is a form of prompt engineering designed to force the AI to comply.
    - It specifies the exact JSON structure required for the output.
- **`user` message**: This contains the original, raw user prompt.
- **`response_format: { type: 'json_object' }`**: This is a crucial parameter that instructs the OpenAI model to guarantee its output is a syntactically correct JSON object.

#### 3. Analyze the Response

```javascript
const content = JSON.parse(completion.choices[0].message.content);
// ...
console.log('Destination:', content.destination);
// ...
destinations.forEach(dest => {
  const included = content.destination?.includes(dest) // ...
  console.log(`${included ? '✅' : '❌'} ${dest}`);
});
```
- It parses the JSON content from the AI's response.
- It then performs a basic analysis to check if the response is plausible:
    - It prints the `destination` string and `title` from the response.
    - It performs a "coverage check" by iterating through the expected destinations (`'Zimbabwe'`, `'Nicaragua'`, etc.) and verifying if their names are present in the AI's output.

### Purpose and Value

This test serves as a "control" in our test suite. While the main application now uses a more robust chunking strategy, this test proves that with sufficient prompt engineering, the base model is capable of handling the request. It's useful for:
- **Baseline Validation**: Confirming the AI model itself is not the issue.
- **Prompt Engineering**: Testing new system prompt structures to see how they influence the AI's output.
- **Debugging**: If the chunked generator fails, you can run this test to quickly see if the problem lies with the base model or the application's chunking logic.

### How to Run

1.  Make sure your `.env` file has a valid `OPENAI_API_KEY`.
2.  Run the script from your terminal: `node .test-files/test-complex-itinerary.js`
