/**
 * Redux Store Configuration
 *
 * Main store setup with middleware and dev tools
 */

import { configureStore } from '@reduxjs/toolkit';
import { localStorageMiddleware } from './middleware/localStorageMiddleware';

// Import reducers
import tripReducer from './slices/tripSlice';
import conversationReducer from './slices/conversationSlice';
import uiReducer from './slices/uiSlice';

/**
 * Configure the Redux store
 */
export const store = configureStore({
  reducer: {
    trip: tripReducer,
    conversation: conversationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Firebase objects and dates
        ignoredActions: [
          'conversation/addMessage',
          'trip/setItinerary',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp', 'payload.user'],
        // Ignore these paths in the state
        ignoredPaths: [
          'conversation.messages',
          'trip.currentItinerary',
        ],
      },
    }).concat(localStorageMiddleware), // Add our custom localStorage middleware
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
