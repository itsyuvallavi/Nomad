# True Conversational AI Guide - NO DEFAULTS EVER

## 🚫 CRITICAL RULES - NEVER BREAK THESE

### ABSOLUTE NO-NO's:
1. **NEVER use default locations** (No London, Paris, etc. as fallbacks)
2. **NEVER use default dates** (No "tomorrow" or "next week" assumptions)
3. **NEVER use default durations** (No automatic "3 days")
4. **NEVER generate itineraries without explicit user data**
5. **NEVER assume preferences** (No automatic vacation type)

### ALWAYS DO:
1. **ALWAYS ask for missing information**
2. **ALWAYS maintain conversation state**
3. **ALWAYS wait for user responses**
4. **ALWAYS confirm before generating**
5. **ALWAYS allow modifications after generation**

---

## 💬 Conversation Flow Architecture

### State Machine Design
```typescript
enum ConversationState {
  GREETING = 'greeting',
  COLLECTING_DESTINATION = 'collecting_destination',
  COLLECTING_DATES = 'collecting_dates',
  COLLECTING_DURATION = 'collecting_duration',
  COLLECTING_TRAVELERS = 'collecting_travelers',
  COLLECTING_PREFERENCES = 'collecting_preferences',
  CONFIRMING_DETAILS = 'confirming_details',
  GENERATING = 'generating',
  SHOWING_ITINERARY = 'showing_itinerary',
  AWAITING_FEEDBACK = 'awaiting_feedback',
  MODIFYING = 'modifying'
}
```

### Conversation Context Structure
```typescript
interface ConversationContext {
  state: ConversationState;
  collectedData: {
    destination?: string;
    startDate?: string;
    duration?: number;
    travelers?: {
      count: number;
      type: string; // solo, couple, family, group
    };
    preferences?: {
      tripType?: string; // vacation, business, workation
      activities?: string[];
      budget?: string;
      dietary?: string[];
      specialRequests?: string[];
    };
  };
  conversationHistory: Message[];
  currentItinerary?: Itinerary;
  pendingQuestion?: string;
}
```

---

## 🎯 Conversation Examples

### Example 1: Complete Flow
```
User: Hello I want you to help me to plan a trip to London.
AI: Great! I'd love to help you plan your trip to London. When would you like to go and for how long?

User: Next week for about 5 days.
AI: Sounds good! A 5-day trip to London starting next week. Is this trip just for you, or will someone be joining you?

User: That would be for me and my wife.
AI: Wonderful! A 5-day London trip for two. Before I create your itinerary, are there any specific interests or activities you'd like to include? (museums, theatre, shopping, etc.)

User: We love museums and good food
AI: Perfect! I'll make sure to include great museums and restaurants. Let me create your 5-day London itinerary starting September 21st...
[GENERATES ITINERARY]

User: Thank you! Can we make sure to add co-working spaces for the first 3 days?
AI: Of course! I'll update your itinerary to include co-working spaces for the first 3 days. Updating now...
[MODIFIES ITINERARY]
```

### Example 2: Minimal Information Start
```
User: I want to travel
AI: I'd be happy to help you plan a trip! Where would you like to go?

User: Maybe Europe?
AI: Europe has so many amazing destinations! Are you thinking of a specific city or country? Popular options include Paris, Rome, Barcelona, Amsterdam, or London.

User: Let's do Rome
AI: Excellent choice! Rome is incredible. When are you planning to visit?

User: In October
AI: October is a great time for Rome! Which dates in October work best for you, and how many days would you like to stay?

User: First week, maybe 4 days?
AI: Perfect! How about October 1-4 (4 days)? And will you be traveling solo or with others?

User: Solo
AI: Great! A 4-day solo trip to Rome from October 1-4. Any specific interests I should focus on? (history, food, art, nightlife, etc.)

User: Just the classic stuff
AI: Understood! I'll create a classic Rome itinerary with the must-see attractions. Creating your itinerary now...
[GENERATES ITINERARY]
```

