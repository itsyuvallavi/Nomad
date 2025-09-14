# Project File Manifest

This document provides a comprehensive list and description of every file and directory in the Nomad Navigator project as of 2025-09-14. Its purpose is to serve as a complete map of the codebase for developers.

---

## 📂 Root Directory

- **`.env` / `.env.local`**: Environment variables. `.env.local` is for local development and contains sensitive keys (like API keys) that should not be committed to version control. **(Essential)**
- **`CLAUDE.md`**: Instructions and guidelines for the AI assistant (Claude) working on this project. Specifies architectural rules, development workflow, and testing priorities. **(Essential for AI Development)**
- **`next.config.ts`**: Configuration file for Next.js. Controls build settings, image optimization, headers, webpack customizations, and performance features. **(Essential)**
- **`package.json`**: Defines project dependencies, scripts (like `dev`, `build`, `test`), and metadata. The heart of the Node.js project. **(Essential)**
- **`package-lock.json`**: Locks the versions of all dependencies to ensure consistent installations across different environments. **(Essential)**
- **`README.md`**: The main project documentation, providing a high-level overview of the application. **(Essential)**
- **`tailwind.config.ts`**: Configuration for the Tailwind CSS framework. Defines the design system (colors, fonts, spacing) and content paths for style generation. **(Essential for UI)**
- **`tsconfig.json`**: TypeScript compiler configuration. Defines how TypeScript code is checked and compiled. **(Essential for TypeScript)**

---

## 📂 `config/`

Contains all project configuration files, keeping the root directory clean.

### `config/build/`
- **`next.config.ts`**: Main Next.js configuration file. (Note: This is often symlinked from the root). **(Essential)**
- **`tailwind.config.ts`**: Tailwind CSS configuration. (Note: This is often symlinked from the root). **(Essential for UI)**
- **`tsconfig.json`**: TypeScript configuration. (Note: This is often symlinked from the root). **(Essential for TypeScript)**

### `config/dev/`
- **`.eslintrc.json`**: Configuration for ESLint, the code linter that enforces code quality and style rules. **(Recommended)**
- **`.mcp.json`**: Configuration for the Model-centric Protocol (MCP), used by the AI assistant for tool integration. **(Essential for AI Development)**
- **`components.json`**: Configuration for `shadcn/ui`, defining paths and settings for UI components. **(Essential for UI)**

### `config/firebase/`
- **`firebase.json`**: Configures Firebase deployment settings, including Hosting and Firestore rules paths. **(Essential for Deployment)**
- **`firestore.indexes.json`**: Defines composite indexes for complex Firestore queries to optimize database performance. **(Essential for Database)**

---

## 📂 `data/`

Stores static and mock data used by the application.

### `data/mock/`
- **`mock-venues.json`**: A JSON file containing mock data for venues in various cities. Used for testing and as a fallback when live APIs are unavailable. **(Useful for Testing)**

### `data/static/`
- **`static-activities.json`**: Pre-defined, static activity data for major cities. Used as a fallback to ensure itineraries can be generated even if live APIs fail. **(Useful for Fallbacks)**

---

## 📂 `docs/`

Contains all project documentation.

### `docs/architecture/`
- **`ID_SYSTEM_STRUCTURE.md`**: Explains the design and implementation of the unique Trip ID system for user data isolation. **(Important Documentation)**
- **`blueprint.md`**: High-level architectural blueprint for the Nomad Navigator app. **(Important Documentation)**
- **`project-structure.md`**: Describes the project's directory and file organization. **(Important Documentation)**
- **`webpack-module-not-found-errors.md`**: A troubleshooting guide explaining how to solve common webpack "Module not found" errors in Next.js. **(Useful Documentation)**

