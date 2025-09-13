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
**Project ID**: nomad-navigator-xej23
**Auth Domain**: nomad-navigator-xej23.firebaseapp.com
**Project Number**: 843370239890

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
**ALWAYS place files in their correct directories:**
- **Tasks & Plans**: `.claude/tasks/[component]/task-name.md` - NEVER in root
- **Documentation**: `.claude/docs/` or `docs/` - NEVER in root
- **Test Files**: `src/__tests__/` or appropriate test directories
- **Components**: `src/components/[category]/`
- **API Routes**: `src/app/api/`
- **Utilities**: `src/lib/utils/`
- **Configurations**: Root level only for configs like `.env`, `next.config.ts`

**NEVER create files in root unless they are:**
- Configuration files (`.env`, `next.config.ts`, `package.json`)
- Standard project files (`README.md`, `LICENSE`)
- Git files (`.gitignore`)

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

### Key Directories
```
src/
├── ai/flows/              # AI processing logic
├── components/            # React components
│   ├── chat/             # Chat interface
│   ├── itinerary/        # Trip display
│   └── ui/               # Reusable components
├── lib/api/              # External API integrations
└── lib/utils/            # Utility functions
```

### AI Flows (Primary Logic)
- `analyze-initial-prompt.ts`: Parses user input
- `generate-personalized-itinerary.ts`: Creates trip plans
- `refine-itinerary-based-on-feedback.ts`: Handles modifications

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
1. Update schemas in `src/ai/schemas.ts`
2. Modify flow logic in `src/ai/flows/`
3. Test with Genkit UI (`npm run genkit:dev`)
4. Run baseline tests
5. Deploy only after tests pass

### Component Development
1. Use existing shadcn/ui components when possible
2. Follow Tailwind utility-first approach
3. Implement proper TypeScript types
4. Test responsive design

### API Integration
1. Add new APIs to `src/lib/api/`
2. Include proper error handling
3. Implement fallback strategies
4. Add environment variable validation

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