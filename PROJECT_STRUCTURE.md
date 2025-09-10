# Nomad Navigator - Complete Project Structure

## 📁 Root Directory
```
nomad-navigator/
│
├── 📄 Configuration Files
│   ├── package.json                 # Node.js dependencies and scripts
│   ├── package-lock.json            # Locked dependency versions
│   ├── tsconfig.json                # TypeScript configuration
│   ├── next.config.js               # Next.js configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── postcss.config.mjs           # PostCSS configuration
│   ├── components.json              # shadcn/ui components config
│   ├── .eslintrc.json               # ESLint configuration
│   ├── .env                         # Environment variables
│   └── apphosting.yaml              # Firebase App Hosting config
│
├── 📄 Documentation
│   ├── README.md                    # Project documentation
│   ├── CLAUDE.md                    # Claude AI instructions
│   ├── CLEANUP_SUMMARY.md           # Cleanup documentation
│   ├── ERROR_POPUP_IMPLEMENTATION.md # Error handling docs
│   └── PROJECT_STRUCTURE.md         # This file
│
├── 📂 .claude/                      # Claude AI configuration
│   ├── settings.local.json          # Local Claude settings
│   └── tasks/                       # Task tracking
│       ├── main-tasks.md            # Main task list
│       ├── ai-optimization.md       # AI optimization plan
│       ├── ai-cleanup-plan.md       # AI cleanup plan
│       ├── UI_UPDATE_IMPLEMENTATION.md # UI update plan
│       └── [other task files...]
│
├── 📂 .updates/                     # Update documentation
│   └── v2.3_update.md               # Version 2.3 changes
│
├── 📂 src/                          # Source code
│   ├── 📂 app/                      # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles
│   │   └── favicon.ico              # Favicon
│   │
│   ├── 📂 ai/                       # AI Processing System
│   │   ├── 📂 flows/                # Genkit AI flows
│   │   │   ├── analyze-initial-prompt.ts       # Prompt analysis
│   │   │   ├── generate-personalized-itinerary.ts # Itinerary generation
│   │   │   └── refine-itinerary-based-on-feedback.ts # Refinement
│   │   │
│   │   ├── 📂 prompts/              # AI prompts
│   │   │   └── ITINERARY_GENERATION_PROMPT.md
│   │   │
│   │   ├── 📂 utils/                # AI utilities
│   │   │   ├── destination-parser.ts           # Basic parser
│   │   │   ├── enhanced-destination-parser.ts  # Enhanced parser
│   │   │   ├── intelligent-trip-extractor.ts   # Trip extraction
│   │   │   └── openai-travel-costs.ts         # Cost estimation
│   │   │
│   │   ├── enhanced-generator-ultra-fast.ts    # Primary generator
│   │   ├── enhanced-generator.ts               # Secondary generator
│   │   ├── unified-generator.ts                # Unified interface
│   │   ├── openai-config.ts                    # OpenAI config
│   │   └── schemas.ts                          # Zod schemas
│   │
│   ├── 📂 components/               # React Components
│   │   ├── 📂 chat/                 # Chat interface
│   │   │   ├── chat-container.tsx              # Main chat container
│   │   │   ├── chat-interface.tsx              # Chat UI
│   │   │   ├── ai-thinking.tsx                 # Thinking animation
│   │   │   └── enhanced-thinking-panel.tsx     # Enhanced thinking UI
│   │   │
│   │   ├── 📂 forms/                # Form components
│   │   │   ├── trip-search-form.tsx            # Search form
│   │   │   └── trip-details-form.tsx           # Details form
│   │   │
│   │   ├── 📂 itinerary/            # Itinerary display
│   │   │   ├── itinerary-view.tsx              # Main view
│   │   │   ├── day-timeline-v2.tsx             # Day timeline
│   │   │   ├── day-schedule.tsx                # Schedule view
│   │   │   ├── activity-card.tsx               # Activity cards
│   │   │   ├── travel-details.tsx              # Travel info
│   │   │   ├── trip-tips.tsx                   # Tips section
│   │   │   ├── coworking-spots.tsx             # Coworking info
│   │   │   ├── export-menu.tsx                 # Export options
│   │   │   └── loading-skeleton.tsx            # Loading state
│   │   │
│   │   ├── 📂 map/                  # Map components
│   │   │   ├── itinerary-map.tsx               # Main map
│   │   │   ├── map-panel.tsx                   # Map panel
│   │   │   ├── activity-marker.tsx             # Map markers
│   │   │   ├── route-layer.tsx                 # Route display
│   │   │   └── utils/
│   │   │       └── geocoding.ts                # Geocoding utils
│   │   │
│   │   └── 📂 ui/                   # UI components (shadcn)
│   │       ├── button.tsx                      # Button component
│   │       ├── card.tsx                         # Card component
│   │       ├── dialog.tsx                       # Dialog component
│   │       ├── form.tsx                         # Form component
│   │       ├── input.tsx                        # Input component
│   │       ├── label.tsx                        # Label component
│   │       ├── tooltip.tsx                      # Tooltip component
│   │       ├── dropdown-menu.tsx                # Dropdown menu
│   │       ├── alert-dialog.tsx                 # Alert dialog
│   │       ├── error-dialog.tsx                 # Error dialog
│   │       ├── empty-state.tsx                  # Empty state
│   │       ├── skeleton-loader.tsx              # Skeleton loader
│   │       └── animated-logo.tsx                # Animated logo
│   │
│   ├── 📂 lib/                      # Library/Utilities
│   │   ├── 📂 api/                  # External APIs
│   │   │   ├── google-places.ts                # Google Places API
│   │   │   ├── weather.ts                      # Weather API
│   │   │   └── pexels.ts                       # Pexels image API
│   │   │
│   │   ├── 📂 utils/                # Utility functions
│   │   │   ├── master-parser.ts                # Master parser
│   │   │   ├── date-parser.ts                  # Date parsing
│   │   │   └── input-validator.ts              # Input validation
│   │   │
│   │   ├── utils.ts                            # General utilities
│   │   ├── animations.ts                       # Animation configs
│   │   ├── city-landmarks.ts                   # City data
│   │   ├── draft-manager.ts                    # Draft management
│   │   ├── error-handler.ts                    # Error handling
│   │   ├── logger.ts                           # Logging utility
│   │   └── retry-utils.ts                      # Retry logic
│   │
│   ├── 📂 hooks/                    # Custom React hooks
│   │   └── use-keyboard-shortcuts.ts           # Keyboard shortcuts
│   │
│   └── 📂 types/                    # TypeScript types
│       └── (currently empty after cleanup)
│
├── 📂 tests/                        # Test files
│   ├── test-apis-fixed.ts          # API tests
│   ├── test-complex-trip.ts        # Complex trip tests
│   ├── test-parser.ts               # Parser tests
│   ├── test-full-ui-flow.ts        # UI flow tests
│   └── [other test files...]
│
├── 📂 scripts/                      # Utility scripts
│   └── test-ai.ts                   # AI testing script
│
├── 📂 logs/                         # Application logs
│   ├── ai-flows.log                 # AI flow logs
│   ├── combined.log                 # Combined logs
│   └── error.log                    # Error logs
│
├── 📂 benchmark-results/            # Performance benchmarks
│   ├── latest_baseline.json         # Latest benchmark
│   ├── phase1-improvement-report.md # Phase 1 report
│   ├── phase2-improvement-report.md # Phase 2 report
│   └── [other reports...]
│
├── 📂 data/                         # Data files
│   ├── learned-patterns.json        # ML patterns
│   └── parse-history.json           # Parse history
│
├── 📂 docs/                         # Documentation
│   └── blueprint.md                 # Project blueprint
│
├── 📂 tasks/                        # Task tracking
│   ├── main-tasks.md                # Main tasks
│   ├── implementation-plan-2025-09-07.md
│   └── project-analysis-2025-01-06.md
│
├── 📂 .searches/                    # Search history
│   └── [JSON search files...]
│
├── 📂 .genkit/                      # Genkit runtime
│   ├── runtimes/                    # Runtime configs
│   ├── servers/                     # Server configs
│   └── traces/                      # Trace data
│
├── 📂 .idx/                         # IDX config
│   ├── dev.nix                      # Nix config
│   └── icon.png                     # IDX icon
│
├── 📂 Nomad_UI_v2.3/               # [TO BE REMOVED]
│   └── (standalone UI reference - not integrated)
│
└── 📄 Test & Config Files
    ├── ai-testing-monitor.ts        # AI test monitor
    ├── ai-test-results.json         # AI test results
    ├── test-phase2-parser.ts        # Phase 2 parser test
    ├── test-phase2-with-api.ts      # Phase 2 API test
    ├── test-phase3-features.ts      # Phase 3 features test
    └── test-phase4-neural.ts        # Phase 4 neural test
```

