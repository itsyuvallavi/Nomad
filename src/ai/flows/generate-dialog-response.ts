/**
 * Dialog Response Generator - Creates contextual, helpful responses for travel planning conversations
 * Handles clarifications, confirmations, suggestions, and error explanations
 */

import { logger } from '@/lib/logger';
import { ClassificationResult, ParseResult } from '../utils/hybrid-parser';
import { ParsedTrip } from '../utils/destination-parser';

export interface ConversationState {
  sessionId: string;
  userId?: string;
  currentItinerary?: ParsedTrip;
  history: Message[];
  context: {
    origin?: string;
    destinations: string[];
    preferences: Map<string, any>;
    constraints: Constraint[];
  };
  metadata: {
    startTime: Date;
    lastActivity: Date;
    messageCount: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    classification?: ClassificationResult;
    parseResult?: ParseResult;
  };
}

export interface Constraint {
  type: 'budget' | 'dates' | 'duration' | 'group_size' | 'accessibility' | 'preferences';
  value: any;
  priority: 'low' | 'medium' | 'high';
}

export interface DialogResponse {
  type: 'clarification' | 'confirmation' | 'suggestion' | 'error' | 'success' | 'information';
  content: string;
  context?: {
    missingInfo?: string[];
    suggestions?: string[];
    nextSteps?: string[];
  };
  actions?: Array<{
    type: 'collect_info' | 'confirm_action' | 'suggest_alternative' | 'show_results';
    label: string;
    data?: any;
  }>;
  confidence: number;
  metadata: {
    processingTime: number;
    responseSource: 'template' | 'ai_generated' | 'hybrid';
    requiresFollowUp: boolean;
  };
}

// Response templates for common scenarios
const RESPONSE_TEMPLATES = {
  missing_origin: {
    template: "I'd love to help you plan this trip! Where will you be departing from?",
    type: 'clarification' as const,
    missingInfo: ['origin']
  },
  
  missing_destination: {
    template: "That sounds like a great trip! Which destination{s} would you like to visit?",
    type: 'clarification' as const,
    missingInfo: ['destinations']
  },
  
  missing_duration: {
    template: "Perfect! How many days are you planning for this trip?",
    type: 'clarification' as const,
    missingInfo: ['duration']
  },
  
  ambiguous_destination: {
    template: "I can help you plan a trip to {region}! Which specific cities interest you most?",
    type: 'clarification' as const,
    missingInfo: ['specific_destinations']
  },
  
  successful_parse: {
    template: "Great! I'll create a {totalDays}-day itinerary from {origin} to {destinations}. Let me get started!",
    type: 'confirmation' as const
  },
  
  modification_confirmation: {
    template: "I'll {action} for your trip. Here's what will change: {changes}",
    type: 'confirmation' as const
  },
  
  parsing_error: {
    template: "I'm having trouble understanding your request. Could you provide more details about your destination and travel dates?",
    type: 'clarification' as const
  },
  
  over_limit_destinations: {
    template: "I can plan trips with up to 5 cities. You've mentioned {count} destinations. Which are your top 5 priorities?",
    type: 'clarification' as const
  },
  
  over_limit_duration: {
    template: "I can plan trips up to 30 days. For longer journeys, I can help you break it into segments. Would that work?",
    type: 'suggestion' as const
  },
  
  suggestion_offer: {
    template: "Based on your preferences for {preferences}, I'd recommend {suggestions}. Would you like me to include {specific} in your itinerary?",
    type: 'suggestion' as const
  },
  
  conversation_greeting: {
    template: "I'd be happy to help you plan an amazing trip! Tell me about your ideal destination and how long you'd like to travel.",
    type: 'information' as const
  }
};

/**
 * Main dialog response generator
 */
