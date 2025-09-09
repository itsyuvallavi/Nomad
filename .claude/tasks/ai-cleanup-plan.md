# AI Generator Cleanup Plan

## Files to Remove (Redundant/Unused)

### Definitely Remove:
1. `src/ai/enhanced-generator.ts` - Old v1, replaced by v2 and ultra-fast
2. `src/ai/enhanced-generator-v2.ts` - Replaced by ultra-fast
3. `src/ai/enhanced-generator-optimized.ts` - Never used in main flow
4. `src/ai/genkit.ts` - Unused Genkit/Gemini configuration

### Keep for Now:
1. `src/ai/enhanced-generator-ultra-fast.ts` - Still primary until unified is tested
2. `src/ai/openai-direct.ts` - May contain useful utilities
3. `src/ai/openai-chunked.ts` - May contain useful chunking logic
4. `src/ai/unified-generator.ts` - New consolidated implementation

### After Testing:
Once unified generator is tested and working:
1. Remove `enhanced-generator-ultra-fast.ts`
2. Remove `openai-direct.ts` 
3. Remove `openai-chunked.ts`

## Test Files to Update:
- `tests/test-transport-quick.ts`
- `tests/test-transportation.ts`
- `tests/test-immediate-fix.ts`
- `tests/test-multi-transport.ts`

These test files import the old generators and need to be updated to use the unified generator.

## Migration Steps:
1. ✅ Create unified generator
2. ✅ Update main flow to use unified as fallback
3. ⏳ Remove definitely unused files
4. ⏳ Update test imports
5. ⏳ Test thoroughly
6. ⏳ Remove remaining old generators once confirmed working