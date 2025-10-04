# Project Cleanup Plan
**Date**: 2025-10-04
**Status**: READY FOR APPROVAL

## Overview
Reorganize project structure to move config files out of root directory and into organized subdirectories, following the structure outlined in CLAUDE.md.

## Current Issues
1. **Root directory clutter**: Config files scattered in root
2. **Firebase files dispersed**: 5 Firebase-related files in root
3. **Test files in root**: Jest config, test scripts in root
4. **Unused Jest setup**: Jest configured but not used (using tsx scripts instead)

## Files to Reorganize

### Firebase Files (5 files)
Current location: `/`
Target location: `config/firebase/`

- `.firebaserc` → `config/firebase/.firebaserc`
- `firebase.json` → `config/firebase/firebase.json`
- `firestore.rules` → `config/firebase/firestore.rules`
- `firestore.indexes.json` → `config/firebase/firestore.indexes.json`
- `firebase-debug.log` → DELETE (debug log, not config)

### Build Config Files (4 files)
Current location: `/`
Target location: `config/build/`

- `next.config.ts` → `config/build/next.config.ts`
- `tailwind.config.ts` → `config/build/tailwind.config.ts`
- `postcss.config.mjs` → `config/build/postcss.config.mjs`
- `tsconfig.json` → `config/build/tsconfig.json`

### Jest Files (2 files) - KEEP OR REMOVE?
Current location: `/`
Options:
1. Move to `config/dev/` (if keeping for future use)
2. DELETE (not currently used, using tsx scripts)

- `jest.config.ts`
- `jest.setup.ts`

### Test Scripts (1 file)
Current location: `/`
Target location: `scripts/`

- `test-ai-parser.js` → `scripts/test-ai-parser.js`

### Keep in Root (Required)
These MUST stay in root for tools to work:
- `package.json` - npm requirement
- `package-lock.json` - npm requirement
- `next-env.d.ts` - Next.js generated types
- `.env`, `.env.local` - Environment variables

## New Directory Structure

```
/
├── config/
│   ├── build/              # Build configurations
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   └── tsconfig.json
│   ├── firebase/           # Firebase configurations
│   │   ├── .firebaserc
│   │   ├── firebase.json
│   │   ├── firestore.rules
│   │   └── firestore.indexes.json
│   └── dev/                # Development configs (optional)
│       ├── jest.config.ts  (if keeping)
│       └── jest.setup.ts   (if keeping)
├── scripts/                # All test/utility scripts
│   ├── test-ai-parser.js   (moved from root)
│   └── ... (existing scripts)
├── src/                    # Source code (unchanged)
├── package.json            # STAYS IN ROOT
├── package-lock.json       # STAYS IN ROOT
├── next-env.d.ts           # STAYS IN ROOT
├── .env                    # STAYS IN ROOT
└── ... (symbolic links to config files - see below)
```

## Symbolic Links Strategy

Many tools expect config files in root. Create symbolic links:

```bash
# In root directory
ln -s config/build/next.config.ts next.config.ts
ln -s config/build/tailwind.config.ts tailwind.config.ts
ln -s config/build/postcss.config.mjs postcss.config.mjs
ln -s config/build/tsconfig.json tsconfig.json
ln -s config/firebase/.firebaserc .firebaserc
ln -s config/firebase/firebase.json firebase.json
ln -s config/firebase/firestore.rules firestore.rules
ln -s config/firebase/firestore.indexes.json firestore.indexes.json
```

## Decision Required: Jest Files

**Question**: Do we keep Jest configuration?

**Current state**:
- Jest is installed in `package.json` devDependencies
- Jest config exists (`jest.config.ts`, `jest.setup.ts`)
- **Jest is NOT used** - no test scripts run Jest
- Using `tsx` scripts for all testing instead

**Options**:

