# Redux Implementation Plan - Nomad Navigator

**Created:** 2025-01-29
**Status:** TODO
**Goal:** Implement Redux Toolkit for centralized state management, eliminating prop drilling and improving maintainability

---

## 📋 Executive Summary

We'll implement Redux Toolkit to manage three main state domains:
1. **Conversation State** - Chat messages, generation progress, session data
2. **Trip/Itinerary State** - Current trip, selected locations/days, metadata
3. **UI State** - View navigation, mobile tabs, shortcuts

**Expected Benefits:**
- Eliminate 8+ levels of prop drilling
- Reduce `useMessageHandler` from 12 parameters to 0
- Centralize state logic for easier debugging
- Enable time-travel debugging with Redux DevTools
- Improve code maintainability and testability

---

## 🎯 Phase 1: Infrastructure Setup

### Task 1.1: Install Dependencies
```bash
npm install @reduxjs/toolkit react-redux
npm install --save-dev @redux-devtools/extension
```

**Files to create:**
- `src/store/index.ts` - Store configuration
- `src/store/hooks.ts` - Typed hooks (useAppDispatch, useAppSelector)
- `src/store/types.ts` - RootState and AppDispatch types

### Task 1.2: Configure Store
**Location:** `src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import conversationReducer from './slices/conversationSlice';
import tripReducer from './slices/tripSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
    trip: tripReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Firebase objects
        ignoredActions: ['conversation/addMessage'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['conversation.messages'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Task 1.3: Create Typed Hooks
**Location:** `src/store/hooks.ts`

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Task 1.4: Wrap App with Provider
**Location:** `src/app/layout.tsx`

```typescript
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          <AuthProvider>
            <OfflineProvider>
              <MotionProvider>
                {children}
              </MotionProvider>
            </OfflineProvider>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
```

---

## 🎯 Phase 2: Conversation Slice (Priority 1)

### Current State (to migrate):
```typescript
// From ItineraryPage.tsx and useMessageHandler.ts
const [messages, setMessages] = useState<Message[]>([]);
const [isGenerating, setIsGenerating] = useState(false);
const [generationProgress, setGenerationProgress] = useState({...});
const [sessionId] = useState<string>(uuid());
const [conversationContext, setConversationContext] = useState<string>();
const [awaitingInput, setAwaitingInput] = useState<string>();
const [errorMessage, setErrorMessage] = useState<string>('');
```

### Task 2.1: Create Conversation Slice
**Location:** `src/store/slices/conversationSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface GenerationProgress {
  stage: string;
  percentage: number;
  message: string;
  estimatedTimeRemaining: number;
}

interface ConversationState {
  messages: Message[];
  isGenerating: boolean;
  generationProgress: GenerationProgress;
  sessionId: string;
  conversationContext?: string;
  awaitingInput?: string;
  errorMessage: string;
  errorDialogOpen: boolean;
}

const initialState: ConversationState = {
  messages: [],
  isGenerating: false,
  generationProgress: {
    stage: 'understanding',
    percentage: 0,
    message: 'Understanding your request...',
    estimatedTimeRemaining: 30,
  },
  sessionId: '',
  conversationContext: undefined,
  awaitingInput: undefined,
  errorMessage: '',
  errorDialogOpen: false,
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    initializeSession: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
      state.messages = [];
      state.conversationContext = undefined;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },

    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },

    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    updateProgress: (state, action: PayloadAction<Partial<GenerationProgress>>) => {
      state.generationProgress = {
        ...state.generationProgress,
        ...action.payload,
      };
    },

    setConversationContext: (state, action: PayloadAction<string | undefined>) => {
      state.conversationContext = action.payload;
    },

    setAwaitingInput: (state, action: PayloadAction<string | undefined>) => {
      state.awaitingInput = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
      state.errorDialogOpen = true;
    },

    clearError: (state) => {
      state.errorMessage = '';
      state.errorDialogOpen = false;
    },

    resetConversation: (state) => {
      state.messages = [];
      state.isGenerating = false;
      state.generationProgress = initialState.generationProgress;
      state.conversationContext = undefined;
      state.awaitingInput = undefined;
      state.errorMessage = '';
      state.errorDialogOpen = false;
    },
  },
});

