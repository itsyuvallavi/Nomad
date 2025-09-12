# Trip Data Collection & Analytics Plan

## Overview
Implement a system to collect, store, and analyze trip generation data to improve AI performance and identify errors.

## Goals
1. **Training Data Collection** - Gather successful trip generations for AI model improvement
2. **Error Detection** - Identify patterns in failed or problematic generations
3. **User Behavior Analysis** - Understand how users interact with the system
4. **Quality Metrics** - Track AI response quality over time
5. **Performance Monitoring** - Measure response times and API usage

## Architecture Options

### Option 1: Firebase Analytics + BigQuery (Recommended)
**Pros:**
- Already using Firebase
- Automatic BigQuery export
- Built-in dashboard
- GDPR compliant
- Cost-effective

**Cons:**
- Limited custom events (500)
- Some learning curve for BigQuery

### Option 2: Custom Analytics Service
**Pros:**
- Full control over data
- Custom schema
- Real-time processing

**Cons:**
- More development work
- Additional infrastructure
- Privacy compliance burden

### Option 3: Third-party Analytics (Mixpanel/Amplitude)
**Pros:**
- Ready-made dashboards
- Advanced analytics features
- Easy integration

**Cons:**
- Monthly costs
- Data ownership concerns
- Privacy implications

## Implementation Plan (Firebase + BigQuery)

### Phase 1: Basic Data Collection (Week 1)

#### 1.1 Create Analytics Service
```typescript
// src/lib/analytics/trip-analytics.ts
interface TripAnalytics {
  // Trip Generation Events
  tripGenerationStarted(data: {
    userId: string;
    prompt: string;
    timestamp: Date;
    sessionId: string;
  }): void;

  tripGenerationCompleted(data: {
    userId: string;
    tripId: string;
    prompt: string;
    destination: string;
    duration: number;
    generationTime: number;
    tokenCount: number;
    success: boolean;
    errorType?: string;
  }): void;

  tripGenerationFailed(data: {
    userId: string;
    prompt: string;
    errorMessage: string;
    errorCode: string;
    stage: 'parsing' | 'generation' | 'validation';
    timestamp: Date;
  }): void;

  // User Interaction Events
  tripModified(data: {
    tripId: string;
    modificationType: string;
    changes: any;
  }): void;

  tripShared(data: {
    tripId: string;
    shareMethod: string;
  }): void;

  tripDeleted(data: {
    tripId: string;
    reason?: string;
  }): void;
}
```

#### 1.2 Data Points to Collect

**Per Trip Generation:**
- User ID (anonymized)
- Session ID
- Timestamp
- Prompt text
- Prompt complexity score
- AI model used
- Token usage
- Generation time
- Success/failure status
- Error details (if failed)
- Retry count

**Generated Trip Data:**
- Destination(s)
- Duration
- Budget range
- Travel style
- Number of activities
- Activity categories
- Estimated costs
- Hotels suggested
- Flights found

**Quality Metrics:**
- Completeness score (all fields filled?)
- Coherence score (activities match destination?)
- Diversity score (variety in suggestions)
- User satisfaction (if they save/modify/delete)

### Phase 2: Advanced Analytics (Week 2)

#### 2.1 Error Tracking System
```typescript
// src/lib/analytics/error-tracker.ts
interface ErrorTracker {
  trackAIError(error: {
    type: 'timeout' | 'invalid_response' | 'api_error' | 'validation_failed';
    context: {
      prompt: string;
      stage: string;
      aiResponse?: any;
    };
    stack?: string;
  }): void;

  trackAPIError(error: {
    api: 'amadeus' | 'google' | 'openai' | 'weather';
    endpoint: string;
    statusCode?: number;
    message: string;
  }): void;
}
```

#### 2.2 Performance Metrics
```typescript
interface PerformanceMetrics {
  // Response times
  aiResponseTime: number;
  apiResponseTimes: Record<string, number>;
  totalGenerationTime: number;
  
  // Resource usage
  tokensUsed: number;
  apiCallCount: Record<string, number>;
  cacheHitRate: number;
  
  // Quality scores
  promptClarityScore: number;
  responseCompleteness: number;
  userSatisfactionScore?: number;
}
```

