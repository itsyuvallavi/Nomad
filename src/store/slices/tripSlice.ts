/**
 * Trip/Itinerary Redux Slice
 *
 * Manages all trip and itinerary related state:
 * - Current itinerary data
 * - Partial itinerary (during generation)
 * - Generation metadata
 * - Selected location/day for navigation
 * - Trip context and search ID
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

/**
 * Type definitions for Trip state
 */
export interface TripState {
  // Current complete itinerary
  currentItinerary: any | null;

  // Partial itinerary during streaming generation
  partialItinerary: any | null;

  // Metadata about the generation process
  generationMetadata: any | null;

  // UI Navigation state
  selectedLocation: string;
  selectedDay: number;

  // Trip context for refinements
  tripContext?: any;

  // Current search/trip ID
  currentSearchId?: string;

  // Recent searches (loaded from localStorage)
  recentSearches: any[];
}

/**
 * Initial state
 */
const initialState: TripState = {
  currentItinerary: null,
  partialItinerary: null,
  generationMetadata: null,
  selectedLocation: '',
  selectedDay: 0,
  tripContext: undefined,
  currentSearchId: undefined,
  recentSearches: [],
};

/**
 * Trip Slice
 *
 * Redux Toolkit automatically generates action creators for each reducer
 */
const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    /**
     * Set the complete itinerary
     * Clears partial itinerary when full itinerary is set
     */
    setItinerary: (state, action: PayloadAction<any>) => {
      state.currentItinerary = action.payload;
      state.partialItinerary = null; // Clear partial when full is ready

      // Auto-select first location if available
      if (action.payload?.dailyItineraries?.[0]) {
        const firstDay = action.payload.dailyItineraries[0];
        state.selectedLocation = firstDay.location || firstDay.city || '';
        state.selectedDay = 0;
      }
    },

    /**
     * Set partial itinerary during streaming/progressive generation
     */
    setPartialItinerary: (state, action: PayloadAction<any>) => {
      state.partialItinerary = action.payload;
    },

    /**
     * Set generation metadata (cities processed, etc.)
     */
    setGenerationMetadata: (state, action: PayloadAction<any>) => {
      state.generationMetadata = action.payload;
    },

    /**
     * Select a location to view in the itinerary display
     */
    selectLocation: (state, action: PayloadAction<string>) => {
      state.selectedLocation = action.payload;

      // Reset selected day when location changes
      state.selectedDay = 0;
    },

    /**
     * Select a specific day in the timeline
     */
    selectDay: (state, action: PayloadAction<number>) => {
      state.selectedDay = action.payload;
    },

    /**
     * Set trip context for refinements and modifications
     */
    setTripContext: (state, action: PayloadAction<any>) => {
      state.tripContext = action.payload;
    },

    /**
     * Set the current search/trip ID
     * This triggers localStorage sync via middleware
     */
    setSearchId: (state, action: PayloadAction<string>) => {
      state.currentSearchId = action.payload;
    },

    /**
     * Update recent searches (loaded from localStorage)
     */
    setRecentSearches: (state, action: PayloadAction<any[]>) => {
      state.recentSearches = action.payload;
    },

    /**
     * Clear all trip data (reset to initial state)
     */
    clearTrip: (state) => {
      state.currentItinerary = null;
      state.partialItinerary = null;
      state.generationMetadata = null;
      state.selectedLocation = '';
      state.selectedDay = 0;
      state.tripContext = undefined;
      // Keep currentSearchId and recentSearches
    },

    /**
     * Complete reset (including search history)
     */
    resetTrip: () => initialState,
  },
});

// Export actions
export const {
  setItinerary,
  setPartialItinerary,
  setGenerationMetadata,
  selectLocation,
  selectDay,
  setTripContext,
  setSearchId,
  setRecentSearches,
  clearTrip,
  resetTrip,
} = tripSlice.actions;

// Export reducer
export default tripSlice.reducer;

/**
 * Selectors
 *
 * These functions extract specific pieces of state.
 * Use these in components with useAppSelector
 */

// Basic selectors
export const selectCurrentItinerary = (state: RootState) => state.trip?.currentItinerary;
export const selectPartialItinerary = (state: RootState) => state.trip?.partialItinerary;
export const selectGenerationMetadata = (state: RootState) => state.trip?.generationMetadata;
export const selectSelectedLocation = (state: RootState) => state.trip?.selectedLocation;
export const selectSelectedDay = (state: RootState) => state.trip?.selectedDay;
export const selectTripContext = (state: RootState) => state.trip?.tripContext;
export const selectSearchId = (state: RootState) => state.trip?.currentSearchId;
export const selectRecentSearches = (state: RootState) => state.trip?.recentSearches || [];

/**
 * Computed selectors (derive data from state)
 */

// Check if we have any itinerary (full or partial)
export const selectHasItinerary = (state: RootState) => {
  return !!(state.trip?.currentItinerary || state.trip?.partialItinerary);
};

// Get the itinerary to display (prefer full, fallback to partial)
export const selectDisplayItinerary = (state: RootState) => {
  return state.trip?.currentItinerary || state.trip?.partialItinerary;
};

// Check if generation is in progress (has partial but not full)
export const selectIsGenerating = (state: RootState) => {
  return !!state.trip?.partialItinerary && !state.trip?.currentItinerary;
};

// Get all locations from the itinerary
export const selectLocations = (state: RootState) => {
  const itinerary = selectDisplayItinerary(state);
  if (!itinerary?.dailyItineraries) return [];

  const locations = new Set<string>();
  itinerary.dailyItineraries.forEach((day: any) => {
    const location = day.location || day.city;
    if (location) locations.add(location);
  });

  return Array.from(locations);
};

// Get days for the selected location
export const selectDaysForLocation = (state: RootState) => {
  const itinerary = selectDisplayItinerary(state);
  const selectedLocation = selectSelectedLocation(state);

  if (!itinerary?.dailyItineraries || !selectedLocation) return [];

  return itinerary.dailyItineraries.filter((day: any) => {
    const location = day.location || day.city;
    return location === selectedLocation;
  });
};

// Get the currently selected day object
export const selectCurrentDay = (state: RootState) => {
  const daysForLocation = selectDaysForLocation(state);
  const selectedDay = selectSelectedDay(state);

  return daysForLocation[selectedDay] || null;
};

/**
 * Example usage in components:
 *
 * ```tsx
 * import { useAppSelector, useAppDispatch } from '@/store/hooks';
 * import { selectCurrentItinerary, setItinerary } from '@/store/slices/tripSlice';
 *
 * function ItineraryDisplay() {
 *   const dispatch = useAppDispatch();
 *   const itinerary = useAppSelector(selectCurrentItinerary);
 *
 *   const handleItineraryReceived = (newItinerary: any) => {
 *     dispatch(setItinerary(newItinerary));
 *   };
 *
 *   return <div>{itinerary?.title}</div>;
 * }
 * ```
 */
