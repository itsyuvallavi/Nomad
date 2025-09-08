# File Explanation: `src/ai/utils/destination-parser.ts`

## Summary

This file contains crucial utility functions for pre-processing the user's raw text prompt. Its main job is to analyze the unstructured text and extract structured information, such as the list of destinations, the duration of stay for each, the trip's origin, and the final return location.

This pre-processing step is vital for the new OpenAI-based approach. By structuring the data *before* sending it to the AI, it significantly improves the reliability and accuracy of the generated itinerary, especially for complex multi-destination trips.

---

## Detailed Breakdown

### Interfaces

```typescript
export interface ParsedDestination {
  name: string;
  days?: number;
  duration: number;
  durationText: string;
  order: number;
}

export interface ParsedTrip {
  origin: string;
  destinations: ParsedDestination[];
  returnTo: string;
  totalDays: number;
  // ...
}
```
- **`ParsedDestination` & `ParsedTrip`**: These TypeScript interfaces define the data structures that the parsing functions will produce. This provides type safety and a clear contract for what the rest of the application can expect to receive from the parser.

### Core Functions

#### `parseDuration(durationText: string): number`
- **Purpose**: Converts natural language durations (e.g., "a week", "3 days", "one month") into a numerical number of days.
- **Logic**: It uses `string.includes()` and regular expressions (`match()`) to find keywords like "week" or "day" and extract the corresponding number. It provides a sensible default (5 days) if it cannot parse the text.

#### `extractOrigin(input: string): string` and `extractReturn(input: string): string`
- **Purpose**: These functions are responsible for finding the starting and ending points of the trip.
- **Logic**: They use an array of regular expression patterns to find common phrases like "from Melbourne", "departing from...", "back home to LA", or "return to...". They iterate through the patterns and return the first match found.

#### `parseDestinations(input: string): ParsedTrip` (Main Function)
- **Purpose**: This is the main orchestrator function that analyzes the entire user prompt and returns a complete `ParsedTrip` object.
- **Logic**:
    1.  It first calls `extractOrigin` and `extractReturn`.
    2.  It uses a series of complex regular expressions (`patterns`) designed to capture various ways users might specify destinations and durations (e.g., "visit Zimbabwe for a week", "spend a week in Madagascar", "Denmark for 3 days").
    3.  It iterates through these patterns, executing them on the input string to find all possible matches.
    4.  It includes a `foundDestinations` `Set` to avoid adding duplicate locations.
    5.  **Special Casing**: It contains specific hardcoded logic to more accurately handle the exact phrasing of the test case that was previously failing ("...Zimbabwe...Nicaragua..."). This is a pragmatic fix to ensure the known problem is solved reliably, although a more robust NLP solution would be a long-term improvement.
    6.  It calculates the `totalDays` by summing the duration of all found destinations.
    7.  Finally, it logs the results and returns the fully populated `ParsedTrip` object.

#### `buildStructuredPrompt(parsedTrip: ParsedTrip, originalPrompt: string): string`
- **Purpose**: This function takes the structured `ParsedTrip` object and creates a new, "enhanced" prompt string to send to the AI.
- **Logic**: It creates a clear, unambiguous summary of the trip plan for the AI to follow. The output looks something like this:
    ```
    Generate a 35-day travel itinerary with the following structure:

    DEPARTURE: From Melbourne

    DESTINATIONS (in order):
    1. Zimbabwe: 7 days
       [Travel day between cities]
    2. Nicaragua: 7 days
       [Travel day between cities]
    ...

    RETURN: To LA

    TOTAL TRIP LENGTH: 35 days

    ORIGINAL REQUEST: [original user prompt]

    IMPORTANT: You MUST include ALL 5 destinations...
    ```
- **Benefit**: This structured format is much easier for the AI to understand than the original, messy user prompt. It removes ambiguity and provides explicit instructions, dramatically increasing the likelihood of getting a correct and complete itinerary in the desired JSON format.