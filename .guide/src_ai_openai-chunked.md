# File Explanation: `src/ai/openai-chunked.ts`

## Summary

This file provides an advanced strategy for generating large and complex travel itineraries by breaking them down into smaller, manageable "chunks." Instead of asking the AI to generate a 30+ day multi-country itinerary in a single request (which is prone to timeouts and token limits), this approach generates the itinerary for each destination separately and then stitches the results together.

This is a critical component for handling the complex, multi-destination user request that was previously failing.

---

## Detailed Breakdown

### Imports

```typescript
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { parseDestinations, buildStructuredPrompt } from '@/ai/utils/destination-parser';
```
- **`OpenAI`**: Imports the official OpenAI SDK to make direct API calls.
- **`logger`**: Imports the custom centralized logger for structured console output.
- **`GeneratePersonalizedItineraryOutput`**: Imports the standard output type to ensure the final result matches the required application schema.
- **`parseDestinations`**: Imports the utility function that extracts structured destination data from the user's raw prompt.

### OpenAI Client Initialization

```typescript
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') { /* ... */ }
  if (!openai) {
    openai = new OpenAI({ /* ... */ });
  }
  return openai;
}
```
- **Singleton Pattern**: This code ensures that only one instance of the `OpenAI` client is created per server-side process. It initializes the client with the API key from environment variables, sets a 30-second timeout for each API request, and allows for up to 2 retries if a request fails. The check for `typeof window` prevents this server-only code from ever running in a browser.

### `generateDestinationChunk` Function

```typescript
async function generateDestinationChunk(
  chunk: DestinationChunk,
  tripContext: string,
  startDate: Date
): Promise<any[]> {
  // ...
  const systemPrompt = `Generate a ${chunk.days}-day itinerary for ${chunk.destination}. ...`;
  const userPrompt = `Create a detailed ${chunk.days}-day itinerary for ${chunk.destination}. ...`;

  const response = await client.chat.completions.create({ /* ... */ });
  // ...
  return Array.isArray(days) ? days : [];
}
```
- **Purpose**: This async function is responsible for generating the itinerary for a *single destination* (a single "chunk").
- **`systemPrompt` and `userPrompt`**: It constructs a very specific prompt for the AI, telling it exactly how many days to generate for a specific city and the required JSON output format.
- **API Call**: It makes the call to `gpt-4o-mini` using `response_format: { type: 'json_object' }` to ensure the AI returns valid JSON.
- **Error Handling**: It is wrapped in a `try...catch` block to handle API failures for an individual chunk.

### `generateChunkedItinerary` (Main Exported Function)

```typescript
export async function generateChunkedItinerary(
  prompt: string,
  // ... other params
): Promise<GeneratePersonalizedItineraryOutput> {
  // ...
  const parsedTrip = parseDestinations(prompt);
  // ...

  // 1. Create Chunks
  for (const dest of parsedTrip.destinations) {
    const chunk: DestinationChunk = { /* ... */ };
    chunks.push(chunk);
    currentDay += days;
  }
  // ...

  // 2. Generate Each Chunk
  for (const chunk of chunks) {
    const chunkDays = await generateDestinationChunk(chunk, prompt, startDate);
    allDays.push(...chunkDays);
  }
  // ...

  // 3. Add Travel Days & Build Final Itinerary
  // ... logic to insert travel activities between destinations ...

  // 4. Generate Quick Tips
  const tipsResponse = await client.chat.completions.create({ /* ... */ });
  // ...

  // 5. Return Final Object
  const itinerary: GeneratePersonalizedItineraryOutput = { /* ... */ };
  return itinerary;
}
```
- **Step 1: Parse and Prepare Chunks**: It first calls `parseDestinations` to get a structured list of destinations. It then loops through this list to create an array of `DestinationChunk` objects, each containing the destination name, duration, and its start/end day number in the overall trip.
- **Step 2: Generate Sequentially**: It iterates through the `chunks` array and calls `generateDestinationChunk` for each one. This happens sequentially to avoid overwhelming the API with too many requests at once. It collects all the generated "day" objects into the `allDays` array.
- **Step 3: Post-Processing**: After all chunks are generated, it performs post-processing to sort the days and intelligently insert "Travel Day" activities between the different destinations.
- **Step 4: Generate Tips**: It makes one final, small API call to generate a list of relevant travel tips for the entire trip.
- **Step 5: Assemble and Return**: It assembles the final `GeneratePersonalizedItineraryOutput` object, combining the destination names, title, the complete `itinerary` array, and the `quickTips`, and returns it.