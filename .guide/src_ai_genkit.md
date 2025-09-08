
# File Explanation: `src/ai/genkit.ts`

## Summary

This file is responsible for the configuration and initialization of the Firebase Genkit framework. Its primary purpose is to set up the connection to the desired AI model provider (in this case, OpenAI) and export a configured `ai` object that the rest of the application can use to define and run AI flows.

**Note:** This file has been modified to pivot from Google's Gemini to OpenAI. The configuration is minimal because the application now uses the OpenAI SDK directly, bypassing most of Genkit's higher-level abstractions.

---

## Detailed Breakdown

### Imports

```typescript
import {genkit} from 'genkit';
```
- **`genkit`**: This is the main import from the `genkit` library. It's the core function used to initialize the framework and configure plugins.

### AI Instance Configuration

```typescript
// OpenAI ONLY - No Gemini
// We're using direct OpenAI integration, not through Genkit
export const ai = genkit({
  plugins: [], // No plugins needed - using OpenAI directly
});
```
- **`export const ai`**: This line creates and exports the central `ai` object. This object is the heart of Genkit; it's used throughout the application to define flows, prompts, and tools (e.g., `ai.defineFlow(...)`).
- **`genkit({ plugins: [] })`**: This is the initialization call.
    - **`plugins`**: This array is where you would typically configure the connection to an AI provider, like Google AI (`googleAI()`) or a third-party model.
    - **Why is it empty?** The `plugins` array is intentionally left empty because the application has been refactored to call the OpenAI API directly (using the `openai` npm package in files like `src/ai/openai-direct.ts`). While this bypasses some of Genkit's features (like unified tool definitions), it was done to gain more control and solve specific issues with complex, multi-destination itinerary generation. The `ai` object is still used to structure the flows (`ai.defineFlow`), but the actual call to the large language model (LLM) happens outside the Genkit plugin system.

### Helper Function and Logging

```typescript
// Export helper to check which provider is active
export const isUsingOpenAI = () => true; // Always OpenAI
```
- **`isUsingOpenAI`**: A simple helper function that always returns `true`. This provides a clear, central place for other parts of the application to check which AI provider is intended to be active. It avoids scattering `process.env` checks throughout the codebase.

```typescript
// Log API configuration status
if (typeof window !== 'undefined') {
  console.log(`🤖 AI Provider: OpenAI GPT-4o-mini (Gemini removed)`);
}
```
- **Configuration Log**: This log message is intended to run on the client-side (`typeof window !== 'undefined'`) to provide immediate feedback in the browser's developer console about which AI provider the