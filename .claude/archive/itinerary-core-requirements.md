# Itinerary Core Requirements & AI Behavior

## 🎯 Core Requirements (MUST HAVE)

### 1. **Location** (WHERE)
- At least one destination
- If not provided → Ask: "Where would you like to go?"
- Default if still unclear → London or Paris (popular, safe choices)

### 2. **Time** (WHEN)
- Start date for the trip
- If not provided → Default: Tomorrow
- Handle: "next week", "in June", "next month", etc.

### 3. **Length** (HOW LONG)
- Duration in days
- If not provided → Default: 3 days
- Min: 1 day, Max: 30 days

## 🏖️ Default Trip Type: VACATION

The AI should ALWAYS generate a **balanced vacation itinerary** by default:

```
Morning: Sightseeing/Attractions
Lunch: Local cuisine
Afternoon: Cultural activities/Museums
Evening: Dining and leisure
```

## ➕ Optional Add-ons (ONLY if requested)

These are NOT included unless explicitly asked for:

### Work/Business Features
- **Coworking spaces** - Only if user mentions "work", "remote", "digital nomad", "coworking"
- **Business centers** - Only if user mentions "business", "meetings"
- **Conference venues** - Only if user mentions "conference", "convention"

### Special Requirements
- **Dietary restrictions** - Only if mentioned (vegan, halal, kosher, allergies)
- **Specific activities** - Only if requested (hiking, diving, skiing, etc.)
- **Budget constraints** - Only if specified (budget, cheap, luxury)
- **Accommodation type** - Default to hotels unless specified (hostel, Airbnb, resort)
- **Transportation preferences** - Only if mentioned (no flying, train only, etc.)

## 💬 Conversational Flow Examples

### Example 1: Minimal Input
```
User: "London"
AI: "Great choice! I've created a 3-day London vacation starting tomorrow.
    When would you like to travel and for how long?"
[Shows 3-day London vacation itinerary]
```

### Example 2: Partial Input
```
User: "5 days"
AI: "Perfect! A 5-day trip. Where would you like to go?"
[Shows 5-day Paris vacation as starter]
```

### Example 3: Complete Input
```
User: "3 days in Tokyo next week"
AI: "Wonderful! Here's your 3-day Tokyo adventure starting next week."
[Shows complete itinerary]
```

### Example 4: With Add-ons
```
User: "5 days in Bali, need coworking spaces"
AI: "Perfect for a workation! I've included coworking spaces and balanced it with vacation activities."
[Shows itinerary with coworking spaces in mornings, vacation activities in afternoons/evenings]
```

## 🤖 AI System Prompts

### For Intent Understanding
```
Identify the core requirements:
1. Location: [city/country or null]
2. Time: [start date or null]
3. Length: [number of days or null]

Trip type:
- Default: "vacation"
- Only mark as "workation" if user mentions: work, remote, coworking, digital nomad
- Only mark as "business" if user mentions: business, meetings, conference

Special requests (only if explicitly mentioned):
- dietary_restrictions: [list or null]
- activities: [specific activities or null]
- budget: [budget level or null]
```

### For Itinerary Generation
```
Generate a {length}-day {trip_type} itinerary for {location}.

IMPORTANT:
- Default type is VACATION - focus on tourism, culture, food, and relaxation
- Balance activities throughout the day
- Include local cuisine experiences
- Mix popular attractions with hidden gems

ONLY include if specifically requested:
- Coworking spaces (if trip_type = "workation")
- Business facilities (if trip_type = "business")
- Dietary-specific restaurants (if dietary_restrictions provided)
- Specific activity venues (if activities mentioned)

Standard vacation schedule:
- Morning (9-12): Major attractions/sightseeing
- Lunch (12-2): Local restaurants
- Afternoon (2-6): Museums/culture/shopping
- Evening (6-10): Dinner and entertainment
```

## ✅ Implementation Checklist

1. **Update AI Parser**
   - Focus only on extracting: location, time, length
   - Don't try to parse activities or preferences

2. **Update Generator**
   - Default to vacation itinerary
   - Only add work/special features if detected in intent

3. **Add Intent Classifier**
   - Detect if user is asking about work/coworking
   - Detect special dietary or activity requests

4. **Smart Defaults**
   - Location not found → "Where would you like to go?" + London starter
   - Time not found → Tomorrow
   - Length not found → 3 days

5. **Conversation Memory**
   - Remember user preferences from previous messages
   - Build up the trip through conversation

## 🎯 Success Metrics

The system should:
1. Never fail to generate an itinerary
2. Always default to vacation unless work is mentioned
3. Ask for clarification on missing core requirements
4. Not assume special requirements (diet, activities, work)
5. Generate balanced, enjoyable vacation itineraries by default