### `docs/` (root)
- **`FIREBASE_SETUP.md`**: Step-by-step instructions for configuring Firebase Authentication and Firestore in the Firebase Console. **(Essential for Auth)**
- **`database-schema.md`**: Details the Firestore database schema, including collections, document structures, and indexes. **(Important Documentation)**
- **`locationiq-implementation-summary.md`**: Summary of the migration from various location APIs to LocationIQ. **(Archival Documentation)**
- **`map-migration-summary.md`**: Summary of the migration from Radar Maps to LocationIQ Maps. **(Archival Documentation)**

---

## 📂 `.claude/`

Directory for AI assistant (Claude) guidance, tasks, and historical context.

### `.claude/archive/`
- Contains markdown files of completed tasks and old plans. Provides historical context for development decisions. **(Archival)**

### `.claude/docs/`
- Similar to the root `docs/` directory, contains AI-specific documentation. These should eventually be merged into the main `docs/` directory. **(Should be organized)**

### `.claude/tasks/`
- Contains active development tasks organized by category (AI, UI, etc.). This is the AI's "to-do list". **(Essential for AI Development)**

- **`settings.local.json`**: Local settings for the Claude AI, controlling permissions and enabled tools. **(Essential for AI Development)**

---

## 📂 `logs/`

Directory for application and AI request logs.

### `logs/ai-requests/`
- **`recent.json`**: A rolling log of the last 100 AI requests and responses for quick debugging. **(Useful for Debugging)**
- **(other files)**: Daily log files in `.jsonl` format, storing every AI request and response for deeper analysis. **(Useful for Analysis)**

---

## 📂 `scripts/`

Contains utility scripts for development and maintenance.

- **`rename-logs.ts`**: A script to rename log files to a more descriptive and standardized format. **(Utility Script)**
- **`view-ai-logs.ts`**: A command-line tool to view and analyze AI request logs from the `logs/` directory. **(Useful for Debugging)**
- **`view-production-logs.ts`**: A tool for analyzing production logs related to user interactions and system metrics. **(Useful for Monitoring)**

---

## 📂 `src/`

The main application source code.

### `src/app/`

The heart of the Next.js application, using the App Router.

- **`layout.tsx`**: The root layout for the entire application. Wraps all pages and includes global providers like `AuthProvider` and `MotionProvider`. **(Essential)**
- **`page.tsx`**: The home page of the application. Manages the main view state (start vs. chat) and handles the initial itinerary request. **(Essential)**
- **`globals.css`**: Global CSS styles and Tailwind CSS base layers. Includes the application's color theme (CSS variables). **(Essential for UI)**
- **`error.tsx`**: A client-side component that acts as an error boundary for the application, catching and displaying errors gracefully. **(Essential for Error Handling)**

#### `src/app/api/`
- Contains API route handlers for server-side logic.
- **`ai/generate-itinerary/route.ts`**: API endpoint to handle itinerary generation requests. **(Essential for AI)**
- **`feedback/route.ts`**: API endpoint for collecting user feedback on generated itineraries. **(Feature-specific)**

#### `src/app/(auth)/` (future structure)
- Would contain authentication-related pages like login, signup, and password reset.

#### `src/app/(main)/` (future structure)
- Would contain main application pages that require authentication, such as profile, settings, and trip history.

- **`favorites/page.tsx`**: A placeholder page for users to view their saved favorite items. Currently uses mock data. **(Feature-specific, Incomplete)**
- **`profile/page.tsx`**: User profile management page. Allows users to update their display name and travel preferences. **(Feature-specific)**
- **`settings/page.tsx`**: Account settings page. Allows users to manage notifications, privacy, and delete their account. **(Feature-specific)**
- **`trips/page.tsx`**: Trip history page. Displays a list of all trips the user has generated and saved. **(Feature-specific)**
- **`test-google-auth/page.tsx`**: A development page for testing Google Authentication functionality. **(Development/Testing Only)**

### `src/components/`

Contains all React components.

- **`ErrorBoundary.tsx`**: A class-based component to catch JavaScript errors anywhere in its child component tree. **(Essential for Error Handling)**
- **`PasswordGate.tsx`**: A component that password-protects the entire site. Used for private beta or staging environments. **(Situational)**

