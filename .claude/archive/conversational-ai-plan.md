# Conversational AI Plan

## Current State
- System tries to parse everything upfront with strict rules
- Fails when input is vague or incomplete
- No dialog with user for clarification
- Already has `conversationHistory` parameter but not using it well

## Proposed Approach: Conversational Flow

### 1. Accept ANY Input
Instead of failing on vague input, generate something and ask for refinement:

```
User: "I want to travel"
AI: "I'd love to help plan your trip! I've created a sample 3-day itinerary for Paris.
     Where would you like to go and for how long?"
[Shows Paris itinerary]

User: "Actually, I want London for a week"
AI: "Perfect! Here's your 7-day London adventure..."
[Updates to London itinerary]
```

### 2. Remove Strict Parser, Use Flexible Understanding

**Current (Too Strict):**
```typescript
// Throws error if no destination found
if (!parsedTrip.destinations || parsedTrip.destinations.length === 0) {
  throw new Error('No destinations found in prompt');
}
```

**Proposed (Conversational):**
```typescript
// If unclear, generate a starter itinerary and ask
if (!parsedTrip.destinations || parsedTrip.destinations.length === 0) {
  // Generate default trip
  const starterTrip = await generateStarterItinerary(prompt);

  // Add conversational response
  starterTrip.aiMessage = getConversationalResponse(prompt);

  return starterTrip;
}
```

### 3. Conversational Response Types

```typescript
function getConversationalResponse(prompt: string): string {
  // Questions
  if (prompt.match(/^(can|could|would|will|do|does|is|are|what|how|where|when)/i)) {
    return "I'd be happy to help plan your trip! Where would you like to go?";
  }

  // Just a number
  if (prompt.match(/^\d+$/)) {
    return `Great! A ${prompt}-day trip. Where would you like to visit?`;
  }

  // Just a city name
  if (prompt.match(/^[A-Z][a-z]+$/)) {
    return `${prompt} is wonderful! I've created a 3-day itinerary. Would you like more or fewer days?`;
  }

  // Empty or nonsense
  if (!prompt || prompt.length < 3) {
    return "I'd love to help you plan an amazing trip! Tell me where you'd like to go or what kind of experience you're looking for.";
  }

  // Vague
  return "I've created a sample itinerary to get started. Feel free to tell me what you'd like to change!";
}
```

### 4. Smart Defaults Based on Input

```typescript
function getSmartDefaults(prompt: string): TripDefaults {
  const lowerPrompt = prompt.toLowerCase();

  // Weekend mentioned
  if (lowerPrompt.includes('weekend')) {
    return { duration: 2, destination: 'Paris' }; // Popular weekend destination
  }

  // Business trip indicators
  if (lowerPrompt.match(/business|work|conference/)) {
    return { duration: 3, destination: 'New York' };
  }

  // Vacation indicators
  if (lowerPrompt.match(/vacation|holiday|relax/)) {
    return { duration: 7, destination: 'Bali' };
  }

  // Adventure indicators
  if (lowerPrompt.match(/adventure|hiking|nature/)) {
    return { duration: 5, destination: 'Iceland' };
  }

  // Default
  return { duration: 3, destination: 'London' };
}
```

### 5. Progressive Enhancement Through Conversation

```typescript
// First interaction
User: "Europe"
AI: Generates 7-day Europe tour (London, Paris, Rome)
    "Here's a classic 7-day European adventure! Want to adjust the cities or duration?"

// Second interaction
User: "Add Barcelona"
AI: Updates to include Barcelona
    "Added Barcelona! Now it's a 9-day trip. Should I extend it or keep it compact?"

// Third interaction
User: "Keep it 7 days"
AI: Optimizes to 7 days
    "Perfect! I've optimized it to 7 days with the highlights of each city."
```

## Implementation Steps

### Step 1: Update Simple Generator
```typescript
// src/services/ai/utils/simple-generator.ts

export async function generateSimpleItinerary(prompt, conversationHistory) {
  // Try to understand intent
  const intent = await understandIntent(prompt, conversationHistory);

  // Always generate something
  let itinerary;
  if (intent.isQuestion) {
    itinerary = await generateStarterItinerary();
    itinerary.aiMessage = getHelpfulResponse(prompt);
  } else if (intent.destinations.length === 0) {
    const defaults = getSmartDefaults(prompt);
    itinerary = await generateDefaultItinerary(defaults);
    itinerary.aiMessage = "I've created a sample itinerary. Tell me what you'd like to change!";
  } else {
    itinerary = await generateRequestedItinerary(intent);
  }

  return itinerary;
}
```

### Step 2: Add Intent Understanding
```typescript
// New file: src/services/ai/utils/intent-classifier.ts

export async function understandIntent(prompt: string, history?: string) {
  // Use GPT to understand what the user wants
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: `Classify the user's intent:
        - isQuestion: true if asking for help
        - needsClarification: true if too vague
        - destinations: array of destinations mentioned
        - duration: number of days (default 3)
        - tripType: leisure|business|adventure|cultural
        - sentiment: excited|curious|confused|specific`
    }, {
      role: 'user',
      content: history ? `${history}\n${prompt}` : prompt
    }],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Step 3: Update UI to Show AI Messages
```typescript
// components/chat/chat-interface.tsx

if (result.aiMessage) {
  // Show AI's conversational response
  addMessage({
    role: 'assistant',
    content: result.aiMessage,
    type: 'conversational'
  });
}

// Always show the itinerary (even if it's a starter)
if (result.itinerary) {
  showItinerary(result);
}
```

## Benefits

1. **Never fails** - Always generates something useful
2. **Natural conversation** - Feels like talking to a travel agent
3. **Progressive refinement** - Start broad, get specific through dialog
4. **Better UX** - No frustrating error messages
5. **Learning** - System learns user preferences through conversation

## Test Cases After Implementation

| Input | Current Behavior | New Behavior |
|-------|-----------------|--------------|
| "" (empty) | Error: No destinations | "I'd love to help plan your trip! Where would you like to go?" + Shows London starter |
| "5" | Error: No destinations | "A 5-day trip sounds great! Where would you like to visit?" + Shows 5-day Paris |
| "London" | 1 day only | "London is wonderful! Here's a 3-day itinerary. Want more days?" |
| "Can you help?" | JSON error/crash | "Of course! Tell me about your dream trip..." + Shows sample |
| "asdfgh" | Error | "I'd love to help! Where are you thinking of traveling?" + Shows starter |
| "Trip to Paris last week" | No destinations found | "Paris is beautiful! Here's a 3-day Paris itinerary with future dates." |

## Next Steps

1. Remove strict parsing requirements
2. Add conversational response generation
3. Implement smart defaults
4. Update UI to show AI messages
5. Test with edge cases