export const {
  initializeSession,
  addMessage,
  setMessages,
  setGenerating,
  updateProgress,
  setConversationContext,
  setAwaitingInput,
  setError,
  clearError,
  resetConversation,
} = conversationSlice.actions;

export default conversationSlice.reducer;

// Selectors
export const selectMessages = (state: RootState) => state.conversation.messages;
export const selectIsGenerating = (state: RootState) => state.conversation.isGenerating;
export const selectGenerationProgress = (state: RootState) => state.conversation.generationProgress;
export const selectSessionId = (state: RootState) => state.conversation.sessionId;
export const selectConversationContext = (state: RootState) => state.conversation.conversationContext;
export const selectAwaitingInput = (state: RootState) => state.conversation.awaitingInput;
export const selectError = (state: RootState) => state.conversation.errorMessage;
export const selectErrorDialogOpen = (state: RootState) => state.conversation.errorDialogOpen;
```

### Task 2.2: Create Async Thunks for Message Handling
**Location:** `src/store/slices/conversationSlice.ts` (add to existing file)

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';

export const sendMessage = createAsyncThunk(
  'conversation/sendMessage',
  async (
    {
      message,
      currentItinerary,
      user
    }: {
      message: string;
      currentItinerary: any;
      user: any;
    },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const { sessionId, conversationContext, messages } = state.conversation;

    // Add user message
    const userMessage: Message = {
      id: uuid(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    dispatch(addMessage(userMessage));

    // Set generating state
    dispatch(setGenerating(true));

    try {
      // Call API (existing logic from useMessageHandler)
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          sessionId,
          conversationContext,
          currentItinerary,
          messages,
        }),
      });

      // Handle response...
      const data = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: uuid(),
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };
      dispatch(addMessage(assistantMessage));

      // Update context
      dispatch(setConversationContext(data.context));

      return data;
    } catch (error) {
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setGenerating(false));
    }
  }
);
```

---

## 🎯 Phase 3: Trip/Itinerary Slice (Priority 2)

### Current State (to migrate):
```typescript
// From ItineraryPage.tsx and ItineraryDisplay
const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
const [partialItinerary, setPartialItinerary] = useState<any>(null);
const [generationMetadata, setGenerationMetadata] = useState<any>(null);
const [selectedLocation, setSelectedLocation] = useState<string>('');
const [selectedDayInTimeline, setSelectedDayInTimeline] = useState(0);
const [tripContext, setTripContext] = useState<TripContext | undefined>(undefined);
```

### Task 3.1: Create Trip Slice
**Location:** `src/store/slices/tripSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TripState {
  currentItinerary: any | null;
  partialItinerary: any | null;
  generationMetadata: any | null;
  selectedLocation: string;
  selectedDay: number;
  tripContext?: any;
  currentSearchId?: string;
}

const initialState: TripState = {
  currentItinerary: null,
  partialItinerary: null,
  generationMetadata: null,
  selectedLocation: '',
  selectedDay: 0,
  tripContext: undefined,
  currentSearchId: undefined,
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setItinerary: (state, action: PayloadAction<any>) => {
      state.currentItinerary = action.payload;
      state.partialItinerary = null; // Clear partial when full itinerary is set
    },

    setPartialItinerary: (state, action: PayloadAction<any>) => {
      state.partialItinerary = action.payload;
    },

    setGenerationMetadata: (state, action: PayloadAction<any>) => {
      state.generationMetadata = action.payload;
    },

    selectLocation: (state, action: PayloadAction<string>) => {
      state.selectedLocation = action.payload;
    },

    selectDay: (state, action: PayloadAction<number>) => {
      state.selectedDay = action.payload;
    },

    setTripContext: (state, action: PayloadAction<any>) => {
      state.tripContext = action.payload;
    },

    setSearchId: (state, action: PayloadAction<string>) => {
      state.currentSearchId = action.payload;
    },

    clearTrip: (state) => {
      state.currentItinerary = null;
      state.partialItinerary = null;
      state.generationMetadata = null;
      state.selectedLocation = '';
      state.selectedDay = 0;
    },
  },
});

export const {
  setItinerary,
  setPartialItinerary,
  setGenerationMetadata,
  selectLocation,
  selectDay,
  setTripContext,
  setSearchId,
  clearTrip,
} = tripSlice.actions;

export default tripSlice.reducer;

// Selectors
export const selectCurrentItinerary = (state: RootState) => state.trip.currentItinerary;
export const selectPartialItinerary = (state: RootState) => state.trip.partialItinerary;
export const selectGenerationMetadata = (state: RootState) => state.trip.generationMetadata;
export const selectSelectedLocation = (state: RootState) => state.trip.selectedLocation;
export const selectSelectedDay = (state: RootState) => state.trip.selectedDay;
export const selectTripContext = (state: RootState) => state.trip.tripContext;
export const selectSearchId = (state: RootState) => state.trip.currentSearchId;
```

---

## 🎯 Phase 4: UI State Slice (Priority 3)

### Current State (to migrate):
```typescript
// From various components
const [currentView, setCurrentView] = useState<'start' | 'chat' | 'auth'>('start');
const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'itinerary'>('chat');
const [showShortcuts, setShowShortcuts] = useState(false);
const [isLoading, setIsLoading] = useState(false);
```

### Task 4.1: Create UI Slice
**Location:** `src/store/slices/uiSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type View = 'start' | 'chat' | 'auth';
type MobileTab = 'chat' | 'itinerary';

interface UIState {
  currentView: View;
  mobileActiveTab: MobileTab;
  showShortcuts: boolean;
  isLoading: boolean;
  isMobile: boolean;
}

const initialState: UIState = {
  currentView: 'start',
  mobileActiveTab: 'chat',
  showShortcuts: false,
  isLoading: false,
  isMobile: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setView: (state, action: PayloadAction<View>) => {
      state.currentView = action.payload;
    },

    setMobileActiveTab: (state, action: PayloadAction<MobileTab>) => {
      state.mobileActiveTab = action.payload;
    },

    toggleShortcuts: (state) => {
      state.showShortcuts = !state.showShortcuts;
    },

    setShowShortcuts: (state, action: PayloadAction<boolean>) => {
      state.showShortcuts = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
  },
});

export const {
  setView,
  setMobileActiveTab,
  toggleShortcuts,
  setShowShortcuts,
  setLoading,
  setIsMobile,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectCurrentView = (state: RootState) => state.ui.currentView;
export const selectMobileActiveTab = (state: RootState) => state.ui.mobileActiveTab;
export const selectShowShortcuts = (state: RootState) => state.ui.showShortcuts;
export const selectIsLoading = (state: RootState) => state.ui.isLoading;
export const selectIsMobile = (state: RootState) => state.ui.isMobile;
```

---

## 🎯 Phase 5: Component Migration

### Migration Order (Incremental Approach)

#### Step 1: Migrate Simple Components First
1. **LoadingProgress** - Read generation progress from Redux
2. **ErrorDialog** - Read error state from Redux
3. **ShortcutsPanel** - Read shortcuts visibility from Redux

#### Step 2: Migrate Medium Components
4. **ChatPanel** - Read messages, isGenerating from Redux
5. **MessageList** - Read messages from Redux
6. **ItineraryDisplay** - Read itinerary, selectedDay, selectedLocation from Redux

#### Step 3: Migrate Complex Components
7. **ItineraryPage** - Dispatch actions instead of managing state
8. **useMessageHandler** - Convert to Redux thunks
9. **useItineraryGeneration** - Integrate with Redux actions

#### Step 4: Migrate Pages
10. **HomePage** - Use Redux for recent searches
11. **App page.tsx** - Use Redux for view navigation

### Task 5.1: Example Migration - ChatPanel

**Before:**
```typescript
// ChatPanel.tsx
interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  userInput: string;
  setUserInput: (value: string) => void;
  handleSendMessage: () => void;
  generationProgress: GenerationProgress;
}

export function ChatPanel({
  messages,
  isGenerating,
  userInput,
  setUserInput,
  handleSendMessage,
  generationProgress
}: ChatPanelProps) {
  return (
    <div>
      <MessageList messages={messages} />
      {isGenerating && <LoadingProgress progress={generationProgress} />}
      <Input value={userInput} onChange={(e) => setUserInput(e.target.value)} />
      <Button onClick={handleSendMessage}>Send</Button>
    </div>
  );
}
```

**After:**
```typescript
// ChatPanel.tsx
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectMessages, selectIsGenerating, selectGenerationProgress } from '@/store/slices/conversationSlice';
import { sendMessage } from '@/store/slices/conversationSlice';
import { selectCurrentItinerary } from '@/store/slices/tripSlice';

export function ChatPanel() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessages);
  const isGenerating = useAppSelector(selectIsGenerating);
  const generationProgress = useAppSelector(selectGenerationProgress);
  const currentItinerary = useAppSelector(selectCurrentItinerary);
  const { user } = useAuth();

  const [userInput, setUserInput] = useState(''); // Keep local - doesn't need Redux

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    dispatch(sendMessage({
      message: userInput,
      currentItinerary,
      user
    }));
    setUserInput('');
  };

  return (
    <div>
      <MessageList messages={messages} />
      {isGenerating && <LoadingProgress progress={generationProgress} />}
      <Input value={userInput} onChange={(e) => setUserInput(e.target.value)} />
      <Button onClick={handleSendMessage}>Send</Button>
    </div>
  );
}
```

**Props eliminated:** 6 → 0 (100% reduction!)

---

## 🎯 Phase 6: Persistence & Side Effects

### Task 6.1: Add Redux Persist for localStorage
```bash
npm install redux-persist
```

**Update store configuration:**
```typescript
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const persistConfig = {
  key: 'nomad-navigator',
  storage,
  whitelist: ['conversation', 'trip'], // Only persist these slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
});

export const persistor = persistStore(store);
```

### Task 6.2: Sync with Firebase
Create middleware to sync Redux state with Firebase/localStorage:

**Location:** `src/store/middleware/syncMiddleware.ts`

```typescript
import { Middleware } from '@reduxjs/toolkit';
import { tripsService } from '@/services/trips/trips-service';

export const syncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Sync specific actions to Firebase
  if (action.type === 'conversation/addMessage') {
    const state = store.getState();
    // Save to localStorage
    localStorage.setItem('conversationContext', state.conversation.conversationContext || '');
  }

  if (action.type === 'trip/setItinerary') {
    const state = store.getState();
    // Sync to Firebase if user is authenticated
    const user = state.auth?.user; // Assuming you migrate auth to Redux too
    if (user) {
      tripsService.syncLocalStorageToFirestore(user.uid);
    }
  }

  return result;
};
```

---

## 🎯 Phase 7: Testing & Validation

### Task 7.1: Test Each Slice
Create test files for each slice:

**Example:** `src/store/slices/__tests__/conversationSlice.test.ts`

