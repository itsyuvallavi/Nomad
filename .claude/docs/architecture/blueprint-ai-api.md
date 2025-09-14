# Nomad Navigator: AI & API Blueprint

This document details the architecture of the AI and external API integration layer, explaining how user prompts are processed and transformed into a complete, data-rich itinerary.

## 1. Core AI Components

- **AI Provider**: OpenAI `gpt-4o-mini` is the exclusive large language model used for generation. The client is configured in `src/services/ai/openai-config.ts`.
- **AI Orchestrator**: Firebase Genkit is the framework used to define and run server-side AI flows.
- **Location Services**: LocationIQ is the primary API for all geospatial data, including place searches, geocoding, and maps.

## 2. Itinerary Generation Flow

The process is orchestrated by the `generate-personalized-itinerary` flow in `src/services/ai/flows/`. It follows these steps:

### Step 1: Prompt Analysis & Validation (`analyze-initial-prompt.ts`)
- **Purpose**: To quickly check if the user's request is understandable and feasible.
- **Action**: A simple AI call or regex checks the prompt for essential details (destination, duration). It uses `parseDestinations` from `destination-parser.ts` for this.
- **Output**: Determines if the trip is too complex (e.g., >5 cities, >30 days). If so, it returns a user-friendly error message immediately without proceeding.

### Step 2: AI Itinerary Generation (`enhanced-generator-ultra-fast.ts`)
- **Purpose**: To generate the creative, day-by-day structure of the itinerary.
- **Input**: The user's natural language prompt.
- **Action**:
  1. A detailed system prompt is constructed using templates from `openai-travel-prompts.ts`. This prompt contains **critical instructions** for the AI, such as:
     - Generate **specific, famous venue names** (e.g., "Louvre Museum", not "art museum").
     - Always use `"Address: N/A"`.
     - Include a `venue_search` field for each activity (e.g., "Louvre Museum Paris").
     - Group activities by neighborhood.
  2. A single API call is made to **OpenAI `gpt-4o-mini`**.
  3. The model returns a structured **JSON object** representing the complete itinerary.
- **Output**: A structured `GeneratePersonalizedItineraryOutput` object, but without real-world data like coordinates or verified addresses.

### Step 3: Location Enrichment (`location-enrichment-locationiq.ts`)
- **Purpose**: To add real-world, accurate data to the AI-generated structure.
- **Input**: The JSON itinerary from OpenAI.
- **Action**:
  1. The service iterates through each activity in the itinerary.
  2. For each activity, it uses the `venue_search` field (e.g., "Louvre Museum Paris") to query the **LocationIQ API**. The API call logic is in `src/services/api/locationiq-enhanced.ts`, which includes rate limiting and retry logic.
  3. If a match is found, the activity is "enriched" with:
     - **Exact Address**: Replaces the "Address N/A" placeholder.
     - **Coordinates**: Latitude and longitude for map plotting.
     - **Other Details**: Website, phone number, hours (if available).
- **Output**: The same itinerary structure, but now with verified, real-world location data.

### Step 4: Route Optimization (`route-optimizer.ts`)
- **Purpose**: To make the itinerary practical and efficient by minimizing travel time.
- **Input**: The enriched itinerary with coordinates.
- **Action**:
  1. For each day, the service analyzes the coordinates of all activities.
  2. It uses a **nearest neighbor algorithm** to re-order the activities within each day, ensuring the user travels logically from one point to the next.
  3. It also calculates the total travel distance for the day and can flag inefficient routes.
- **Output**: The final, optimized itinerary with activities ordered for minimal travel.

## 3. External API Integrations (`/src/services/api/`)

- **`locationiq.ts` / `locationiq-enhanced.ts`**:
  - **Function**: The workhorse for all location data. It replaces Google Places, Radar, and Foursquare.
  - **Used for**: Searching for venues, geocoding addresses, and providing map data.
  - **Key Feature**: The "enhanced" version includes robust rate-limiting and retry logic to handle API usage limits gracefully.

- **`pexels.ts`**:
  - **Function**: Fetches high-quality, free stock images for destinations.
  - **Used for**: Displaying an attractive header image for each location in the itinerary. It uses search terms from `city-landmarks.ts` to find iconic images.

- **`weather.ts`**:
  - **Function**: Retrieves weather forecasts from OpenWeatherMap.
  - **Used for**: Adding daily weather predictions to the itinerary (currently a secondary feature).

- **`amadeus.ts`**
  - **Function**: Provides flight and hotel data.
  - **Status**: Currently disabled due to sandbox limitations and timeouts. Cost estimation is handled by OpenAI instead.

## 4. Key AI Utility Files (`/src/services/ai/utils/`)

- **`openai-travel-prompts.ts`**: The most critical file for AI quality. It contains the detailed instructions and examples that guide the OpenAI model to produce the desired output format and quality.
- **`destination-parser.ts`**: A regex-based utility for quickly extracting basic trip details (destinations, durations) from the user's prompt. Used in the initial validation step.
- **`venue-knowledge-base.ts`**: A static JSON file containing curated lists of famous venues for major cities. This is used to provide examples in the AI prompt, improving the quality of generated venue names.

This modular, multi-stage process ensures a balance of speed, creativity, and accuracy. The AI provides the creative structure, while external APIs ground