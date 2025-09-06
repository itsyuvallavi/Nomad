# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Nomad Navigator - AI-powered travel planning application for digital nomads using Next.js 15, Firebase Genkit, and Google Gemini AI.

## Plan & Review

### Before starting work
•⁠  ⁠Always in plan mode to make a plan
•⁠  ⁠After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
•⁠  ⁠The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
•⁠  ⁠If the task require external knowledge or certain package, also research to get latest knowledge (Use Task tool for research)
•⁠  ⁠Don't over plan it, always think MVP.
•⁠  ⁠Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing
•⁠  ⁠You should update the plan as you work.
•⁠  ⁠After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers.
•⁠  ⁠After you complete the task, you should update the plan to mark the task as completed.

## Development Commands

### Essential Commands
```bash
# Development server (port 9002 with Turbopack)
npm run dev

# AI development server (Firebase Genkit)
npm run genkit:dev

# AI development with watch mode
npm run genkit:watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build
```

## Architecture Overview

### AI Flow System
The application uses Firebase Genkit with Google Gemini for AI processing. All AI logic resides in `src/ai/`:
- **Flows** (`src/ai/flows/`): Modular AI processing functions that handle different aspects of itinerary generation
- **Schemas** (`src/ai/schemas.ts`): Zod schemas defining structured outputs for AI responses
- **Configuration** (`src/ai/genkit.ts`): Genkit and Gemini model setup

When modifying AI functionality:
1. Update relevant flow in `src/ai/flows/`
2. Ensure schema compliance in `src/ai/schemas.ts`
3. Test using `npm run genkit:dev` to access the Genkit UI

### Application State Flow
The main application (`src/app/page.tsx`) manages three primary views:
1. **StartItinerary**: Initial form input
2. **ChatDisplay**: Interactive AI conversation
3. **ItineraryDisplay**: Generated itinerary results

State transitions are handled through `currentView` state variable with data passed between components via props.

### Component Architecture
- **UI Components** (`src/components/ui/`): shadcn/ui components - DO NOT modify these directly
- **Feature Components** (`src/components/`): Application-specific components
- **Styling**: Tailwind CSS with custom animations defined in `globals.css`

### Key Technical Considerations
- **Server Actions**: AI flows are exposed as Next.js server actions (see exports in flow files)
- **Type Safety**: All AI responses are validated through Zod schemas
- **LocalStorage**: Recent searches stored client-side (no backend persistence)
- **File Handling**: File attachments converted to base64 data URIs before AI processing

## Environment Setup
Required environment variable:
- `GEMINI_API_KEY`: Google AI API key for Gemini model access

## Testing Approach
Currently no automated tests. Manual testing via:
1. Development server for UI testing
2. Genkit UI for AI flow testing
3. TypeScript compilation for type safety verification