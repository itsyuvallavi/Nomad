/**
 * Enhanced Chat Conversation Flow - Orchestrates the complete dialog system
 * Integrates hybrid parsing, dialog responses, and modification handling
 */

import { logger } from '@/lib/logger';
import { hybridParser, classifyInput, ClassificationResult, ParseResult } from '../utils/hybrid-parser';
import { 
  generateDialogResponse, 
  DialogResponse, 
  ConversationState, 
  Message,
  createConversationState,
  updateConversationState
} from './generate-dialog-response';
import { 
  handleModification, 
  ModificationResult 
} from './handle-modification';

export interface ChatRequest {
  message: string;
  sessionId: string;
  userId?: string;
  context?: Partial<ConversationState>;
}

export interface ChatResponse {
  success: boolean;
  sessionId: string;
  response: DialogResponse;
  conversationState: ConversationState;
  itinerary?: any; // Will be generated itinerary if successful
  modification?: ModificationResult;
  metadata: {
    processingTime: number;
    classification: ClassificationResult;
    parseResult: ParseResult;
    flowPath: string[];
    requiresItineraryGeneration: boolean;
  };
  error?: string;
}

// In-memory session storage (in production, use Redis or database)
const sessionStore = new Map<string, ConversationState>();

/**
 * Main chat conversation handler
 */