#### `src/components/auth/`
- **`AuthModal.tsx`**: A dialog that handles both login and signup flows. **(Essential for Auth)**
- **`AuthSuccess.tsx`**: A component to show a success message after authentication. **(UI Component)**
- **`ForgotPasswordForm.tsx`**: The form for handling password reset requests. **(Essential for Auth)**
- **`LoginForm.tsx`**: The user login form component. **(Essential for Auth)**
- **`ProtectedRoute.tsx`**: A component wrapper that restricts access to a page or component to authenticated users only. **(Essential for Auth)**
- **`SignupForm.tsx`**: The user registration form component. **(Essential for Auth)**
- **`UserMenu.tsx`**: The dropdown menu for authenticated users, showing profile links and a logout button. **(Essential for Auth)**

#### `src/components/chat/`
- **`ai-thinking.tsx`**: A simple loading indicator shown while the AI is processing. **(Could be merged/simplified)**
- **`chat-container-v2.tsx`**: A previous version of the chat container. **(Redundant, should be removed)**
- **`chat-container.tsx`**: The main component orchestrating the chat interface, itinerary display, and map. **(Essential)**
- **`chat-input.tsx`**: The textarea and send button for user input. **(Redundant, likely replaced)**
- **`chat-interface.tsx`**: The main chat panel component, handling message display and input. **(Essential)**
- **`context-display.tsx`**: A debug component to visualize the conversation state. **(Development/Testing Only)**
- **`generation-progress.tsx`**: A UI component to show the multi-stage progress of itinerary generation. **(UI Component)**
- **`hooks/`**: Custom React hooks related to the chat feature.
  - **`use-chat-state.ts`**: Manages the state of the chat (messages, loading states, itinerary data). **(Essential Logic)**
  - **`use-chat-storage.ts`**: Handles saving and loading chat sessions to local storage. **(Essential Logic)**
- **`message-list.tsx`**: Renders the list of user and assistant messages. **(Redundant, likely replaced)**
- **`modern-loading-panel.tsx`**: A sophisticated loading animation panel shown during itinerary generation. **(UI Component)**
- **`premium-chat-input.tsx`**: An enhanced chat input component with advanced features. **(Potentially Redundant/Future)**
- **`premium-message-bubble.tsx`**: An enhanced message bubble component. **(Potentially Redundant/Future)**
extra
- **`services/ai-service.ts`**: A service layer that abstracts the calls to the AI generation flows. **(Essential Logic)**
- **`simple-chat-container.tsx`**: A simplified version of the chat interface. **(Redundant, should be removed)**

#### `src/components/forms/`
- **`trip-details-form.tsx`**: The main form on the home page where users enter their initial travel prompt. **(Redundant, likely replaced by `trip-search-form.tsx`)**
- **`trip-search-form.tsx`**: The primary search form on the landing page. **(Essential)**

#### `src/components/itinerary/`
- Contains components for displaying the generated travel itinerary.
- **`activity-card.tsx`**: Renders a single activity within a day's schedule. **(Essential for UI)**
- **`coworking-spots.tsx`**: A specific component to highlight co-working spaces in an itinerary. **(Feature-specific)**
- **`day-schedule.tsx`**: Renders the list of activities for a single day. **(Essential for UI)**
- **`day-timeline-v2.tsx`**: The interactive horizontal timeline for selecting a day. **(Essential for UI)**
- **`export-menu.tsx`**: A dropdown menu with options to export the itinerary (PDF, Calendar, etc.). **(Essential for UI)**
- **`itinerary-view.tsx`**: The main panel that displays the entire day-by-day itinerary. **(Essential for UI)**
- **`loading-skeleton.tsx`**: Skeleton loaders for the itinerary panel. **(UI Component)**
- **`travel-details.tsx`**: A component to display flight and hotel details. **(Feature-specific)**
- **`trip-tips.tsx`**: A component to display the "Quick Tips" section of the itinerary. **(UI Component)**

