# Guardian Agent Instructions - Nomad Navigator

## Overview
These instructions ensure consistency across all guardian agents working on the Nomad Navigator codebase. All agents must follow these guidelines based on the comprehensive modernization plan and findings from our analysis.

## Project Health Status
**Current Score: 42/100 ⚠️**
- Critical TypeScript compilation errors must be fixed
- Build process failing with timeout
- Major refactoring needed for production readiness

## Universal Guidelines for All Agents

### 1. Technology Stack Requirements
- **Frontend**: Next.js 15, React 19, TypeScript (strict mode)
- **UI**: shadcn/ui components with Tailwind CSS
- **AI**: OpenAI GPT-5 EXCLUSIVELY (no other models)
- **State**: React Context with proper optimization
- **Routing**: Use `next/navigation` (NOT `next/router`)

### 2. Code Quality Standards

#### Component Size Limits
- **Maximum Lines**: 350 per file
- **Current Violations** (MUST FIX):
  - AuthContext.tsx (485 lines)
  - trips/page.tsx (469 lines)
  - profile/page.tsx (404 lines)
- **Action**: Split large files into smaller, focused components

#### Performance Requirements
- All context values MUST use `useMemo`
- Event handlers MUST use `useCallback`
- Lists MUST have proper keys
- Components with expensive renders MUST use `React.memo`

#### TypeScript Standards
- Strict mode enabled
- No `any` types without explicit justification
- All props must be typed
- All function returns must be typed

### 3. Next.js 15 Patterns

#### Server Components (Default)
- Pages and layouts are Server Components by default
- Only add `'use client'` when necessary
- Data fetching happens in Server Components

#### Client Components (When Needed)
- Interactive elements (forms, buttons with onClick)
- Components using hooks (useState, useEffect)
- Components with browser-only APIs

#### Correct Imports
```typescript
// ✅ CORRECT
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// ❌ WRONG
import { useRouter } from 'next/router'
```

### 4. File Organization Rules

#### Correct Directory Structure
```
src/
├── app/                    # Next.js App Router pages ONLY
│   └── api/               # API Route Handlers
├── components/            # React components
│   └── pages/            # Full page components
├── services/              # ALL business logic
│   ├── ai/               # AI flows and utilities
│   ├── api/              # External API integrations
│   └── firebase/         # Firebase services
├── lib/                   # Utilities ONLY (no business logic)
│   ├── utils/            # Helper functions
│   ├── constants/        # Static values
│   └── monitoring/       # Logging, errors
├── hooks/                # Custom React hooks
├── contexts/             # React contexts
└── types/                # TypeScript definitions
```

#### CRITICAL: File Placement
- **Business Logic**: MUST go in `src/services/`
- **API Integrations**: MUST go in `src/services/api/`
- **AI Code**: MUST go in `src/services/ai/`
- **Firebase**: MUST go in `src/services/firebase/`
- **Utilities**: ONLY pure functions in `src/lib/utils/`

## Component-Quality-Guardian Specific Instructions

### Focus Areas
1. **Component Size**: Flag any file >350 lines
2. **Performance**: Check for missing memoization
3. **Duplicated Code**: Identify and extract to hooks
4. **Server/Client Boundaries**: Optimize component types

### Current Priority Fixes
1. Extract duplicate Google auth logic from LoginForm/SignupForm
2. Split AuthContext into smaller pieces:
   - `useFirebaseAuth` hook
   - `useUserDocument` hook
   - `useGoogleAuth` hook
3. Add memoization to all context providers
4. Convert static UI components to Server Components

### Custom Hooks to Create
```typescript
// Priority 1: Authentication
src/hooks/use-auth-form.ts
src/hooks/use-google-auth.ts

// Priority 2: Core Features
src/hooks/use-trip.ts
src/hooks/use-itinerary.ts
src/hooks/use-chat.ts

// Priority 3: UI/UX
src/hooks/use-toast.ts
src/hooks/use-modal.ts
```

## Core-Logic-Guardian Specific Instructions

### Focus Areas
1. **Token Optimization**: Reduce OpenAI API usage by 40-65%
2. **Performance**: Implement streaming and caching
3. **Security**: Fix in-memory storage, add rate limiting
4. **Code Organization**: Move files to correct directories

### Critical Issues to Fix

#### 1. In-Memory Storage (P0)
- **File**: `src/app/api/ai/route.ts`
- **Issue**: Using `Map()` for production storage
- **Fix**: Implement Redis or database persistence

#### 2. Token Usage Optimization
- Implement structured prompts
- Add response caching for common queries
- Use cheaper models for simple tasks
- Implement prompt compression

