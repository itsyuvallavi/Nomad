# CRITICAL FIXES - Priority Action List

## 🔴 DAY 1 - Stop the Bleeding (4-6 hours)

### 1. Fix TypeScript Configuration (30 min)
```bash
# Add to tsconfig.json to temporarily suppress while fixing:
{
  "compilerOptions": {
    "strict": false,  # Temporarily disable while fixing
    "noImplicitAny": false,  # Allow any temporarily
    "skipLibCheck": true  # Skip library checks
  }
}
```

### 2. Emergency Test File Fixes (1 hour)
Fix these specific files causing most errors:
- `/home/user/studio/scripts/run-comprehensive-tests.ts` - Add proper types
- `/home/user/studio/scripts/test-and-fix.ts` - Add proper types
- `/home/user/studio/src/components/itinerary-components/__tests__/test-utils.ts` - Fix Activity type

### 3. Remove Console Logs (1 hour)
```bash
# Quick replacement script
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log/logger.debug/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error/logger.error/g'
```

### 4. Secure API Keys (30 min)
- Move OPENAI_API_KEY to server-side only
- Remove duplicate entries in .env.local
- Add .env.local to .gitignore

### 5. Split Largest Files (2 hours)
Priority files to split:
1. `src/testing/integration-tests.ts` (844 lines) → Split into 3 files
2. `src/testing/ai-tests.ts` (716 lines) → Split into 3 files
3. `src/testing/test-runner.ts` (592 lines) → Split into 2 files

---

## 🟠 DAY 2-3 - Stabilize Core (8-12 hours)

### 6. Add Critical Tests
Create these test files:
- `src/services/ai/__tests__/ai-controller.test.ts`
- `src/services/ai/__tests__/trip-generator.test.ts`
- `src/app/api/ai/__tests__/route.test.ts`

### 7. Fix Build Process
- Investigate build timeout
- Add build optimization
- Implement code splitting

### 8. Type Safety for Core Services
Fix types in these critical files:
- `src/services/ai/ai-controller.ts`
- `src/services/ai/trip-generator.ts`
- `src/services/ai/modules/intent-parser.ts`

---

## 🟡 WEEK 1 - Make It Maintainable (20-30 hours)

### 9. Comprehensive Testing
- Achieve 40% test coverage
- Focus on AI services and API routes
- Add integration tests for critical paths

### 10. Performance Optimization
- Implement React.memo for heavy components
- Add useMemo/useCallback where needed
- Implement lazy loading for routes

### 11. Error Handling
- Add error boundaries to all pages
- Implement retry logic for API calls
- Add proper error logging

### 12. Documentation
- Document AI flow architecture
- Add JSDoc to public APIs
- Create troubleshooting guide

---

## Quick Win Scripts

### Check Current Status
```bash
npm run typecheck 2>&1 | grep "error TS" | wc -l  # Count errors
find src -name "*.test.*" -o -name "*.spec.*" | wc -l  # Count tests
```

### Monitor Progress
```bash
# Create progress tracker
echo "Day 1: $(date)" >> TECH_DEBT_PROGRESS.md
echo "TypeScript Errors: $(npm run typecheck 2>&1 | grep 'error TS' | wc -l)" >> TECH_DEBT_PROGRESS.md
echo "Test Files: $(find src -name '*.test.*' | wc -l)" >> TECH_DEBT_PROGRESS.md
```

---

## Success Metrics

After Day 1:
- [ ] TypeScript errors < 100
- [ ] No console.logs in production code
- [ ] API keys secured
- [ ] Largest file < 500 lines

After Day 3:
- [ ] TypeScript errors < 50
- [ ] 10+ test files created
- [ ] Build completes in < 2 minutes
- [ ] Core services have types

After Week 1:
- [ ] TypeScript errors = 0
- [ ] Test coverage > 40%
- [ ] All critical paths tested
- [ ] Performance metrics improved by 30%

---

**Remember**: Focus on stopping the bleeding first, then stabilize, then optimize.
