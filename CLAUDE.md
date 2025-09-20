# CLAUDE.md

This file provides guidance to Claude Code when working with the Nomad Navigator codebase.

## ⚠️ CRITICAL: Firebase IDE Environment
**NEVER run `npm run dev` in Firebase IDE!**
- Firebase automatically runs the app on its own ports
- Running `npm run dev` will cause port conflicts and issues
- The app is already accessible through Firebase's preview URLs
- Only use `npm run build` for production builds
- For testing: Use Firebase's preview, not local dev server
- **The app is ALWAYS running automatically** - no need to start any server

## Project Overview
Nomad Navigator - AI-powered travel planning application for digital nomads using Next.js 15, OpenAI APIs, and modern web technologies.

## Current Firebase Project
**Project ID**: nomad-navigatordup-70195-f4cf9
**Auth Domain**: nomad-navigatordup-70195-f4cf9.firebaseapp.com
**Project Number**: 476100182115

## Current Technology Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 (EXCLUSIVELY - no other models)
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

#### Project Structure (As of Jan 13, 2025)
```
nomad-navigator/
├── config/                      # ALL configuration files
│   ├── build/                   # Build configs (next, tailwind, postcss, tsconfig)
│   ├── firebase/                # Firebase configs (firebase.json, firestore files)
│   └── dev/                     # Dev configs (eslint, components, mcp)
├── data/                        # ALL static/mock data
│   ├── static/                  # Static data files
│   ├── mock/                    # Mock data for testing
│   └── cache/                   # Cached data
├── src/
│   ├── app/                     # Next.js App Router (pages only)
│   ├── components/              # React components
│   │   └── pages/               # Full page components
│   ├── services/                # ALL business logic
│   │   ├── ai/                  # AI flows and utilities
│   │   ├── api/                 # External API integrations
│   │   ├── firebase/            # Firebase services (auth, analytics)
│   │   ├── trips/               # Trip-related services
│   │   └── storage/             # Storage services
│   ├── lib/                     # Utilities ONLY
│   │   ├── utils/               # Utility functions
│   │   ├── constants/           # App constants
│   │   └── monitoring/          # Logging, errors, performance
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript type definitions
├── public/                      # Static assets (favicons, PWA manifest)
├── docs/                        # Documentation
└── scripts/                     # Build/utility scripts
```

#### File Placement Rules
**ALWAYS place files in their correct directories:**
- **Services/Business Logic**: `src/services/[category]/` - NOT in lib
- **External APIs**: `src/services/api/` - NOT in lib/api
- **AI Code**: `src/services/ai/` - NOT in src/ai
- **Firebase Code**: `src/services/firebase/` - NOT in lib
- **Utilities**: `src/lib/utils/` - Pure functions only
- **Constants**: `src/lib/constants/` - Static values
- **Monitoring**: `src/lib/monitoring/` - Loggers, error handlers
- **Mock Data**: `data/mock/` - NOT in src/data
- **Config Files**: `config/[category]/` - NOT in root
- **Page Components**: `src/components/pages/` - Full page logic

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
2. **Use MCPs**: Leverage file system MCP for efficient file access
3. **Document Changes**: Explain modifications for future handoffs

## AI Testing Guidelines

### Golden Rule: "3 days in London" Must Always Work
This simple test is our canary. If it fails, stop and fix before proceeding.

### Test Priority Levels
1. **Must Pass**: Simple requests (London weekend, Paris 3-day)
2. **Should Pass**: Medium complexity (multi-city, week-long trips)
3. **Can Occasionally Fail**: Complex requests (multi-week, heavy constraints)

### Red Flags - Stop Immediately
- Simple prompts not being understood
- Response times > 15 seconds for simple requests
- Missing required fields in AI responses
- Inconsistent destination/day counts

## Development Commands

```bash
# Core Development
npm run dev                 # Next.js dev server (port 9002)
npm run genkit:dev         # AI flow debugging UI
npm run typecheck          # TypeScript validation

# Quality Assurance
npm run lint               # Code linting
npm run build              # Production build test
```

## Architecture Quick Reference

### Key Directories
```
src/
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
├── components/            # React components
│   ├── pages/            # Full page components
│   ├── chat/             # Chat interface
│   ├── itinerary/        # Trip display
│   └── ui/               # Reusable components
└── lib/                   # Utilities only
    ├── utils/            # Helper functions
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
// Correct imports after reorganization:
import { auth } from '@/services/firebase/auth';
import { amadeus } from '@/services/api/amadeus';
import { generateItinerary } from '@/services/ai/flows/generate-personalized-itinerary';
import { logger } from '@/lib/monitoring/logger';
import { formatDate } from '@/lib/utils/date-parser';
import { CITY_LANDMARKS } from '@/lib/constants/city-landmarks';

// Backward compatibility (still works but avoid in new code):
import { auth } from '@/lib/firebase';  // Re-exports from services
import { tripsService } from '@/lib/trips-service';  // Re-exports from services
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

### AI Not Understanding Prompts
1. Check recent changes to AI flows
2. Validate environment variables (ensure GPT-5 API key is set)
3. Review prompt parsing logic in ai-controller.ts
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
- **App Dev Server**: `npm run dev` → http://localhost:9002
- **Task Templates**: `.claude/tasks/templates/`

Remember: When in doubt, run the baseline test. If London works, everything else is solvable.