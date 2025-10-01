# AI Controller Modules

Supporting modules for the AIController that handle conversation management and intent extraction.

**Last Updated**: January 25, 2025

## Modules

### intent-parser.ts (497 lines)
**Purpose**: Extracts structured travel intent from natural language input

**Key Functions**:
- `parseIntent()` - Main entry point for intent extraction
- `extractWithPatterns()` - Pattern-based extraction for common formats
- `extractWithGPT()` - GPT-4o-mini fallback for complex queries
- `detectMultiCity()` - Identifies multi-destination trips
- `parseDates()` - Handles relative and absolute date formats

**Example**:
```typescript
import { IntentParser } from './intent-parser';
import { UserIntent } from '../types/core.types'; // Centralized types

const parser = new IntentParser();
const intent: UserIntent = await parser.parseIntent('3 days in Paris next month');
// Returns: { destination: 'Paris', duration: 3, startDate: '2025-02-01' }
```

### conversation-manager.ts (415 lines)
**Purpose**: Manages conversation state and context across interactions

**Key Functions**:
- `getOrCreateSession()` - Session initialization
- `updateContext()` - State management
- `addMessage()` - Message history tracking
- `determineState()` - Conversation flow control
- `clearContext()` - Session cleanup

**States**:
- `initial` - No information collected
- `collecting_destination` - Need destination
- `collecting_dates` - Need travel dates
- `collecting_duration` - Need trip length
- `ready` - All information collected
- `generating` - Creating itinerary

### cache-manager.ts (230 lines)
**Purpose**: Intelligent caching system to reduce API calls

**Features**:
- LRU (Least Recently Used) eviction
- TTL (Time To Live) expiration
- Fuzzy matching for similar queries
- Configurable size limits

**Configuration**:
```typescript
const cache = new CacheManager<T>({
  maxSize: 100,    // Maximum entries
  ttl: 3600000     // 1 hour TTL
});
```

### response-formatter.ts (327 lines)
**Purpose**: Formats AI responses for user interaction

**Key Functions**:
- `formatResponse()` - Main formatting entry
- `generateQuestions()` - Creates contextual questions
- `detectMissingFields()` - Identifies required information
- `buildSuggestions()` - Provides helpful prompts
- `formatError()` - User-friendly error messages

**Response Types**:
- `question` - Requesting missing information
- `ready` - Ready to generate itinerary
- `generating` - Processing request
- `complete` - Itinerary ready
- `error` - Error occurred

## Data Flow

```
User Input
    ↓
IntentParser
    ├── Pattern Extraction (fast)
    └── GPT Extraction (fallback)
         ↓
ConversationManager
    ├── Session Management
    └── State Tracking
         ↓
ResponseFormatter
    ├── Question Generation
    └── Response Building
         ↓
CacheManager (throughout)
    ├── Cache Hits
    └── Cache Storage
```

## Integration with AIController

The AIController orchestrates these modules:

```typescript
import { IntentParser } from './modules/intent-parser';
import { ConversationManager } from './modules/conversation-manager';
import { CacheManager } from './modules/cache-manager';
import { ResponseFormatter } from './modules/response-formatter';
import { UserIntent, ConversationContext } from './types/core.types';

export class AIController {
  private intentParser: IntentParser;
  private conversationManager: ConversationManager;
  private cache: CacheManager;
  private responseFormatter: ResponseFormatter;

  async processMessage(message: string, context?: string) {
    // 1. Check cache
    const cached = this.cache.get(message);
    if (cached) return cached;

    // 2. Parse intent
    const intent: UserIntent = await this.intentParser.parseIntent(message);

    // 3. Update conversation
    const conversation: ConversationContext = this.conversationManager.updateContext(intent);

    // 4. Format response
    const response = this.responseFormatter.formatResponse(conversation);

    // 5. Cache result
    this.cache.set(message, response);

    return response;
  }
}
```

## Performance

- **Pattern Extraction**: <50ms
- **GPT Extraction**: 500-1500ms
- **Cache Hit**: <5ms
- **Session Operations**: <10ms
- **Response Formatting**: <20ms

## Recent Updates (Jan 25, 2025)

- ✅ Fixed all TypeScript errors in ConversationManager (LogCategory types)
- ✅ Updated to use centralized types from `core.types.ts`
- ✅ Improved error handling and logging consistency
- ✅ Enhanced cache manager with better type safety