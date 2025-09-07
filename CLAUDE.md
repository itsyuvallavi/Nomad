# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Nomad Navigator - AI-powered travel planning application for digital nomads using Next.js 15, Firebase Genkit, and Google Gemini AI.

## Development Workflow

### Planning Requirements
- Always use plan mode before starting implementation work
- Write detailed plans to `.claude/tasks/TASK_NAME.md` including reasoning and task breakdown
- Research external knowledge/packages if needed (use Task tool)
- Focus on MVP approach - don't over-plan
- Get user approval before implementation

### During Implementation
- Update the plan file as you work
- Document changes with detailed descriptions for handover
- Mark tasks as completed in the plan

## Development Commands

```bash
# Development servers
npm run dev                # Next.js dev server with Turbopack (default port 9002)
npm run dev:both          # Run both Next.js and Genkit servers in parallel
npm run genkit:dev        # Firebase Genkit UI for testing AI flows
npm run genkit:watch      # Genkit with hot reload

# Code quality
npm run typecheck         # TypeScript type checking
npm run lint              # ESLint code linting

# Production
npm run build             # Production build
npm run start             # Start production server
```

## Architecture Overview

### AI Flow System
The application uses Firebase Genkit with Google Gemini for all AI processing:

**Core Files:**
- `src/ai/genkit.ts`: Genkit configuration with Gemini model setup
- `src/ai/schemas.ts`: Zod schemas for structured AI outputs
- `src/ai/flows/`: AI processing flows (server actions)
  - `analyze-initial-prompt.ts`: Analyzes user input to identify missing trip information
  - `generate-personalized-itinerary.ts`: Creates detailed day-by-day itineraries
  - `refine-itinerary-based-on-feedback.ts`: Modifies itineraries based on user feedback

**AI Flow Implementation Pattern:**
Each flow follows this structure:
1. Input/Output schemas using Zod
2. Flow definition with `ai.defineFlow()`
3. Prompt template with tool usage
4. Export as Next.js server action

**Tool Usage in AI Flows:**
The AI uses three custom tools defined in `generate-personalized-itinerary.ts`:
- `estimateFlightTime`: Calculates flight durations between cities
- `getWeatherForecast`: Fetches real weather data (requires OPENWEATHERMAP API key)
- `findRealPlaces`: Searches for real venues via Foursquare API (requires FOURSQUARE_API_KEY)

### Application State Flow
The main app (`src/app/page.tsx`) manages state transitions between views:
- **StartItinerary** → **ChatDisplay** → **ItineraryDisplay**
- State passed via props, not global state management
- Recent searches stored in localStorage

### External API Integration
Located in `src/lib/api/`:
- **Foursquare API** (`foursquare.ts`): Real venue search
- **OpenWeatherMap API** (`weather.ts`): Weather forecasts
- **API Validation** (`api-validation.ts`): Key validation utilities

### Component Structure
- `src/components/ui/`: shadcn/ui components (auto-generated, don't modify)
- `src/components/`: Feature components
  - `start-itinerary.tsx`: Initial form and recent searches
  - `chat-display.tsx`: AI conversation interface
  - `itinerary-display.tsx`: Generated itinerary view
  - `itinerary-form.tsx`: Trip details input form

## Environment Variables
Required in `.env` file:
```
GEMINI_API_KEY=           # Google AI API key (required)
FOURSQUARE_API_KEY=       # Foursquare Places API (optional, for real venues)
OPENWEATHERMAP=           # OpenWeatherMap API key (optional, for weather)
```

## Key Technical Patterns

### Date Handling
AI flows use current year by default. Date extraction logic in `generate-personalized-itinerary.ts:289-299` ensures correct date formatting.

### Error Handling
AI flows include fallback responses when APIs fail. See `generate-personalized-itinerary.ts:403-437` for error recovery pattern.

### Information Gathering Strategy
Defined in `analyze-initial-prompt.ts:49-86`:

**Essential Information (AI will ask if missing):**
- Trip duration/length (e.g., "5 days", "2 weeks")
- Travel dates (specific or flexible like "mid-January")
- Destination(s)
- Origin/departure location
- Number of travelers

**Smart Defaults (AI won't ask - applies automatically):**
- Budget: Moderate ($150-200/day per person)
- Activities: Mix of highlights, culture, food, sights
- Travel style: Balanced comfort/adventure
- Accommodation: Mid-range hotels/Airbnbs

When modifying AI functionality:
1. Update relevant flow in `src/ai/flows/`
2. Ensure schema compliance in `src/ai/schemas.ts`
3. Test using `npm run genkit:dev` to access the Genkit UI
4. Keep questions minimal - only ask for essential missing info

### File Attachments
Files converted to base64 data URIs before AI processing. See `itinerary-form.tsx` for implementation.