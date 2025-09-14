# Nomad Navigator: UI Architecture Blueprint

This document explains the structure of the user interface, detailing the main pages, components, and how they interact to create the user experience.

## 1. Main Page (`src/app/page.tsx`)

This is the primary entry point and acts as a **view controller**. It manages which main UI state is visible to the user.

- **Views it controls**:
  1.  **Start View**: The initial landing page where users can start a new trip. This view renders the `TripSearchForm` component.
  2.  **Chat View**: The main application interface shown after a user starts planning a trip. This view renders the `ChatDisplay` component.

- **State Management**:
  - It uses React's `useState` to manage the `currentView` (`'start'` or `'chat'`).
  - It passes down the initial user prompt and any saved chat history to the `ChatDisplay` component.
  - It handles navigation logic, such as returning from the chat view back to the start view.

## 2. Core UI Components

### `ChatDisplay` (`/src/components/chat/chat-container.tsx`)

This is the main workspace of the application. It orchestrates all the major UI panels and manages the core application logic after a trip is initiated.

- **Layout**: It implements the three-column layout for desktop and the tabbed view for mobile.
- **Responsibilities**:
  1.  **Initial Generation**: When it mounts, it triggers the initial API call to `/api/ai/generate-itinerary` using the prompt it received from `page.tsx`.
  2.  **State Management**: It holds the central state for the current trip, including all chat messages and the `currentItinerary` data object. It uses the `useChatState` hook for this.
  3.  **Communication**: It's the central hub. It receives user input from the `ChatPanel` and sends new requests to the AI service. When it receives an updated itinerary, it passes the new data down to the `ItineraryPanel` and `MapPanel`.
  4.  **Component Rendering**: It decides which panels to show based on the device (desktop vs. mobile) and the availability of itinerary data.

### `ItineraryPanel` (`/src/components/itinerary/itinerary-view.tsx`)

This component is responsible for displaying the entire travel plan.

- **Key Child Components**:
  - **`DayTimelineV2`**: An interactive horizontal timeline that allows the user to select which day to view. It's the primary navigation within the itinerary.
  - **`DayItinerary` (`day-schedule.tsx`)**: Renders the schedule for a single selected day.
  - **`ActivityCard`**: Displays the details for a single activity (time, description, address, etc.).
  - **`ExportMenu`**: A dropdown menu component that handles exporting the itinerary to PDF or copying it to the clipboard.
  - **`ItineraryMap`**: When the map is toggled inside this panel, this component is rendered to show the route.

### `ChatPanel` (`/src/components/chat/chat-interface.tsx`)

This is the conversational part of the UI.

- **Responsibilities**:
  - **`MessageList`**: Renders the back-and-forth conversation between the user and the AI assistant.
  - **`ChatInput`**: Provides the text area for the user to type new messages or feedback.
  - **Interaction**: When the user sends a message, it passes the input up to the `ChatDisplay` component to be processed.

### `MapPanel` (`/src/components/map/map-panel.tsx`)

This component visualizes the itinerary on a map.

- **Key Child Components**:
  - **`LocationIQMap`**: The core map rendering component that uses `maplibre-gl` and tiles from LocationIQ.
  - **`ActivityMarker`**: A custom marker placed on the map for each activity that has coordinates.
  - **`RouteLayer`**: A component that draws the travel path between activities for a selected day.
- **Functionality**:
  - It receives the enriched `itinerary` object from `ChatDisplay`.
  - It extracts the coordinates from each activity and plots them on the map.
  - It can display the route for a single day or all activities at once.

## 3. Component Hierarchy

Here is a simplified tree representing how the main components are nested:

```
src/app/page.tsx
└── Header
└── (if 'start' view)
    └── TripSearchForm
└── (if 'chat' view)
    └── ChatDisplay (`chat-container.tsx`)
        ├── ChatPanel (`chat-interface.tsx`)
        │   ├── MessageList
        │   └── ChatInput
        ├── ItineraryPanel (`itinerary-view.tsx`)
        │   ├── DayTimelineV2
        │   └── DayItinerary
        │       └── ActivityCard
        └── MapPanel (`map-panel.tsx`)
            └── LocationIQMap
                ├── ActivityMarker
                └── RouteLayer
```

## 4. UI State and Data Flow

1.  **Initial State**: `page.tsx` is in `'start'` view.
2.  **User Action**: User submits prompt via `TripSearchForm`.
3.  **State Change**: `page.tsx` calls `handleItineraryRequest`, updates its state to `'chat'`, and passes the user's prompt to `ChatDisplay`.
4.  **Data Fetching**: `ChatDisplay` mounts and triggers an API call to generate the itinerary. While loading, it shows a skeleton UI.
5.  **Data Propagation**: Once the itinerary is fetched, `ChatDisplay` updates its `currentItinerary` state.
6.  **Re-rendering**: React re-renders the child components. `ItineraryPanel` and `MapPanel` receive the new `itinerary` data as props and display the plan and map markers.
7.  **User Interaction**: User types a refinement message in `ChatInput`. The message is passed up to `ChatDisplay`, which triggers a new API call to refine the itinerary. The flow repeats from Step 4.
