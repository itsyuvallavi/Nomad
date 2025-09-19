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
  try {
    const body = await request.json();
    const { prompt, conversationContext, sessionId, attachedFile } = body;

    logger.info('API', 'Processing itinerary request', {
      sessionId,
      hasContext: !!conversationContext
    });

    // Initialize controllers
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    // Process the message through the conversation controller
    const response = await aiController.processMessage(prompt, conversationContext);

    // Check if we have enough information to generate
    if (response.type === 'ready' && response.canGenerate && response.intent) {
      // Extract parameters and generate itinerary
      const tripParams = aiController.getTripParameters(response.intent);

      logger.info('API', 'Generating itinerary', {
        destination: tripParams.destination,
        duration: tripParams.duration
      });

      // Generate the itinerary with OSM enrichment
      const itinerary = await tripGenerator.generateItinerary(tripParams);

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
    logger.error('API', 'Failed to process itinerary request', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
        type: 'error'
      },
      { status: 500 }
    );
  }
}

// Configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds