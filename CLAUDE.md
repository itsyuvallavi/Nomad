# CLAUDE.md

This file provides guidance to Claude Code when working with the Nomad Navigator codebase.

## ⚠️ CRITICAL: Firebase IDE Environment
**NEVER run `npm run dev` in Firebase IDE!** 
- Firebase automatically runs the app on its own ports
- Running `npm run dev` will cause port conflicts and issues
- The app is already accessible through Firebase's preview URLs
- Only use `npm run build` for production builds
- For testing: Use Firebase's preview, not local dev server

## Project Overview
Nomad Navigator - AI-powered travel planning application for digital nomads using Next.js 15, OpenAI APIs, and modern web technologies.

## Current Firebase Project
**Project ID**: nomad-navigatordup-70195-f4cf9
**Auth Domain**: nomad-navigatordup-70195-f4cf9.firebaseapp.com
**Project Number**: 476100182115

## Current Technology Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-4, custom prompt engineering
- **APIs**: Amadeus (flights/hotels), Google Places/Maps, Weather, Foursquare
- **Deployment**: Firebase Hosting
- **Development**: MCP integration (filesystem, puppeteer)

## Development Workflow

### Before Starting Any Task
1. **Plan First**: Always create a plan in `.claude/tasks/[component]/task-name.md`
2. **Test Baseline**: Run `npm run test:ai --baseline` before making AI changes
3. **Get Approval**: Ask for plan review before implementation
4. **Think MVP**: Focus on minimal viable solutions

### File Organization - CRITICAL

#### Project Structure (As of Jan 17, 2025 - UPDATED)
```
nomad-navigator/
├── config/                      # Configuration files (if present)
├── data/                        # Static/mock data
│   ├── static/                  # Static data files
│   └── mock/                    # Mock data for testing
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   ├── favorites/           # Favorites page
│   │   ├── profile/             # Profile page
│   │   ├── settings/            # Settings page
│   │   ├── trips/               # Trips page
│   │   └── page.tsx             # Main page
│   ├── pages/                   # Page components (NEW)
│   │   ├── home/                # Home page
│   │   │   ├── components/      # Home-specific components
│   │   │   └── HomePage.tsx     # Main home page component
│   │   └── itinerary/           # Itinerary page
│   │       ├── components/      # Itinerary-specific components
│   │       │   ├── chat/        # Chat components
│   │       │   ├── itinerary/   # Itinerary display components
│   │       │   └── map/         # Map components
│   │       └── ItineraryPage.tsx
│   ├── infrastructure/          # Infrastructure layer (NEW)
│   │   ├── components/          # Infrastructure components
│   │   ├── contexts/            # Auth and other contexts
│   │   └── providers/           # App providers (motion, offline)
│   ├── components/              # Shared React components
│   │   ├── common/              # Common/shared components
│   │   ├── navigation/          # Navigation components
│   │   └── ui/                  # UI components (shadcn/ui)
│   ├── services/                # Business logic
│   │   ├── ai/                  # AI flows and utilities
│   │   ├── api/                 # External API integrations
│   │   ├── firebase/            # Firebase services
│   │   ├── trips/               # Trip-related services
│   │   └── storage/             # Storage services
│   ├── lib/                     # Utilities and helpers
│   │   ├── helpers/             # Helper functions (includes general.ts with cn)
│   │   ├── utils/               # Utility functions (animations, retry)
│   │   ├── constants/           # App constants
│   │   └── monitoring/          # Logging, errors, performance
│   └── hooks/                   # Custom React hooks
├── public/                      # Static assets
├── docs/                        # Documentation
└── scripts/                     # Build/utility scripts
```

#### File Placement Rules
**IMPORTANT: Case-sensitive file names - many components use PascalCase:**
- **Page Components**: `src/pages/[page]/` - Full page implementations
- **Infrastructure**: `src/infrastructure/` - Auth, providers, contexts
- **Services/Business Logic**: `src/services/[category]/`
- **External APIs**: `src/services/api/`
- **AI Code**: `src/services/ai/`
- **Firebase Code**: `src/services/firebase/`
- **Utilities**:
  - `src/lib/helpers/general.ts` - Contains cn() utility function
  - `src/lib/utils/` - animations.ts, retry.ts
- **Constants**: `src/lib/constants/`
- **Monitoring**: `src/lib/monitoring/`
- **UI Components**: `src/components/ui/` - shadcn/ui components
- **Mock Data**: `data/mock/`

**Root Directory Files (only these):**
- `.env`, `.env.local` - Environment variables
- `package.json`, `package-lock.json` - NPM files
- `README.md`, `CLAUDE.md` - Documentation
- `next-env.d.ts` - Next.js types
- Symbolic links to config files

