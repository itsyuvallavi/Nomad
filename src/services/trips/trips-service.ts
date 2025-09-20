/**
 * Trips Service
 * Manages trip data in Firestore and syncs with localStorage
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/services/firebase/auth';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import type { ChatState } from '@/app/page';

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  prompt: string;
  startDate?: Date | Timestamp | string;
  endDate?: Date | Timestamp | string;
  duration: number;
  budget?: number;
  currency: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  chatState?: ChatState;
  itinerary?: GeneratePersonalizedItineraryOutput;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastOpenedAt?: Timestamp;
  isFavorite: boolean;
  tags: string[];
  imageUrl?: string;
}

export interface CreateTripInput {
  userId: string;
  prompt: string;
  title?: string;
  chatState?: ChatState;
  itinerary?: GeneratePersonalizedItineraryOutput;
  fileDataUrl?: string;
  id?: string; // Optional ID to use instead of generating one
}

class TripsService {
  private readonly COLLECTION_NAME = 'trips';
  private readonly LOCAL_STORAGE_KEY = 'recentSearches';

  /**
   * Create a new trip in Firestore
   */
  async createTrip(input: CreateTripInput): Promise<Trip> {
    // Use provided ID or generate a new one
    const tripId = input.id || doc(collection(db, this.COLLECTION_NAME)).id;
    
    // Extract destination and duration from itinerary if available
    const destination = input.itinerary?.destination || 
                       this.extractDestinationFromPrompt(input.prompt) || 
                       'Unknown Destination';
    
    const duration = input.itinerary?.itinerary?.length || 
                    this.extractDurationFromPrompt(input.prompt) || 
                    3;

    // Clean the data before saving to Firestore
    const cleanedChatState = this.cleanDataForFirestore(input.chatState);
    const cleanedItinerary = this.cleanDataForFirestore(input.itinerary);

    const tripData: any = {
      userId: input.userId,
      title: input.title || input.itinerary?.title || `Trip to ${destination}`,
      destination,
      prompt: input.prompt,
      duration,
      currency: 'USD',
      travelStyle: 'mid-range',
      status: input.itinerary ? 'confirmed' : 'draft',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      isFavorite: false,
      tags: this.extractTagsFromItinerary(input.itinerary)
    };
    
    // Only add these if they're valid
    if (cleanedChatState) {
      tripData.chatState = cleanedChatState;
    }
    if (cleanedItinerary) {
      tripData.itinerary = cleanedItinerary;
    }
    
    // Only add imageUrl if we have one
    if (input.itinerary?.destination) {
      // We could potentially fetch an image URL here in the future
      // For now, we'll leave it out of the document
    }

    // Extract dates from itinerary if available
    if (input.itinerary?.itinerary?.[0]?.date) {
      const firstDay = input.itinerary.itinerary[0].date;
      const lastDay = input.itinerary.itinerary[input.itinerary.itinerary.length - 1].date;

      // Parse dates in local timezone to avoid off-by-one error
      const [startYear, startMonth, startDay] = firstDay.split('-').map(Number);
      const [endYear, endMonth, endDay] = lastDay.split('-').map(Number);

      tripData.startDate = new Date(startYear, startMonth - 1, startDay);
      tripData.endDate = new Date(endYear, endMonth - 1, endDay);
    }

    const tripRef = doc(db, this.COLLECTION_NAME, tripId);
    await setDoc(tripRef, tripData);

    return {
      id: tripId,
      ...tripData
    } as Trip;
  }

  /**
   * Get all trips for a user
   */
  async getUserTrips(userId: string, limitCount: number = 50): Promise<Trip[]> {
    try {
      // Optimized query with limit for better performance
      const tripsQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(tripsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Trip));
    } catch (error: any) {
      // If index doesn't exist, fall back to simple query and sort in memory
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('Index not ready, using fallback query');
        
        const simpleQuery = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId)
        );

        const snapshot = await getDocs(simpleQuery);
        const trips = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Trip));

        // Sort in memory
        return trips.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime; // Descending order
        });
      }
      throw error;
    }
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(tripId: string): Promise<Trip | null> {
    const tripRef = doc(db, this.COLLECTION_NAME, tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      return null;
    }

    return {
      id: tripSnap.id,
      ...tripSnap.data()
    } as Trip;
  }

  /**
   * Update a trip
   */
  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<void> {
    const tripRef = doc(db, this.COLLECTION_NAME, tripId);
    
    // Clean the updates for Firestore
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const cleaned = this.cleanDataForFirestore(value);
        if (cleaned !== null) {
          cleanUpdates[key] = cleaned;
        }
      }
    }
    
    await updateDoc(tripRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Delete a trip
   */
  async deleteTrip(tripId: string): Promise<void> {
    const tripRef = doc(db, this.COLLECTION_NAME, tripId);
    await deleteDoc(tripRef);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(tripId: string, isFavorite: boolean): Promise<void> {
    await this.updateTrip(tripId, { isFavorite });
  }

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    await this.updateTrip(tripId, { status });
  }

  /**
   * Sync localStorage searches to Firestore
   */
  async syncLocalStorageToFirestore(userId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check if we've already synced for this user
      const syncKey = `trips_synced_${userId}`;
      const alreadySynced = localStorage.getItem(syncKey);
      if (alreadySynced) {
        console.log('Already synced trips for this user');
        return;
      }

      const localSearches = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!localSearches) return;

      const searches = JSON.parse(localSearches);
      const batch = writeBatch(db);
      let hasNewTrips = false;

      for (const search of searches) {
        // Check if trip already exists
        const existingTrips = await this.getUserTrips(userId);
        const exists = existingTrips.some(
          trip => trip.prompt === search.prompt && 
                 Math.abs(trip.createdAt.toDate().getTime() - new Date(search.lastUpdated).getTime()) < 60000
        );

        if (!exists) {
          const tripId = search.id || doc(collection(db, this.COLLECTION_NAME)).id;
          const tripRef = doc(db, this.COLLECTION_NAME, tripId);
          
          const tripData = {
            userId,
            title: search.title || 'New Trip',
            destination: this.extractDestinationFromPrompt(search.prompt) || 'Unknown',
            prompt: search.prompt,
            duration: this.extractDurationFromPrompt(search.prompt) || 3,
            currency: 'USD',
            travelStyle: 'mid-range' as const,
            status: search.chatState?.isCompleted ? 'confirmed' as const : 'draft' as const,
            chatState: search.chatState,
            itinerary: search.chatState?.itinerary,
            createdAt: Timestamp.fromDate(new Date(search.lastUpdated)),
            updatedAt: serverTimestamp(),
            isFavorite: false,
            tags: [],
          };

          batch.set(tripRef, tripData);
          hasNewTrips = true;
        }
      }

      if (hasNewTrips) {
        await batch.commit();
        console.log('✅ Local searches synced to Firestore');
      }
      
      // Mark as synced and clear localStorage
      localStorage.setItem(syncKey, 'true');
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      console.log('✅ Cleared localStorage after sync');
    } catch (error) {
      console.error('Error syncing localStorage to Firestore:', error);
    }
  }

  /**
   * Helper: Extract destination from prompt
   */
  private extractDestinationFromPrompt(prompt: string): string | null {
    // Common patterns: "trip to Paris", "visiting London", "travel to Tokyo"
    const patterns = [
      /(?:trip|travel|visit|going|fly|vacation|holiday)\s+(?:to|in)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+in|\s+during|,|\.|\?|$)/i,
      /(?:^|\s)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:trip|travel|vacation|holiday)/i,
      /(?:explore|discover|tour)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+in|,|\.|\?|$)/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Look for city names
    const cities = ['London', 'Paris', 'Tokyo', 'New York', 'Barcelona', 'Rome', 'Amsterdam', 'Berlin', 'Dubai', 'Singapore'];
    for (const city of cities) {
      if (prompt.toLowerCase().includes(city.toLowerCase())) {
        return city;
      }
    }

    return null;
  }

  /**
   * Helper: Extract duration from prompt
   */
  private extractDurationFromPrompt(prompt: string): number | null {
    // Patterns: "3 days", "one week", "2 weeks", "5 nights"
    const patterns = [
      /(\d+)\s*(?:day|night)s?/i,
      /(\d+)\s*weeks?/i,
      /(one|two|three|four|five|six|seven)\s*(?:day|night)s?/i,
      /(a|one)\s*week/i
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        const value = match[1];
        
        // Handle number words
        const wordToNumber: Record<string, number> = {
          'a': 1, 'one': 1, 'two': 2, 'three': 3, 
          'four': 4, 'five': 5, 'six': 6, 'seven': 7
        };

        if (wordToNumber[value.toLowerCase()]) {
          return wordToNumber[value.toLowerCase()];
        }

        // Handle week(s)
        if (pattern.toString().includes('week')) {
          return parseInt(value) * 7;
        }

        return parseInt(value);
      }
    }

    return null;
  }

  /**
   * Helper: Clean data for Firestore (remove undefined values and Map objects)
   */
  private cleanDataForFirestore(data: any): any {
    if (data === undefined || data === null) {
      return null;
    }
    
    // Handle Maps
    if (data instanceof Map) {
      const obj: any = {};
      data.forEach((value, key) => {
        obj[key] = this.cleanDataForFirestore(value);
      });
      return obj;
    }
    
    // Handle Arrays
    if (Array.isArray(data)) {
      return data.map(item => this.cleanDataForFirestore(item))
        .filter(item => item !== null);
    }
    
    // Handle Objects
    if (typeof data === 'object' && data !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip private fields (starting with _) and undefined values
        if (!key.startsWith('_') && value !== undefined) {
          const cleanedValue = this.cleanDataForFirestore(value);
          if (cleanedValue !== null) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : null;
    }
    
    // Return primitive values as-is
    return data;
  }

  /**
   * Helper: Extract tags from itinerary
   */
  private extractTagsFromItinerary(itinerary?: GeneratePersonalizedItineraryOutput): string[] {
    if (!itinerary) return [];

    const tags: string[] = [];

    // Add main activities/themes
    const activities = new Set<string>();
    itinerary.itinerary?.forEach(day => {
      day.activities?.forEach(activity => {
        if (activity.category) {
          activities.add(activity.category.toLowerCase());
        }
      });
    });

    tags.push(...Array.from(activities).slice(0, 5));

    return tags;
  }
}

export const tripsService = new TripsService();