# AI System Improvement Plan

## Current Issues Analysis

### Critical Issues (33.3% failure rate)
1. **JSON Parsing Errors**
   - GPT-5 API is correct (`responses.create` is the proper API)
   - Issue is with JSON extraction from `output_text`
   - Model sometimes returns malformed JSON or adds extra text

2. **JSON Parsing Failures**
   - No structured output format specified
   - Using regex to extract JSON from text
   - Model not instructed to output valid JSON consistently

### Performance Issues (avg 9 seconds)
1. **Slow Response Times**
   - No streaming implementation
   - Full JSON response required before processing
   - No caching of common requests

### Date Extraction Issues (27.8% missing)
1. **Poor Date Parsing**
   - Not handling relative dates properly
   - Missing year inference logic
   - Date format validation issues

## Improvement Strategy

### Phase 1: Fix JSON Parsing Issues
1. **Improve Prompt Engineering**
   - Add explicit instructions: "Return ONLY valid JSON, no other text"
   - Provide clear JSON examples in prompts
   - Add structure validation requirements

2. **Enhanced JSON Extraction**
   - Use more robust regex: `/\{[\s\S]*?\}(?![\s\S]*\{)/`
   - Try multiple extraction methods
   - Implement JSON repair for common issues
   - Add retry logic with simplified prompts

### Phase 2: Improve Date Extraction
1. **Enhanced Date Parser**
   - Handle relative dates ("next month", "in 2 weeks")
   - Infer missing year from context
   - Support multiple date formats
   - Add timezone handling

2. **Date Validation**
   - Ensure dates are in future
   - Validate date ranges
   - Calculate duration from date ranges

### Phase 3: Optimize Performance
1. **Response Streaming**
   - Implement streaming for faster perceived response
   - Show partial results as they arrive
   - Progress indicators for long operations

2. **Caching Strategy**
   - Cache common destinations
   - Store successful extractions
   - Pre-process common phrases

### Phase 4: Enhanced Error Handling
1. **Retry Logic**
   - Automatic retry on JSON parse failure
   - Fallback to simpler prompts
   - Progressive complexity reduction

2. **Validation Layer**
   - Schema validation for all responses
   - Field completeness checks
   - Data consistency validation

## Implementation Priority

### Immediate Fixes (Today)
1. ✅ Improve prompt engineering for cleaner JSON output
2. ✅ Add robust JSON extraction and repair logic
3. ✅ Implement retry mechanism for failed parsing
4. ✅ Add comprehensive validation layer

### Short-term (This Week)
1. Improve date extraction logic
2. Add comprehensive validation
3. Implement retry mechanisms
4. Add performance monitoring

### Long-term (Next Sprint)
1. Streaming responses
2. Caching layer
3. ML-based intent detection
4. Multi-language support

## Success Metrics
- Simple test success rate: >95% (currently 83.3%)
- Medium complexity success: >80% (currently 28.6%)
- Complex cases success: >60% (currently 0%)
- Average response time: <3 seconds (currently 9 seconds)
- JSON parse errors: <1% (currently 33.3%)

## Testing Strategy
1. Run comprehensive test suite after each change
2. Compare results with baseline
3. Monitor error rates in production
4. User feedback collection

## Files to Modify
1. `/src/services/ai/ai-controller.ts` - Improve JSON extraction
2. `/src/services/ai/trip-generator.ts` - Better prompt engineering
3. `/src/services/ai/prompts.ts` - Add JSON-focused prompts
4. `/src/lib/utils/json-parser.ts` - Create JSON repair utility
5. `/src/lib/utils/date-parser.ts` - Enhanced date parsing

## Risk Mitigation
- Keep backup of current implementation
- Test changes incrementally
- Monitor API costs closely
- Have rollback plan ready