# AI Testing Suite

## Comprehensive AI Challenge Test

The **comprehensive-ai-challenge-test.ts** is designed to rigorously test the AI's capabilities across multiple dimensions:

### Test Scenarios

1. **Vague Request Test**
   - Tests if AI properly asks for clarification when given vague inputs
   - Ensures conversational flow works correctly
   - Validates that AI doesn't assume defaults

2. **Complex Multi-City Trip**
   - Tests generation of complex itineraries with multiple destinations
   - Validates handling of specific requirements (coworking, dietary restrictions)
   - Ensures proper duration and location management

3. **Specific Constraints Test**
   - Tests handling of accessibility requirements (wheelchair access)
   - Validates medical needs (dialysis centers)
   - Ensures dietary restrictions are respected (allergies)

4. **Edge Case - Impossible Request**
   - Tests AI's ability to recognize impossible requests
   - Validates graceful handling of contradictory requirements
   - Ensures helpful alternatives are suggested

5. **Modification Flow Test**
   - Tests the ability to modify existing itineraries
   - Validates conversation continuity
   - Ensures changes are properly applied

6. **Stress Test - Maximum Complexity**
   - Tests with 30-day, 10-city European tour
   - Multiple constraints: gluten-free, remote work, budget limits
   - Validates performance under complex requirements

### Running the Tests

```bash
# Run the comprehensive challenge test
npm run test:ai:challenge

# Run with verbose output
tsx tests/ai/comprehensive-ai-challenge-test.ts

# Run specific test scenarios
# (Edit the test file to enable/disable specific scenarios)
```

### Test Validation

Each test validates:
- **Response Structure**: Ensures AI responses follow expected schema
- **Conversation Flow**: Validates multi-turn conversations work correctly
- **Content Quality**: Checks that requirements are met (venues, activities, constraints)
- **Error Handling**: Ensures graceful handling of edge cases
- **Performance**: Monitors response times

### Expected Behavior

The AI should:
1. **Never assume defaults** - Always ask for missing information
2. **Handle constraints properly** - Respect dietary, accessibility, and budget requirements
3. **Generate valid itineraries** - Proper structure with days, activities, venues
4. **Engage conversationally** - Ask clarifying questions when needed
5. **Handle edge cases** - Recognize and respond appropriately to impossible requests

### Test Results

Results are saved to `tests/ai/results/` with detailed information about:
- Pass/fail status for each scenario
- Response times
- Errors and warnings
- Full AI conversation logs

### Success Metrics

- **Pass Rate**: Should be ≥80% for production readiness
- **Response Time**: Average should be <15 seconds for simple requests
- **Conversation Quality**: Should ask relevant questions without being repetitive
- **Content Accuracy**: Generated itineraries should meet stated requirements

## Configuration

The test uses the actual AI service, so ensure:
1. OpenAI API key is configured in `.env`
2. Other API keys (Google, Amadeus) are set if needed
3. The AI service is properly deployed

## Troubleshooting

If tests fail:
1. Check API keys are properly configured
2. Verify AI service is running (`npm run genkit:dev`)
3. Check logs in `logs/ai-requests/` for detailed error information
4. Ensure rate limits haven't been exceeded

## Development

To add new test scenarios:
1. Edit `comprehensive-ai-challenge-test.ts`
2. Add new scenario to `getTestScenarios()` method
3. Define validation logic for the scenario
4. Run tests to validate

The test framework is designed to be extensible and comprehensive, ensuring the AI system meets quality standards before deployment.