## 🔑 Key Directories

### `/src/ai/` - AI Processing Core
- **flows/**: Firebase Genkit AI flows for processing
- **utils/**: Parsing and extraction utilities
- **generators**: Different generation strategies (ultra-fast is primary)

### `/src/components/` - UI Components
- **chat/**: Chat interface and interaction
- **itinerary/**: Itinerary display and management
- **map/**: Map visualization
- **ui/**: Reusable UI components (shadcn/ui)

### `/src/lib/` - Libraries & Utilities
- **api/**: External API integrations
- **utils/**: Helper functions and parsers

## 📊 Statistics

- **Total Source Files**: ~75 files
- **AI/ML Files**: 15 files
- **Component Files**: 35 files
- **Utility Files**: 15 files
- **Test Files**: 30+ files
- **Lines of Code**: ~15,000+ (excluding node_modules)

## 🚀 Active Features

1. **AI Itinerary Generation** (OpenAI GPT-3.5/4)
2. **Real-time Venue Search** (Google Places API)
3. **Weather Integration** (OpenWeatherMap)
4. **Image Search** (Pexels API)
5. **Map Visualization** (Mapbox)
6. **Export Functionality** (PDF, Calendar)
7. **Chat Interface** with thinking animations
8. **Recent Search History**
9. **Error Recovery** with user-friendly popups

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **AI**: OpenAI API, Firebase Genkit
- **Maps**: Mapbox GL JS
- **State**: React hooks (no Redux)
- **Animation**: Framer Motion
- **Build**: Turbopack
- **Testing**: Custom AI test suite

## 📝 Recent Changes (v2.3)

- Removed 19 unused files
- Optimized AI generators (70% token reduction)
- Enhanced caching with category-specific TTLs
- Fixed duration calculations
- Improved venue diversity
- Added request deduplication
- Test pass rate improved by 50%

## 🔄 Development Commands

```bash
npm run dev          # Start dev server (port 9002)
npm run build        # Production build
npm run typecheck    # TypeScript checking
npm run lint         # ESLint
npm run test:ai      # Run AI tests
npm run genkit:dev   # Genkit UI
```