**NEVER create in root:**
- Test files or results
- Temporary documentation
- Config files (use config/ directory)
- Data files (use data/ directory)

**Examples of incorrect placement:**
- ❌ `/FIREBASE_AUTH_SETUP.md` → ✅ `.claude/docs/firebase-auth-setup.md`
- ❌ `/optimization-plan.md` → ✅ `.claude/tasks/performance/optimization-plan.md`
- ❌ `/todo-list.md` → ✅ `.claude/tasks/current-todos.md`

### During Implementation
1. **Update Plans**: Document progress and changes
2. **Test Frequently**: Run baseline tests after AI modifications
3. **Use MCPs**: Leverage file system MCP for efficient file access
4. **Document Changes**: Explain modifications for future handoffs

## AI Testing - CRITICAL

### Golden Rule: "3 days in London" Must Always Work
This simple test is our canary. If it fails, stop and fix before proceeding.

```bash
# Before any AI changes
npm run test:ai --baseline

# After AI changes
npm run test:ai --baseline

# Full test suite
npm run test:ai
```

### Test Priority Levels
1. **Must Pass**: Simple requests (London weekend, Paris 3-day)
2. **Should Pass**: Medium complexity (multi-city, week-long trips)
3. **Can Occasionally Fail**: Complex requests (multi-week, heavy constraints)

### Red Flags - Stop Immediately
- Baseline test failing after previously passing
- Response times > 15 seconds for simple requests
- Missing required fields in AI responses
- Inconsistent destination/day counts

## Development Commands

```bash
# Core Development
npm run dev                 # Next.js dev server (port 9002)
npm run genkit:dev         # AI flow debugging UI
npm run typecheck          # TypeScript validation

# AI Testing
npm run test:ai --baseline # Critical baseline test
npm run test:ai            # Full test suite

# Quality Assurance
npm run lint               # Code linting
npm run build              # Production build test
```

## Architecture Quick Reference

### Key Directories (Updated Jan 17, 2025)
```
src/
├── app/                   # Next.js App Router & API routes
│   └── api/ai/           # AI API endpoints
├── pages/                 # Page components & logic
│   ├── home/             # Home page & components
│   └── itinerary/        # Itinerary page & components
│       └── components/
│           ├── chat/     # Chat interface
│           ├── itinerary/# Trip display (Day-schedule.tsx, etc.)
│           └── map/      # Map components (ItineraryMap.tsx, etc.)
├── infrastructure/        # Core infrastructure
│   ├── components/       # ErrorBoundary, PasswordGate
│   ├── contexts/         # AuthContext
│   └── providers/        # App providers
├── services/              # All business logic
│   ├── ai/               # AI processing logic
│   │   ├── flows/        # AI flow definitions
│   │   ├── utils/        # AI utilities
│   │   └── schemas.ts    # AI type schemas
│   ├── api/              # External API integrations
│   │   ├── amadeus.ts    # Flight/hotel APIs
│   │   ├── google-places.ts
│   │   └── weather.ts
│   └── firebase/         # Firebase services
│       └── auth.ts       # Authentication
├── components/            # Shared React components
│   ├── common/           # Shared/common components
│   ├── navigation/       # Navigation components
│   └── ui/               # shadcn/ui components
└── lib/                   # Utilities and helpers
    ├── helpers/          # Helper functions (general.ts with cn)
    ├── utils/            # Utilities (animations.ts, retry.ts)
    ├── constants/        # Static values
    └── monitoring/       # Logging/errors
```

### AI Flows (Primary Logic)
- `src/services/ai/flows/analyze-initial-prompt.ts`: Parses user input
- `src/services/ai/flows/generate-personalized-itinerary.ts`: Creates trip plans
- `src/services/ai/flows/refine-itinerary-based-on-feedback.ts`: Handles modifications

### External APIs
- **Amadeus**: Flights, hotels, car rentals
- **Google Places**: Attractions, restaurants, venues
- **Weather API**: Current conditions and forecasts
- **Foursquare**: Venue details and recommendations

## Current Challenges & Focus Areas

### Token Usage Optimization
- Use MCP file system for efficient file access
- Be specific about which files to examine
- Avoid loading entire codebase into context

### API Integration Reliability
- Amadeus is in sandbox mode (mock data)
- Google APIs require proper key configuration
- Handle API failures gracefully with fallbacks

### Testing Strategy
- Maintain simple test cases that always work
- Complex scenarios can have occasional failures
- Prioritize consistency over feature complexity

## Environment Variables
```bash
# Required
OPENAI_API_KEY=            # Primary AI processing
GOOGLE_API_KEY=            # Maps, Places, Geocoding
AMADEUS_API_KEY=           # Flights and hotels (sandbox)
AMADEUS_API_SECRET=        # Amadeus authentication

# Optional
FOURSQUARE_API_KEY=        # Enhanced venue data
OPENWEATHERMAP=            # Weather forecasts
```

