# Files to Remove After Implementing Conversational AI

## Files Being Replaced

### 1. Old Parser (being replaced by intent-understanding.ts)
- `/src/services/ai/utils/ai-destination-parser.ts` - Old strict parser that fails on vague input

### 2. Old Generators (being replaced by conversational-generator.ts)
- Keep `/src/services/ai/utils/simple-generator.ts` for now as fallback
- Later can remove once conversational is proven

### 3. Unused/Redundant Files
- Any test files for the old parser
- Old validation logic that's too strict

## Implementation Status
- ✅ Created intent-understanding.ts
- ✅ Created conversational-generator.ts
- ⏳ Need to update main flow to use new approach
- ⏳ Need to update UI to show AI messages
- ⏳ Then remove old files

## Command to Remove (after testing):
```bash
# Archive old files first
mkdir -p archive/old-ai
mv src/services/ai/utils/ai-destination-parser.ts archive/old-ai/

# After confirming everything works, delete
rm -rf archive/old-ai
```