export async function handleChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();
  const flowPath: string[] = [];
  
  logger.info('Chat Conversation', 'Processing message', {
    sessionId: request.sessionId,
    messageLength: request.message.length,
    userId: request.userId
  });
  
  try {
    // Step 1: Load or create conversation state
    flowPath.push('load_state');
    let conversationState = sessionStore.get(request.sessionId);
    
    if (!conversationState) {
      conversationState = createConversationState(request.sessionId, request.userId);
      logger.info('Chat Conversation', 'Created new conversation state', { sessionId: request.sessionId });
    } else {
      logger.info('Chat Conversation', 'Loaded existing conversation state', { 
        sessionId: request.sessionId,
        messageCount: conversationState.metadata.messageCount,
        hasItinerary: !!conversationState.currentItinerary
      });
    }
    
    // Step 2: Classify input type
    flowPath.push('classify');
    let classification = classifyInput(request.message);
    
    logger.info('Chat Conversation', 'Input classified', {
      type: classification.type,
      complexity: classification.complexity,
      confidence: classification.confidence
    });
    
    // Step 3: Handle different conversation flows
    let parseResult: ParseResult;
    let dialogResponse: DialogResponse;
    let modificationResult: ModificationResult | undefined;
    let requiresItineraryGeneration = false;
    
    if (classification.type === 'modification' && conversationState.currentItinerary) {
      // Handle modification to existing itinerary
      flowPath.push('handle_modification');
      modificationResult = await handleModification(
        request.message,
        conversationState.currentItinerary,
        conversationState
      );
      
      if (modificationResult.success) {
        // Update conversation state with modified itinerary
        conversationState.currentItinerary = modificationResult.changes.after;
        requiresItineraryGeneration = true;
      }
      
      // Generate appropriate dialog response
      parseResult = {
        success: modificationResult.success,
        confidence: modificationResult.confidence,
        source: 'hybrid',
        parsedTrip: modificationResult.changes.after,
        metadata: {
          processingTime: modificationResult.metadata.processingTime,
          fallbackUsed: false,
          classification
        }
      };
      
      dialogResponse = await generateModificationResponse(modificationResult, conversationState);
      
    } else if (classification.type === 'question') {
      // Handle pure questions
      flowPath.push('handle_question');
      parseResult = {
        success: false,
        confidence: 0.8,
        source: 'hybrid',
        metadata: {
          processingTime: 0,
          fallbackUsed: false,
          classification
        }
      };
      
      dialogResponse = await generateDialogResponse(
        request.message,
        classification,
        parseResult,
        conversationState
      );
      
    } else {
      // Handle travel planning requests (new or continuation)
      flowPath.push('parse_travel_request');
      
      // Build context-aware input for parsing (before adding current message to state)
      const contextAwareInput = buildContextAwareInput(request.message, conversationState);
      
      // Debug log to see if context combination is working
      if (contextAwareInput !== request.message) {
        logger.info('Chat Conversation', 'Using context-aware input', {
          original: request.message,
          contextAware: contextAwareInput
        });
        
        // Re-classify the combined input for proper dialog generation
        classification = classifyInput(contextAwareInput);
        logger.info('Chat Conversation', 'Updated classification for combined input', {
          newClassification: classification.type,
          newConfidence: classification.confidence
        });
      }
      
      // Try parsing with hybrid parser (with context if available)
      parseResult = await hybridParser.parse(contextAwareInput);
      
      // Generate dialog response based on parse result
      flowPath.push('generate_response');
      dialogResponse = await generateDialogResponse(
        contextAwareInput,
        classification,
        parseResult,
        conversationState
      );
      
      // Check if we should generate an itinerary
      if (parseResult.success && dialogResponse.type === 'confirmation') {
        requiresItineraryGeneration = true;
      }
    }
    
    // Step 4: Update conversation state
    flowPath.push('update_state');
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: request.message,
      timestamp: new Date(),
      metadata: {
        classification,
        parseResult
      }
    };
    
    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: dialogResponse.content,
      timestamp: new Date()
    };
    
    conversationState = updateConversationState(conversationState, userMessage, parseResult);
    conversationState = updateConversationState(conversationState, assistantMessage);
    
    // Store updated state
    sessionStore.set(request.sessionId, conversationState);
    
    // Step 5: Generate itinerary if needed
    let itinerary: any = undefined;
    if (requiresItineraryGeneration && parseResult.parsedTrip) {
      flowPath.push('generate_itinerary');
      try {
        itinerary = await generateItinerary(parseResult.parsedTrip, conversationState);
        logger.info('Chat Conversation', 'Itinerary generated successfully', {
          destinations: parseResult.parsedTrip.destinations.length,
          totalDays: parseResult.parsedTrip.totalDays
        });
      } catch (error) {
        logger.error('Chat Conversation', 'Itinerary generation failed', { error });
        // Don't fail the whole conversation if itinerary generation fails
      }
    }
    
    // Step 6: Build response
    const response: ChatResponse = {
      success: true,
      sessionId: request.sessionId,
      response: dialogResponse,
      conversationState,
      itinerary,
      modification: modificationResult,
      metadata: {
        processingTime: Date.now() - startTime,
        classification,
        parseResult,
        flowPath,
        requiresItineraryGeneration
      }
    };
    
    logger.info('Chat Conversation', 'Message processed successfully', {
      sessionId: request.sessionId,
      responseType: dialogResponse.type,
      hasItinerary: !!itinerary,
      processingTime: response.metadata.processingTime,
      flowPath: flowPath.join(' -> ')
    });
    
    return response;
    
  } catch (error) {
    logger.error('Chat Conversation', 'Message processing failed', { 
      error,
      sessionId: request.sessionId,
      flowPath: flowPath.join(' -> ')
    });
    
    // Return error response
    return {
      success: false,
      sessionId: request.sessionId,
      response: {
        type: 'error',
        content: "I'm sorry, I'm having trouble processing your request right now. Could you try again?",
        confidence: 0.1,
        metadata: {
          processingTime: Date.now() - startTime,
          responseSource: 'template',
          requiresFollowUp: true
        }
      },
      conversationState: sessionStore.get(request.sessionId) || createConversationState(request.sessionId, request.userId),
      metadata: {
        processingTime: Date.now() - startTime,
        classification: { type: 'ambiguous', confidence: 0, complexity: 'simple', features: {} },
        parseResult: { 
          success: false, 
          confidence: 0, 
          source: 'hybrid',
          metadata: { processingTime: 0, fallbackUsed: false, classification: { type: 'ambiguous', confidence: 0, complexity: 'simple', features: {} } }
        },
        flowPath,
        requiresItineraryGeneration: false
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate dialog response for modifications
 */
async function generateModificationResponse(
  modificationResult: ModificationResult,
  conversationState: ConversationState
): Promise<DialogResponse> {
  if (!modificationResult.success) {
    return {
      type: 'error',
      content: `I couldn't make that change: ${modificationResult.changes.summary}`,
      confidence: 0.8,
      metadata: {
        processingTime: 0,
        responseSource: 'template',
        requiresFollowUp: true
      }
    };
  }
  
  if (modificationResult.requiresConfirmation) {
    return {
      type: 'confirmation',
      content: modificationResult.confirmationPrompt || `I'll ${modificationResult.changes.summary}. Shall I proceed?`,
      context: {
        nextSteps: ['Confirm the change', 'Generate updated itinerary']
      },
      actions: [
        {
          type: 'confirm_action',
          label: 'Yes, make this change',
          data: { modificationId: generateMessageId() }
        },
        {
          type: 'suggest_alternative',
          label: 'No, try something else',
          data: {}
        }
      ],
      confidence: modificationResult.confidence,
      metadata: {
        processingTime: modificationResult.metadata.processingTime,
        responseSource: 'hybrid',
        requiresFollowUp: true
      }
    };
  }
  
  return {
    type: 'success',
    content: `Perfect! I've updated your itinerary: ${modificationResult.changes.summary}`,
    confidence: modificationResult.confidence,
    metadata: {
      processingTime: modificationResult.metadata.processingTime,
      responseSource: 'hybrid',
      requiresFollowUp: false
    }
  };
}

/**
 * Generate itinerary from parsed trip data
 * This integrates with the existing itinerary generation system
 */
async function generateItinerary(parsedTrip: any, conversationState: ConversationState): Promise<any> {
  // Import the existing itinerary generation function
  try {
    const { generatePersonalizedItinerary } = await import('./generate-personalized-itinerary');
    
    // Build prompt from parsed trip
    const prompt = buildPromptFromParsedTrip(parsedTrip);
    
    // Build conversation history for context
    const conversationHistory = buildConversationHistory(conversationState);
    
    // Generate itinerary using existing system
    const itinerary = await generatePersonalizedItinerary({ 
      prompt,
      conversationHistory 
    });
    
    return itinerary;
    
  } catch (error) {
    logger.error('Chat Conversation', 'Failed to import or call itinerary generator', { error });
    throw error;
  }
}

/**
 * Build prompt from parsed trip data for itinerary generation
 */
function buildPromptFromParsedTrip(parsedTrip: any): string {
  const destinations = parsedTrip.destinations.map((d: any) => d.name).join(', ');
  const origin = parsedTrip.origin ? ` from ${parsedTrip.origin}` : '';
  
  return `${parsedTrip.totalDays} days in ${destinations}${origin}`;
}

/**
 * Build conversation history string for context
 */
function buildConversationHistory(conversationState: ConversationState): string {
  if (!conversationState.history || conversationState.history.length === 0) {
    return '';
  }
  
  return conversationState.history
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
}

/**
 * Build context-aware input by combining current message with relevant conversation context
 */
function buildContextAwareInput(currentMessage: string, conversationState: ConversationState): string {
  // If no conversation history, just return current message
  if (!conversationState.history || conversationState.history.length === 0) {
    return currentMessage;
  }
  
  // Get user messages from conversation
  const userMessages = conversationState.history
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content);
  
  // If current message looks like clarification (short, incomplete), combine with previous context
  if (isLikelyClarification(currentMessage) && userMessages.length > 0) {
    const previousUserMessage = userMessages[userMessages.length - 1];
    return `${previousUserMessage} ${currentMessage}`;
  }
  
  return currentMessage;
}

/**
 * Check if message is likely a clarification/follow-up
 */
function isLikelyClarification(message: string): boolean {
  // Short messages that look like clarifications
  if (message.length < 30) {
    // Contains typical clarification patterns
    return /^(for \d+|from [A-Z]|in [A-Z]|\d+ days|to [A-Z])/.test(message.trim());
  }
  return false;
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get conversation state for external access
 */
export function getConversationState(sessionId: string): ConversationState | undefined {
  return sessionStore.get(sessionId);
}

/**
 * Clear conversation state (for testing or reset)
 */
export function clearConversationState(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getActiveSessions(): string[] {
  return Array.from(sessionStore.keys());
}

/**
 * Handle conversation continuation (for multi-turn dialogs)
 */
export async function continueConversation(
  sessionId: string,
  userResponse: string,
  action?: { type: string; data?: any }
): Promise<ChatResponse> {
  const conversationState = sessionStore.get(sessionId);
  
  if (!conversationState) {
    throw new Error(`No active conversation found for session ${sessionId}`);
  }
  
  // Handle specific actions (like confirmation responses)
  if (action?.type === 'confirm_action') {
    // User confirmed a modification - proceed with itinerary generation
    return handleChatMessage({
      message: 'proceed with the change',
      sessionId,
      context: conversationState
    });
  }
  
  // Regular conversation continuation
  return handleChatMessage({
    message: userResponse,
    sessionId,
    context: conversationState
  });
}

/**
 * Export types and main functions
 */
