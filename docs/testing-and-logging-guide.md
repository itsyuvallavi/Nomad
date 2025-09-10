# AI Testing and Logging Guide

## Overview
This document describes the comprehensive testing and logging infrastructure implemented for the Nomad Navigator AI system.

## 1. Test Suite

### Available Test Commands

```bash
# Run basic single-destination tests
npm run test:ai:basic

# Run edge case tests
npm run test:ai:edge

# Run all comprehensive tests
npm run test:ai:comprehensive

# Run original baseline test
npm run test:ai --baseline
```

### Test Structure

Tests are defined in `/tests/ai/golden-tests.json` with the following categories:
- **Basic**: Simple single-destination trips (London, Paris, Tokyo)
- **Multi-city**: Complex multi-destination tours
- **Edge cases**: Vague dates, missing origin, business trips
- **Validation**: Tests that should fail (too many cities, too long)

### Test Runner Features

The comprehensive test runner (`/tests/ai/comprehensive-test-runner.ts`) provides:
- Color-coded terminal output
- Performance metrics tracking
- Automatic validation against expected results
- Test result logging to `/logs/ai-tests/`
- Pass/fail statistics and summaries

## 2. AI Request/Response Logging

### Automatic Logging

Every AI generation request is now automatically logged with:
- Unique request ID
- Timestamp
- Input prompt
- Response data
- Error information (if any)
- Performance metrics (duration, tokens used)
- Metadata (model, strategy, destinations)

### Log Storage

Logs are stored in multiple formats:
- **Daily logs**: `/logs/ai-requests/ai-log-YYYY-MM-DD.jsonl`
- **Session logs**: `/logs/ai-requests/sessions/[session_id].jsonl`
- **Recent cache**: `/logs/ai-requests/recent.json` (last 100 requests)

### Viewing Logs

Use the log viewer CLI tool:

```bash
# Show recent AI requests
npm run logs:ai

# Show daily statistics
npm run logs:ai stats

# Show recent errors
npm run logs:ai errors

# Show help
npm run logs:ai help
```

## 3. Integration Points

### In generate-personalized-itinerary.ts

The logging is integrated at three key points:
1. **Request logging**: When a new request comes in
2. **Response logging**: When generation succeeds
3. **Error logging**: When generation fails

Example log entry:
```json
{
  "id": "req_1234567890_abc123",
  "timestamp": "2025-01-10T12:34:56.789Z",
  "type": "response",
  "duration": 2345,
  "metadata": {
    "model": "gpt-4o-mini",
    "strategy": "ultra-fast",
    "destinations": ["London"],
    "totalDays": 3
  }
}
```

## 4. Debugging Workflow

### When Tests Fail

1. Check the test output for specific error messages
2. View recent logs: `npm run logs:ai`
3. Check error logs: `npm run logs:ai errors`
4. Review the full request/response in session logs

### Performance Issues

1. Check daily stats: `npm run logs:ai stats`
2. Look for slow requests in test results
3. Review logs for timeout errors
4. Check if specific destinations consistently fail

### Common Issues

- **API Key Missing**: Set `OPENAI_API_KEY` in `.env`
- **Timeout Errors**: Check if external APIs (Amadeus, Weather) are down
- **Schema Validation**: Review the Zod schemas if responses don't validate
- **Rate Limiting**: Add delays between tests if hitting rate limits

## 5. Best Practices

### During Development

1. **Run basic tests first**: `npm run test:ai:basic`
2. **Check logs after failures**: `npm run logs:ai errors`
3. **Monitor performance**: Watch for increasing response times
4. **Test edge cases**: Run `npm run test:ai:edge` before deployment

### Before Deployment

1. Run full test suite: `npm run test:ai:comprehensive`
2. Review error logs for patterns
3. Check average response times
4. Ensure all basic tests pass

### In Production

1. Monitor daily stats regularly
2. Set up alerts for high error rates
3. Archive old logs periodically
4. Use feedback API for user reports

## 6. File Structure

```
/home/user/studio/
├── tests/ai/
│   ├── golden-tests.json              # Test case definitions
│   ├── comprehensive-test-runner.ts   # Main test runner
│   └── ai-testing-monitor.ts         # Original baseline tests
├── src/lib/utils/
│   └── ai-logger.ts                  # Logging utility
├── scripts/
│   └── view-ai-logs.ts              # CLI log viewer
└── logs/
    ├── ai-tests/                    # Test results
    │   └── test-results-*.json
    └── ai-requests/                 # AI request logs
        ├── ai-log-*.jsonl
        ├── recent.json
        └── sessions/*.jsonl
```

## 7. Future Enhancements

Once deployed with real users:
1. Enable feedback collection through UI
2. Implement ML learning from feedback
3. Add automated prompt optimization
4. Create dashboards for monitoring
5. Set up alerting for anomalies

## Summary

The testing and logging infrastructure provides:
- **Comprehensive testing** with golden test cases
- **Automatic logging** of all AI interactions
- **Easy debugging** with CLI tools
- **Performance tracking** for optimization
- **Error monitoring** for reliability

This foundation ensures the AI system is reliable, debuggable, and ready for continuous improvement.