### Phase 3: Data Pipeline (Week 3)

#### 3.1 Real-time Collection
```typescript
// src/lib/analytics/collector.ts
class TripDataCollector {
  private queue: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  async collect(event: AnalyticsEvent) {
    this.queue.push(event);
    
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  private async flush() {
    const events = [...this.queue];
    this.queue = [];
    
    // Send to Firestore analytics collection
    await this.sendToFirestore(events);
    
    // Send critical errors immediately to monitoring
    const errors = events.filter(e => e.type === 'error');
    if (errors.length > 0) {
      await this.alertOnErrors(errors);
    }
  }
}
```

#### 3.2 Storage Schema
```typescript
// Firestore Collections

// analytics/trips/{docId}
interface TripAnalyticsDoc {
  tripId: string;
  userId: string; // hashed for privacy
  timestamp: Timestamp;
  prompt: {
    text: string;
    length: number;
    language: string;
    complexity: number;
  };
  generation: {
    model: string;
    duration: number;
    tokens: number;
    attempts: number;
  };
  result: {
    success: boolean;
    destination: string;
    tripDuration: number;
    activities: number;
    errorType?: string;
    errorMessage?: string;
  };
  quality: {
    completeness: number;
    coherence: number;
    diversity: number;
  };
  userActions: {
    saved: boolean;
    modified: boolean;
    deleted: boolean;
    timeSpent: number;
  };
}

// analytics/errors/{docId}
interface ErrorAnalyticsDoc {
  timestamp: Timestamp;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: any;
  userId?: string;
  tripId?: string;
  resolved: boolean;
  resolutionTime?: number;
}

// analytics/performance/{date}/{hourly}
interface PerformanceDoc {
  timestamp: Timestamp;
  metrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    totalTokensUsed: number;
    uniqueUsers: number;
    apiUsage: Record<string, number>;
  };
}
```

### Phase 4: Analysis Dashboard (Week 4)

#### 4.1 Admin Dashboard Pages
1. **Overview Dashboard**
   - Total trips generated
   - Success rate
   - Average generation time
   - Popular destinations
   - Error rate trends

2. **AI Performance**
   - Token usage over time
   - Response time distribution
   - Error patterns
   - Prompt complexity vs success rate

3. **User Insights**
   - Most common trip types
   - User satisfaction metrics
   - Feature usage statistics
   - Drop-off points

4. **Error Analysis**
   - Error frequency by type
   - Error patterns
   - Failed prompt analysis
   - API failure tracking

#### 4.2 Export Capabilities
```typescript
// src/lib/analytics/export.ts
class DataExporter {
  async exportForTraining(filters: {
    dateRange: [Date, Date];
    minQualityScore?: number;
    onlySuccessful?: boolean;
  }) {
    // Export successful trips for AI training
    const trips = await this.getFilteredTrips(filters);
    
    // Format for fine-tuning
    return trips.map(trip => ({
      prompt: trip.prompt.text,
      completion: trip.result,
      metadata: {
        quality: trip.quality,
        userSatisfaction: trip.userActions.saved
      }
    }));
  }

  async exportErrors(dateRange: [Date, Date]) {
    // Export errors for analysis
    return this.getErrors(dateRange);
  }
}
```

## Privacy & Compliance

### Data Privacy Measures
1. **User Consent**
   - Add analytics consent to terms
   - Provide opt-out option
   - Clear data usage policy

2. **Data Anonymization**
   - Hash user IDs
   - Remove PII from prompts
   - Aggregate sensitive data

3. **Data Retention**
   - 90-day detailed data
   - 1-year aggregated data
   - User right to deletion

### GDPR Compliance
```typescript
// src/lib/analytics/privacy.ts
class PrivacyManager {
  async anonymizePrompt(prompt: string): string {
    // Remove emails, phone numbers, names
    return prompt
      .replace(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, '[NAME]')
      .replace(/\S+@\S+\.\S+/g, '[EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  }

  async deleteUserData(userId: string) {
    // Delete all analytics data for user
    await this.deleteFromAllCollections(userId);
  }

  async exportUserData(userId: string) {
    // GDPR data export
    return this.getAllUserAnalytics(userId);
  }
}
```

