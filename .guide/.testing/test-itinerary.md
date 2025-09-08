
# File Explanation: `.test-files/test-itinerary.js`

## Summary

This script is designed to be a high-level integration test for the main AI flow, `generatePersonalizedItinerary`. It directly imports and calls this function, simulating how the application's frontend would use it.

Its primary purpose is to verify that the entire AI generation logic, including any internal calls to other modules like the destination parser or the OpenAI helpers, works as expected and returns data in the correct format.

**Note:** This test was likely written before the major pivot to OpenAI and the chunked generation strategy. It may not fully exercise the multi-destination logic and is better suited for testing simple, single-destination prompts.

---

## Detailed Breakdown

### Setup

```javascript
const { generatePersonalizedItinerary } = require('../src/ai/flows/generate-personalized-itinerary');
```
- It uses `require` to directly import the main server action from the application's source code. This is a key feature of this test—it calls the exact same function the UI calls.

### `testItinerary` Function

#### 1. Define Prompt

```javascript
const testPrompt = 'I want to visit Paris for 3 days from January 15-17, 2025...';
```
- It defines a simple, single-destination prompt with a specific date range.

#### 2. Call the Server Action

```javascript
const result = await generatePersonalizedItinerary({
  prompt: testPrompt
});
```
- It calls the imported function, passing the prompt in the same object structure that the frontend would use. This triggers the full server-side logic.

#### 3. Validation Checks

After receiving the `result`, the script performs several validations:

-   **Basic Info**: It logs the `destination`, `title`, and number of `days` from the result to confirm that a valid object was returned.
-   **Date Validation**:
    ```javascript
    result.itinerary.forEach(day => {
        // ...
        if (year !== 2025) {
            console.error(`❌ Wrong year! ...`);
        }
    });
    ```
    - It iterates through each day of the generated itinerary and checks if the year is correct (2025, as specified in the prompt). This is a good test to see if the AI is correctly interpreting date information.
-   **Real Data Check**:
    - It iterates through all the activities in the itinerary and checks if they have a valid `address` field.
    - It calculates and prints a "Real data ratio," showing how many of the generated activities have a real-world address. This was more relevant when the system used the Foursquare API via Genkit tools. In the current OpenAI implementation, this checks if the AI is hallucinating plausible addresses.

### How to Run

1.  Make sure your `.env` file is configured with the necessary API keys.
2.  Run the script from your terminal: `node .test-files/test-itinerary.js`
3.  The script will print the generation results and the validation checks to the console.
