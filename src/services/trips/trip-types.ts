/**
 * Trip Type Definitions
 * Centralized type definitions for trip-related services
 */

import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import type { ChatState } from '@/app/page';

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  prompt: string;
  startDate?: string;
  endDate?: string;
  duration: number;
  budget?: number;
  currency: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  chatState?: ChatState;
  itinerary?: GeneratePersonalizedItineraryOutput;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  isFavorite: boolean;
  tags: string[];
  imageUrl?: string;
}

export interface CreateTripInput {
  userId: string;
  title?: string;
  destination?: string;
  prompt: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  budget?: number;
  currency?: string;
  travelStyle?: 'budget' | 'mid-range' | 'luxury';
  chatState?: ChatState;
  itinerary?: GeneratePersonalizedItineraryOutput;
  tags?: string[];
  imageUrl?: string;
}

export interface LocalSearchData {
  id: string;
  message: string;
  response: any;
  timestamp: string;
  synced?: boolean;
  destination?: string;
  duration?: number;
}

export interface TripQueryOptions {
  userId: string;
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'lastOpenedAt';
  orderDirection?: 'asc' | 'desc';
  status?: Trip['status'];
  isFavorite?: boolean;
}

export interface TripUpdateInput extends Partial<Trip> {
  id?: never;
  userId?: never;
  createdAt?: never;
}