export async function generateDialogResponse(
  input: string,
  classification: ClassificationResult,
  parseResult: ParseResult,
  context: ConversationState
): Promise<DialogResponse> {
  const startTime = Date.now();
  
  logger.info('Dialog Generator', 'Generating response', {
    inputLength: input.length,
    classification: classification.type,
    parseSuccess: parseResult.success,
    hasContext: !!context.currentItinerary
  });
  
  try {
    let response: DialogResponse;
    
    // Route to appropriate response handler based on classification and parse result
    if (classification.type === 'question') {
      response = await handleQuestionResponse(input, classification, context);
    } else if (classification.type === 'modification') {
      response = await handleModificationResponse(input, parseResult, context);
    } else if (!parseResult.success) {
      response = await handleParsingErrorResponse(input, classification, parseResult, context);
    } else if (parseResult.success && needsClarification(parseResult, context)) {
      response = await handleClarificationResponse(parseResult, context);
    } else if (parseResult.success) {
      response = await handleSuccessResponse(parseResult, context);
    } else {
      response = await handleFallbackResponse(input, classification, context);
    }
    
    // Add processing metadata
    response.metadata = {
      ...response.metadata,
      processingTime: Date.now() - startTime
    };
    
    logger.info('Dialog Generator', 'Response generated', {
      type: response.type,
      confidence: response.confidence,
      requiresFollowUp: response.metadata.requiresFollowUp,
      processingTime: response.metadata.processingTime
    });
    
    return response;
    
  } catch (error) {
    logger.error('Dialog Generator', 'Response generation failed', { error });
    
    return {
      type: 'error',
      content: "I'm sorry, I'm having trouble processing your request right now. Could you try rephrasing it?",
      confidence: 0.3,
      metadata: {
        processingTime: Date.now() - startTime,
        responseSource: 'template',
        requiresFollowUp: true
      }
    };
  }
}

/**
 * Handle question-type responses
 */
async function handleQuestionResponse(
  input: string,
  classification: ClassificationResult,
  context: ConversationState
): Promise<DialogResponse> {
  // For now, redirect questions to appropriate handlers
  const content = "I specialize in creating travel itineraries! If you'd like help planning a trip, just tell me your destination and how long you'd like to travel.";
  
  return {
    type: 'information',
    content,
    confidence: 0.8,
    metadata: {
      processingTime: 0,
      responseSource: 'template',
      requiresFollowUp: false
    }
  };
}

/**
 * Handle modification requests
 */
async function handleModificationResponse(
  input: string,
  parseResult: ParseResult,
  context: ConversationState
): Promise<DialogResponse> {
  if (!context.currentItinerary) {
    return {
      type: 'error',
      content: "I don't see an existing itinerary to modify. Would you like me to create a new one?",
      confidence: 0.9,
      metadata: {
        processingTime: 0,
        responseSource: 'template',
        requiresFollowUp: true
      }
    };
  }
  
  // For now, acknowledge the modification request
  const content = "I understand you'd like to modify your itinerary. Let me process that change for you.";
  
  return {
    type: 'confirmation',
    content,
    confidence: 0.7,
    metadata: {
      processingTime: 0,
      responseSource: 'template',
      requiresFollowUp: true
    }
  };
}

/**
 * Handle parsing errors with helpful guidance
 */
async function handleParsingErrorResponse(
  input: string,
  classification: ClassificationResult,
  parseResult: ParseResult,
  context: ConversationState
): Promise<DialogResponse> {
  const missingInfo: string[] = [];
  
  // Analyze what might be missing
  if (!parseResult.parsedTrip?.origin && !context.context.origin) {
    missingInfo.push('departure city');
  }
  
  if (!parseResult.parsedTrip?.destinations.length && !context.context.destinations.length) {
    missingInfo.push('destination');
  }
  
  if (parseResult.parsedTrip?.totalDays === 0) {
    missingInfo.push('trip duration');
  }
  
  let content: string;
  let suggestions: string[] = [];
  
  if (missingInfo.length > 0) {
    content = `I'd love to help you plan this trip! I need a bit more information about your ${missingInfo.join(' and ')}.`;
    suggestions = [
      "Try: '5 days in Paris from New York'",
      "Or: 'Weekend trip to London from Boston'"
    ];
  } else {
    content = "I'm having trouble understanding your travel request. Could you provide more specific details?";
    suggestions = [
      "Include your departure city",
      "Specify your destination",
      "Mention how long you'd like to travel"
    ];
  }
  
  return {
    type: 'clarification',
    content,
    context: {
      missingInfo,
      suggestions,
      nextSteps: ["Provide missing travel details"]
    },
    confidence: 0.8,
    metadata: {
      processingTime: 0,
      responseSource: 'template',
      requiresFollowUp: true
    }
  };
}

/**
 * Handle successful parsing that needs clarification
 */