#### `src/components/layout/`
- **`scrollable-page.tsx`**: A wrapper to ensure pages are properly scrollable, especially on mobile. **(Essential for Layout)**

#### `src/components/map/`
- Contains all map-related components.
- **`activity-marker.tsx`**: A custom map marker for a single activity. **(Essential for Map)**
- **`itinerary-map.tsx`**: The main map component that displays the itinerary route and markers. **(Essential for Map)**
- **`locationiq-map.tsx`**: The core map implementation using LocationIQ and MapLibre GL. Replaces `radar-map.tsx`. **(Essential for Map)**
- **`map-panel.tsx`**: The wrapper panel for the map display. **(Essential for Map)**
- **`mobile-map-modal.tsx`**: A full-screen modal for displaying the map on mobile devices. **(Essential for Mobile UI)**
- **`radar-map.tsx`**: Old map implementation using Radar. **(Obsolete, can be removed)**
- **`route-layer.tsx`**: A Leaflet component to draw the route line on the map. **(Essential for Map)**
- **`utils/geocoding.ts`**: Utility functions for geocoding addresses to coordinates using Nominatim. **(Could be consolidated)**

#### `src/components/navigation/`
- **`Header.tsx`**: The main application header component. **(Essential for UI)**
- **`mobile-bottom-nav.tsx`**: The bottom navigation bar for mobile devices. **(Essential for Mobile UI)**

#### `src/components/providers/`
- **`motion-provider.tsx`**: A context provider for the `framer-motion` animation library. **(Essential for UI Animations)**
- **`offline-provider.tsx`**: A context provider that manages service worker and offline capabilities. **(Feature-specific)**

#### `src/components/suspense/`
- **`SuspenseBoundary.tsx`**: A reusable wrapper for React Suspense with default fallbacks. **(Utility Component)**

#### `src/components/ui/`
- Core, reusable UI components, mostly from `shadcn/ui`.
- **`alert-dialog.tsx`**, **`alert.tsx`**, **`animated-logo.tsx`**, **`avatar.tsx`**, **`badge.tsx`**, **`button.tsx`**, **`card.tsx`**, **`checkbox.tsx`**, **`dialog.tsx`**, **`dropdown-menu.tsx`**, **`empty-state.tsx`**, **`error-dialog.tsx`**, **`form.tsx`**, **`input.tsx`**, **`label.tsx`**, **`lazy-image.tsx`**, **`optimized-imports.ts`**, **`popular-destinations-carousel.tsx`**, **`premium-button.tsx`**, **`premium-card.tsx`**, **`progress.tsx`**, **`pull-to-refresh.tsx`**, **`select.tsx`**, **`separator.tsx`**, **`skeleton-loader.tsx`**, **`switch.tsx`**, **`tabs.tsx`**, **`textarea.tsx`**, **`tooltip.tsx`**, **`trip-inspiration-categories.tsx`**, **`virtual-activity-list.tsx`**. **(All are Essential UI Building Blocks)**

### `src/contexts/`
- **`AuthContext.tsx`**: Provides global authentication state and methods (login, logout, etc.) to the entire application. **(Essential for Auth)**

### `src/hooks/`
- Contains globally reusable React hooks.
- **`use-enhanced-chat.ts`**: A hook managing the state and logic for the enhanced dialog system. **(Potentially Future)**
- **`use-keyboard-shortcuts.ts`**: A hook for adding keyboard shortcuts. **(Utility Hook)**
- **`use-motion-config.ts`**: A hook for managing animation preferences (respecting `prefers-reduced-motion`). **(Utility Hook)**
- **`use-premium-gestures.ts`**: A hook for advanced mobile gestures like long-press and pinch-to-zoom. **(Potentially Future)**
- **`use-pull-to-refresh.ts`**: A hook that implements pull-to-refresh functionality. **(Feature-specific, Mobile)**
- **`use-service-worker.ts`**: A hook for interacting with the service worker for PWA features. **(Feature-specific, Offline)**
- **`use-swipe-gestures.ts`**: A basic hook for detecting swipe gestures on mobile. **(Utility Hook)**

