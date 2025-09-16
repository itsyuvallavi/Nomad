/**
 * Enhanced Chat Hook - Integrates Phase 3 Dialog System with UI
 * Manages conversation state, handles enhanced messages, and provides Phase 3 features
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  handleChatMessage, 
  continueConversation, 
  getConversationState,
  clearConversationState,
  type ChatRequest,
  type ChatResponse 
} from '@/services/ai/flows/chat-conversation';
import { 
  ConversationState, 
  type EnhancedMessage 
} from '@/services/ai/flows/generate-dialog-response';
import { logger } from '@/lib/logger';

interface UseEnhancedChatOptions {
  sessionId?: string;
  userId?: string;
  onError?: (error: string) => void;
  onItineraryGenerated?: (itinerary: any) => void;
}

interface UseEnhancedChatReturn {
  messages: EnhancedMessage[];
  conversationState: ConversationState | null;
  isGenerating: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (message?: string) => Promise<void>;
  clearConversation: () => void;
  suggestions: string[];
  handleQuickAction: (action: string, data?: any) => void;
  showMetadata: boolean;
  toggleMetadata: () => void;
  error: string | null;
}

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useEnhancedChat(options: UseEnhancedChatOptions = {}): UseEnhancedChatReturn {
  const sessionIdRef = useRef(options.sessionId || generateSessionId());
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showMetadata, setShowMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing conversation state on mount
  useEffect(() => {
    const existingState = getConversationState(sessionIdRef.current);
    if (existingState) {
      setConversationState(existingState);
      // Convert history to enhanced messages
      const enhancedMessages: EnhancedMessage[] = existingState.history.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }));
      setMessages(enhancedMessages);
    }
  }, []);

  const sendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || inputValue.trim();
    if (!messageToSend || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Add user message immediately for responsive UI
      const userMessage: EnhancedMessage = {
        role: 'user',
        content: messageToSend,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      // Prepare chat request
      const request: ChatRequest = {
        message: messageToSend,
        sessionId: sessionIdRef.current,
        userId: options.userId,
        context: conversationState || undefined
      };

      logger.info('Enhanced Chat', 'Sending message', { 
        sessionId: sessionIdRef.current,
        messageLength: messageToSend.length 
      });

      // Handle chat message with Phase 3 system
      const response: ChatResponse = await handleChatMessage(request);

      if (response.success) {
        // Create enhanced assistant message
        const assistantMessage: EnhancedMessage = {
          role: 'assistant',
          content: response.response.content,
          timestamp: new Date(),
          metadata: {
            confidence: response.response.confidence,
            responseType: response.response.type,
            processingTime: response.metadata.processingTime,
            requiresFollowUp: response.response.metadata.requiresFollowUp,
            classification: response.metadata.classification,
            parseResult: response.metadata.parseResult
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConversationState(response.conversationState);

        // Handle suggestions from dialog response
        if (response.response.context?.suggestions) {
          setSuggestions(response.response.context.suggestions);
        } else {
          setSuggestions([]);
        }

        // Handle itinerary generation
        if (response.itinerary && options.onItineraryGenerated) {
          options.onItineraryGenerated(response.itinerary);
        }

        logger.info('Enhanced Chat', 'Message processed successfully', {
          responseType: response.response.type,
          hasItinerary: !!response.itinerary,
          processingTime: response.metadata.processingTime
        });

      } else {
        // Handle error response
        const errorMessage: EnhancedMessage = {
          role: 'assistant',
          content: response.error || "I'm sorry, I encountered an error processing your request.",
          timestamp: new Date(),
          metadata: {
            confidence: 0.1,
            responseType: 'error',
            processingTime: response.metadata.processingTime,
            requiresFollowUp: false
          }
        };

        setMessages(prev => [...prev, errorMessage]);
        if (response.conversationState) {
          setConversationState(response.conversationState);
        }

        setError(response.error || 'Unknown error occurred');
        
        if (options.onError) {
          options.onError(response.error || 'Unknown error occurred');
        }

        logger.error('Enhanced Chat', 'Message processing failed', { 
          error: response.error,
          sessionId: sessionIdRef.current 
        });
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
      
      const errorMessage: EnhancedMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
        metadata: {
          confidence: 0.1,
          responseType: 'error',
          processingTime: 0,
          requiresFollowUp: true
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(errorMsg);
      
      if (options.onError) {
        options.onError(errorMsg);
      }

      logger.error('Enhanced Chat', 'Network or processing error', { error });
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, isGenerating, conversationState, options]);

  const clearConversation = useCallback(() => {
    clearConversationState(sessionIdRef.current);
    setMessages([]);
    setConversationState(null);
    setSuggestions([]);
    setError(null);
    sessionIdRef.current = generateSessionId();
    
    logger.info('Enhanced Chat', 'Conversation cleared', { 
      newSessionId: sessionIdRef.current 
    });
  }, []);

  const handleQuickAction = useCallback(async (action: string, data?: any) => {
    switch (action) {
      case 'suggestion':
        if (typeof data === 'string') {
          await sendMessage(data);
        }
        break;
        
      case 'confirm_action':
        if (conversationState) {
          try {
            setIsGenerating(true);
            const response = await continueConversation(
              sessionIdRef.current,
              'yes, proceed',
              { type: 'confirm_action', data }
            );
            
            if (response.success) {
              const confirmMessage: EnhancedMessage = {
                role: 'assistant',
                content: response.response.content,
                timestamp: new Date(),
                metadata: {
                  confidence: response.response.confidence,
                  responseType: response.response.type,
                  processingTime: response.metadata.processingTime,
                  requiresFollowUp: response.response.metadata.requiresFollowUp
                }
              };
              
              setMessages(prev => [...prev, confirmMessage]);
              setConversationState(response.conversationState);
              
              if (response.itinerary && options.onItineraryGenerated) {
                options.onItineraryGenerated(response.itinerary);
              }
            }
          } catch (error) {
            logger.error('Enhanced Chat', 'Quick action failed', { action, error });
          } finally {
            setIsGenerating(false);
          }
        }
        break;
        
      default:
        logger.warn('Enhanced Chat', 'Unknown quick action', { action, data });
    }
  }, [sendMessage, conversationState, options]);

  const toggleMetadata = useCallback(() => {
    setShowMetadata(prev => !prev);
  }, []);

  return {
    messages,
    conversationState,
    isGenerating,
    inputValue,
    setInputValue,
    sendMessage,
    clearConversation,
    suggestions,
    handleQuickAction,
    showMetadata,
    toggleMetadata,
    error
  };
}