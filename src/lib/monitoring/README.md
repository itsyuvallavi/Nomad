# Monitoring & Logging

## Overview

Centralized logging and monitoring utilities for debugging and performance tracking.

## Logger (`logger.ts`)

### Usage

```typescript
import { logger } from '@/lib/monitoring/logger';

// Info log
logger.info('API', 'Processing request', { userId: 123 });

// Warning log
logger.warn('API', 'Rate limit approaching', { remaining: 10 });

// Error log
logger.error('API', 'Request failed', error);
```

### Log Categories

Available categories (LogCategory type):

- `'AI'` - AI service operations
- `'API'` - External API calls (includes OSM)
- `'USER'` - User actions
- `'SYSTEM'` - System operations
- `'ERROR'` - Error handling
- `'DRAFT'` - Draft management
- `'RETRY'` - Retry logic
- And more...

### Log Levels

- `info()` - General information
- `warn()` - Warnings that don't stop execution
- `error()` - Errors that need attention

### Development vs Production

```typescript
// Development: Logs to console
logger.info('API', 'Debug info', data);

// Production: Can be configured to send to:
// - CloudWatch
// - Sentry
// - LogRocket
// - Custom analytics
```

## Error Handler (`error-handler.ts`)

### Usage

```typescript
import { handleError, ErrorCategory } from '@/lib/monitoring/error-handler';

try {
  // Operation that might fail
  await riskyOperation();
} catch (error) {
  handleError(error, ErrorCategory.API);
  // Error is logged and can be reported
}
```

### Error Categories

```typescript
enum ErrorCategory {
  API = 'API',
  AI = 'AI',
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}
```

## Performance Monitoring

### Measuring Operation Time

```typescript
const startTime = performance.now();

// Do operation
await someOperation();

const duration = performance.now() - startTime;
logger.info('SYSTEM', `Operation took ${duration}ms`);
```

### Tracking API Performance

```typescript
// Track OSM queries
logger.info('API', 'OSM query started', { zone: 'Paris' });
const start = Date.now();

const pois = await osmService.findPOIs(...);

logger.info('API', 'OSM query completed', {
  zone: 'Paris',
  duration: Date.now() - start,
  results: pois.length
});
```

## Best Practices

### 1. Use Appropriate Categories

```typescript
// Good
logger.info('API', 'OSM query successful');
logger.info('AI', 'Generation started');

// Bad
logger.info('MISC', 'Something happened');
```

### 2. Include Context

```typescript
// Good - includes useful context
logger.error('API', 'OSM query failed', {
  zone: 'Paris',
  query: 'restaurants',
  error: error.message
});

// Bad - no context
logger.error('API', 'Failed');
```

### 3. Don't Log Sensitive Data

```typescript
// Bad - logs API key
logger.info('API', 'Request', { apiKey: process.env.API_KEY });

// Good - logs safe info
logger.info('API', 'Request', { endpoint: '/api/ai' });
```

## Configuration

### Environment-based Logging

```typescript
// Conditional logging based on environment
if (process.env.NODE_ENV === 'development') {
  logger.info('DEBUG', 'Detailed debug info', largeObject);
}
```

### Log Filtering

```typescript
// Only log certain categories in production
const shouldLog = (category: LogCategory) => {
  if (process.env.NODE_ENV === 'production') {
    return ['ERROR', 'API', 'AI'].includes(category);
  }
  return true;
};
```

## Integration with Services

### AI Service Logging

```typescript
logger.info('AI', 'Processing message', { message: userInput });
logger.info('AI', 'Enriching with OSM data', { destination });
logger.info('AI', 'Generation complete', { duration });
```

### API Service Logging

```typescript
logger.info('API', 'OSM POI query', { activity: 'restaurant' });
logger.warn('API', 'LocationIQ fallback used');
logger.error('API', 'Weather API failed', error);
```

## Future Enhancements

- [ ] Add structured logging (JSON format)
- [ ] Implement log aggregation
- [ ] Add performance metrics dashboard
- [ ] Integrate with error tracking service
- [ ] Add user session tracking