### `src/lib/`
- Contains libraries and utility functions that are not specific to a single feature.

#### `src/lib/api/`
- Contains wrappers for external APIs. **(Should be in `src/services/api/`)**
- **`amadeus.ts`**, **`foursquare.ts`**, **`google-places-optimized.ts`**, **`google-places.ts`**, **`pexels.ts`**, **`places-unified.ts`**, **`radar-places.ts`**, **`radar.ts`**, **`static-places.ts`**, **`weather.ts`**. **(These are redundant or misplaced)**

#### `src/lib/constants/`
- **`api-config.ts`**: Configuration flags for API usage (e.g., using static vs. live data). **(Essential Config)**
- **`city-landmarks.ts`**: A database of iconic landmarks for generating better image search queries. **(Utility Data)**
- **`city-zones.ts`**: Defines logical zones for major cities to aid in route optimization. **(Essential for AI Logic)**

#### `src/lib/monitoring/`
- **`ai-logger.ts`**: A service for logging all AI requests and responses to files for debugging and analysis. **(Essential for AI Dev)**
- **`error-handler.ts`**: A utility for categorizing and handling application errors gracefully. **(Essential for Error Handling)**
- **`logger.ts`**: A centralized logging service for the entire application. **(Essential for Debugging)**
- **`performance-monitor.ts`**: A utility to track and report web performance metrics (FCP, LCP, etc.). **(Useful for Optimization)**
- **`production-logger.ts`**: A logging service specifically for production environments, integrating with analytics. **(Essential for Production)**

#### `src/lib/utils/`
- Contains general utility functions.
- **`ai-logger.ts`**: Re-export file. **(Redundant)**
- **`circuit.ts`**: Implements the circuit breaker pattern for resilient API calls. **(Essential for Resilience)**
- **`clear-all-trips.ts`**: A utility script to clear all user trip data from Firebase and localStorage. **(Debug/Test Utility)**
- **`date-parser.ts`**: Utilities for parsing natural language dates. **(Utility Function)**
- **`input-validator.ts`**: Utilities for sanitizing and validating user input. **(Utility Function)**
- **`master-parser.ts`**: The main parser that orchestrates all text processing tools. **(Core Logic, needs refactoring)**
- **`retry.ts`**: A utility for retrying failed async functions with exponential backoff. **(Essential for Resilience)**

- **`utils.ts`**: The main utility file from `shadcn/ui`, used for merging Tailwind CSS classes. **(Essential for UI)**

### `src/services/`
This directory should contain all business logic and interactions with external services.

#### `src/services/ai/`
- Contains all core AI logic.
- **`config.ts`**: Main AI configuration file. **(Essential for AI)**
- **`openai-config.ts`**: Specific configuration for the OpenAI client. **(Essential for AI)**
- **`schemas.ts`**: Zod schemas defining the structure of AI inputs and outputs. **(Essential for AI)**

- **`flows/`**: Contains the main AI server actions (Genkit flows).
  - **`analyze-initial-prompt.ts`**: A flow to analyze the user's initial prompt for required information. **(Core AI Logic)**
  - **`chat-conversation.ts`**: The main orchestrator for the enhanced dialog system. **(Future Logic)**
  - **`generate-dialog-response.ts`**: A flow to generate contextual conversational responses. **(Future Logic)**
  - **`generate-personalized-itinerary.ts`**: The primary flow that generates the complete travel itinerary. **(Essential AI Logic)**
  - **`handle-modification.ts`**: A flow to process user requests to modify an existing itinerary. **(Future Logic)**
  - **`refine-itinerary-based-on-feedback.ts`**: A flow to refine an itinerary based on user feedback. **(Core AI Logic)**

