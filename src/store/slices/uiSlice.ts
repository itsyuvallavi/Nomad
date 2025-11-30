/**
 * UI Redux Slice
 *
 * Manages all UI-related state:
 * - View navigation
 * - Mobile tab state
 * - Loading states
 * - Shortcuts visibility
 * - Mobile detection
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * View type (navigation state)
 */
export type View = 'start' | 'chat' | 'auth';

/**
 * Mobile tab type
 */
export type MobileTab = 'chat' | 'itinerary';

/**
 * UI state type
 */
export interface UIState {
  // Navigation
  currentView: View;

  // Mobile state
  mobileActiveTab: MobileTab;
  isMobile: boolean;

  // UI toggles
  showShortcuts: boolean;

  // Loading states
  isLoading: boolean;
}

/**
 * Initial state
 */
const initialState: UIState = {
  currentView: 'start',
  mobileActiveTab: 'chat',
  isMobile: false,
  showShortcuts: false,
  isLoading: false,
};

/**
 * UI Slice
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set the current view (navigation)
     */
    setView: (state, action: PayloadAction<View>) => {
      state.currentView = action.payload;
    },

    /**
     * Set mobile active tab
     */
    setMobileActiveTab: (state, action: PayloadAction<MobileTab>) => {
      state.mobileActiveTab = action.payload;
    },

    /**
     * Toggle shortcuts visibility
     */
    toggleShortcuts: (state) => {
      state.showShortcuts = !state.showShortcuts;
    },

    /**
     * Set shortcuts visibility explicitly
     */
    setShowShortcuts: (state, action: PayloadAction<boolean>) => {
      state.showShortcuts = action.payload;
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set mobile detection state
     */
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },

    /**
     * Navigate to chat view and set mobile tab
     */
    navigateToChat: (state) => {
      state.currentView = 'chat';
      if (state.isMobile) {
        state.mobileActiveTab = 'chat';
      }
    },

    /**
     * Navigate to itinerary (mobile only)
     */
    navigateToItinerary: (state) => {
      if (state.isMobile) {
        state.mobileActiveTab = 'itinerary';
      }
    },

    /**
     * Reset UI state to initial
     */
    resetUI: () => initialState,
  },
});

// Export actions
export const {
  setView,
  setMobileActiveTab,
  toggleShortcuts,
  setShowShortcuts,
  setLoading,
  setIsMobile,
  navigateToChat,
  navigateToItinerary,
  resetUI,
} = uiSlice.actions;

// Export reducer
export default uiSlice.reducer;

/**
 * Selectors
 */

// Basic selectors
export const selectCurrentView = (state: RootState) => state.ui?.currentView || 'start';
export const selectMobileActiveTab = (state: RootState) => state.ui?.mobileActiveTab || 'chat';
export const selectShowShortcuts = (state: RootState) => state.ui?.showShortcuts || false;
export const selectIsLoading = (state: RootState) => state.ui?.isLoading || false;
export const selectIsMobile = (state: RootState) => state.ui?.isMobile || false;

/**
 * Computed selectors
 */

// Check if on chat view
export const selectIsOnChatView = (state: RootState) => {
  return selectCurrentView(state) === 'chat';
};

// Check if on start view
export const selectIsOnStartView = (state: RootState) => {
  return selectCurrentView(state) === 'start';
};

// Check if showing chat tab on mobile
export const selectIsShowingChat = (state: RootState) => {
  const isMobile = selectIsMobile(state);
  const tab = selectMobileActiveTab(state);

  if (!isMobile) return true; // Always show on desktop
  return tab === 'chat';
};

// Check if showing itinerary tab on mobile
export const selectIsShowingItinerary = (state: RootState) => {
  const isMobile = selectIsMobile(state);
  const tab = selectMobileActiveTab(state);

  if (!isMobile) return true; // Always show on desktop
  return tab === 'itinerary';
};

// Get current tab label (for mobile)
export const selectCurrentTabLabel = (state: RootState) => {
  const tab = selectMobileActiveTab(state);
  return tab === 'chat' ? 'Chat' : 'Itinerary';
};

/**
 * Example usage in components:
 *
 * ```tsx
 * import { useAppSelector, useAppDispatch } from '@/store/hooks';
 * import {
 *   selectCurrentView,
 *   selectIsMobile,
 *   setView,
 *   navigateToChat
 * } from '@/store/slices/uiSlice';
 *
 * function Navigation() {
 *   const dispatch = useAppDispatch();
 *   const currentView = useAppSelector(selectCurrentView);
 *   const isMobile = useAppSelector(selectIsMobile);
 *
 *   const handleStartPlanning = () => {
 *     dispatch(navigateToChat());
 *   };
 *
 *   return (
 *     <div>
 *       {currentView === 'start' && <StartView />}
 *       {currentView === 'chat' && <ChatView />}
 *     </div>
 *   );
 * }
 * ```
 */
