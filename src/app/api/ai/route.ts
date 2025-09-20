import { NextRequest, NextResponse } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import { logger } from '@/lib/monitoring/logger';

/**
 * API Route: /api/ai
 * Handles conversational itinerary generation with OSM enrichment
 */

// Response type for the API
export interface ConversationalItineraryOutput {
  type: 'question' | 'confirmation' | 'itinerary' | 'error';
  message: string;
  awaitingInput?: string;
  suggestedOptions?: string[];
  itinerary?: any;
  conversationContext?: string;
  requiresGeneration?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { message, prompt, conversationContext, context, sessionId } = body;

    // Support both 'message' and 'prompt' fields for backwards compatibility
    const userMessage = message || prompt;

    logger.info('API', 'Request received', {
      sessionId,
      message: userMessage,
      hasContext: !!conversationContext || !!context,
      timestamp: new Date().toISOString()
    });

    // Initialize controllers
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    // Process the message through the conversation controller
    // Support both 'conversationContext' and 'context' fields
    const contextToUse = conversationContext || context;

    logger.info('API', 'Processing message with AI controller', {
      hasContext: !!contextToUse
    });

    const aiStartTime = Date.now();
    const response = await aiController.processMessage(userMessage, contextToUse);
    const aiTime = Date.now() - aiStartTime;

    logger.info('API', 'AI controller response', {
      type: response.type,
      canGenerate: response.canGenerate,
      processingTime: `${aiTime}ms`
    });

    // Check if we have enough information to generate
    if (response.type === 'ready' && response.canGenerate && response.intent) {
      // Extract parameters and generate itinerary
      const tripParams = aiController.getTripParameters(response.intent);

      logger.info('API', 'Generating itinerary', {
        destination: tripParams.destination,
        duration: tripParams.duration
      });

      // Generate the itinerary with HERE enrichment
      const genStartTime = Date.now();
      const itinerary = await tripGenerator.generateItinerary(tripParams);
      const genTime = Date.now() - genStartTime;

      logger.info('API', 'Itinerary generated', {
        generationTime: `${genTime}ms`,
        totalTime: `${Date.now() - startTime}ms`
      });

      // Return the generated itinerary
      return NextResponse.json({
        success: true,
        data: {
          type: 'itinerary',
          message: 'Your itinerary is ready!',
          itinerary,
          conversationContext: response.context
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Session': sessionId || 'new'
        }
      });
    }

    // Need more information - return question
    if (response.type === 'question') {
      logger.info('API', 'Returning question', {
        missingFields: response.missingFields,
        totalTime: `${Date.now() - startTime}ms`
      });

      return NextResponse.json({
        success: true,
        data: {
          type: 'question',
          message: response.message,
          awaitingInput: response.missingFields?.[0],
          suggestedOptions: undefined,
          conversationContext: response.context
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Session': sessionId || 'new'
        }
      });
    }

    // Handle other response types
    return NextResponse.json({
      success: true,
      data: {
        type: 'confirmation',
        message: response.message,
        requiresGeneration: false,
        conversationContext: response.context
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-Session': sessionId || 'new'
      }
    });

  } catch (error: any) {
    const errorTime = Date.now() - startTime;

    logger.error('API', 'Request failed', {
      error: error.message,
      stack: error.stack,
      timeToError: `${errorTime}ms`,
      type: error.name
    });

    // Check for timeout
    if (error.name === 'AbortError' || errorTime > 25000) {
      return NextResponse.json({
        success: false,
        error: 'Request timed out. Please try again with a simpler request.',
        type: 'error',
        timeElapsed: errorTime
      }, { status: 504 });
    }

    // Check for OpenAI errors
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return NextResponse.json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
        type: 'error',
        details: error.message
      }, { status: 503 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
        type: 'error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds