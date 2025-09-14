# Enhanced Dialog Architecture Implementation Plan

## Executive Summary
Complete overhaul of the chat interface's parsing and dialog system to handle both structured travel requests and conversational modifications using a hybrid approach that combines traditional regex parsing with AI-powered understanding.

## Current Problems to Solve
1. **Lisbon/Granada Issue**: Parser only detecting one city when multiple are specified
2. **Missing Origins**: "Unknown → destination" appearing in outputs
3. **Conversational Failures**: Can't handle "make it more romantic" type requests
4. **Context Loss**: Each message treated in isolation, losing conversation history
5. **Rigid Parsing**: All-or-nothing approach fails on slightly ambiguous inputs

## Implementation Plan

### Phase 1: Core Infrastructure (Foundation)

#### 1.1 Create Input Classifier Module
**Location**: `/src/ai/utils/input-classifier.ts`

**Steps**:
1. Define input type enums:
   - `structured` - Clear travel requests ("3 days in Paris from NYC")
   - `conversational` - Natural language ("I'd love to visit somewhere warm")
   - `modification` - Changes to existing ("add 2 more days")
   - `question` - Information queries ("what's included?")
   - `ambiguous` - Needs clarification

2. Implement classification logic:
   ```typescript
   - Pattern matching for structured inputs
   - Intent detection for modifications
   - Question identification
   - Complexity scoring algorithm
   - Confidence level calculation
   ```

3. Create feature extraction:
   - Destination detection
   - Date/duration extraction
   - Preference identification
   - Context requirement detection

4. Build parser routing logic:
   - Route to traditional parser for simple structured
   - Route to AI for complex/conversational
   - Route to hybrid for medium complexity

**Testing**:
- Unit tests for each input type
- Edge case validation
- Performance benchmarks

#### 1.2 Implement Conversation State Manager
**Location**: `/src/ai/services/conversation-state.ts`

**Steps**:
1. Design state schema:
   ```typescript
   interface ConversationState {
     sessionId: string;
     userId?: string;
     currentItinerary?: Itinerary;
     history: Message[];
     context: {
       origin?: string;
       destinations: string[];
       preferences: Map<string, any>;
       constraints: Constraint[];
     };
     metadata: {
       startTime: Date;
       lastActivity: Date;
       messageCount: number;
     };
   }
   ```

2. Implement state operations:
   - Initialize new conversation
   - Update with new message
   - Merge context from multiple sources
   - Extract relevant context for parsing
   - Serialize/deserialize for persistence

3. Create context extraction methods:
   - Get latest destinations
   - Get confirmed preferences
   - Get modification history
   - Build context prompt for AI

4. Add state persistence:
   - In-memory store for active sessions
   - Optional Redis/DB backing
   - TTL-based cleanup
   - State recovery mechanisms

**Testing**:
- State transition tests
- Context extraction validation
- Persistence/recovery tests

### Phase 2: Parser Enhancement

#### 2.1 Fix and Enhance Traditional Parser
**Location**: `/src/ai/utils/destination-parser.ts`

**Steps**:
1. Fix current issues:
   - Add pattern for "X days in City and Y days in City2"
   - Fix "i want to be X days in Y" pattern
   - Improve origin detection patterns
   - Handle comma-separated city lists

2. Add new patterns:
   ```typescript
   // Multi-destination with specific days
   /(\d+)\s*days?\s+in\s+(\w+)\s+and\s+(\d+)\s*days?\s+in\s+(\w+)/
   
   // Duration at start
   /^(\d+)\s*weeks?\s+in\s+(.+)/
   
   // Complex multi-city
   /visiting\s+([^,]+),\s+([^,]+),?\s+and\s+([^,]+)/
   ```

3. Implement fallback cascade:
   - Try specific patterns first
   - Fall back to general patterns
   - Extract partial information when possible

4. Add validation layer:
   - Verify city names against known list
   - Validate day counts
   - Check total duration consistency

**Testing**:
- Test all reported failing cases
- Regression tests for working cases
- Performance tests

#### 2.2 Create Hybrid Parser
**Location**: `/src/ai/utils/hybrid-parser.ts`

**Steps**:
1. Design parser interface:
   ```typescript
   interface HybridParser {
     parse(input: string, context?: ConversationState): Promise<ParseResult>;
     canHandle(classification: ClassificationResult): boolean;
     getConfidence(): number;
   }
   ```

2. Implement parsing strategy:
   - Start with traditional parser
   - If low confidence, enhance with AI
   - Merge results intelligently
   - Validate combined output

3. Create result merger:
   - Prefer high-confidence extractions
   - Fill gaps with AI suggestions
   - Resolve conflicts (traditional wins for structure)
   - Maintain source attribution

4. Add caching layer:
   - Cache AI parsing results
   - Cache traditional parsing results
   - Invalidate on context change

**Testing**:
- Compare against pure traditional
- Compare against pure AI
- Validate merged results

#### 2.3 Implement AI Parser Module
**Location**: `/src/ai/utils/ai-parser.ts`

**Steps**:
1. Create structured prompt templates:
   ```typescript
   const PARSING_PROMPT = `
   Extract travel information from user input.
   Context: {context}
   Input: {input}
   
   Return JSON:
   {
     origin: string | null,
     destinations: [{city: string, days: number}],
     startDate: string | null,
     preferences: string[],
     modifications: string[]
   }
   `;
   ```

2. Implement AI parsing flow:
   - Build context-aware prompt
   - Call OpenAI with structured output
   - Parse and validate response
   - Handle errors gracefully

3. Add conversation understanding:
   - Detect modification intents
   - Understand relative references ("there", "that city")
   - Handle pronouns and context
   - Identify implicit information

4. Create confidence scoring:
   - Score based on AI response consistency
   - Check against known constraints
   - Validate logical consistency

**Testing**:
- Test with various conversation contexts
- Validate JSON parsing
- Test error handling

### Phase 3: Dialog Flow Enhancement

#### 3.1 Create Dialog Response Generator
**Location**: `/src/ai/flows/generate-dialog-response.ts`

**Steps**:
1. Design response types:
   - Clarification request
   - Confirmation message
   - Suggestion offer
   - Error explanation
   - Success acknowledgment

2. Implement response generation:
   ```typescript
   async function generateDialogResponse(
     input: string,
     classification: ClassificationResult,
     parseResult: ParseResult,
     context: ConversationState
   ): Promise<DialogResponse>
   ```

3. Create response templates:
   - For missing information
   - For ambiguous requests
   - For modifications
   - For confirmations

4. Add natural language generation:
   - Use AI for complex responses
   - Use templates for simple responses
   - Maintain consistent tone

**Testing**:
- Response appropriateness tests
- Tone consistency validation
- Context awareness tests

#### 3.2 Implement Modification Handler
**Location**: `/src/ai/flows/handle-modification.ts`

**Steps**:
1. Create modification types:
   - Add destination
   - Remove destination
   - Change duration
   - Update preferences
   - Adjust dates

2. Implement modification detection:
   ```typescript
   function detectModificationType(
     input: string,
     currentItinerary: Itinerary
   ): ModificationType
   ```

3. Build modification application:
   - Clone current itinerary
   - Apply modifications
   - Validate result
   - Generate diff

4. Create confirmation flow:
   - Show what will change
   - Request confirmation
   - Apply or rollback

**Testing**:
- Test each modification type
- Validate itinerary integrity
- Test rollback scenarios

#### 3.3 Update Main Chat Flow
**Location**: `/src/ai/flows/chat-conversation.ts`

**Steps**:
1. Integrate all components:
   ```typescript
   async function handleChatMessage(
     message: string,
     sessionId: string
   ): Promise<ChatResponse> {
     // 1. Load conversation state
     // 2. Classify input
     // 3. Route to appropriate parser
     // 4. Apply modifications if needed
     // 5. Generate response
     // 6. Update state
     // 7. Return response
   }
   ```

2. Implement routing logic:
   - Check classification
   - Load appropriate parser
   - Handle parser failures
   - Fall back gracefully

3. Add error recovery:
   - Parser failure handling
   - AI timeout handling
   - State corruption recovery
   - User-friendly error messages

4. Create response builder:
   - Combine itinerary with dialog
   - Add clarification requests
   - Include suggestions
   - Format for UI

**Testing**:
- End-to-end conversation tests
- Error scenario tests
- Performance under load

### Phase 4: Integration & UI Updates

#### 4.1 Update Chat Interface Component
**Location**: `/src/components/chat/chat-interface.tsx`

**Steps**:
1. Add state management:
   - Track conversation state
   - Store message history
   - Manage loading states
   - Handle errors

2. Implement UI enhancements:
   - Show parsing confidence
   - Display modification previews
   - Add clarification UI
   - Show context indicators

3. Add interaction features:
   - Quick action buttons
   - Suggestion chips
   - Modification preview
   - Undo/redo support

4. Integrate with new flows:
   - Call new chat handler
   - Process responses
   - Update UI accordingly

**Testing**:
- UI interaction tests
- State management tests
- Error display tests

#### 4.2 Create Conversation Context Display
**Location**: `/src/components/chat/context-display.tsx`

**Steps**:
1. Design context visualization:
   - Show active destinations
   - Display preferences
   - Show conversation phase
   - Indicate confidence level

2. Implement context component:
   - Real-time updates
   - Collapsible sections
   - Edit capabilities
   - Clear action buttons

3. Add debugging features:
   - Show parser output
   - Display classification
   - Show confidence scores
   - Log state changes

**Testing**:
- Component rendering tests
- Interaction tests
- State sync tests

### Phase 5: Testing & Validation

#### 5.1 Create Comprehensive Test Suite
**Location**: `/tests/ai/dialog-system/`

**Test Categories**:
1. **Parser Tests** (`parser-tests.ts`):
   - Traditional parser edge cases
   - AI parser accuracy
   - Hybrid parser scenarios
   - Performance benchmarks

2. **Classification Tests** (`classification-tests.ts`):
   - Input type detection
   - Confidence scoring
   - Router decision validation

3. **Conversation Tests** (`conversation-tests.ts`):
   - Multi-turn dialogs
   - Context preservation
   - Modification flows
   - Error recovery

4. **Integration Tests** (`integration-tests.ts`):
   - End-to-end scenarios
   - Real user conversations
   - Performance under load
   - Error conditions

#### 5.2 Create Test Scenarios
**Location**: `/tests/ai/dialog-system/scenarios/`

**Scenarios to test**:
1. **Lisbon/Granada Fix**:
   ```
   Input: "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada"
   Expected: Both cities detected with correct days
   ```

2. **Conversational Flow**:
   ```
   User: "I want to visit Paris"
   AI: "How many days?"
   User: "5 days"
   AI: "Where are you departing from?"
   User: "NYC"
   Expected: Complete itinerary generated
   ```

3. **Modification Flow**:
   ```
   User: "3 days in London from Boston"
   AI: [generates itinerary]
   User: "Add 2 days in Paris"
   Expected: Updated itinerary with both cities
   ```

4. **Ambiguous Input**:
   ```
   User: "Something romantic in Europe"
   AI: "I can suggest Paris, Venice, or Prague. How long?"
   User: "1 week in Venice"
   Expected: Venice itinerary generated
   ```

### Phase 6: Performance Optimization

#### 6.1 Implement Caching Strategy
**Location**: `/src/ai/utils/cache-manager.ts`

**Steps**:
1. Cache parsing results
2. Cache AI responses
3. Cache classification results
4. Implement cache invalidation

#### 6.2 Optimize Parser Performance
**Steps**:
1. Pre-compile regex patterns
2. Implement pattern priority
3. Add early termination
4. Parallelize where possible

### Phase 7: Documentation & Deployment

#### 7.1 Create Documentation
**Location**: `/docs/dialog-system/`

**Documents**:
1. Architecture overview
2. Parser usage guide
3. Conversation state management
4. Testing guide
5. Troubleshooting guide

#### 7.2 Deployment Plan
1. Deploy to staging
2. Run integration tests
3. Perform load testing
4. Gradual rollout
5. Monitor and iterate

## Success Metrics

### Functional Metrics
- ✅ Lisbon/Granada case works correctly
- ✅ "Make it more romantic" understood
- ✅ Missing origin handled gracefully
- ✅ Multi-turn conversations work
- ✅ Modifications applied correctly

### Performance Metrics
- Parser response time < 100ms for structured
- AI parser response time < 2s
- Classification accuracy > 95%
- Conversation state retrieval < 50ms

### Quality Metrics
- User satisfaction score > 4.5/5
- Successful conversation completion > 90%
- Error rate < 5%
- Fallback usage < 10%

## Risk Mitigation

### Technical Risks
1. **AI Parser Latency**: Mitigate with caching and timeout handling
2. **State Corruption**: Implement validation and recovery
3. **Parser Conflicts**: Clear precedence rules
4. **Memory Leaks**: Proper cleanup and TTL

### User Experience Risks
1. **Confusion**: Clear UI indicators
2. **Slow Responses**: Loading states and progressive updates
3. **Errors**: Graceful degradation and helpful messages

## Timeline Estimate

- **Phase 1**: 2 days (Infrastructure)
- **Phase 2**: 3 days (Parser Enhancement)
- **Phase 3**: 2 days (Dialog Flow)
- **Phase 4**: 2 days (Integration)
- **Phase 5**: 2 days (Testing)
- **Phase 6**: 1 day (Optimization)
- **Phase 7**: 1 day (Documentation)

**Total**: ~13 days of development

## Next Steps

1. Review and approve plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Daily progress updates
5. Continuous testing and validation