'use client';

import { useCallback, useEffect } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import type { ChatState, Message } from './use-chat-state';

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 10;

export interface RecentSearch {
  id: string;
  prompt: string;
  fileDataUrl?: string;
  chatState?: ChatState;
  title?: string;
  lastUpdated: string;
}

export function useChatStorage(searchId: string) {
  const saveChatState = useCallback((
    messages: Message[],
    isCompleted: boolean,
    itinerary?: GeneratePersonalizedItineraryOutput
  ) => {
    if (typeof window === 'undefined') return;
    
    try {
      const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') as RecentSearch[];
      const existingSearchIndex = searches.findIndex(s => s.id === searchId);
      
      const chatState: ChatState = {
        messages,
        isCompleted,
        itinerary
      };
      
      if (existingSearchIndex >= 0) {
        searches[existingSearchIndex] = {
          ...searches[existingSearchIndex],
          chatState,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Create new search entry if needed
        const newSearch: RecentSearch = {
          id: searchId,
          prompt: messages[0]?.content || '',
          chatState,
          title: itinerary?.title || 'New Trip',
          lastUpdated: new Date().toISOString()
        };
        searches.unshift(newSearch);
      }
      
      // Keep only the most recent searches
      const trimmedSearches = searches.slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmedSearches));
    } catch (error) {
      console.error('Failed to save chat state:', error);
    }
  }, [searchId]);

  const loadChatState = useCallback((): ChatState | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') as RecentSearch[];
      const search = searches.find(s => s.id === searchId);
      return search?.chatState || null;
    } catch (error) {
      console.error('Failed to load chat state:', error);
      return null;
    }
  }, [searchId]);

  const clearChatHistory = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]') as RecentSearch[];
      const updatedSearches = searches.filter(s => s.id !== searchId);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }, [searchId]);

  return {
    saveChatState,
    loadChatState,
    clearChatHistory
  };
}