### Example 3: Vague Input Handling
```
User: Paris
AI: Paris sounds wonderful! To help you plan the perfect trip, could you tell me:
- When you'd like to visit?
- How long you'd like to stay?

User: Not sure
AI: No problem! Let me help you decide. Are you looking at:
- A quick weekend getaway (2-3 days)?
- A standard city break (4-5 days)?
- An extended stay (week or more)?

User: Standard sounds good
AI: Great! A 4-5 day trip gives you time to see the highlights. What time of year were you thinking? Spring, summer, fall, or winter?

User: Spring
AI: Spring in Paris is beautiful! That's typically March through May. Do you have a preference for early spring (March-April) or late spring (May)?

User: May
AI: Perfect! May is lovely in Paris. Any specific dates in May, or should I suggest some options?

User: You pick
AI: How about May 15-19? That's a Thursday to Monday, which often has better flight prices than weekend-to-weekend. Does that work for you?

User: Yes
AI: Excellent! May 15-19 in Paris. Will you be traveling alone or with others?

User: With my partner
AI: Wonderful! A romantic 5-day Paris trip for two from May 15-19. Let me create your itinerary...
[GENERATES ITINERARY]
```

---

## 🤖 AI Response Templates

### Information Gathering Templates

#### Missing Destination:
```
"I'd be happy to help you plan a trip! Where would you like to go?"
"Where are you thinking of traveling to?"
"What destination do you have in mind?"
```

#### Missing Dates:
```
"When would you like to visit [destination]?"
"What dates are you considering for your trip?"
"When are you planning to travel?"
```

#### Missing Duration:
```
"How long would you like to stay in [destination]?"
"How many days are you planning for this trip?"
"What's the duration you have in mind?"
```

#### Missing Traveler Info:
```
"Will you be traveling solo or with others?"
"Is this a solo trip or will someone be joining you?"
"Who will be traveling with you?"
```

### Confirmation Templates:
```
"Perfect! Let me confirm: A [duration]-day trip to [destination] for [travelers] starting [date]. Is that correct?"
"Great! So that's [destination] from [start] to [end] for [travelers]. Should I create your itinerary?"
```

### Modification Templates:
```
"Of course! I'll update your itinerary to include [request]. Updating now..."
"No problem! Let me modify the itinerary to [change]. One moment..."
"I'll adjust that for you. Making the changes now..."
```

---

## 🔧 Implementation Requirements

### 1. State Management
```typescript
// New conversation state manager
class ConversationStateManager {
  private state: ConversationState;
  private context: ConversationContext;

  constructor() {
    this.state = ConversationState.GREETING;
    this.context = {
      state: ConversationState.GREETING,
      collectedData: {},
      conversationHistory: [],
      pendingQuestion: null
    };
  }

  async processMessage(message: string): Promise<AIResponse> {
    // Analyze message
    const intent = await this.analyzeIntent(message);

    // Update context based on current state
    switch(this.state) {
      case ConversationState.GREETING:
        return this.handleGreeting(message);
      case ConversationState.COLLECTING_DESTINATION:
        return this.handleDestination(message);
      case ConversationState.COLLECTING_DATES:
        return this.handleDates(message);
      // ... etc
    }
  }

  private getMissingInfo(): string[] {
    const missing = [];
    if (!this.context.collectedData.destination) missing.push('destination');
    if (!this.context.collectedData.startDate) missing.push('dates');
    if (!this.context.collectedData.duration) missing.push('duration');
    return missing;
  }

  private canGenerate(): boolean {
    return !!(
      this.context.collectedData.destination &&
      this.context.collectedData.startDate &&
      this.context.collectedData.duration
    );
  }
}
```