async function handleClarificationResponse(
  parseResult: ParseResult,
  context: ConversationState
): Promise<DialogResponse> {
  const trip = parseResult.parsedTrip!;
  const missingInfo: string[] = [];
  
  if (!trip.origin) {
    return buildTemplateResponse('missing_origin', {}, context);
  }
  
  if (trip.destinations.length === 0) {
    return buildTemplateResponse('missing_destination', {}, context);
  }
  
  if (trip.totalDays === 0) {
    return buildTemplateResponse('missing_duration', {}, context);
  }
  
  // Check for validation issues
  if (trip.destinations.length > 5) {
    return buildTemplateResponse('over_limit_destinations', {
      count: trip.destinations.length
    }, context);
  }
  
  if (trip.totalDays > 30) {
    return buildTemplateResponse('over_limit_duration', {}, context);
  }
  
  // Default to success if no major issues
  return handleSuccessResponse(parseResult, context);
}

/**
 * Handle successful parsing with confirmation
 */
async function handleSuccessResponse(
  parseResult: ParseResult,
  context: ConversationState
): Promise<DialogResponse> {
  const trip = parseResult.parsedTrip!;
  
  const destinationList = trip.destinations.length > 1 
    ? trip.destinations.slice(0, -1).map(d => d.name).join(', ') + ' and ' + trip.destinations[trip.destinations.length - 1].name
    : trip.destinations[0]?.name || 'your destination';
  
  return buildTemplateResponse('successful_parse', {
    totalDays: trip.totalDays,
    origin: trip.origin || 'your departure city',
    destinations: destinationList
  }, context);
}

/**
 * Handle fallback scenarios
 */
async function handleFallbackResponse(
  input: string,
  classification: ClassificationResult,
  context: ConversationState
): Promise<DialogResponse> {
  if (context.history.length === 0) {
    return buildTemplateResponse('conversation_greeting', {}, context);
  }
  
  return buildTemplateResponse('parsing_error', {}, context);
}

/**
 * Build response from template
 */
function buildTemplateResponse(
  templateKey: keyof typeof RESPONSE_TEMPLATES,
  variables: Record<string, any>,
  context: ConversationState
): DialogResponse {
  const template = RESPONSE_TEMPLATES[templateKey];
  
  let content = template.template;
  
  // Replace variables in template
  Object.entries(variables).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });
  
  // Handle pluralization
  content = content.replace(/{(\w+)}\{s\}/g, (match, word) => {
    const value = variables[word];
    return Array.isArray(value) && value.length > 1 ? `${word}s` : word;
  });
  
  return {
    type: template.type,
    content,
    context: {
      missingInfo: 'missingInfo' in template ? template.missingInfo : undefined
    },
    confidence: 0.8,
    metadata: {
      processingTime: 0,
      responseSource: 'template',
      requiresFollowUp: template.type === 'clarification'
    }
  };
}

/**
 * Check if parsed result needs clarification
 */
function needsClarification(parseResult: ParseResult, context: ConversationState): boolean {
  if (!parseResult.parsedTrip) return true;
  
  const trip = parseResult.parsedTrip;
  
  // Check for missing essential information
  if (!trip.origin && !context.context.origin) return true;
  if (trip.destinations.length === 0) return true;
  if (trip.totalDays === 0) return true;
  
  // Check for validation issues
  if (trip.destinations.length > 5) return true;
  if (trip.totalDays > 30) return true;
  
  // Check confidence level
  if (parseResult.confidence < 0.6) return true;
  
  return false;
}

/**
 * Create conversation state for new sessions
 */
export function createConversationState(sessionId: string, userId?: string): ConversationState {
  return {
    sessionId,
    userId,
    history: [],
    context: {
      destinations: [],
      preferences: new Map(),
      constraints: []
    },
    metadata: {
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0
    }
  };
}

/**
 * Update conversation state with new message
 */
export function updateConversationState(
  state: ConversationState,
  message: Message,
  parseResult?: ParseResult
): ConversationState {
  const updatedState = { ...state };
  
  // Add message to history
  updatedState.history.push(message);
  
  // Update metadata
  updatedState.metadata.lastActivity = new Date();
  updatedState.metadata.messageCount++;
  
  // Update context from parse result
  if (parseResult?.parsedTrip) {
    const trip = parseResult.parsedTrip;
    
    if (trip.origin && !updatedState.context.origin) {
      updatedState.context.origin = trip.origin;
    }
    
    if (trip.destinations.length > 0) {
      const newDestinations = trip.destinations.map(d => d.name);
      updatedState.context.destinations = [...new Set([...updatedState.context.destinations, ...newDestinations])];
    }
    
    if (parseResult.success && trip.destinations.length > 0) {
      updatedState.currentItinerary = trip;
    }
  }
  
  return updatedState;
}

/**
 * Export types and utilities
 */
export type { DialogResponse, ConversationState, Message, Constraint };