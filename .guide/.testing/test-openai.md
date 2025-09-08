
# File Explanation: `.test-files/test-openai.js`

## Summary

This is the most fundamental API test in the suite. Its sole purpose is to verify the connection to the OpenAI API and ensure that the provided API key is valid.

It sends a very simple, self-contained request to the `gpt-4o-mini` model. It does not depend on any other part of the application's code. This makes it an excellent first step for debugging if the AI features are failing, as it confirms the problem is not with the basic API connectivity.

---

## Detailed Breakdown

### Setup

```javascript
const OpenAI = require('openai');
require('dotenv').config();
```
- It imports the official `openai` SDK and loads the environment variables from the `.env` file.

### API Key Check

```javascript
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env file!');
  process.exit(1);
}
```
- Before attempting to make an API call, the script first checks if the `OPENAI_API_KEY` variable exists. If not, it exits immediately with an error message. This provides a clear, immediate failure if the `.env` file is not configured correctly.

### `testOpenAI` Function

#### 1. API Call

```javascript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are a travel assistant...' },
    { role: 'user', content: 'Give me a simple 2-day Paris itinerary...' }
  ],
  response_format: { type: 'json_object' }
});
```
- It calls the OpenAI API with a simple, hardcoded prompt asking for a 2-day Paris itinerary.
- **`response_format: { type: 'json_object' }`**: This is an important parameter that requests the AI to return its response in a valid JSON format, making the output easy to parse and verify.

#### 2. Response Logging

```javascript
console.log('✅ SUCCESS! OpenAI API is working!');
// ...
const content = JSON.parse(completion.choices[0].message.content);
console.log(JSON.stringify(content, null, 2));
```
- If the API call is successful, it prints a clear success message.
- It logs the `usage` statistics from the response, showing how many tokens were used.
- It parses the JSON content from the AI's response and pretty-prints it to the console, allowing you to see exactly what the model generated.

#### 3. Detailed Error Handling

```javascript
catch (error: any) {
    console.error('❌ OpenAI API Test Failed!');
    if (error.message.includes('401')) {
      console.error('🔑 Authentication Error: Your API key is invalid or expired.');
    } else if (error.message.includes('429')) {
      console.error('⚠️ Rate Limit Error: Too many requests.');
    }
    // ... more specific errors
}
```
- The `try...catch` block includes very specific error handling. It inspects the error message returned by the OpenAI SDK and provides user-friendly, actionable feedback for common problems like:
    - Invalid API key (`401`)
    - Rate limit exceeded (`429`)
    - Insufficient account credits (`insufficient_quota`)

### How to Run

1.  Make sure your `.env` file contains your `OPENAI_API_KEY`.
2.  Run the script from your terminal: `node .test-files/test-openai.js`
3.  If successful, it will print the generated JSON itinerary. If it fails, it will provide a specific error message guiding you on how to fix it.