### Option A: DELETE Jest files (Recommended)
- Remove `jest.config.ts`
- Remove `jest.setup.ts`
- Remove Jest dependencies from `package.json`:
  - `@testing-library/jest-dom`
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@types/jest`
  - `jest-environment-jsdom`
- Benefits: Cleaner, no unused code
- Risks: If we want Jest later, need to reconfigure

### Option B: KEEP Jest files
- Move to `config/dev/jest.config.ts`
- Move to `config/dev/jest.setup.ts`
- Create symlink from root
- Benefits: Available for future use
- Risks: Maintains unused code

**Recommendation**: Option A (DELETE) - Not being used, can always reinstall later.

## Import Path Changes Required

After moving config files, these imports may need updating:

### Firebase Files
Search for imports of:
- `firebase.json`
- `firestore.rules`
- `.firebaserc`

**Expected impact**: Low - Firebase CLI uses root directory by default, symlinks will handle this.

### Build Config Files
Search for imports of:
- `next.config.ts`
- `tailwind.config.ts`
- `postcss.config.mjs`
- `tsconfig.json`

**Expected impact**: Very Low - These are auto-discovered by Next.js/PostCSS/TypeScript, symlinks will handle this.

### Test Scripts
Search for imports of:
- `test-ai-parser.js`

**Expected impact**: None - File is executed directly, not imported.

## Implementation Steps

### Phase 1: Preparation
1. ✅ Analyze current structure
2. ✅ Identify all files to move
3. ✅ Create cleanup plan
4. ⏸️ **GET APPROVAL** before proceeding

### Phase 2: Create Directories
```bash
mkdir -p config/build
mkdir -p config/firebase
mkdir -p config/dev  # Only if keeping Jest
```

### Phase 3: Move Files
```bash
# Firebase files
mv .firebaserc config/firebase/
mv firebase.json config/firebase/
mv firestore.rules config/firebase/
mv firestore.indexes.json config/firebase/
rm firebase-debug.log  # Delete debug log

# Build configs
mv next.config.ts config/build/
mv tailwind.config.ts config/build/
mv postcss.config.mjs config/build/
mv tsconfig.json config/build/

# Test scripts
mv test-ai-parser.js scripts/

# Jest files (if keeping)
mv jest.config.ts config/dev/
mv jest.setup.ts config/dev/
```

### Phase 4: Create Symbolic Links
```bash
# Build configs
ln -s config/build/next.config.ts next.config.ts
ln -s config/build/tailwind.config.ts tailwind.config.ts
ln -s config/build/postcss.config.mjs postcss.config.mjs
ln -s config/build/tsconfig.json tsconfig.json

# Firebase configs
ln -s config/firebase/.firebaserc .firebaserc
ln -s config/firebase/firebase.json firebase.json
ln -s config/firebase/firestore.rules firestore.rules
ln -s config/firebase/firestore.indexes.json firestore.indexes.json

# Jest (only if keeping)
ln -s config/dev/jest.config.ts jest.config.ts
ln -s config/dev/jest.setup.ts jest.setup.ts
```

### Phase 5: Update References
1. Search for hardcoded paths to moved files
2. Update import statements if any exist
3. Update documentation references

### Phase 6: Verification
```bash
# Test that everything still works
npm run typecheck   # TypeScript compilation
npm run build       # Production build
npm run dev         # Dev server

# Firebase commands should still work
firebase deploy --only hosting --dry-run
```

### Phase 7: Update Documentation
Update `CLAUDE.md` with new structure.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Symbolic links not followed by tools | HIGH | Test each tool after creating symlinks |
| Missing import path updates | MEDIUM | Search codebase for references before moving |
| Firebase CLI breaks | MEDIUM | Firebase CLI should follow symlinks, test with --dry-run |
| Build process breaks | HIGH | Test build immediately after changes |

## Rollback Plan

If issues occur:
```bash
# Remove symlinks
rm next.config.ts tailwind.config.ts postcss.config.mjs tsconfig.json
rm .firebaserc firebase.json firestore.rules firestore.indexes.json

# Move files back
mv config/build/* .
mv config/firebase/* .
mv scripts/test-ai-parser.js .

# Remove directories
rmdir config/build config/firebase config/dev config
```

## Success Criteria

- ✅ All config files in organized subdirectories
- ✅ Root directory only contains essential files
- ✅ `npm run dev` works
- ✅ `npm run build` works
- ✅ `npm run typecheck` passes
- ✅ Firebase deploy works (dry-run test)
- ✅ No broken imports
- ✅ Documentation updated

## Questions for User

1. **Jest files**: DELETE or KEEP? (Recommend: DELETE)
2. **Proceed with reorganization?** This is a significant structural change.
3. **Test approach**: Should we test each phase or do it all at once?

---

**Next Steps**: Await approval before proceeding with implementation.
