import { NextRequest, NextResponse } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';

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

    // Initialize controllers
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    // Process the message through the conversation controller
    const response = await aiController.processMessage(prompt, conversationContext);

    // Check if we have enough information to generate
    if (response.type === 'ready' && response.canGenerate && response.intent) {
      // Extract parameters and generate itinerary
      const tripParams = aiController.getTripParameters(response.intent);

      // Generate the itinerary
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

    // Return question or other response type
    const conversationalResponse: ConversationalItineraryOutput = {
      type: response.type === 'question' ? 'question' : 'confirmation',
      message: response.message,
      awaitingInput: response.missingFields?.[0],
      conversationContext: response.context,
      requiresGeneration: false
    };

    return NextResponse.json({
      success: true,
      data: conversationalResponse
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-Session': sessionId || 'new'
      }
    });
  } catch (error: any) {
    console.error('Error in conversational itinerary generation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process conversation',
        type: 'error'
      },
      { status: 500 }
    );
  }
}

// Configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds