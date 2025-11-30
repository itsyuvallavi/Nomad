/**
 * Conversation Redux Slice
 *
 * Manages all conversation and chat related state:
 * - Messages (chat history)
 * - Generation status and progress
 * - Session management
 * - Error handling
 * - User input awaiting
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * Message type definition
 */
export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: 'question' | 'answer' | 'confirmation' | 'itinerary' | 'error' | 'initial';
  awaitingInput?: string;
  suggestedOptions?: string[];
  timestamp?: number;
}

/**
 * Generation progress tracking
 */
export interface GenerationProgress {
  stage: 'understanding' | 'planning' | 'researching' | 'generating' | 'finalizing';
  percentage: number;
  message: string;
  estimatedTimeRemaining: number; // in seconds
}

/**
 * Conversation state type
 */
export interface ConversationState {
  // Chat messages
  messages: Message[];

  // Generation state
  isGenerating: boolean;
  generationProgress: GenerationProgress;

  // Session management
  sessionId: string;
  conversationContext?: string;

  // User input state
  awaitingInput?: string;

  // Error handling
  errorMessage: string;
  errorDialogOpen: boolean;
}

/**
 * Initial state
 */
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

/**
 * Conversation Slice
 */
const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    /**
     * Initialize a new session
     */
    initializeSession: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
      state.messages = [];
      state.conversationContext = undefined;
      state.awaitingInput = undefined;
      state.isGenerating = false;
    },

    /**
     * Add a single message to the conversation
     */
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push({
        ...action.payload,
        id: action.payload.id || `msg-${Date.now()}-${Math.random()}`,
        timestamp: action.payload.timestamp || Date.now(),
      });
    },

    /**
     * Set all messages (replace existing)
     */
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },

    /**
     * Update the last message in the conversation
     */
    updateLastMessage: (state, action: PayloadAction<Partial<Message>>) => {
      if (state.messages.length > 0) {
        const lastIndex = state.messages.length - 1;
        state.messages[lastIndex] = {
          ...state.messages[lastIndex],
          ...action.payload,
        };
      }
    },

    /**
     * Remove a message by ID
     */
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },

    /**
     * Set generation status
     */
    setGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;

      // Reset progress when stopping generation
      if (!action.payload) {
        state.generationProgress = initialState.generationProgress;
      }
    },

    /**
     * Update generation progress
     */
    updateProgress: (state, action: PayloadAction<Partial<GenerationProgress>>) => {
      state.generationProgress = {
        ...state.generationProgress,
        ...action.payload,
      };
    },

    /**
     * Set conversation context for AI continuity
     */
    setConversationContext: (state, action: PayloadAction<string | undefined>) => {
      state.conversationContext = action.payload;
    },

    /**
     * Set awaiting input status
     */
    setAwaitingInput: (state, action: PayloadAction<string | undefined>) => {
      state.awaitingInput = action.payload;
    },

    /**
     * Set error message and open dialog
     */
    setError: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
      state.errorDialogOpen = true;
      state.isGenerating = false;
    },

    /**
     * Clear error message and close dialog
     */
    clearError: (state) => {
      state.errorMessage = '';
      state.errorDialogOpen = false;
    },

    /**
     * Reset conversation (clear messages, keep session)
     */
    resetConversation: (state) => {
      state.messages = [];
      state.isGenerating = false;
      state.generationProgress = initialState.generationProgress;
      state.conversationContext = undefined;
      state.awaitingInput = undefined;
      state.errorMessage = '';
      state.errorDialogOpen = false;
    },

    /**
     * Complete reset (including session)
     */
    resetSession: () => initialState,
  },
});

// Export actions
export const {
  initializeSession,
  addMessage,
  setMessages,
  updateLastMessage,
  removeMessage,
  setGenerating,
  updateProgress,
  setConversationContext,
  setAwaitingInput,
  setError,
  clearError,
  resetConversation,
  resetSession,
} = conversationSlice.actions;

// Export reducer
export default conversationSlice.reducer;

/**
 * Selectors
 */

// Basic selectors
export const selectMessages = (state: RootState) => state.conversation?.messages || [];
export const selectIsGenerating = (state: RootState) => state.conversation?.isGenerating || false;
export const selectGenerationProgress = (state: RootState) =>
  state.conversation?.generationProgress || initialState.generationProgress;
export const selectSessionId = (state: RootState) => state.conversation?.sessionId || '';
export const selectConversationContext = (state: RootState) => state.conversation?.conversationContext;
export const selectAwaitingInput = (state: RootState) => state.conversation?.awaitingInput;
export const selectErrorMessage = (state: RootState) => state.conversation?.errorMessage || '';
export const selectErrorDialogOpen = (state: RootState) => state.conversation?.errorDialogOpen || false;

/**
 * Computed selectors
 */

// Get the last message in the conversation
export const selectLastMessage = (state: RootState) => {
  const messages = selectMessages(state);
  return messages[messages.length - 1] || null;
};

// Get only user messages
export const selectUserMessages = (state: RootState) => {
  const messages = selectMessages(state);
  return messages.filter(msg => msg.role === 'user');
};

// Get only assistant messages
export const selectAssistantMessages = (state: RootState) => {
  const messages = selectMessages(state);
  return messages.filter(msg => msg.role === 'assistant');
};

// Check if conversation has messages
export const selectHasMessages = (state: RootState) => {
  const messages = selectMessages(state);
  return messages.length > 0;
};

// Count messages by type
export const selectMessageCount = (state: RootState) => {
  const messages = selectMessages(state);
  return {
    total: messages.length,
    user: messages.filter(m => m.role === 'user').length,
    assistant: messages.filter(m => m.role === 'assistant').length,
    system: messages.filter(m => m.role === 'system').length,
  };
};

// Get the initial user message (first message)
export const selectInitialMessage = (state: RootState) => {
  const messages = selectMessages(state);
  return messages.find(msg => msg.role === 'user') || null;
};

// Check if waiting for user input
export const selectIsWaitingForInput = (state: RootState) => {
  const awaitingInput = selectAwaitingInput(state);
  const isGenerating = selectIsGenerating(state);
  return !!awaitingInput && !isGenerating;
};

// Get conversation status
export const selectConversationStatus = (state: RootState):
  'idle' | 'generating' | 'awaiting_input' | 'error' => {
  const isGenerating = selectIsGenerating(state);
  const awaitingInput = selectAwaitingInput(state);
  const hasError = selectErrorDialogOpen(state);

  if (hasError) return 'error';
  if (isGenerating) return 'generating';
  if (awaitingInput) return 'awaiting_input';
  return 'idle';
};

// Get progress percentage
export const selectProgressPercentage = (state: RootState) => {
  const progress = selectGenerationProgress(state);
  return progress.percentage;
};

// Get estimated time remaining
export const selectTimeRemaining = (state: RootState) => {
  const progress = selectGenerationProgress(state);
  return progress.estimatedTimeRemaining;
};

/**
 * Example usage in components:
 *
 * ```tsx
 * import { useAppSelector, useAppDispatch } from '@/store/hooks';
 * import {
 *   selectMessages,
 *   selectIsGenerating,
 *   addMessage,
 *   setGenerating
 * } from '@/store/slices/conversationSlice';
 *
 * function ChatPanel() {
 *   const dispatch = useAppDispatch();
 *   const messages = useAppSelector(selectMessages);
 *   const isGenerating = useAppSelector(selectIsGenerating);
 *
 *   const handleSendMessage = (text: string) => {
 *     dispatch(addMessage({
 *       role: 'user',
 *       content: text,
 *     }));
 *     dispatch(setGenerating(true));
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *       {isGenerating && <LoadingSpinner />}
 *     </div>
 *   );
 * }
 * ```
 */