## Task Organization

### Component-Based Task Structure
```
.claude/tasks/
├── ui/                    # Frontend tasks
├── ai/                    # AI flow improvements
├── api/                   # External integrations
├── map/                   # Map components
├── testing/               # Test improvements
└── architecture/          # System design
```

### Task Naming Convention
- `YYYY-MM-DD-descriptive-name.md`
- Include component area in path
- Mark status: TODO, IN_PROGRESS, DONE

## MCP Integration

### Available MCPs
- **Filesystem**: Efficient file access (reduces tokens)
- **Puppeteer**: Web scraping capabilities

### Usage Guidelines
- Let filesystem MCP handle file reading
- Don't paste large files into conversations
- Use specific file paths when requesting analysis

## Common Patterns

### AI Flow Development
1. Update schemas in `src/services/ai/schemas.ts`
2. Modify flow logic in `src/services/ai/flows/`
3. Test with Genkit UI (`npm run genkit:dev`)
4. Run baseline tests
5. Deploy only after tests pass

### Component Development
1. Use existing shadcn/ui components when possible
2. Follow Tailwind utility-first approach
3. Implement proper TypeScript types
4. Test responsive design

### API Integration
1. Add new APIs to `src/services/api/`
2. Include proper error handling
3. Implement fallback strategies
4. Add environment variable validation

### Import Path Guidelines
```typescript
// Current import paths (Updated Jan 17, 2025):

// Infrastructure imports
import { AuthProvider } from '@/infrastructure/contexts/AuthContext';
import { PasswordGate } from '@/infrastructure/components/PasswordGate';
import { OfflineProvider } from '@/infrastructure/providers/offline';
import { MotionProvider } from '@/infrastructure/providers/motion';

// Services imports
import { auth } from '@/services/firebase/auth';
import { amadeus } from '@/services/api/amadeus';
import { generateItinerary } from '@/services/ai/flows/generate-personalized-itinerary';

// UI Components
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/helpers/general';  // IMPORTANT: cn utility is here

// Utilities and helpers
import { logger } from '@/lib/monitoring/logger';
import { fadeInUp, staggerContainer } from '@/lib/utils/animations';
import { retryApiCall } from '@/lib/utils/retry';
import { CITY_LANDMARKS } from '@/lib/constants/city-landmarks';

// Page components
import { HomePage } from '@/pages/home/HomePage';
import { ItineraryPage } from '@/pages/itinerary/ItineraryPage';

// Case-sensitive imports (watch the capitalization!)
// Many components use PascalCase: Day-schedule.tsx, Coworking-spots.tsx, etc.
```

## Performance Optimization Strategy

### Implemented Optimizations
1. **Streaming**: Show results as they generate
2. **Edge Deployment**: Run at edge locations
3. **Database Caching**: Persist popular destinations
4. **Pre-warm Cache**: Load London/Paris/Tokyo on startup

### Monitoring
- Track AI response times
- Monitor API usage and costs
- Log user interaction patterns
- Measure conversion rates

## Troubleshooting

### Common Import Issues & Solutions
1. **Case-sensitive file names**: Many files use PascalCase (e.g., `Day-schedule.tsx`, `Coworking-spots.tsx`)
   - Always check exact file names with proper capitalization
   - macOS/Windows may be case-insensitive but production Linux is case-sensitive

2. **cn utility location**: The `cn` utility is in `@/lib/helpers/general`
   ```typescript
   import { cn } from '@/lib/helpers/general';  // NOT from '@/lib/utils'
   ```

3. **Page components location**: Full page components are in `src/pages/`, not `src/components/pages/`
   ```typescript
   import { HomePage } from '@/pages/home/HomePage';
   ```

4. **Infrastructure imports**: Auth, providers, and contexts are in `src/infrastructure/`
   ```typescript
   import { AuthProvider } from '@/infrastructure/contexts/AuthContext';
   ```

### AI Tests Failing
1. Check recent changes to AI flows
2. Validate environment variables
3. Test individual flows in Genkit UI
4. Compare with last working version

### API Issues
1. Verify API keys in environment
2. Check API rate limits and quotas
3. Test API endpoints directly
4. Review error logs in `logs/` directory

### MCP Not Working
1. Restart Claude Code
2. Check MCP configuration with `claude mcp list`
3. Verify packages are installed
4. Re-add MCPs if necessary

---

## Quick Reference Links
- **Genkit UI**: `npm run genkit:dev` → http://localhost:4000
- **App Dev Server**: `npm run dev` → http://localhost:9002
- **Task Templates**: `.claude/tasks/templates/`
- **Test Results**: `ai-test-results.json`

Remember: When in doubt, run the baseline test. If London works, everything else is solvable.