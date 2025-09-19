#!/bin/bash

echo "================================================"
echo "Verifying UI uses ONLY new AI components"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check for old AI imports
echo "Checking for OLD AI imports (should find NONE)..."
echo "------------------------------------------------"

OLD_FLOWS=$(grep -r "from '@/services/ai/flows/'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "// OLD IMPORTS REMOVED" | wc -l)
OLD_CONVERSATION=$(grep -r "from '@/services/ai/conversation/'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
OLD_UTILS=$(grep -r "from '@/services/ai/utils/'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "openai-travel-costs" | grep -v "safeChat" | wc -l)

if [ "$OLD_FLOWS" -eq 0 ]; then
    echo -e "${GREEN}✅ No old flow imports found${NC}"
else
    echo -e "${RED}❌ Found $OLD_FLOWS old flow imports!${NC}"
    grep -r "from '@/services/ai/flows/'" src/ --include="*.tsx" --include="*.ts"
fi

if [ "$OLD_CONVERSATION" -eq 0 ]; then
    echo -e "${GREEN}✅ No old conversation imports found${NC}"
else
    echo -e "${RED}❌ Found $OLD_CONVERSATION old conversation imports!${NC}"
    grep -r "from '@/services/ai/conversation/'" src/ --include="*.tsx" --include="*.ts"
fi

if [ "$OLD_UTILS" -eq 0 ]; then
    echo -e "${GREEN}✅ No problematic utils imports found${NC}"
else
    echo -e "${RED}❌ Found $OLD_UTILS problematic utils imports!${NC}"
    grep -r "from '@/services/ai/utils/'" src/ --include="*.tsx" --include="*.ts" | grep -v "openai-travel-costs" | grep -v "safeChat"
fi

echo ""
echo "Checking for NEW AI imports (should find some)..."
echo "------------------------------------------------"

NEW_CONTROLLER=$(grep -r "from '@/services/ai/ai-controller'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
NEW_GENERATOR=$(grep -r "from '@/services/ai/trip-generator'" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
NEW_PROMPTS=$(grep -r "from './prompts'" src/services/ai/ --include="*.ts" 2>/dev/null | wc -l)

if [ "$NEW_CONTROLLER" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $NEW_CONTROLLER ai-controller imports${NC}"
else
    echo -e "${RED}❌ No ai-controller imports found!${NC}"
fi

if [ "$NEW_GENERATOR" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $NEW_GENERATOR trip-generator imports${NC}"
else
    echo -e "${RED}❌ No trip-generator imports found!${NC}"
fi

if [ "$NEW_PROMPTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $NEW_PROMPTS prompts imports${NC}"
else
    echo -e "${RED}❌ No prompts imports found!${NC}"
fi

echo ""
echo "Checking API route integration..."
echo "------------------------------------------------"

API_ROUTE="/home/user/studio/src/app/api/ai/generate-itinerary-v2/route.ts"
if [ -f "$API_ROUTE" ]; then
    if grep -q "AIController" "$API_ROUTE" && grep -q "TripGenerator" "$API_ROUTE"; then
        echo -e "${GREEN}✅ API route uses new AI components${NC}"
    else
        echo -e "${RED}❌ API route not using new components!${NC}"
    fi
else
    echo -e "${RED}❌ API route file not found!${NC}"
fi

echo ""
echo "================================================"
echo "VERIFICATION SUMMARY"
echo "================================================"

TOTAL_OLD=$((OLD_FLOWS + OLD_CONVERSATION + OLD_UTILS))
TOTAL_NEW=$((NEW_CONTROLLER + NEW_GENERATOR + NEW_PROMPTS))

if [ "$TOTAL_OLD" -eq 0 ] && [ "$TOTAL_NEW" -gt 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: UI uses ONLY new AI components!${NC}"
    echo -e "${GREEN}   No old imports found${NC}"
    echo -e "${GREEN}   New components properly integrated${NC}"
    exit 0
else
    echo -e "${RED}❌ FAILURE: Issues found${NC}"
    echo -e "${RED}   Old imports: $TOTAL_OLD${NC}"
    echo -e "${RED}   New imports: $TOTAL_NEW${NC}"
    exit 1
fi