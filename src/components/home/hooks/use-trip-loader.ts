/**
 * Hook for loading trips from URL params or localStorage
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { tripsService } from '@/services/trips/trips-service';
import type { FormValues } from '@/components/home/TripPlanningForm';
type View = 'auth' | 'start' | 'chat';
type TripMode = 'create' | 'view' | 'edit' | 'continue';

interface ChatState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isCompleted: boolean;
  itinerary?: any;
}

interface TripContext {
  mode: TripMode;
  tripId?: string;
  isModified: boolean;
}

interface UseTripLoaderParams {
  user: any;
  setCurrentView: (view: View) => void;
  setInitialPrompt: (prompt: FormValues | null) => void;
  setSavedChatState: (state: ChatState | undefined) => void;
  setCurrentSearchId: (id: string | undefined) => void;
  setTripContext: (context: TripContext | undefined) => void;
}

export function useTripLoader({
  user,
  setCurrentView,
  setInitialPrompt,
  setSavedChatState,
  setCurrentSearchId,
  setTripContext
}: UseTripLoaderParams) {
  const searchParams = useSearchParams();

  const loadTripFromFirestore = async (tripId: string, mode: TripMode) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const trip = await tripsService.getTrip(tripId);
      if (trip && trip.chatState) {
        setInitialPrompt({ prompt: trip.prompt });
        setSavedChatState(trip.chatState);
        setCurrentSearchId(tripId);
        setTripContext({
          mode,
          tripId,
          isModified: false
        });
        setCurrentView('chat');
      }
    } catch (error) {
      console.error('Error loading trip from Firestore:', error);
    }
  };

  const loadTripFromLocalStorage = () => {
    const viewingTrip = localStorage.getItem('viewingTrip');
    if (viewingTrip) {
      try {
        const tripData = JSON.parse(viewingTrip);
        setInitialPrompt({ prompt: tripData.prompt });
        setSavedChatState(tripData.chatState);
        setCurrentSearchId(tripData.id);
        setTripContext({
          mode: 'view',
          tripId: tripData.id,
          isModified: false
        });
        setCurrentView('chat');
        localStorage.removeItem('viewingTrip'); // Clean up
      } catch (error) {
        console.error('Error loading trip data:', error);
      }
    }
  };

  useEffect(() => {
    const tripId = searchParams?.get('tripId');
    const mode = searchParams?.get('mode') as TripMode;

    if (tripId && mode) {
      // Load trip from Firestore
      loadTripFromFirestore(tripId, mode);
    } else {
      // Fallback to old localStorage method for backward compatibility
      loadTripFromLocalStorage();
    }
  }, [searchParams]);

  return {
    loadTripFromFirestore,
    loadTripFromLocalStorage
  };
}