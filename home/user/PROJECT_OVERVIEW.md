
# Nomad Navigator - Project Overview & Architecture

## 1. High-Level Application Structure

The application is a modern Next.js 15 web app with a clear separation of concerns.

- **`/src/app`**: The entry point of the application.
  - `layout.tsx`: The global HTML shell, imports global CSS and fonts.
  - `page.tsx`: The main page component, acts as a "view controller" that decides whether to show the start screen or the chat/itinerary interface.

- **`/src/components`**: Contains all React components.
  - `/ui`: Holds the `shadcn/ui` primitive components (Button, Card, etc.). These are foundational and generally not modified.
  - `/figma`: Contains the newer, more polished presentational components that match the intended design (`ChatPanel.tsx`, `ItineraryPanel.tsx`, etc.). **This is the primary set of UI components in use.**
  - Other components (`start-itinerary.tsx`, `chat-display.tsx`): These are the main "container" or "feature" components that manage state and logic.

- **`/src/ai`**: The heart of the AI functionality.
  - `/flows`: Defines the server-side AI logic using Genkit. These are exposed as Next.js Server Actions.
    - `generate-personalized-itinerary.ts`: The main flow for creating a trip plan. **Crucially, this has been refactored to call OpenAI directly.**
    - `refine-itinerary-based-on-feedback.ts`: Handles follow-up requests to modify an existing itinerary.
  - `/utils`: Helper functions for the AI, most importantly the `destination-parser.ts` which pre-processes user input.
  - `openai-direct.ts` & `openai-chunked.ts`: These files contain the actual logic for making API calls to OpenAI, bypassing much of the Genkit framework for better control.

- **`/src/lib`**: Shared utilities and third-party API integrations.
  - `/api`: Contains wrappers for external APIs like Pexels (for images).
  - `logger.ts`: The centralized logging service.
  - `utils.ts`: General utility functions (like `cn` for Tailwind class merging).

- **`/.guide`**: Contains all the markdown documentation files explaining the codebase.

---

## 2. Execution Flow: From Prompt to Itinerary

This timeline explains which files are triggered when a user requests a new itinerary.

1.  **Initial View (`/src/app/page.tsx`)**
    - The user lands on the homepage, which renders the `Home` component from `page.tsx`.
    - This component's state (`currentView`) is initially `'start'`, so it renders the `<StartItinerary />` component (`/src/components/start-itinerary.tsx`).

2.  **User Submits Prompt (`/src/components/itinerary-form.tsx`)**
    - The user types their trip request into the `<ItineraryForm />`.
    - Upon submission, the form's `onSubmit` handler calls the `handleItineraryRequest` function, which was passed down as a prop from `page.tsx`.

3.  **View Transition (`/src/app/page.tsx`)**
    - `handleItineraryRequest` updates the state of the `Home` component:
      - `setInitialPrompt` stores the user's request.
      - `setCurrentView('chat')` triggers a re-render.
    - The `renderMainContent` function now returns the `<ChatDisplay />` component.

4.  **Orchestration Begins (`/src/components/chat-display.tsx`)**
    - `<ChatDisplay />` receives the user's prompt as a prop.
    - An `useEffect` hook fires on the initial render. It adds the user's prompt to the message list and immediately calls the `generateItinerary` function.

5.  **Server-Side AI Call (`/src/ai/flows/generate-personalized-itinerary.ts`)**
    - `generateItinerary` in `chat-display.tsx` calls the exported `generatePersonalizedItinerary` server action.
    - **This is the key handoff from client to server.**
    - The server-side function first uses the **Destination Parser** (`/src/ai/utils/destination-parser.ts`) to analyze the prompt and structure the request.
    - It then decides whether to use the **chunked generator** (`/src/ai/openai-chunked.ts`) for complex trips or the **direct generator** (`/src/ai/openai-direct.ts`) for simple ones.
    - The chosen function makes one or more API calls to the **OpenAI API**.

6.  **Response and State Update (`/src/components/chat-display.tsx`)**
    - The server action returns the complete itinerary JSON object to the `generateItinerary` function in `<ChatDisplay />`.
    - The function updates the component's state:
      - `setCurrentItinerary(itinerary)` stores the result.
      - `setMessages(...)` adds an "Itinerary is ready" message to the chat.
      - `setIsGenerating(false)` hides the loading indicators.

7.  **Displaying the Itinerary (`/src/components/figma/ItineraryPanel.tsx`)**
    - The state update in `<ChatDisplay />` causes a re-render.
    - The right-hand panel now conditionally renders the `<ItineraryPanel />` because `currentItinerary` is no longer null.
    - `<ItineraryPanel />` receives the full itinerary object as a prop and is responsible for rendering the entire visual display, including fetching images from Pexels, handling multi-destination tabs, and rendering the list of `<DayItinerary />` components.

8.  **Refinement Loop (`/src/ai/flows/refine-itinerary-based-on-feedback.ts`)**
    - If the user types a follow-up message (e.g., "add another day"), the `handleRefine` function in `chat-display.tsx` is called.
    - This function calls the `refineItineraryBasedOnFeedback` server action, sending the *current* itinerary and the new feedback.
    - The process repeats from Step 6, updating the `currentItinerary` state with the newly refined data.

---

## 3. Project History & Timeline

This project has undergone a significant architectural evolution to overcome initial challenges.

- **Phase 1: Initial Implementation (Gemini & Genkit Tools)**
  - The application was first built using Firebase Genkit with Google's Gemini AI model.
  - The AI prompt was designed to use Genkit "Tools" (`estimateFlightTime`, `getWeatherForecast`, `findRealPlaces`) to gather information.
  - **Problem:** This approach failed on complex, multi-destination prompts. The AI struggled to manage the numerous required tool calls, understand the nested logic, and often hit token or complexity limits, resulting in incomplete or incorrect itineraries. The "5-destination bug" was a prime example of this failure mode.

- **Phase 2: Pivoting to a New Architecture (OpenAI & Pre-processing)**
  - **The Fix:** A decision was made to pivot the core AI logic to a more powerful model (OpenAI's `gpt-4o-mini`) and to change the strategy from reactive tool-calling to proactive pre-processing.
  - **New Components:**
    - **Destination Parser (`/ai/utils/destination-parser.ts`):** This was the most critical addition. It processes the user's raw prompt on the server *before* it's sent to the AI, structuring the request into a clear list of destinations and durations.
    - **Chunked Generation (`/ai/openai-chunked.ts`):** To handle very long or complex trips without timing out, this system was created to generate the itinerary for each destination in a separate, smaller API call.
    - **Direct OpenAI Integration:** The code was refactored to call the `openai` npm package directly, giving the application more control over the request and response format.
  - **Result:** This new architecture successfully solved the multi-destination bug and is significantly more robust and reliable.

- **Phase 3: Cleanup and Documentation (Current State)**
  - After validating the new architecture, the focus has shifted to improving the codebase.
  - **Logging:** A centralized logger (`/lib/logger.ts`) was added for better debugging.
  - **UI Polish:** The UI components were refined (`/components/figma/*`), and real images were integrated using the Pexels API.
  - **Documentation:** The `.guide` directory was created to document the entire codebase, making it easier to understand and maintain going forward.
