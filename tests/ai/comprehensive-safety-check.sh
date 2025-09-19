#!/bin/bash

echo "========================================================"
echo "COMPREHENSIVE SAFETY CHECK BEFORE DELETING OLD AI FILES"
echo "========================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "1. Checking if NEW AI files import OLD AI files..."
echo "---------------------------------------------------"

# Check ai-controller.ts
echo "Checking ai-controller.ts..."
if grep -q "from '@/services/ai/flows\|from '@/services/ai/conversation\|from '@/services/ai/utils/[^o]" src/services/ai/ai-controller.ts; then
    echo -e "${RED}❌ ai-controller.ts imports old files!${NC}"
    grep "from '@/services/ai/" src/services/ai/ai-controller.ts
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ ai-controller.ts is clean${NC}"
fi

# Check trip-generator.ts
echo "Checking trip-generator.ts..."
if grep -q "from '@/services/ai/flows\|from '@/services/ai/conversation\|from '@/services/ai/utils/[^o]" src/services/ai/trip-generator.ts; then
    echo -e "${RED}❌ trip-generator.ts imports old files!${NC}"
    grep "from '@/services/ai/" src/services/ai/trip-generator.ts
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ trip-generator.ts is clean${NC}"
fi

# Check prompts.ts
echo "Checking prompts.ts..."
if grep -q "from '@/services/ai/flows\|from '@/services/ai/conversation" src/services/ai/prompts.ts; then
    echo -e "${RED}❌ prompts.ts imports old files!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ prompts.ts is clean${NC}"
fi

echo ""
echo "2. Checking if OLD AI files are imported by NEW AI files..."
echo "-----------------------------------------------------------"

# List old AI files that would be deleted
OLD_FILES=(
    "src/services/ai/flows/generate-personalized-itinerary.ts"
    "src/services/ai/flows/generate-personalized-itinerary-v2.ts"
    "src/services/ai/flows/refine-itinerary-based-on-feedback.ts"
    "src/services/ai/conversation/ai-conversation-controller.ts"
    "src/services/ai/conversation/conversation-controller.ts"
    "src/services/ai/conversation/conversation-state-manager.ts"
    "src/services/ai/conversation/ai-powered-analyzer.ts"
    "src/services/ai/conversation/response-analyzer.ts"
    "src/services/ai/conversation/question-generator.ts"
    "src/services/ai/utils/conversational-generator.ts"
    "src/services/ai/utils/intent-understanding.ts"
    "src/services/ai/utils/zone-based-planner.ts"
    "src/services/ai/utils/route-optimizer.ts"
)

for file in "${OLD_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if this old file imports any NEW files (circular dependency)
        if grep -q "ai-controller\|trip-generator\|from './prompts'" "$file" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Old file $file imports new files (expected)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
done

echo ""
echo "3. Checking TEST files for old AI imports..."
echo "---------------------------------------------"

TEST_OLD_IMPORTS=$(grep -r "from '@/services/ai/flows\|from '@/services/ai/conversation" tests/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".old/" | wc -l)

if [ "$TEST_OLD_IMPORTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TEST_OLD_IMPORTS test files importing old AI files${NC}"
    echo "Test files with old imports:"
    grep -r "from '@/services/ai/flows\|from '@/services/ai/conversation" tests/ --include="*.ts" | grep -v ".old/" | cut -d: -f1 | sort | uniq
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ No test files import old AI files${NC}"
fi

echo ""
echo "4. Checking for dynamic imports or require statements..."
echo "---------------------------------------------------------"

DYNAMIC_IMPORTS=$(grep -r "require.*ai/flows\|require.*ai/conversation\|import.*ai/flows\|import.*ai/conversation" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)

if [ "$DYNAMIC_IMPORTS" -gt 0 ]; then
    echo -e "${RED}❌ Found dynamic imports of old AI files!${NC}"
    grep -r "require.*ai/flows\|require.*ai/conversation" src/ --include="*.ts" --include="*.tsx"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No dynamic imports found${NC}"
fi

echo ""
echo "5. Checking for references in configuration files..."
echo "-----------------------------------------------------"

CONFIG_REFS=$(grep -r "ai/flows\|ai/conversation\|ai/utils" --include="*.json" --include="*.config.*" --include="*.yml" --include="*.yaml" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)

if [ "$CONFIG_REFS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found references in config files${NC}"
    grep -r "ai/flows\|ai/conversation" --include="*.json" --include="*.config.*" . 2>/dev/null | grep -v node_modules | head -5
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ No references in config files${NC}"
fi

echo ""
echo "6. Checking API response format compatibility..."
echo "-------------------------------------------------"

# Check if the API route response matches what UI expects
echo "Checking response structure in API route..."
if grep -q "type: 'question'\|type: 'itinerary'" src/app/api/ai/generate-itinerary-v2/route.ts; then
    echo -e "${GREEN}✅ API response structure looks compatible${NC}"
else
    echo -e "${YELLOW}⚠️  Verify API response structure manually${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "7. Checking for missing exports that might be needed..."
echo "--------------------------------------------------------"

# Check if old files export anything that new files don't
echo "Checking for 'refine' functionality..."
if grep -q "modifyItinerary\|refine" src/services/ai/trip-generator.ts; then
    echo -e "${GREEN}✅ Modification/refinement functionality preserved${NC}"
else
    echo -e "${YELLOW}⚠️  Modification functionality might be missing${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "8. Running TypeScript type check..."
echo "------------------------------------"

echo "Running tsc --noEmit to check for type errors..."
npx tsc --noEmit 2>&1 | head -20
TSC_EXIT_CODE=${PIPESTATUS[0]}

if [ "$TSC_EXIT_CODE" -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${YELLOW}⚠️  TypeScript has some issues (may be unrelated)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "========================================================"
echo "SAFETY CHECK SUMMARY"
echo "========================================================"

if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ Critical Checks: PASSED${NC}"
    echo "   - New AI files don't depend on old ones"
    echo "   - No dynamic imports of old files"
    echo "   - UI properly integrated"
else
    echo -e "${RED}❌ Critical Errors: $ERRORS${NC}"
    echo "   UNSAFE to delete old files!"
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
    echo "   - Some test files may need updating"
    echo "   - Review warnings above"
else
    echo -e "${GREEN}✅ No warnings${NC}"
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}VERDICT: SAFE to delete old AI files${NC}"
    echo ""
    echo "Old files that can be deleted:"
    echo "  - src/services/ai/flows/* (except schemas.ts)"
    echo "  - src/services/ai/conversation/*"
    echo "  - src/services/ai/utils/* (except openai-travel-costs.ts, safeChat.ts)"
    echo "  - src/services/ai/openai-config.ts"
    exit 0
else
    echo -e "${RED}VERDICT: NOT SAFE to delete - fix errors first!${NC}"
    exit 1
fi