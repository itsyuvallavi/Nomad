/**
 * Redux Middleware for localStorage synchronization
 *
 * Automatically syncs specific Redux actions to localStorage
 * with conflict resolution and Safari ITP handling
 */

import { Middleware } from '@reduxjs/toolkit';
import { LocalStorageManager, STORAGE_KEYS } from './localStorage-manager';

/**
 * localStorage sync middleware
 *
 * Listens to Redux actions and syncs relevant state to localStorage
 */
export const localStorageMiddleware: Middleware = (store) => (next) => (action) => {
  // Let the action pass through first
  const result = next(action);

  // Get the updated state after the action
  const state = store.getState();

  // Sync specific slices to localStorage based on action type
  switch (action.type) {
    // Conversation state syncing
    case 'conversation/addMessage':
    case 'conversation/setMessages':
    case 'conversation/setConversationContext':
      {
        const { sessionId, conversationContext } = state.conversation || {};
        if (sessionId && conversationContext) {
          LocalStorageManager.set(
            STORAGE_KEYS.CONVERSATION_CONTEXT(sessionId),
            conversationContext
          );
          LocalStorageManager.set(
            STORAGE_KEYS.SESSION_ID(sessionId),
            sessionId
          );
        }
      }
      break;

    // Trip state syncing (recent searches)
    case 'trip/setItinerary':
      {
        const { currentItinerary, currentSearchId } = state.trip || {};
        if (currentItinerary && currentSearchId) {
          // Update recent searches
          const recentSearches = LocalStorageManager.get<any[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
          const filtered = recentSearches.filter((s: any) => s.id !== currentSearchId);

          const newSearch = {
            id: currentSearchId,
            destination: currentItinerary.destination,
            title: currentItinerary.title,
            startDate: currentItinerary.startDate,
            duration: currentItinerary.duration,
            timestamp: Date.now(),
            hasItinerary: true,
            lastUpdated: new Date().toISOString(),
            chatState: {
              itinerary: currentItinerary,
              messages: state.conversation?.messages || [],
            },
          };

          filtered.unshift(newSearch);
          LocalStorageManager.set(STORAGE_KEYS.RECENT_SEARCHES, filtered.slice(0, 5));
        }
      }
      break;

    // UI state syncing (viewing trip)
    case 'trip/setSearchId':
      {
        const { currentSearchId } = state.trip || {};
        if (currentSearchId) {
          LocalStorageManager.set(STORAGE_KEYS.VIEWING_TRIP, currentSearchId);
        }
      }
      break;

    // Clear conversation on reset
    case 'conversation/resetConversation':
      {
        const { sessionId } = state.conversation || {};
        if (sessionId) {
          LocalStorageManager.remove(STORAGE_KEYS.CONVERSATION_CONTEXT(sessionId));
        }
      }
      break;

    // Clear trip data
    case 'trip/clearTrip':
      {
        LocalStorageManager.remove(STORAGE_KEYS.VIEWING_TRIP);
      }
      break;

    default:
      // No localStorage sync needed for this action
      break;
  }

  return result;
};

/**
 * Load persisted state from localStorage (for store initialization)
 */
export function loadPersistedState(): any {
  try {
    const recentSearches = LocalStorageManager.get(STORAGE_KEYS.RECENT_SEARCHES, []);
    const viewingTrip = LocalStorageManager.get(STORAGE_KEYS.VIEWING_TRIP);

    // Build initial state from localStorage
    const persistedState: any = {};

    // Load trip state
    if (recentSearches && recentSearches.length > 0) {
      persistedState.trip = {
        recentSearches,
      };

      // If viewing a specific trip, load it
      if (viewingTrip) {
        const tripData = recentSearches.find((s: any) => s.id === viewingTrip);
        if (tripData) {
          persistedState.trip.currentItinerary = tripData.chatState?.itinerary;
          persistedState.trip.currentSearchId = viewingTrip;

          // Load conversation for this trip
          if (tripData.chatState?.messages) {
            persistedState.conversation = {
              messages: tripData.chatState.messages,
              sessionId: LocalStorageManager.get(STORAGE_KEYS.SESSION_ID(viewingTrip)),
              conversationContext: LocalStorageManager.get(
                STORAGE_KEYS.CONVERSATION_CONTEXT(viewingTrip)
              ),
            };
          }
        }
      }
    }

    return persistedState;
  } catch (error) {
    console.error('[localStorage] Error loading persisted state:', error);
    return {};
  }
}

/**
 * Throttle localStorage writes to improve performance
 */
let throttleTimeout: NodeJS.Timeout | null = null;
const throttledActions = new Set<string>();

export const throttledLocalStorageMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // List of actions to throttle (high-frequency updates)
  const shouldThrottle = [
    'conversation/updateProgress',
    'trip/setPartialItinerary',
  ].includes(action.type);

  if (shouldThrottle) {
    throttledActions.add(action.type);

    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
    }

    throttleTimeout = setTimeout(() => {
      // Sync all throttled actions after delay
      throttledActions.forEach(actionType => {
        localStorageMiddleware(store)(next)({ type: actionType });
      });
      throttledActions.clear();
      throttleTimeout = null;
    }, 1000); // 1 second throttle
  } else {
    // Non-throttled actions sync immediately
    localStorageMiddleware(store)(next)(action);
  }

  return result;
};
