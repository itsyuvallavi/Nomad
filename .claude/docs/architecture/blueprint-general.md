# Nomad Navigator: General Architecture Blueprint

This document provides a high-level overview of the Nomad Navigator application, explaining the overall structure and data flow from user interaction to itinerary generation.

## 1. Core Technologies

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: `shadcn/ui`
- **AI Backend**: Firebase Genkit (for orchestrating AI flows)
- **AI Model**: OpenAI `gpt-4o-mini`
- **Location Services**: LocationIQ (for geocoding, places, and maps)
- **Authentication**: Firebase Authentication
- **Database**: Firestore (for storing user trips and preferences)

## 2. Overall Application Flow

This is the end-to-end journey of a user request:

1.  **User Input**: The user lands on `src/app/page.tsx` and interacts with the `TripSearchForm` component. They enter a travel prompt (e.g., "3 days in London").

2.  **Frontend Request**: The `ChatDisplay` component (`src/components/chat/chat-container.tsx`) receives the prompt and makes a `fetch` request to the backend API endpoint at `/api/ai/generate-itinerary/route.ts`.

3.  **API Route Handling**: The Next.js API route receives the request. Its primary job is to call the main server-side AI flow.

4.  **AI Flow Orchestration (`generate-personalized-itinerary.ts`)**:
    - This is the central AI "brain" located in `src/services/ai/flows/`.
    - It receives the user's prompt.
    - It uses the `enhanced-generator-ultra-fast.ts` utility to generate a structured itinerary using OpenAI.

5.  **Itinerary Generation (`enhanced-generator-ultra-fast.ts`)**:
    - The generator sends a carefully constructed prompt to the OpenAI API (`gpt-4o-mini`).
    - OpenAI returns a JSON object representing the day-by-day itinerary, based on schemas defined in `src/services/ai/schemas.ts`.

6.  **Data Enrichment (`location-enrichment-locationiq.ts`)**:
    - The generated itinerary is passed to this service.
    - It uses the **LocationIQ API** to search for the specific venues mentioned by the AI (e.g., "Louvre Museum").
    - It enriches the itinerary by adding real-world data like addresses and coordinates to each activity.

7.  **Route Optimization (`route-optimizer.ts`)**:
    - The enriched itinerary is then processed to re-order activities within each day.
    - This minimizes travel time and creates a logical geographical flow, preventing the user from zigzagging across the city.

8.  **Response to Frontend**: The final, enriched, and optimized itinerary is sent back to the `ChatDisplay` component in the frontend.

9.  **UI Display**:
    - The `ChatDisplay` component receives the itinerary and updates its state.
    - The `ItineraryPanel` (`src/components/itinerary/itinerary-view.tsx`) renders the day-by-day plan.
    - The `MapPanel` (`src/components/map/map-panel.tsx`) uses the coordinates to display markers on a map.

## 3. Directory Structure Philosophy

- **`/src/app`**: Contains only Next.js pages and API routes. The entry point of the application.
- **`/src/components`**: Contains all React components, organized by feature (chat, itinerary, map, etc.). This is the "View" layer.
- **`/src/services`**: Contains all business logic and external interactions. This is the "Controller" and "Model" layer.
  - **`/ai/flows`**: The highest-level server actions that orchestrate the AI logic.
  - **`/ai/utils`**: Helper utilities for the AI, such as prompt builders and parsers.
  - **`/api`**: Wrappers for all external APIs (LocationIQ, Pexels, etc.).
- **`/lib`**: Contains reusable, non-business-specific utilities like logging, date formatting, and constants.

## 4. State Management & Data Persistence

- **UI State**: Managed locally within React components using `useState` and `useEffect`. For example, `src/app/page.tsx` manages the current view (start vs. chat).
- **Session State**: Recent searches and in-progress chats are saved to `localStorage` via `useChatStorage` hook. This is for unauthenticated users or for session recovery.
- **Persistent Storage**: For authenticated users, all completed trips are saved to **Firestore** via the `tripsService` (`src/services/trips/trips-service.ts`). This allows users to access their trip history from any device.
- **Authentication State**: Managed globally via `AuthContext` (`src/contexts/AuthContext.tsx`), which provides user data throughout the app.

This structure separates concerns, making the app easier to maintain and scale. The UI is decoupled from the business logic, and the AI flows are self