## Implementation Checklist

### Week 1: Foundation
- [ ] Set up analytics service structure
- [ ] Implement basic event tracking
- [ ] Add to trip generation flow
- [ ] Create Firestore collections
- [ ] Test data collection

### Week 2: Enhancement
- [ ] Add error tracking
- [ ] Implement performance metrics
- [ ] Add quality scoring
- [ ] Set up data batching
- [ ] Create privacy controls

### Week 3: Analysis
- [ ] Build admin dashboard
- [ ] Create data export tools
- [ ] Set up BigQuery export
- [ ] Implement alerting system
- [ ] Add monitoring

### Week 4: Optimization
- [ ] Fine-tune metrics
- [ ] Create training data pipeline
- [ ] Build error pattern detection
- [ ] Add automated reports
- [ ] Document everything

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Health Metrics**
   - Success rate < 80%
   - Response time > 10s
   - Error rate > 5%

2. **Quality Metrics**
   - Completeness score < 70%
   - User deletion rate > 20%
   - Retry rate > 30%

3. **Resource Metrics**
   - Token usage spike (>2x normal)
   - API failures > 10/hour
   - Database size > limits

### Alert Channels
- Email for critical issues
- Slack for warnings
- Dashboard for monitoring

## ROI & Benefits

### Expected Outcomes
1. **AI Improvement**
   - 20% reduction in generation failures
   - 30% improvement in response quality
   - Better prompt understanding

2. **Cost Optimization**
   - Identify expensive operations
   - Reduce unnecessary API calls
   - Optimize token usage

3. **User Experience**
   - Faster response times
   - Fewer errors
   - Better trip suggestions

## Tools & Technologies

### Required
- Firebase Analytics
- Firestore
- Cloud Functions
- BigQuery (optional)

### Optional
- Grafana for visualization
- Sentry for error tracking
- Datadog for monitoring

## Budget Estimate

### Monthly Costs (1000 users)
- Firebase Analytics: Free
- Firestore storage: ~$5
- Cloud Functions: ~$10
- BigQuery: ~$5
- **Total: ~$20/month**

## Next Steps

1. **Immediate (This Week)**
   - Review and approve plan
   - Set up basic tracking
   - Start collecting data

2. **Short Term (2 Weeks)**
   - Implement error tracking
   - Build simple dashboard
   - Start analyzing patterns

3. **Long Term (1 Month)**
   - Export training data
   - Fine-tune AI model
   - Optimize based on insights

## Success Metrics

- **Week 1:** Basic data collection working
- **Week 2:** 100+ trips analyzed
- **Week 3:** Dashboard operational
- **Week 4:** First insights report
- **Month 2:** AI model improved with collected data

---

## Quick Start Code

```typescript
// Add to chat-container.tsx
import { tripAnalytics } from '@/lib/analytics/trip-analytics';

// When generation starts
tripAnalytics.tripGenerationStarted({
  userId: user?.uid || 'anonymous',
  prompt: initialPrompt.prompt,
  timestamp: new Date(),
  sessionId: currentSearchId.current
});

// When generation completes
tripAnalytics.tripGenerationCompleted({
  userId: user?.uid || 'anonymous',
  tripId: firestoreTripId,
  prompt: initialPrompt.prompt,
  destination: itinerary.destination,
  duration: itinerary.tripDuration,
  generationTime: Date.now() - startTime,
  tokenCount: estimatedTokens,
  success: true
});

// When generation fails
tripAnalytics.tripGenerationFailed({
  userId: user?.uid || 'anonymous',
  prompt: initialPrompt.prompt,
  errorMessage: error.message,
  errorCode: error.code,
  stage: 'generation',
  timestamp: new Date()
});
```

---

**Document Version:** 1.0
**Created:** 2025-09-12
**Status:** Ready for Review