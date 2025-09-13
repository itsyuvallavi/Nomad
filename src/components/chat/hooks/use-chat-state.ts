'use client';

import { useState, useRef, useCallback } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

export interface ChatState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isCompleted: boolean;
  itinerary?: GeneratePersonalizedItineraryOutput;
}

export interface GenerationProgress {
  stage: 'understanding' | 'planning' | 'generating' | 'finalizing';
  message: string;
  percentage: number;
  timestamp: number;
}

export function useChatState(initialState?: ChatState) {
  const [messages, setMessages] = useState<Message[]>(initialState?.messages || []);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(
    initialState?.itinerary || null
  );
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    stage: 'understanding',
    message: 'Understanding your request...',
    percentage: 0,
    timestamp: Date.now()
  });

  const generationIdRef = useRef<string | null>(null);
  const generationStartTime = useRef<number>(0);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          content
        };
      }
      return newMessages;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentItinerary(null);
  }, []);

  const setError = useCallback((error: string) => {
    setErrorMessage(error);
    setErrorDialogOpen(true);
    setIsGenerating(false);
  }, []);

  return {
    // State
    messages,
    userInput,
    isGenerating,
    currentItinerary,
    errorDialogOpen,
    errorMessage,
    generationProgress,
    generationIdRef,
    generationStartTime,
    
    // Actions
    setMessages,
    setUserInput,
    setIsGenerating,
    setCurrentItinerary,
    setErrorDialogOpen,
    setErrorMessage,
    setGenerationProgress,
    addMessage,
    updateLastMessage,
    clearMessages,
    setError
  };
}