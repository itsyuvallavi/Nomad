# Project Structure

## Overview
The Nomad Navigator project follows a clean, organized structure designed for maintainability and scalability.

## Directory Structure

```
nomad-navigator/
├── src/                    # Core application code
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── ai/               # AI system
│   │   ├── flows/        # Firebase Genkit flows
│   │   ├── utils/        # AI utilities and generators
│   │   ├── schemas.ts    # Zod schemas for AI
│   │   ├── config.ts     # AI configuration
│   │   └── openai-config.ts # OpenAI specific config
│   ├── lib/              # Libraries and utilities
│   │   ├── api/         # External API integrations
│   │   └── utils/       # General utilities
│   ├── hooks/           # React hooks
│   └── types/           # TypeScript type definitions
│
├── tests/                # All testing
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── ai/             # AI-specific tests
│   └── results/        # Test results and logs
│
├── scripts/             # Development scripts
├── tools/              # Development tools
│
├── docs/               # Documentation
│   ├── api/           # API documentation
│   ├── architecture/  # System design docs
│   ├── deployment/    # Deployment guides
│   └── user/         # User documentation
│
├── .claude/           # Claude AI guidance
│   ├── instructions/  # AI coding instructions
│   ├── tasks/        # Active task tracking
│   └── archive/      # Completed tasks
│
├── config/           # Configuration files
│   ├── development/  # Dev environment configs
│   ├── production/   # Prod environment configs
│   └── testing/     # Test environment configs
│
├── data/            # Application data
│   ├── cache/      # Cache storage
│   ├── learned/    # ML/AI patterns
│   └── static/     # Static data files
│
├── logs/           # Application logs
│   ├── app/       # Application logs
│   ├── ai/        # AI-specific logs
│   └── error/     # Error logs
│
└── [Root Files]
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── .env
    ├── .gitignore
    ├── README.md
    └── CLAUDE.md
```

## Key Directories

### `/src/ai`
Contains all AI-related code:
- **flows/**: Firebase Genkit flow definitions (server actions)
- **utils/**: AI utilities including generators and parsers
- **schemas.ts**: Zod schemas for type-safe AI responses
- **config.ts**: Centralized AI configuration

### `/tests`
Organized testing structure:
- **unit/**: Isolated unit tests
- **integration/**: Full integration tests
- **ai/**: AI-specific testing and monitoring
- **results/**: Test outputs and benchmarks

### `/docs`
Comprehensive documentation:
- **api/**: API endpoint documentation
- **architecture/**: System design and structure
- **deployment/**: Deployment procedures
- **user/**: End-user guides

### `/.claude`
Claude AI development guidance:
- **tasks/**: Active development tasks
- **archive/**: Completed task history
- **instructions/**: AI coding guidelines

## Runtime Directories (Not Modified)
- `.genkit/`: Firebase Genkit runtime files
- `.next/`: Next.js build output
- `node_modules/`: NPM dependencies

## Benefits of This Structure

1. **Clear Separation**: Core code, tests, docs, and config are cleanly separated
2. **Scalability**: Easy to add new features without cluttering
3. **Maintainability**: Clear organization makes finding files easy
4. **Testing Focus**: Dedicated test structure encourages comprehensive testing
5. **Documentation**: Organized docs promote better documentation practices
6. **AI Integration**: AI code is centralized but accessible

## Migration Notes

During the reorganization (2025-09-10):
- Moved test files from root to `/tests`
- Consolidated AI utilities in `/src/ai/utils`
- Organized logs into categorized subdirectories
- Created proper config directory structure
- Archived old task files to `.claude/archive`