```typescript
import conversationReducer, {
  addMessage,
  setGenerating,
  resetConversation
} from '../conversationSlice';

describe('conversationSlice', () => {
  it('should add a message', () => {
    const initialState = { messages: [], isGenerating: false };
    const message = { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() };

    const newState = conversationReducer(initialState, addMessage(message));

    expect(newState.messages).toHaveLength(1);
    expect(newState.messages[0]).toEqual(message);
  });

  it('should reset conversation', () => {
    const initialState = {
      messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }],
      isGenerating: true
    };

    const newState = conversationReducer(initialState, resetConversation());

    expect(newState.messages).toHaveLength(0);
    expect(newState.isGenerating).toBe(false);
  });
});
```

### Task 7.2: Integration Testing
Test components with Redux:

```typescript
import { renderWithProviders } from '@/test-utils/redux';
import { ChatPanel } from './ChatPanel';

test('ChatPanel displays messages from Redux', () => {
  const { getByText } = renderWithProviders(<ChatPanel />, {
    preloadedState: {
      conversation: {
        messages: [
          { id: '1', role: 'user', content: 'Test message', timestamp: Date.now() }
        ],
        isGenerating: false,
      },
    },
  });

  expect(getByText('Test message')).toBeInTheDocument();
});
```

### Task 7.3: Manual Testing Checklist
- [ ] Send message in chat
- [ ] Generate itinerary
- [ ] Switch between mobile tabs
- [ ] Navigate between views
- [ ] Refresh page (test persistence)
- [ ] Error handling
- [ ] Redux DevTools time-travel

---

## 🎯 Phase 8: Documentation & Cleanup

### Task 8.1: Update Documentation
Create files:
- `docs/redux-architecture.md` - Redux structure explanation
- `docs/state-management.md` - When to use Redux vs local state

### Task 8.2: Remove Old Code
Delete after migration complete:
- Simplified `useMessageHandler.ts` (move logic to thunks)
- State props from component interfaces
- Scattered useState calls (where moved to Redux)

### Task 8.3: Update CLAUDE.md
Add Redux guidelines to project documentation.

---

## 📊 Success Metrics

### Before Redux:
- **ItineraryPage:** 9+ useState calls, 200+ lines
- **ChatPanel props:** 6+ props
- **useMessageHandler params:** 12 parameters
- **Prop drilling depth:** 5 levels

### After Redux:
- **ItineraryPage:** ~3 useState calls (local UI only), ~150 lines
- **ChatPanel props:** 0 props (all from Redux)
- **useMessageHandler:** Replaced with Redux thunks
- **Prop drilling depth:** 0 (direct access)

---

## ⚠️ Important Notes

### What NOT to Put in Redux:
- ❌ Form input values (keep local with useState)
- ❌ Hover states, focus states
- ❌ Modal open/close (unless shared across routes)
- ❌ Temporary UI state

### What TO Put in Redux:
- ✅ Shared state (messages, itinerary)
- ✅ Data from APIs
- ✅ Navigation state
- ✅ User preferences
- ✅ Complex state with multiple updaters

---

## 🚀 Implementation Timeline

### Week 1: Infrastructure
- Days 1-2: Setup Redux Toolkit, create store
- Days 3-4: Create all three slices
- Day 5: Set up persistence and middleware

### Week 2: Migration
- Days 1-2: Migrate simple components
- Days 3-4: Migrate complex components
- Day 5: Migrate pages

### Week 3: Testing & Polish
- Days 1-2: Write tests
- Days 3-4: Clean up old code
- Day 5: Documentation

---

## 📚 Learning Resources

### Official Docs:
- Redux Toolkit: https://redux-toolkit.js.org/
- React Redux: https://react-redux.js.org/

### Recommended Reading Order:
1. Redux Toolkit Quick Start
2. createSlice API reference
3. createAsyncThunk for async operations
4. Redux DevTools Extension guide

---

## Next Steps

1. Review this plan
2. Get approval to proceed
3. Start with Phase 1 (Infrastructure Setup)
4. Implement incrementally, test each phase
5. Learn Redux DevTools along the way

**Ready to start implementation?**