### 2. No Default Values Function
```typescript
// REMOVE ALL OF THESE:
function getSmartDefaults() { /* DELETE THIS */ }
function getDefaultDestination() { /* DELETE THIS */ }
function getDefaultDuration() { /* DELETE THIS */ }
function getDefaultDates() { /* DELETE THIS */ }

// REPLACE WITH:
function requireInformation(field: string): AIResponse {
  const questions = {
    destination: "Where would you like to go?",
    dates: "When would you like to travel?",
    duration: "How long would you like to stay?",
    travelers: "Will you be traveling alone or with others?"
  };

  return {
    type: 'question',
    message: questions[field],
    awaitingInput: field,
    cannotProceed: true
  };
}
```

### 3. Message Type System
```typescript
enum MessageType {
  QUESTION = 'question',        // Asking for information
  CONFIRMATION = 'confirmation', // Confirming details
  GENERATION = 'generation',    // Creating itinerary
  MODIFICATION = 'modification', // Updating itinerary
  CLARIFICATION = 'clarification', // Need more specific info
  ERROR = 'error'              // Something went wrong
}

interface AIResponse {
  type: MessageType;
  message: string;
  awaitingInput?: string;
  canProceed: boolean;
  suggestedOptions?: string[];
  itinerary?: Itinerary;
}
```

---

## 📊 Decision Flow Chart

```
User Message
    ↓
Analyze Intent & Current State
    ↓
Has All Required Info?
    ├─ NO → Ask Next Question
    │       ↓
    │   Wait for Response
    │       ↓
    │   Update Context
    │       ↓
    │   [Loop back to Has All Required Info?]
    │
    └─ YES → Confirm Details
            ↓
        User Confirms?
            ├─ NO → Ask What to Change
            │      ↓
            │   Update Context
            │      ↓
            │   [Loop back]
            │
            └─ YES → Generate Itinerary
                    ↓
                Show Itinerary
                    ↓
                Ask for Feedback
                    ↓
                User Wants Changes?
                    ├─ YES → Process Modification
                    │        ↓
                    │    Update Itinerary
                    │        ↓
                    │    [Loop back to Show]
                    │
                    └─ NO → Conversation Complete
```

---

## ✅ Success Criteria

1. **NEVER generates without explicit user data**
2. **ALWAYS asks for missing information**
3. **Maintains conversation context across messages**
4. **Allows iterative refinement**
5. **Provides helpful suggestions when user is unsure**
6. **Confirms details before generation**
7. **Supports modifications after generation**
8. **Natural, friendly conversation flow**

---

## 🚨 Anti-Patterns to Remove

### REMOVE These Patterns:
```typescript
// ❌ NEVER DO THIS:
const destination = parsedDestination || 'London';
const duration = parsedDuration || 3;
const startDate = parsedDate || 'tomorrow';

// ❌ NEVER DO THIS:
if (!destination) {
  return generateDefaultItinerary();
}

// ❌ NEVER DO THIS:
const defaults = {
  destination: 'Paris',
  duration: 3,
  startDate: new Date()
};
```

### REPLACE With:
```typescript
// ✅ ALWAYS DO THIS:
if (!destination) {
  return {
    type: 'question',
    message: 'Where would you like to go?',
    canProceed: false
  };
}

// ✅ ALWAYS DO THIS:
const missingInfo = getMissingRequirements();
if (missingInfo.length > 0) {
  return askForInformation(missingInfo[0]);
}

// ✅ ALWAYS DO THIS:
if (!hasAllRequiredInfo()) {
  return continueConversation();
}
```

---

## 🎯 Final Notes

The AI should feel like talking to a knowledgeable travel agent who:
- Asks clarifying questions
- Never assumes or uses defaults
- Remembers what you've told them
- Confirms before taking action
- Can modify plans based on feedback
- Provides suggestions when you're unsure
- Maintains context throughout the conversation

This is a FUNDAMENTAL change from the current "always generate something" philosophy to a "gather information first, then generate" approach.