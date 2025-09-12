# Production Monitoring Guide

This guide explains how to monitor user interactions and itinerary generations in your deployed Nomad Navigator app.

## 🔍 What Gets Logged

### User Interactions
- **Page visits** and navigation
- **Prompt submissions** with metadata
- **Button clicks** and feature usage
- **Session duration** and engagement
- **Error encounters** and user feedback

### Itinerary Generation
- **Full request/response data** for every generation
- **Performance metrics** (response times, API calls)
- **Success/failure rates** and error details
- **Popular destinations** and travel patterns
- **User prompts** and AI responses
- **Strategy usage** (ultra-fast vs enhanced)

### System Metrics
- **API response times** across services
- **Error rates** and failure patterns
- **Cache hit rates** and performance
- **Resource usage** and scaling needs

## 📊 Monitoring Dashboard Locations

### 1. Local Log Files (Development)
```bash
# View recent activity
npm run logs:production recent

# Daily statistics
npm run logs:production stats

# User session analysis  
npm run logs:production sessions

# List all log files
npm run logs:production files
```

**Log files location**: `logs/production/production-YYYY-MM-DD.json`

### 2. Firebase Analytics (Production)
Once deployed, visit your Firebase Console:
- Go to **Analytics > Events** to see real-time user interactions
- Check **Analytics > Audiences** for user behavior patterns
- Review **Analytics > Funnels** for conversion tracking

**Key events to monitor**:
- `itinerary_generation_start` - User submitted a prompt
- `itinerary_generation_success` - Successfully generated itinerary
- `itinerary_generation_error` - Generation failed
- `user_prompt_submitted` - Raw prompt data
- `user_feedback_provided` - User satisfaction feedback

### 3. Server Logs (Firebase Hosting)
```bash
# View Firebase function logs
firebase functions:log

# Real-time log streaming
firebase functions:log --follow
```

## 🛠️ Log Analysis Commands

### Recent Activity Monitor
```bash
# Show last 50 log entries
npm run logs:production recent 50

# Monitor in real-time (during development)
watch -n 5 "npm run logs:production recent 10"
```

### Daily Statistics
```bash
# Today's stats
npm run logs:production stats

# Specific date
npm run logs:production stats 2025-09-11

# Get stats for multiple dates
for date in 2025-09-10 2025-09-11 2025-09-12; do
  echo "=== $date ===" 
  npm run logs:production stats $date
done
```

### User Session Analysis
```bash
# Analyze user sessions for today
npm run logs:production sessions

# Specific date
npm run logs:production sessions 2025-09-11
```

## 📈 Key Metrics to Track

### Performance Metrics
- **Average response time**: Should be < 15 seconds
- **Success rate**: Target > 95%
- **Cache hit rate**: Higher is better for performance
- **API error rate**: Should be minimal

### User Engagement
- **Sessions per day**: Growth indicator
- **Prompts per session**: Engagement depth
- **Session duration**: User satisfaction
- **Return visits**: Product stickiness

### Popular Patterns
- **Most requested destinations**
- **Common trip durations**  
- **Popular travel dates**
- **Error patterns** and user pain points

## 🚨 Monitoring Alerts

### Set up alerts for:
1. **High error rates** (>5% in 1 hour)
2. **Slow response times** (>30s average)
3. **API quota exhaustion**
4. **Unusual traffic spikes**

### Firebase Console Alerts
1. Go to **Project Settings > Integrations**
2. Set up **Slack/Email notifications**
3. Configure **Performance monitoring**
4. Enable **Crash reporting**

## 🔍 Real-World Usage Analysis

### Understanding User Prompts
```bash
# Extract popular destinations from logs
npm run logs:production stats | grep -o '"destination":"[^"]*"' | sort | uniq -c | sort -nr

# Find most common prompt patterns
grep "itinerary_generation_start" logs/production/*.json | head -20
```

### Debugging Failed Generations
```bash
# Find recent errors
npm run logs:production recent 100 | grep "❌ FAILED"

# Get error details for specific date
grep "error" logs/production/production-2025-09-11.json | jq '.error.message'
```

### Performance Optimization
```bash
# Find slow requests (>20 seconds)
grep "duration_ms" logs/production/*.json | awk -F'"duration_ms":' '{print $2}' | awk -F',' '{print $1}' | sort -n | tail -10
```

## 🎯 Learning from User Data

### What to Look For:
1. **Failed prompts** - What inputs break the system?
2. **Popular destinations** - Where do people want to go?
3. **Trip patterns** - How long are typical trips?
4. **Time-to-abandon** - When do users give up?
5. **Successful interactions** - What works well?

### Data-Driven Improvements:
- **Add static data** for frequently requested cities
- **Optimize prompts** based on successful patterns
- **Fix common error scenarios**
- **Improve response times** for popular routes
- **Pre-cache** popular destinations

## 🔐 Privacy & Security

### Data Protection:
- **User IPs** are not logged
- **Personal info** in prompts is not stored
- **Session IDs** are anonymized (last 8 chars only)
- **User agents** are truncated for privacy
- **Prompts** are stored for improvement but can be purged

### GDPR Compliance:
- Users can request data deletion
- No personal identifiers are stored
- All logging is for service improvement only
- Data retention: 30 days for detailed logs, 1 year for aggregated metrics

## 🚀 Scaling Monitoring

As your app grows:
1. **Set up log aggregation** (ELK stack, Datadog)
2. **Create dashboards** for key metrics
3. **Implement automated alerts**
4. **Set up A/B testing** for improvements
5. **Add user feedback loops**

---

**Quick Start**: After deployment, run `npm run logs:production recent` to see your first users interacting with the app! 🎉