#### 3. API Modernization
- Convert all routes to Next.js 15 Route Handlers
- Implement streaming responses
- Add proper error handling
- Implement rate limiting

### Service Layer Refactoring
Files exceeding 350 lines that need splitting:
- generate-personalized-itinerary.ts (409 lines)
- ai-prompt-utils.ts (386 lines)
- itinerary-formatter.ts (367 lines)

## Test-Guardian Specific Instructions

### Testing Requirements

#### Baseline Test (MUST ALWAYS PASS)
"3 days in London" - Simple trip generation test

#### Critical Test Areas
1. **Build Process**: Must compile without errors
2. **Authentication**: Login/signup flows must work
3. **AI Generation**: Trip generation must complete
4. **Performance**: Page load <3 seconds

### Current Test Failures to Monitor
1. **TypeScript Errors**: 47 compilation errors
2. **Build Timeout**: Production build failing
3. **Large Files**: 5 files exceed 350 line limit
4. **Missing Optimizations**: 83% of components lack memoization

### Test Execution Order
1. Fix TypeScript compilation errors first
2. Ensure build process completes
3. Test authentication flows
4. Validate AI trip generation
5. Performance testing

## Shared Code Patterns

### Context Provider Pattern
```typescript
// ALWAYS memoize context values
const value = useMemo(() => ({
  state1,
  state2,
  action1,
  action2,
}), [state1, state2]);

return (
  <Context.Provider value={value}>
    {children}
  </Context.Provider>
);
```

### Custom Hook Pattern
```typescript
export function useCustomHook() {
  const [state, setState] = useState();
  
  const action = useCallback(() => {
    // action logic
  }, [/* dependencies */]);
  
  useEffect(() => {
    // cleanup
    return () => {
      // cleanup logic
    };
  }, [/* dependencies */]);
  
  return { state, action };
}
```

### Server Action Pattern
```typescript
async function serverAction(formData: FormData) {
  'use server';
  
  // Validate input
  const validated = schema.parse({
    field: formData.get('field'),
  });
  
  // Perform action
  try {
    await performDatabaseOperation(validated);
    revalidatePath('/path');
  } catch (error) {
    throw new Error('Action failed');
  }
}
```

### shadcn/ui Component Usage
```typescript
// Use composition with asChild
<Button asChild>
  <Link href="/path">Navigate</Link>
</Button>

// NOT this way
<Button>
  <Link href="/path">Navigate</Link>
</Button>
```

## Communication Between Agents

### Information to Share
1. Files modified and why
2. New patterns introduced
3. Breaking changes made
4. Dependencies added/removed
5. Performance impact of changes

### Handoff Protocol
When one agent completes work:
1. Document changes in `.claude/agents/handoff/[date]-[agent].md`
2. Update this instructions file if new patterns emerge
3. Note any failing tests or issues for next agent
4. Update CLAUDE.md if project structure changes

## Quality Checklist for All Changes

Before committing any changes, verify:
- [ ] No files exceed 350 lines
- [ ] All TypeScript errors resolved
- [ ] Proper memoization added
- [ ] Server/Client components correctly designated
- [ ] Business logic in correct directory
- [ ] Tests pass (especially "3 days in London")
- [ ] No duplicate code
- [ ] Proper error handling
- [ ] Performance optimizations applied
- [ ] Documentation updated

## Emergency Procedures

### If Build Fails
1. Check TypeScript errors: `npm run typecheck`
2. Check for circular dependencies
3. Verify all imports are correct
4. Check environment variables

### If AI Generation Fails
1. Verify OpenAI API key is set
2. Check token limits
3. Review error logs
4. Test with simple prompt first

### If Tests Fail
1. Run baseline test first
2. Check for recent changes
3. Verify environment setup
4. Review error messages carefully

## Success Metrics

### Target Goals
- **Project Health Score**: >80/100
- **TypeScript Errors**: 0
- **Files >350 lines**: 0
- **Component Optimization**: >80%
- **Build Time**: <30 seconds
- **Token Usage**: -50% reduction
- **Test Coverage**: >70%

## Version Control Guidelines

### Commit Messages
Use conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code restructuring
- `perf:` Performance improvements
- `test:` Test additions/changes
- `docs:` Documentation updates

### Branch Strategy
- `main` - Production ready code
- `develop` - Development branch
- `feature/[name]` - New features
- `fix/[issue]` - Bug fixes
- `refactor/[area]` - Refactoring work

## Final Notes

1. **Quality over Speed**: Better to do it right than fast
2. **Test Everything**: Especially after refactoring
3. **Document Changes**: Future agents need context
4. **Follow Patterns**: Consistency is key
5. **Ask for Help**: If unsure, document the issue for review

These instructions will be updated as the project evolves. All agents must check for updates before starting work.