- **`services/`**: AI-related services.
  - **`conversation-state.ts`**: Manages the state of a conversation for the dialog system. **(Future Logic)**
  - **`location-enrichment-locationiq.ts`**: Service to enrich generated itineraries with real-world data from LocationIQ. **(Essential for AI)**
  - **`location-enrichment.ts`**: Old location enrichment service. **(Obsolete)**

- **`utils/`**: AI-specific utility functions.
  - **`ai-destination-parser.ts`**: Uses AI to parse destinations from a prompt. **(Core AI Logic)**
  - **`ai-parser.ts`**: An advanced AI-powered parser module for the dialog system. **(Future Logic)**
  - **`destination-parser.ts`**: A regex-based parser for destinations. **(Core Logic, but could be merged/replaced)**
  - **`enhanced-destination-parser.ts`**: An improved parser using text processing tools. **(Core Logic, needs consolidation)**
  - **`enhanced-generator-ultra-fast.ts`**: An optimized itinerary generator that runs API calls in parallel. **(Core AI Logic)**
  - **`enhanced-generator.ts`**: An older version of the enhanced generator. **(Potentially Redundant)**
  - **`hybrid-parser.ts`**: A parser that combines regex and AI for best results. **(Future Logic)**
  - **`input-classifier.ts`**: A utility to classify the user's intent (e.g., question, modification). **(Future Logic)**
  - **`intelligent-trip-extractor.ts`**: Uses AI to extract structured data from a prompt. **(Core AI Logic)**
  - **`openai-travel-costs.ts`**: Uses OpenAI to estimate travel costs. **(Feature-specific)**
  - **`openai-travel-prompts.ts`**: A centralized file for storing and building complex prompts for OpenAI. **(Essential for AI)**
  - **`providers/openai.ts` & `providers/types.ts`**: An abstraction layer for the OpenAI LLM provider. **(Core AI Logic)**
  - **`route-optimizer.ts`**: A utility to optimize the order of activities to minimize travel time. **(Essential for AI)**
  - **`safeChat.ts`**: A wrapper for making type-safe, schema-validated calls to the LLM. **(Core AI Logic)**
  - **`unified-generator.ts`**: A class to unify different itinerary generation strategies. **(Core AI Logic)**
  - **`venue-knowledge-base.ts`**: A static database of famous venues to improve AI generation quality. **(Utility Data for AI)**
  - **`zone-based-planner.ts`**: A utility for planning itineraries based on city zones. **(Essential for AI)**

#### `src/services/api/`
- Contains all wrappers for external APIs.
- **`amadeus.ts`**, **`foursquare.ts`**, **`google-places-optimized.ts`**, **`google-places.ts`**, **`locationiq-enhanced.ts`**, **`locationiq.ts`**, **`pexels.ts`**, **`places-unified-locationiq.ts`**, **`places-unified.ts`**, **`radar-places.ts`**, **`radar.ts`**, **`static-places.ts`**, **`weather.ts`**. **(All are Essential API Integrations, though some are legacy/redundant and can be cleaned up)**

#### `src/services/firebase/`
- **`analytics.ts`**: Wrapper for Firebase Analytics. **(Essential for Production)**
- **`auth.ts`**: Main Firebase initialization and auth service configuration. **(Essential for Auth)**

#### `src/services/storage/`
- **`offline-storage.ts`**: Manages offline data storage using IndexedDB. **(Feature-specific, Offline)**

#### `src/services/trips/`
- **`draft-manager.ts`**: Handles auto-saving and recovery of in-progress itineraries. **(Essential for UX)**
- **`trips-service.ts`**: A service for managing trip data in Firestore (create, read, update, delete). **(Essential for Data Persistence)**

---

## 📂 `tests/`
- **`ai/`**: Contains test scripts for AI-related functionality (`test-address-safety.js`, `test-route-optimization.js`, `test-ui-components.js`, `test-venue-generation.js`, `ai-testing-monitor.ts`). **(Essential for AI Quality)**
- **`test-simple-itinerary.ts`**: A simple script to run a single itinerary generation test. **(Useful for Quick Tests)**
